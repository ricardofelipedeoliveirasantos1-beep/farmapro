import pg from 'pg';
import {
  AjusteEstoqueDTO,
  AlterarStatusLoteDTO,
  AprovarInventarioDTO,
  BloqueioDesbloqueioProdutoDTO,
  CadastrarLoteDTO,
  ContextoTenant,
  EntradaMercadoriaDTO,
  EstoqueMovimentacao,
  FiltrosPainelEstoque,
  Inventario,
  InventarioItem,
  ProdutoEstoqueItem,
  RegistrarContagemInventarioDTO,
  ResumoPainelEstoque,
  SaidaMercadoriaDTO,
} from '@farmapro/shared';

export interface LoteAlocacaoFEFO {
  loteId: string;
  numeroLote: string;
  dataValidade: string;
  quantidadeAlocada: number;
  custoUnitarioCentavos: number;
}

export class EstoqueService {
  /**
   * Retorna os indicadores consolidados para o Painel de Estoque da filial.
   * Critério de cálculo documentado:
   * - Custo Total: soma(quantidade_fisica * custo_unitario_lote ou custo_medio)
   * - Venda Total: soma(quantidade_fisica * preco_venda_centavos)
   */
  static async obterResumoPainel(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    _filtros?: FiltrosPainelEstoque,
  ): Promise<ResumoPainelEstoque> {
    // 1. Total de produtos cadastrados na empresa
    const resTotal = await client.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM produtos WHERE empresa_id = $1 AND status != 'INATIVO'`,
      [empresaId],
    );
    const totalProdutosCadastrados = Number(resTotal.rows[0]?.total || 0);

    // 2. Saldos, estoque baixo, sem estoque e valores financeiros
    const resSaldos = await client.query<{
      produtos_baixo: string;
      produtos_zerados: string;
      valor_custo_total: string;
      valor_venda_total: string;
    }>(
      `SELECT 
        COUNT(CASE WHEN es.quantidade_disponivel <= pf.estoque_minimo AND es.quantidade_disponivel > 0 THEN 1 END) AS produtos_baixo,
        COUNT(CASE WHEN es.quantidade_disponivel <= 0 THEN 1 END) AS produtos_zerados,
        COALESCE(SUM(es.quantidade_fisica * COALESCE(es.custo_medio_centavos, pf.preco_custo_centavos, 0)), 0) AS valor_custo_total,
        COALESCE(SUM(es.quantidade_fisica * COALESCE(pf.preco_venda_centavos, 0)), 0) AS valor_venda_total
       FROM estoque_saldos es
       INNER JOIN produtos p ON p.id = es.produto_id
       LEFT JOIN produtos_filiais pf ON pf.produto_id = es.produto_id AND pf.filial_id = es.filial_id
       WHERE es.empresa_id = $1 AND es.filial_id = $2 AND p.status != 'INATIVO'`,
      [empresaId, filialId],
    );

    const rowSaldos = resSaldos.rows[0];
    const produtosEstoqueBaixo = Number(rowSaldos?.produtos_baixo || 0);
    const produtosSemEstoque = Number(rowSaldos?.produtos_zerados || 0);
    const valorTotalEstoqueCustoCentavos = Math.round(Number(rowSaldos?.valor_custo_total || 0));
    const valorTotalEstoqueVendaCentavos = Math.round(Number(rowSaldos?.valor_venda_total || 0));

    // 3. Lotes vencidos, bloqueados, quarentena e próximos do vencimento (<= 60 dias)
    const resLotes = await client.query<{
      proximos_vencimento: string;
      vencidos_ou_bloqueados: string;
    }>(
      `SELECT 
        COUNT(CASE 
          WHEN l.status = 'ATIVO' 
           AND l.data_validade > CURRENT_DATE 
           AND l.data_validade <= (CURRENT_DATE + INTERVAL '60 days')
          THEN 1 
        END) AS proximos_vencimento,
        COUNT(CASE 
          WHEN l.status IN ('BLOQUEADO', 'QUARENTENA', 'VENCIDO') 
            OR l.data_validade <= CURRENT_DATE 
          THEN 1 
        END) AS vencidos_ou_bloqueados
       FROM lotes l
       WHERE l.empresa_id = $1 AND l.filial_id = $2 AND l.quantidade_disponivel > 0`,
      [empresaId, filialId],
    );

    const rowLotes = resLotes.rows[0];
    const produtosProximosVencimento = Number(rowLotes?.proximos_vencimento || 0);
    const produtosVencidosOuBloqueados = Number(rowLotes?.vencidos_ou_bloqueados || 0);

    return {
      totalProdutosCadastrados,
      produtosEstoqueBaixo,
      produtosSemEstoque,
      produtosProximosVencimento,
      produtosVencidosOuBloqueados,
      valorTotalEstoqueCustoCentavos,
      valorTotalEstoqueVendaCentavos,
      criterioCalculoValorEstoque:
        'Custo: Quantidade Física × Custo Médio Ponderado de Aquisição. Venda: Quantidade Física × Preço de Venda Praticado na Filial.',
    };
  }

  /**
   * Lista os produtos com saldo e alertas na filial especificada.
   */
  static async listarProdutosEstoque(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    filtros?: FiltrosPainelEstoque,
  ): Promise<ProdutoEstoqueItem[]> {
    let sql = `
      SELECT 
        p.id AS produto_id,
        p.empresa_id,
        $2::uuid AS filial_id,
        p.nome_comercial,
        p.nome_generico,
        p.fabricante,
        p.apresentacao,
        p.tipo_produto,
        p.status AS status_produto,
        cp.nome AS categoria_nome,
        COALESCE(pcb.codigo_barras, '') AS codigo_barras_principal,
        COALESCE(pf.preco_custo_centavos, 0) AS preco_custo_centavos,
        COALESCE(pf.preco_venda_centavos, 0) AS preco_venda_centavos,
        COALESCE(pf.estoque_minimo, 0) AS estoque_minimo,
        COALESCE(pf.estoque_maximo, 0) AS estoque_maximo,
        pf.localizacao_prateleira,
        COALESCE(es.quantidade_fisica, 0) AS quantidade_fisica,
        COALESCE(es.quantidade_reservada, 0) AS quantidade_reservada,
        COALESCE(es.quantidade_disponivel, 0) AS quantidade_disponivel,
        COUNT(CASE WHEN l.status = 'ATIVO' AND l.data_validade > CURRENT_DATE THEN 1 END) AS total_lotes_ativos,
        MIN(CASE WHEN l.status = 'ATIVO' AND l.data_validade > CURRENT_DATE THEN l.data_validade END) AS proximo_vencimento
      FROM produtos p
      LEFT JOIN categorias_produtos cp ON cp.id = p.categoria_id
      LEFT JOIN produtos_codigos_barras pcb ON pcb.produto_id = p.id AND pcb.e_principal = true
      LEFT JOIN produtos_filiais pf ON pf.produto_id = p.id AND pf.filial_id = $2
      LEFT JOIN estoque_saldos es ON es.produto_id = p.id AND es.filial_id = $2
      LEFT JOIN lotes l ON l.produto_id = p.id AND l.filial_id = $2 AND l.quantidade_disponivel > 0
      WHERE p.empresa_id = $1
    `;

    const params: unknown[] = [empresaId, filialId];

    if (filtros?.termoBusca && filtros.termoBusca.trim().length > 0) {
      params.push(`%${filtros.termoBusca.trim()}%`);
      const idx = params.length;
      sql += ` AND (p.nome_comercial ILIKE $${idx} OR p.nome_generico ILIKE $${idx} OR pcb.codigo_barras ILIKE $${idx})`;
    }

    if (filtros?.categoriaId) {
      params.push(filtros.categoriaId);
      sql += ` AND p.categoria_id = $${params.length}`;
    }

    sql += `
      GROUP BY 
        p.id, p.empresa_id, p.nome_comercial, p.nome_generico, p.fabricante, 
        p.apresentacao, p.tipo_produto, p.status, cp.nome, pcb.codigo_barras,
        pf.preco_custo_centavos, pf.preco_venda_centavos, pf.estoque_minimo, 
        pf.estoque_maximo, pf.localizacao_prateleira, es.quantidade_fisica, 
        es.quantidade_reservada, es.quantidade_disponivel
      ORDER BY p.nome_comercial ASC
    `;

    if (filtros?.limite) {
      params.push(filtros.limite);
      sql += ` LIMIT $${params.length}`;
    }

    const res = await client.query<{
      produto_id: string;
      empresa_id: string;
      filial_id: string;
      nome_comercial: string;
      nome_generico: string;
      fabricante: string;
      apresentacao: string;
      tipo_produto: string;
      status_produto: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
      categoria_nome: string;
      codigo_barras_principal: string;
      preco_custo_centavos: string;
      preco_venda_centavos: string;
      estoque_minimo: string;
      estoque_maximo: string;
      localizacao_prateleira: string;
      quantidade_fisica: string;
      quantidade_reservada: string;
      quantidade_disponivel: string;
      total_lotes_ativos: string;
      proximo_vencimento: string | Date | null;
    }>(sql, params);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return res.rows.map(r => {
      const qtdDisponivel = Number(r.quantidade_disponivel);
      const estMin = Number(r.estoque_minimo);
      const proxVenc = r.proximo_vencimento
        ? r.proximo_vencimento instanceof Date
          ? r.proximo_vencimento.toISOString().substring(0, 10)
          : String(r.proximo_vencimento).substring(0, 10)
        : undefined;

      let alertaEstoque: ProdutoEstoqueItem['alertaEstoque'] = 'NORMAL';
      if (qtdDisponivel <= 0) {
        alertaEstoque = 'ZERADO';
      } else if (qtdDisponivel <= estMin) {
        alertaEstoque = 'BAIXO';
      } else if (proxVenc) {
        const dtVenc = new Date(proxVenc);
        const diasParaVencer = (dtVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
        if (diasParaVencer <= 0) {
          alertaEstoque = 'VENCIDO';
        } else if (diasParaVencer <= 60) {
          alertaEstoque = 'VENCENDO';
        }
      }

      return {
        produtoId: r.produto_id,
        empresaId: r.empresa_id,
        filialId: r.filial_id,
        nomeComercial: r.nome_comercial,
        nomeGenerico: r.nome_generico || undefined,
        fabricante: r.fabricante,
        apresentacao: r.apresentacao,
        tipoProduto: r.tipo_produto,
        categoriaNome: r.categoria_nome || undefined,
        codigoBarrasPrincipal: r.codigo_barras_principal || undefined,
        precoCustoCentavos: Number(r.preco_custo_centavos),
        precoVendaCentavos: Number(r.preco_venda_centavos),
        estoqueMinimo: Number(r.estoque_minimo),
        estoqueMaximo: Number(r.estoque_maximo),
        localizacaoPrateleira: r.localizacao_prateleira || undefined,
        quantidadeFisica: Number(r.quantidade_fisica),
        quantidadeReservada: Number(r.quantidade_reservada),
        quantidadeDisponivel: qtdDisponivel,
        statusProduto: r.status_produto,
        totalLotesAtivos: Number(r.total_lotes_ativos),
        proximoVencimento: proxVenc,
        alertaEstoque,
      };
    });
  }

  /**
   * Consulta os lotes de um produto na filial.
   */
  static async listarLotesProduto(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    produtoId?: string,
  ) {
    let sql = `
      SELECT 
        l.id, l.empresa_id, l.filial_id, l.produto_id,
        l.numero_lote, l.data_fabricacao, l.data_validade,
        l.quantidade_recebida, l.quantidade_disponivel, l.quantidade_reservada,
        l.quantidade_bloqueada, l.custo_unitario_centavos, l.status,
        l.motivo_bloqueio, l.origem_entrada_tipo, l.origem_entrada_id,
        p.nome_comercial, p.apresentacao
      FROM lotes l
      INNER JOIN produtos p ON p.id = l.produto_id
      WHERE l.empresa_id = $1 AND l.filial_id = $2
    `;

    const params: unknown[] = [empresaId, filialId];
    if (produtoId) {
      params.push(produtoId);
      sql += ` AND l.produto_id = $3`;
    }

    sql += ` ORDER BY l.data_validade ASC, l.numero_lote ASC`;

    const res = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      produto_id: string;
      numero_lote: string;
      data_fabricacao: string | Date;
      data_validade: string | Date;
      quantidade_recebida: string;
      quantidade_disponivel: string;
      quantidade_reservada: string;
      quantidade_bloqueada: string;
      custo_unitario_centavos: string;
      status: 'ATIVO' | 'QUARENTENA' | 'BLOQUEADO' | 'VENCIDO' | 'ESGOTADO';
      motivo_bloqueio?: string;
      origem_entrada_tipo: string;
      origem_entrada_id?: string;
      nome_comercial: string;
      apresentacao: string;
    }>(sql, params);

    return res.rows.map(r => ({
      id: r.id,
      empresaId: r.empresa_id,
      filialId: r.filial_id,
      produtoId: r.produto_id,
      numeroLote: r.numero_lote,
      dataFabricacao:
        r.data_fabricacao instanceof Date
          ? r.data_fabricacao.toISOString().substring(0, 10)
          : String(r.data_fabricacao).substring(0, 10),
      dataValidade:
        r.data_validade instanceof Date
          ? r.data_validade.toISOString().substring(0, 10)
          : String(r.data_validade).substring(0, 10),
      quantidadeRecebida: Number(r.quantidade_recebida),
      quantidadeDisponivel: Number(r.quantidade_disponivel),
      quantidadeReservada: Number(r.quantidade_reservada),
      quantidadeBloqueada: Number(r.quantidade_bloqueada),
      custoUnitarioCentavos: Number(r.custo_unitario_centavos),
      status: r.status,
      motivoBloqueio: r.motivo_bloqueio,
      origemEntradaTipo: r.origem_entrada_tipo,
      origemEntradaId: r.origem_entrada_id,
      nomeComercial: r.nome_comercial,
      apresentacao: r.apresentacao,
    }));
  }

  /**
   * Algoritmo FEFO (First Expire, First Out):
   * Seleciona lotes disponíveis ordenados estritamente pela data de validade mais próxima.
   * Descarta lotes vencidos, bloqueados, em quarentena ou sem estoque.
   */
  static async selecionarLotesFEFO(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    produtoId: string,
    quantidadeSolicitada: number,
  ): Promise<LoteAlocacaoFEFO[]> {
    if (quantidadeSolicitada <= 0) {
      throw new Error('A quantidade solicitada para alocação FEFO deve ser maior que zero.');
    }

    const resLotes = await client.query<{
      id: string;
      numero_lote: string;
      data_validade: string | Date;
      quantidade_disponivel: string;
      custo_unitario_centavos: string;
    }>(
      `SELECT id, numero_lote, data_validade, quantidade_disponivel, custo_unitario_centavos
       FROM lotes
       WHERE empresa_id = $1 
         AND filial_id = $2 
         AND produto_id = $3
         AND status = 'ATIVO'
         AND data_validade > CURRENT_DATE
         AND quantidade_disponivel > 0
       ORDER BY data_validade ASC, criado_em ASC
       FOR UPDATE`,
      [empresaId, filialId, produtoId],
    );

    let restante = quantidadeSolicitada;
    const alocacoes: LoteAlocacaoFEFO[] = [];

    for (const row of resLotes.rows) {
      const disponivel = Number(row.quantidade_disponivel);
      if (disponivel <= 0) continue;

      const qtdPegar = Math.min(restante, disponivel);
      const dataValidadeStr =
        row.data_validade instanceof Date
          ? row.data_validade.toISOString().substring(0, 10)
          : String(row.data_validade).substring(0, 10);

      alocacoes.push({
        loteId: row.id,
        numeroLote: row.numero_lote,
        dataValidade: dataValidadeStr,
        quantidadeAlocada: qtdPegar,
        custoUnitarioCentavos: Number(row.custo_unitario_centavos),
      });

      restante -= qtdPegar;
      if (restante <= 0) break;
    }

    if (restante > 0) {
      throw new Error(
        `Estoque disponível insuficiente para atender a quantidade solicitada (${quantidadeSolicitada} un). Faltam ${restante} un.`,
      );
    }

    return alocacoes;
  }

  /**
   * Entrada Manual de Mercadorias com controle de lote e atualização do saldo de estoque.
   */
  static async registrarEntradaMercadoria(
    client: pg.PoolClient | pg.Pool,
    dados: EntradaMercadoriaDTO,
    tenant: ContextoTenant,
    usuarioId: string,
  ): Promise<{ sucesso: boolean; loteId: string; movimentoId: string }> {
    if (dados.quantidade <= 0) {
      throw new Error('A quantidade de entrada deve ser maior que zero.');
    }
    if (dados.custoUnitarioCentavos < 0) {
      throw new Error('O custo unitário não pode ser negativo.');
    }
    if (!dados.numeroLote || dados.numeroLote.trim().length === 0) {
      throw new Error('O número do lote é obrigatório para registrar a entrada.');
    }
    if (!dados.dataValidade) {
      throw new Error('A data de validade é obrigatória.');
    }

    const filialId = dados.filialId || tenant.filialId;
    if (!filialId) {
      throw new Error('A filial é obrigatória para a entrada de mercadoria.');
    }

    // 1. Obter ou inicializar o saldo consolidado com lock pessimista
    const resSaldo = await client.query<{
      quantidade_fisica: string;
      custo_medio_centavos: string;
    }>(
      `SELECT quantidade_fisica, custo_medio_centavos 
       FROM estoque_saldos 
       WHERE filial_id = $1 AND produto_id = $2 
       FOR UPDATE`,
      [filialId, dados.produtoId],
    );

    let saldoAnterior = 0;
    if (resSaldo.rows.length === 0) {
      // Inserir saldo inicial zerado
      await client.query(
        `INSERT INTO estoque_saldos (
          empresa_id, filial_id, produto_id, quantidade_fisica, quantidade_reservada, 
          custo_medio_centavos, ultimo_custo_centavos, atualizado_em
        ) VALUES ($1, $2, $3, 0, 0, $4, $4, NOW())`,
        [tenant.empresaId, filialId, dados.produtoId, dados.custoUnitarioCentavos],
      );
    } else {
      saldoAnterior = Number(resSaldo.rows[0]?.quantidade_fisica || 0);
    }

    const saldoPosterior = saldoAnterior + dados.quantidade;

    // 2. Criar ou atualizar o lote na filial
    const dtFab = dados.dataFabricacao ? dados.dataFabricacao : new Date().toISOString().substring(0, 10);
    const resLote = await client.query<{ id: string; quantidade_disponivel: string }>(
      `SELECT id, quantidade_disponivel 
       FROM lotes 
       WHERE filial_id = $1 AND produto_id = $2 AND numero_lote = $3`,
      [filialId, dados.produtoId, dados.numeroLote],
    );

    let loteId: string;
    if (resLote.rows.length > 0) {
      loteId = resLote.rows[0]!.id;
      await client.query(
        `UPDATE lotes 
         SET quantidade_recebida = quantidade_recebida + $1,
             quantidade_disponivel = quantidade_disponivel + $1,
             custo_unitario_centavos = $2,
             data_validade = $3,
             status = CASE WHEN status = 'ESGOTADO' THEN 'ATIVO' ELSE status END,
             atualizado_em = NOW()
         WHERE id = $4`,
        [dados.quantidade, dados.custoUnitarioCentavos, dados.dataValidade, loteId],
      );
    } else {
      const resInsLote = await client.query<{ id: string }>(
        `INSERT INTO lotes (
          empresa_id, filial_id, produto_id, numero_lote, data_fabricacao, data_validade,
          quantidade_recebida, quantidade_disponivel, quantidade_reservada, quantidade_bloqueada,
          custo_unitario_centavos, status, origem_entrada_tipo, origem_entrada_id, atualizado_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $7, 0, 0, $8, 'ATIVO', 'COMPRA_NFE', $9, NOW()
        ) RETURNING id`,
        [
          tenant.empresaId,
          filialId,
          dados.produtoId,
          dados.numeroLote,
          dtFab,
          dados.dataValidade,
          dados.quantidade,
          dados.custoUnitarioCentavos,
          dados.documentoOrigem || 'ENTRADA_MANUAL',
        ],
      );
      loteId = resInsLote.rows[0]!.id;
    }

    // 3. Atualizar estoque_saldos
    await client.query(
      `UPDATE estoque_saldos 
       SET quantidade_fisica = quantidade_fisica + $1,
           ultimo_custo_centavos = $2,
           atualizado_em = NOW()
       WHERE filial_id = $3 AND produto_id = $4`,
      [dados.quantidade, dados.custoUnitarioCentavos, filialId, dados.produtoId],
    );

    // 4. Gravar no Livro-Razão (estoque_movimentacoes)
    const resMov = await client.query<{ id: string }>(
      `INSERT INTO estoque_movimentacoes (
        empresa_id, filial_id, produto_id, lote_id, tipo_movimentacao, quantidade,
        custo_unitario_centavos, saldo_anterior, saldo_posterior, origem_documento_tipo,
        origem_documento_id, usuario_id, motivo, data_hora_movimento, criado_em
      ) VALUES (
        $1, $2, $3, $4, 'ENTRADA_AVULSA', $5, $6, $7, $8, 'ENTRADA_MANUAL', $9, $10, $11, NOW(), NOW()
      ) RETURNING id`,
      [
        tenant.empresaId,
        filialId,
        dados.produtoId,
        loteId,
        dados.quantidade,
        dados.custoUnitarioCentavos,
        saldoAnterior,
        saldoPosterior,
        dados.documentoOrigem || 'MANUAL',
        usuarioId,
        dados.motivo || 'Entrada manual de mercadoria no estoque',
      ],
    );

    return {
      sucesso: true,
      loteId,
      movimentoId: resMov.rows[0]!.id,
    };
  }

  /**
   * Saída Manual / Perda / Descarte com validação estrita de estoque negativo.
   */
  static async registrarSaidaMercadoria(
    client: pg.PoolClient | pg.Pool,
    dados: SaidaMercadoriaDTO,
    tenant: ContextoTenant,
    usuarioId: string,
  ): Promise<{ sucesso: boolean; movimentoId: string }> {
    if (dados.quantidade <= 0) {
      throw new Error('A quantidade de saída deve ser maior que zero.');
    }
    if (!dados.motivo || dados.motivo.trim().length === 0) {
      throw new Error('O motivo da saída é obrigatório.');
    }

    const filialId = dados.filialId || tenant.filialId;
    if (!filialId) {
      throw new Error('A filial é obrigatória para registrar a saída de mercadoria.');
    }

    // 1. Obter saldo consolidado com lock pessimista
    const resSaldo = await client.query<{
      quantidade_fisica: string;
      quantidade_disponivel: string;
      custo_medio_centavos: string;
    }>(
      `SELECT quantidade_fisica, quantidade_disponivel, custo_medio_centavos 
       FROM estoque_saldos 
       WHERE filial_id = $1 AND produto_id = $2 
       FOR UPDATE`,
      [filialId, dados.produtoId],
    );

    if (resSaldo.rows.length === 0) {
      throw new Error('Produto não possui registro de saldo de estoque nesta filial.');
    }

    const saldoAnterior = Number(resSaldo.rows[0]!.quantidade_fisica);
    const saldoDisponivel = Number(resSaldo.rows[0]!.quantidade_disponivel);

    if (saldoDisponivel < dados.quantidade) {
      throw new Error(
        `Estoque insuficiente para saída. Saldo disponível: ${saldoDisponivel} un. Quantidade solicitada: ${dados.quantidade} un. O FarmaPro não permite estoque negativo.`,
      );
    }

    // 2. Alocação do lote (se não informado, utiliza FEFO)
    let loteId = dados.loteId;
    let custoUnitario = Number(resSaldo.rows[0]!.custo_medio_centavos || 0);

    if (loteId) {
      const resLote = await client.query<{
        id: string;
        quantidade_disponivel: string;
        custo_unitario_centavos: string;
      }>(
        `SELECT id, quantidade_disponivel, custo_unitario_centavos 
         FROM lotes 
         WHERE id = $1 AND filial_id = $2 
         FOR UPDATE`,
        [loteId, filialId],
      );

      if (resLote.rows.length === 0) {
        throw new Error('Lote informado não encontrado nesta filial.');
      }

      const qtdLoteDisp = Number(resLote.rows[0]!.quantidade_disponivel);
      if (qtdLoteDisp < dados.quantidade) {
        throw new Error(
          `O lote selecionado possui apenas ${qtdLoteDisp} un disponíveis. Não é possível retirar ${dados.quantidade} un.`,
        );
      }

      custoUnitario = Number(resLote.rows[0]!.custo_unitario_centavos);

      await client.query(
        `UPDATE lotes 
         SET quantidade_disponivel = quantidade_disponivel - $1,
             status = CASE WHEN (quantidade_disponivel - $1) <= 0 THEN 'ESGOTADO' ELSE status END,
             atualizado_em = NOW()
         WHERE id = $2`,
        [dados.quantidade, loteId],
      );
    } else {
      // Priorização FEFO automática
      const alocacoes = await this.selecionarLotesFEFO(
        client,
        tenant.empresaId,
        filialId,
        dados.produtoId,
        dados.quantidade,
      );

      for (const aloc of alocacoes) {
        await client.query(
          `UPDATE lotes 
           SET quantidade_disponivel = quantidade_disponivel - $1,
               status = CASE WHEN (quantidade_disponivel - $1) <= 0 THEN 'ESGOTADO' ELSE status END,
               atualizado_em = NOW()
           WHERE id = $2`,
          [aloc.quantidadeAlocada, aloc.loteId],
        );
      }
      loteId = alocacoes[0]?.loteId;
    }

    // 3. Atualizar estoque_saldos (garante não negativo)
    const saldoPosterior = saldoAnterior - dados.quantidade;
    if (saldoPosterior < 0) {
      throw new Error('Operação bloqueada: O saldo físico final não pode ser negativo.');
    }

    await client.query(
      `UPDATE estoque_saldos 
       SET quantidade_fisica = quantidade_fisica - $1,
           atualizado_em = NOW()
       WHERE filial_id = $2 AND produto_id = $3`,
      [dados.quantidade, filialId, dados.produtoId],
    );

    // 4. Registrar Livro-Razão
    const resMov = await client.query<{ id: string }>(
      `INSERT INTO estoque_movimentacoes (
        empresa_id, filial_id, produto_id, lote_id, tipo_movimentacao, quantidade,
        custo_unitario_centavos, saldo_anterior, saldo_posterior, origem_documento_tipo,
        origem_documento_id, usuario_id, motivo, data_hora_movimento, criado_em
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'SAIDA_MANUAL', 'MANUAL', $10, $11, NOW(), NOW()
      ) RETURNING id`,
      [
        tenant.empresaId,
        filialId,
        dados.produtoId,
        loteId || null,
        dados.tipoSaida || 'SAIDA_AVULSA',
        -dados.quantidade, // Negativo para saída
        custoUnitario,
        saldoAnterior,
        saldoPosterior,
        usuarioId,
        dados.motivo,
      ],
    );

    return {
      sucesso: true,
      movimentoId: resMov.rows[0]!.id,
    };
  }

  /**
   * Ajuste de Estoque com Justificativa Obrigatória e auditoria.
   */
  static async ajustarEstoque(
    client: pg.PoolClient | pg.Pool,
    dados: AjusteEstoqueDTO,
    tenant: ContextoTenant,
    usuarioId: string,
  ): Promise<{ sucesso: boolean; movimentoId: string; novoSaldo: number }> {
    if (!dados.justificativa || dados.justificativa.trim().length < 5) {
      throw new Error('Uma justificativa detalhada (mínimo de 5 caracteres) é obrigatória para realizar ajustes de estoque.');
    }
    if (dados.quantidadeAjuste === 0) {
      throw new Error('A quantidade de ajuste não pode ser zero.');
    }

    const filialId = dados.filialId || tenant.filialId;
    if (!filialId) {
      throw new Error('A filial é obrigatória para o ajuste de estoque.');
    }

    // 1. Obter saldo atual com lock
    const resSaldo = await client.query<{
      quantidade_fisica: string;
      quantidade_disponivel: string;
      custo_medio_centavos: string;
    }>(
      `SELECT quantidade_fisica, quantidade_disponivel, custo_medio_centavos 
       FROM estoque_saldos 
       WHERE filial_id = $1 AND produto_id = $2 
       FOR UPDATE`,
      [filialId, dados.produtoId],
    );

    let saldoAnterior = 0;
    let custoUnitario = 0;

    if (resSaldo.rows.length === 0) {
      if (dados.quantidadeAjuste < 0) {
        throw new Error('Não é possível realizar ajuste negativo em produto sem saldo cadastrado.');
      }
      await client.query(
        `INSERT INTO estoque_saldos (
          empresa_id, filial_id, produto_id, quantidade_fisica, quantidade_reservada, 
          custo_medio_centavos, ultimo_custo_centavos, atualizado_em
        ) VALUES ($1, $2, $3, 0, 0, 0, 0, NOW())`,
        [tenant.empresaId, filialId, dados.produtoId],
      );
    } else {
      saldoAnterior = Number(resSaldo.rows[0]!.quantidade_fisica);
      custoUnitario = Number(resSaldo.rows[0]!.custo_medio_centavos || 0);
    }

    const saldoPosterior = saldoAnterior + dados.quantidadeAjuste;
    if (saldoPosterior < 0) {
      throw new Error(
        `Ajuste bloqueado: O ajuste resultaria em saldo negativo (${saldoPosterior} un). O sistema proíbe estoque negativo.`,
      );
    }

    // 2. Atualizar Lote se informado
    if (dados.loteId) {
      const resLote = await client.query<{ quantidade_disponivel: string }>(
        `SELECT quantidade_disponivel FROM lotes WHERE id = $1 AND filial_id = $2 FOR UPDATE`,
        [dados.loteId, filialId],
      );
      if (resLote.rows.length > 0) {
        const qtdLote = Number(resLote.rows[0]!.quantidade_disponivel);
        const novoLoteQtd = qtdLote + dados.quantidadeAjuste;
        if (novoLoteQtd < 0) {
          throw new Error('O ajuste deixaria o saldo do lote negativo, o que é proibido.');
        }
        await client.query(
          `UPDATE lotes 
           SET quantidade_disponivel = $1,
               status = CASE WHEN $1 = 0 THEN 'ESGOTADO' ELSE status END,
               atualizado_em = NOW() 
           WHERE id = $2`,
          [novoLoteQtd, dados.loteId],
        );
      }
    }

    // 3. Atualizar estoque_saldos
    await client.query(
      `UPDATE estoque_saldos 
       SET quantidade_fisica = $1, atualizado_em = NOW() 
       WHERE filial_id = $2 AND produto_id = $3`,
      [saldoPosterior, filialId, dados.produtoId],
    );

    // 4. Registrar Livro-Razão
    const tipoMov = dados.quantidadeAjuste > 0 ? 'AJUSTE_MANUAL_POSITIVO' : 'AJUSTE_MANUAL_NEGATIVO';
    const resMov = await client.query<{ id: string }>(
      `INSERT INTO estoque_movimentacoes (
        empresa_id, filial_id, produto_id, lote_id, tipo_movimentacao, quantidade,
        custo_unitario_centavos, saldo_anterior, saldo_posterior, origem_documento_tipo,
        origem_documento_id, usuario_id, motivo, data_hora_movimento, criado_em
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'AJUSTE_MANUAL', 'AJUSTE', $10, $11, NOW(), NOW()
      ) RETURNING id`,
      [
        tenant.empresaId,
        filialId,
        dados.produtoId,
        dados.loteId || null,
        tipoMov,
        dados.quantidadeAjuste,
        custoUnitario,
        saldoAnterior,
        saldoPosterior,
        usuarioId,
        dados.justificativa,
      ],
    );

    return {
      sucesso: true,
      movimentoId: resMov.rows[0]!.id,
      novoSaldo: saldoPosterior,
    };
  }

  /**
   * Bloqueio ou Desbloqueio de Produto.
   */
  static async alterarStatusProduto(
    client: pg.PoolClient | pg.Pool,
    dados: BloqueioDesbloqueioProdutoDTO,
    tenant: ContextoTenant,
    usuarioId: string,
  ): Promise<{ sucesso: boolean; statusAtual: string }> {
    if (!dados.motivo || dados.motivo.trim().length === 0) {
      throw new Error('O motivo da alteração de status do produto é obrigatório.');
    }

    const resProd = await client.query<{ id: string; status: string }>(
      `SELECT id, status FROM produtos WHERE id = $1 AND empresa_id = $2`,
      [dados.produtoId, tenant.empresaId],
    );

    if (resProd.rows.length === 0) {
      throw new Error('Produto não encontrado nesta empresa.');
    }

    await client.query(
      `UPDATE produtos SET status = $1, atualizado_em = NOW() WHERE id = $2`,
      [dados.novoStatus, dados.produtoId],
    );

    // Registrar auditoria
    await client.query(
      `INSERT INTO auditoria_logs (
        empresa_id, filial_id, usuario_id, operacao, tabela_afetada, registro_afetado_id,
        dados_anteriores, dados_novos, criado_em
      ) VALUES (
        $1, $2, $3, 'UPDATE', 'produtos', $4, 
        json_build_object('status', $5::text), 
        json_build_object('status', $6::text, 'motivo', $7::text), 
        NOW()
      )`,
      [
        tenant.empresaId,
        dados.filialId || tenant.filialId || null,
        usuarioId,
        dados.produtoId,
        resProd.rows[0]!.status,
        dados.novoStatus,
        dados.motivo,
      ],
    );

    return {
      sucesso: true,
      statusAtual: dados.novoStatus,
    };
  }

  /**
   * Cadastro de novo lote com controle sanitário.
   */
  static async cadastrarLote(
    client: pg.PoolClient | pg.Pool,
    dados: CadastrarLoteDTO,
    tenant: ContextoTenant,
    usuarioId: string,
  ): Promise<{ sucesso: boolean; loteId: string }> {
    if (!dados.numeroLote || dados.numeroLote.trim().length === 0) {
      throw new Error('O número do lote é obrigatório.');
    }
    if (!dados.dataValidade) {
      throw new Error('A data de validade é obrigatória.');
    }
    if (dados.quantidade < 0) {
      throw new Error('A quantidade do lote não pode ser negativa.');
    }

    const filialId = dados.filialId || tenant.filialId;
    if (!filialId) {
      throw new Error('A filial é obrigatória para cadastrar lote.');
    }

    const statusInicial = dados.status || 'ATIVO';
    const dtFab = dados.dataFabricacao || new Date().toISOString().substring(0, 10);

    const resLote = await client.query<{ id: string }>(
      `INSERT INTO lotes (
        empresa_id, filial_id, produto_id, numero_lote, data_fabricacao, data_validade,
        quantidade_recebida, quantidade_disponivel, quantidade_reservada, quantidade_bloqueada,
        custo_unitario_centavos, status, motivo_bloqueio, origem_entrada_tipo, criado_em, atualizado_em
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $7, 0, 0, $8, $9, $10, 'COMPRA_NFE', NOW(), NOW()
      ) RETURNING id`,
      [
        tenant.empresaId,
        filialId,
        dados.produtoId,
        dados.numeroLote.trim(),
        dtFab,
        dados.dataValidade,
        dados.quantidade,
        dados.custoUnitarioCentavos,
        statusInicial,
        dados.motivoBloqueio || null,
      ],
    );

    const loteId = resLote.rows[0]!.id;

    // Se houve quantidade, atualiza saldo físico
    if (dados.quantidade > 0) {
      const resSaldo = await client.query<{ quantidade_fisica: string }>(
        `SELECT quantidade_fisica FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2 FOR UPDATE`,
        [filialId, dados.produtoId],
      );

      let saldoAnt = 0;
      if (resSaldo.rows.length === 0) {
        await client.query(
          `INSERT INTO estoque_saldos (
            empresa_id, filial_id, produto_id, quantidade_fisica, quantidade_reservada, 
            custo_medio_centavos, ultimo_custo_centavos, atualizado_em
          ) VALUES ($1, $2, $3, $4, 0, $5, $5, NOW())`,
          [tenant.empresaId, filialId, dados.produtoId, dados.quantidade, dados.custoUnitarioCentavos],
        );
      } else {
        saldoAnt = Number(resSaldo.rows[0]!.quantidade_fisica);
        await client.query(
          `UPDATE estoque_saldos 
           SET quantidade_fisica = quantidade_fisica + $1, atualizado_em = NOW() 
           WHERE filial_id = $2 AND produto_id = $3`,
          [dados.quantidade, filialId, dados.produtoId],
        );
      }

      await client.query(
        `INSERT INTO estoque_movimentacoes (
          empresa_id, filial_id, produto_id, lote_id, tipo_movimentacao, quantidade,
          custo_unitario_centavos, saldo_anterior, saldo_posterior, origem_documento_tipo,
          origem_documento_id, usuario_id, motivo, data_hora_movimento, criado_em
        ) VALUES (
          $1, $2, $3, $4, 'ENTRADA_AVULSA', $5, $6, $7, $8, 'CADASTRO_LOTE', 'LOTE_NOVO', $9, $10, NOW(), NOW()
        )`,
        [
          tenant.empresaId,
          filialId,
          dados.produtoId,
          loteId,
          dados.quantidade,
          dados.custoUnitarioCentavos,
          saldoAnt,
          saldoAnt + dados.quantidade,
          usuarioId,
          'Entrada por cadastro de novo lote',
        ],
      );
    }

    return {
      sucesso: true,
      loteId,
    };
  }

  /**
   * Alteração de Situação de Lote (Quarentena, Bloqueado, Ativo, Vencido).
   */
  static async alterarStatusLote(
    client: pg.PoolClient | pg.Pool,
    dados: AlterarStatusLoteDTO,
    tenant: ContextoTenant,
    usuarioId: string,
  ): Promise<{ sucesso: boolean; novoStatus: string }> {
    if (!dados.motivo || dados.motivo.trim().length === 0) {
      throw new Error('O motivo da alteração de situação do lote é obrigatório.');
    }

    const resLote = await client.query<{
      id: string;
      filial_id: string;
      produto_id: string;
      status: string;
      quantidade_disponivel: string;
      custo_unitario_centavos: string;
    }>(
      `SELECT id, filial_id, produto_id, status, quantidade_disponivel, custo_unitario_centavos 
       FROM lotes 
       WHERE id = $1 AND empresa_id = $2 
       FOR UPDATE`,
      [dados.loteId, tenant.empresaId],
    );

    if (resLote.rows.length === 0) {
      throw new Error('Lote não encontrado nesta empresa.');
    }

    const lote = resLote.rows[0]!;
    const statusAnt = lote.status;

    await client.query(
      `UPDATE lotes 
       SET status = $1, motivo_bloqueio = $2, atualizado_em = NOW() 
       WHERE id = $3`,
      [dados.novoStatus, dados.motivo, dados.loteId],
    );

    // Registro no Livro-Razão se for bloqueio ou desbloqueio
    let tipoMov: string | null = null;
    if (dados.novoStatus === 'QUARENTENA') tipoMov = 'BLOQUEIO_QUARENTENA';
    else if (dados.novoStatus === 'BLOQUEADO') tipoMov = 'BLOQUEIO_SANITARIO';
    else if (dados.novoStatus === 'ATIVO' && (statusAnt === 'BLOQUEADO' || statusAnt === 'QUARENTENA')) {
      tipoMov = 'DESBLOQUEIO_SANITARIO';
    }

    if (tipoMov) {
      await client.query(
        `INSERT INTO estoque_movimentacoes (
          empresa_id, filial_id, produto_id, lote_id, tipo_movimentacao, quantidade,
          custo_unitario_centavos, saldo_anterior, saldo_posterior, origem_documento_tipo,
          origem_documento_id, usuario_id, motivo, data_hora_movimento, criado_em
        ) VALUES (
          $1, $2, $3, $4, $5, 0, $6, $7, $7, 'GESTAO_LOTES', $4, $8, $9, NOW(), NOW()
        )`,
        [
          tenant.empresaId,
          lote.filial_id,
          lote.produto_id,
          lote.id,
          tipoMov,
          Number(lote.custo_unitario_centavos),
          Number(lote.quantidade_disponivel),
          usuarioId,
          dados.motivo,
        ],
      );
    }

    return {
      sucesso: true,
      novoStatus: dados.novoStatus,
    };
  }

  /**
   * INVENTÁRIO — Criação de novo inventário por filial.
   * Não altera diretamente o estoque.
   */
  static async criarInventario(
    client: pg.PoolClient | pg.Pool,
    dados: {
      filialId: string;
      descricao: string;
      tipoInventario: 'GERAL' | 'CATEGORIA' | 'ROTATIVO' | 'ESPECIFICO';
      categoriaId?: string;
      produtosIds?: string[];
    },
    tenant: ContextoTenant,
    usuarioId: string,
  ): Promise<Inventario> {
    if (!dados.descricao || dados.descricao.trim().length === 0) {
      throw new Error('A descrição do inventário é obrigatória.');
    }

    const filialId = dados.filialId || tenant.filialId;
    if (!filialId) {
      throw new Error('A filial é obrigatória para abrir um inventário.');
    }

    // 1. Criar o cabeçalho do inventário
    const resInv = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      codigo_sequencial: number;
      descricao: string;
      tipo_inventario: 'GERAL' | 'CATEGORIA' | 'ROTATIVO' | 'ESPECIFICO';
      status: 'EM_ANDAMENTO';
      aberto_por_id: string;
      aberto_em: string;
      criado_em: string;
      atualizado_em: string;
    }>(
      `INSERT INTO inventarios (
        empresa_id, filial_id, descricao, tipo_inventario, categoria_id,
        status, aberto_por_id, aberto_em, criado_em, atualizado_em
      ) VALUES ($1, $2, $3, $4, $5, 'EM_ANDAMENTO', $6, NOW(), NOW(), NOW())
      RETURNING *`,
      [
        tenant.empresaId,
        filialId,
        dados.descricao.trim(),
        dados.tipoInventario,
        dados.categoriaId || null,
        usuarioId,
      ],
    );

    const inv = resInv.rows[0]!;

    // 2. Obter snapshot dos produtos e lotes para conferência
    let sqlProdutos = `
      SELECT 
        p.id AS produto_id,
        l.id AS lote_id,
        COALESCE(l.quantidade_disponivel, es.quantidade_fisica, 0) AS quantidade_sistema,
        COALESCE(l.custo_unitario_centavos, es.custo_medio_centavos, pf.preco_custo_centavos, 0) AS custo_unitario
      FROM produtos p
      LEFT JOIN produtos_filiais pf ON pf.produto_id = p.id AND pf.filial_id = $2
      LEFT JOIN estoque_saldos es ON es.produto_id = p.id AND es.filial_id = $2
      LEFT JOIN lotes l ON l.produto_id = p.id AND l.filial_id = $2 AND l.status = 'ATIVO' AND l.quantidade_disponivel > 0
      WHERE p.empresa_id = $1 AND p.status = 'ATIVO'
    `;

    const params: unknown[] = [tenant.empresaId, filialId];
    if (dados.tipoInventario === 'CATEGORIA' && dados.categoriaId) {
      params.push(dados.categoriaId);
      sqlProdutos += ` AND p.categoria_id = $3`;
    } else if (dados.produtosIds && dados.produtosIds.length > 0) {
      params.push(dados.produtosIds);
      sqlProdutos += ` AND p.id = ANY($3::uuid[])`;
    }

    const resItens = await client.query<{
      produto_id: string;
      lote_id?: string;
      quantidade_sistema: string;
      custo_unitario: string;
    }>(sqlProdutos, params);

    // 3. Inserir itens no inventário
    for (const item of resItens.rows) {
      await client.query(
        `INSERT INTO inventario_itens (
          empresa_id, filial_id, inventario_id, produto_id, lote_id,
          quantidade_sistema, status_item, custo_unitario_centavos, criado_em, atualizado_em
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDENTE', $7, NOW(), NOW())`,
        [
          tenant.empresaId,
          filialId,
          inv.id,
          item.produto_id,
          item.lote_id || null,
          Number(item.quantidade_sistema),
          Number(item.custo_unitario),
        ],
      );
    }

    return {
      id: inv.id,
      empresaId: inv.empresa_id,
      filialId: inv.filial_id,
      codigoSequencial: inv.codigo_sequencial,
      descricao: inv.descricao,
      tipoInventario: inv.tipo_inventario,
      status: inv.status,
      abertoPorId: inv.aberto_por_id,
      abertoEm: inv.aberto_em,
      criadoEm: inv.criado_em,
      atualizadoEm: inv.atualizado_em,
      totalItens: resItens.rows.length,
    };
  }

  /**
   * INVENTÁRIO — Registra a contagem física digitada pelo operador.
   * Não altera o estoque antes da aprovação!
   */
  static async registrarContagemInventario(
    client: pg.PoolClient | pg.Pool,
    dados: RegistrarContagemInventarioDTO,
    tenant: ContextoTenant,
    usuarioId: string,
  ): Promise<{ sucesso: boolean; divergenciasEncontradas: number }> {
    const resInv = await client.query<{ id: string; status: string }>(
      `SELECT id, status FROM inventarios WHERE id = $1 AND empresa_id = $2`,
      [dados.inventarioId, tenant.empresaId],
    );

    if (resInv.rows.length === 0) {
      throw new Error('Inventário não encontrado.');
    }
    if (resInv.rows[0]!.status === 'CONCLUIDO_APROVADO' || resInv.rows[0]!.status === 'CANCELADO') {
      throw new Error('Este inventário já foi finalizado e não permite novas contagens.');
    }

    let divergencias = 0;

    for (const cont of dados.contagens) {
      const resItem = await client.query<{
        id: string;
        quantidade_sistema: string;
        custo_unitario_centavos: string;
      }>(
        `SELECT id, quantidade_sistema, custo_unitario_centavos 
         FROM inventario_itens 
         WHERE id = $1 AND inventario_id = $2`,
        [cont.itemId, dados.inventarioId],
      );

      if (resItem.rows.length === 0) continue;

      const qtdSistema = Number(resItem.rows[0]!.quantidade_sistema);
      const qtdContada = cont.quantidadeContada;
      const divergencia = qtdContada - qtdSistema;
      const custoUnit = Number(resItem.rows[0]!.custo_unitario_centavos);
      const valorDivCentavos = Math.round(divergencia * custoUnit);

      if (divergencia !== 0) {
        divergencias++;
      }

      await client.query(
        `UPDATE inventario_itens 
         SET quantidade_contada = $1,
             divergencia = $2,
             valor_divergencia_centavos = $3,
             justificativa = $4,
             contado_por_id = $5,
             contado_em = NOW(),
             status_item = 'CONTADO',
             atualizado_em = NOW()
         WHERE id = $6`,
        [qtdContada, divergencia, valorDivCentavos, cont.justificativa || null, usuarioId, cont.itemId],
      );
    }

    // Atualiza status do inventário para AGUARDANDO_APROVACAO
    await client.query(
      `UPDATE inventarios 
       SET status = 'AGUARDANDO_APROVACAO', 
           finalizado_por_id = $1, 
           finalizado_em = NOW(),
           atualizado_em = NOW() 
       WHERE id = $2`,
      [usuarioId, dados.inventarioId],
    );

    return {
      sucesso: true,
      divergenciasEncontradas: divergencias,
    };
  }

  /**
   * INVENTÁRIO — Aprovação formal de divergências.
   * Exige permissão `estoque:aprovar_divergencia`.
   * Aplica os ajustes aos saldos e lotes, gerando o Livro-Razão imutável.
   */
  static async aprovarInventario(
    client: pg.PoolClient | pg.Pool,
    dados: AprovarInventarioDTO,
    tenant: ContextoTenant,
    autorizadorId: string,
  ): Promise<{ sucesso: boolean; itensAjustados: number; totalDivergencias: number }> {
    if (!dados.justificativaGeral || dados.justificativaGeral.trim().length < 5) {
      throw new Error('A aprovação de divergências exige uma justificativa formal com no mínimo 5 caracteres.');
    }

    const resInv = await client.query<{
      id: string;
      filial_id: string;
      status: string;
    }>(
      `SELECT id, filial_id, status FROM inventarios WHERE id = $1 AND empresa_id = $2 FOR UPDATE`,
      [dados.inventarioId, tenant.empresaId],
    );

    if (resInv.rows.length === 0) {
      throw new Error('Inventário não encontrado.');
    }

    const inv = resInv.rows[0]!;
    if (inv.status === 'CONCLUIDO_APROVADO') {
      throw new Error('Este inventário já foi aprovado e consolidado anteriormente.');
    }

    // Buscar itens contados com divergência
    const resItens = await client.query<{
      id: string;
      produto_id: string;
      lote_id?: string;
      quantidade_sistema: string;
      quantidade_contada: string;
      divergencia: string;
      custo_unitario_centavos: string;
      justificativa?: string;
    }>(
      `SELECT id, produto_id, lote_id, quantidade_sistema, quantidade_contada, divergencia, custo_unitario_centavos, justificativa
       FROM inventario_itens
       WHERE inventario_id = $1 AND status_item = 'CONTADO' AND divergencia != 0`,
      [dados.inventarioId],
    );

    let itensAjustados = 0;

    for (const item of resItens.rows) {
      const div = Number(item.divergencia);
      const custoUnit = Number(item.custo_unitario_centavos);
      const qtdContada = Number(item.quantidade_contada);

      // 1. Atualizar saldo consolidado no estoque_saldos
      const resSaldo = await client.query<{ quantidade_fisica: string }>(
        `SELECT quantidade_fisica FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2 FOR UPDATE`,
        [inv.filial_id, item.produto_id],
      );

      let saldoAnt = 0;
      if (resSaldo.rows.length === 0) {
        await client.query(
          `INSERT INTO estoque_saldos (
            empresa_id, filial_id, produto_id, quantidade_fisica, quantidade_reservada, 
            custo_medio_centavos, ultimo_custo_centavos, atualizado_em
          ) VALUES ($1, $2, $3, $4, 0, $5, $5, NOW())`,
          [tenant.empresaId, inv.filial_id, item.produto_id, qtdContada, custoUnit],
        );
      } else {
        saldoAnt = Number(resSaldo.rows[0]!.quantidade_fisica);
        const novoSaldo = saldoAnt + div;
        if (novoSaldo < 0) {
          throw new Error('Divergência de inventário resultaria em saldo negativo, o que é proibido.');
        }
        await client.query(
          `UPDATE estoque_saldos SET quantidade_fisica = $1, atualizado_em = NOW() WHERE filial_id = $2 AND produto_id = $3`,
          [novoSaldo, inv.filial_id, item.produto_id],
        );
      }

      // 2. Atualizar Lote se associado
      if (item.lote_id) {
        await client.query(
          `UPDATE lotes 
           SET quantidade_disponivel = GREATEST(0, quantidade_disponivel + $1),
               status = CASE WHEN (quantidade_disponivel + $1) <= 0 THEN 'ESGOTADO' ELSE status END,
               atualizado_em = NOW()
           WHERE id = $2`,
          [div, item.lote_id],
        );
      }

      // 3. Gravar Livro-Razão (estoque_movimentacoes)
      const tipoMov = div > 0 ? 'AJUSTE_POSITIVO_INVENTARIO' : 'AJUSTE_NEGATIVO_INVENTARIO';
      await client.query(
        `INSERT INTO estoque_movimentacoes (
          empresa_id, filial_id, produto_id, lote_id, tipo_movimentacao, quantidade,
          custo_unitario_centavos, saldo_anterior, saldo_posterior, origem_documento_tipo,
          origem_documento_id, usuario_id, motivo, data_hora_movimento, criado_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'INVENTARIO', $10, $11, $12, NOW(), NOW()
        )`,
        [
          tenant.empresaId,
          inv.filial_id,
          item.produto_id,
          item.lote_id || null,
          tipoMov,
          div,
          custoUnit,
          saldoAnt,
          saldoAnt + div,
          dados.inventarioId,
          autorizadorId,
          `Ajuste aprovado por inventário: ${dados.justificativaGeral}. Motivo item: ${item.justificativa || 'Sem justificativa individual'}`,
        ],
      );

      // Marcar item como aprovado
      await client.query(`UPDATE inventario_itens SET status_item = 'APROVADO' WHERE id = $1`, [item.id]);
      itensAjustados++;
    }

    // 4. Fechar inventário como CONCLUIDO_APROVADO
    await client.query(
      `UPDATE inventarios 
       SET status = 'CONCLUIDO_APROVADO', 
           aprovado_por_id = $1, 
           aprovado_em = NOW(), 
           observacoes = $2,
           atualizado_em = NOW() 
       WHERE id = $3`,
      [autorizadorId, dados.justificativaGeral, dados.inventarioId],
    );

    return {
      sucesso: true,
      itensAjustados,
      totalDivergencias: resItens.rows.length,
    };
  }

  /**
   * Consulta os detalhes de um inventário específico com seus itens.
   */
  static async obterDetalhesInventario(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    inventarioId: string,
  ): Promise<Inventario | null> {
    const resInv = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      codigo_sequencial: number;
      descricao: string;
      tipo_inventario: 'GERAL' | 'CATEGORIA' | 'ROTATIVO' | 'ESPECIFICO';
      categoria_id?: string;
      status: 'EM_ANDAMENTO' | 'AGUARDANDO_APROVACAO' | 'CONCLUIDO_APROVADO' | 'CANCELADO';
      aberto_por_id: string;
      aberto_em: string;
      finalizado_por_id?: string;
      finalizado_em?: string;
      aprovado_por_id?: string;
      aprovado_em?: string;
      observacoes?: string;
      criado_em: string;
      atualizado_em: string;
      nome_aberto_por?: string;
      nome_aprovado_por?: string;
    }>(
      `SELECT 
        i.*,
        u_aberto.nome AS nome_aberto_por,
        u_aprov.nome AS nome_aprovado_por
       FROM inventarios i
       LEFT JOIN usuarios u_aberto ON u_aberto.id = i.aberto_por_id
       LEFT JOIN usuarios u_aprov ON u_aprov.id = i.aprovado_por_id
       WHERE i.id = $1 AND i.empresa_id = $2 AND i.filial_id = $3`,
      [inventarioId, empresaId, filialId],
    );

    if (resInv.rows.length === 0) return null;
    const inv = resInv.rows[0]!;

    const resItens = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      inventario_id: string;
      produto_id: string;
      lote_id?: string;
      quantidade_sistema: string;
      quantidade_contada?: string;
      divergencia?: string;
      custo_unitario_centavos: string;
      valor_divergencia_centavos?: string;
      justificativa?: string;
      contado_por_id?: string;
      contado_em?: string;
      status_item: 'PENDENTE' | 'CONTADO' | 'APROVADO' | 'REJEITADO';
      criado_em: string;
      atualizado_em: string;
      nome_comercial: string;
      apresentacao: string;
      numero_lote?: string;
      data_validade?: string | Date;
    }>(
      `SELECT 
        ii.*,
        p.nome_comercial,
        p.apresentacao,
        l.numero_lote,
        l.data_validade
       FROM inventario_itens ii
       INNER JOIN produtos p ON p.id = ii.produto_id
       LEFT JOIN lotes l ON l.id = ii.lote_id
       WHERE ii.inventario_id = $1
       ORDER BY p.nome_comercial ASC`,
      [inventarioId],
    );

    const itens: InventarioItem[] = resItens.rows.map(it => ({
      id: it.id,
      empresaId: it.empresa_id,
      filialId: it.filial_id,
      inventarioId: it.inventario_id,
      produtoId: it.produto_id,
      loteId: it.lote_id,
      quantidadeSistema: Number(it.quantidade_sistema),
      quantidadeContada: it.quantidade_contada !== null && it.quantidade_contada !== undefined ? Number(it.quantidade_contada) : undefined,
      divergencia: it.divergencia !== null && it.divergencia !== undefined ? Number(it.divergencia) : undefined,
      custoUnitarioCentavos: Number(it.custo_unitario_centavos),
      valorDivergenciaCentavos: it.valor_divergencia_centavos !== null && it.valor_divergencia_centavos !== undefined ? Number(it.valor_divergencia_centavos) : undefined,
      justificativa: it.justificativa,
      contadoPorId: it.contado_por_id,
      contadoEm: it.contado_em,
      statusItem: it.status_item,
      criadoEm: it.criado_em,
      atualizadoEm: it.atualizado_em,
      nomeProduto: it.nome_comercial,
      apresentacao: it.apresentacao,
      numeroLote: it.numero_lote,
      dataValidade: it.data_validade
        ? it.data_validade instanceof Date
          ? it.data_validade.toISOString().substring(0, 10)
          : String(it.data_validade).substring(0, 10)
        : undefined,
    }));

    const totalDivs = itens.filter(i => (i.divergencia || 0) !== 0).length;
    const valTotalDiv = itens.reduce((acc, i) => acc + (i.valorDivergenciaCentavos || 0), 0);

    return {
      id: inv.id,
      empresaId: inv.empresa_id,
      filialId: inv.filial_id,
      codigoSequencial: inv.codigo_sequencial,
      descricao: inv.descricao,
      tipoInventario: inv.tipo_inventario,
      categoriaId: inv.categoria_id,
      status: inv.status,
      abertoPorId: inv.aberto_por_id,
      abertoEm: inv.aberto_em,
      finalizadoPorId: inv.finalizado_por_id,
      finalizadoEm: inv.finalizado_em,
      aprovadoPorId: inv.aprovado_por_id,
      aprovadoEm: inv.aprovado_em,
      observacoes: inv.observacoes,
      criadoEm: inv.criado_em,
      atualizadoEm: inv.atualizado_em,
      nomeAbertoPor: inv.nome_aberto_por,
      nomeAprovadoPor: inv.nome_aprovado_por,
      totalItens: itens.length,
      totalDivergencias: totalDivs,
      valorDivergenciaTotalCentavos: valTotalDiv,
      itens,
    };
  }

  /**
   * Lista os inventários cadastrados na filial.
   */
  static async listarInventarios(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    status?: string,
  ): Promise<Inventario[]> {
    let sql = `
      SELECT 
        i.*,
        u_aberto.nome AS nome_aberto_por,
        u_aprov.nome AS nome_aprovado_por,
        COUNT(ii.id) AS total_itens,
        COUNT(CASE WHEN ii.divergencia != 0 THEN 1 END) AS total_divergencias,
        COALESCE(SUM(ii.valor_divergencia_centavos), 0) AS valor_divergencia_total
      FROM inventarios i
      LEFT JOIN usuarios u_aberto ON u_aberto.id = i.aberto_por_id
      LEFT JOIN usuarios u_aprov ON u_aprov.id = i.aprovado_por_id
      LEFT JOIN inventario_itens ii ON ii.inventario_id = i.id
      WHERE i.empresa_id = $1 AND i.filial_id = $2
    `;

    const params: unknown[] = [empresaId, filialId];
    if (status) {
      params.push(status);
      sql += ` AND i.status = $3`;
    }

    sql += `
      GROUP BY i.id, u_aberto.nome, u_aprov.nome
      ORDER BY i.aberto_em DESC
    `;

    const res = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      codigo_sequencial: number;
      descricao: string;
      tipo_inventario: 'GERAL' | 'CATEGORIA' | 'ROTATIVO' | 'ESPECIFICO';
      categoria_id?: string;
      status: 'EM_ANDAMENTO' | 'AGUARDANDO_APROVACAO' | 'CONCLUIDO_APROVADO' | 'CANCELADO';
      aberto_por_id: string;
      aberto_em: string;
      finalizado_por_id?: string;
      finalizado_em?: string;
      aprovado_por_id?: string;
      aprovado_em?: string;
      observacoes?: string;
      criado_em: string;
      atualizado_em: string;
      nome_aberto_por?: string;
      nome_aprovado_por?: string;
      total_itens: string;
      total_divergencias: string;
      valor_divergencia_total: string;
    }>(sql, params);

    return res.rows.map(r => ({
      id: r.id,
      empresaId: r.empresa_id,
      filialId: r.filial_id,
      codigoSequencial: r.codigo_sequencial,
      descricao: r.descricao,
      tipoInventario: r.tipo_inventario,
      categoriaId: r.categoria_id,
      status: r.status,
      abertoPorId: r.aberto_por_id,
      abertoEm: r.aberto_em,
      finalizadoPorId: r.finalizado_por_id,
      finalizadoEm: r.finalizado_em,
      aprovadoPorId: r.aprovado_por_id,
      aprovadoEm: r.aprovado_em,
      observacoes: r.observacoes,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
      nomeAbertoPor: r.nome_aberto_por,
      nomeAprovadoPor: r.nome_aprovado_por,
      totalItens: Number(r.total_itens),
      totalDivergencias: Number(r.total_divergencias),
      valorDivergenciaTotalCentavos: Number(r.valor_divergencia_total),
    }));
  }

  /**
   * Consulta o Livro-Razão Imutável de Movimentações de Estoque.
   */
  static async listarMovimentacoes(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    filtros?: {
      produtoId?: string;
      tipoMovimentacao?: string;
      dataInicio?: string;
      dataFim?: string;
      limite?: number;
    },
  ): Promise<EstoqueMovimentacao[]> {
    let sql = `
      SELECT 
        em.*,
        p.nome_comercial,
        l.numero_lote,
        u.nome AS nome_usuario
      FROM estoque_movimentacoes em
      INNER JOIN produtos p ON p.id = em.produto_id
      LEFT JOIN lotes l ON l.id = em.lote_id
      LEFT JOIN usuarios u ON u.id = em.usuario_id
      WHERE em.empresa_id = $1 AND em.filial_id = $2
    `;

    const params: unknown[] = [empresaId, filialId];

    if (filtros?.produtoId) {
      params.push(filtros.produtoId);
      sql += ` AND em.produto_id = $${params.length}`;
    }

    if (filtros?.tipoMovimentacao) {
      params.push(filtros.tipoMovimentacao);
      sql += ` AND em.tipo_movimentacao = $${params.length}`;
    }

    if (filtros?.dataInicio) {
      params.push(filtros.dataInicio);
      sql += ` AND em.data_hora_movimento >= $${params.length}::timestamptz`;
    }

    if (filtros?.dataFim) {
      params.push(filtros.dataFim);
      sql += ` AND em.data_hora_movimento <= $${params.length}::timestamptz`;
    }

    sql += ` ORDER BY em.data_hora_movimento DESC, em.criado_em DESC`;

    const limit = filtros?.limite || 100;
    params.push(limit);
    sql += ` LIMIT $${params.length}`;

    const res = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      produto_id: string;
      lote_id?: string;
      tipo_movimentacao: EstoqueMovimentacao['tipoMovimentacao'];
      quantidade: string;
      custo_unitario_centavos: string;
      saldo_anterior: string;
      saldo_posterior: string;
      origem_documento_tipo?: string;
      origem_documento_id?: string;
      usuario_id: string;
      motivo?: string;
      id_offline_uuid?: string;
      chave_idempotencia?: string;
      data_hora_movimento: string;
      criado_em: string;
      nome_comercial: string;
      numero_lote?: string;
      nome_usuario?: string;
    }>(sql, params);

    return res.rows.map(r => ({
      id: r.id,
      empresaId: r.empresa_id,
      filialId: r.filial_id,
      produtoId: r.produto_id,
      loteId: r.lote_id,
      tipoMovimentacao: r.tipo_movimentacao,
      quantidade: Number(r.quantidade),
      custoUnitarioCentavos: Number(r.custo_unitario_centavos),
      saldoAnterior: Number(r.saldo_anterior),
      saldoPosterior: Number(r.saldo_posterior),
      origemDocumentoTipo: r.origem_documento_tipo,
      origemDocumentoId: r.origem_documento_id,
      usuarioId: r.usuario_id,
      motivo: r.motivo,
      idOfflineUuid: r.id_offline_uuid,
      chaveIdempotencia: r.chave_idempotencia,
      dataHoraMovimento: r.data_hora_movimento,
      criadoEm: r.criado_em,
      nomeProduto: r.nome_comercial,
      numeroLote: r.numero_lote,
      nomeUsuario: r.nome_usuario,
    }));
  }
}
