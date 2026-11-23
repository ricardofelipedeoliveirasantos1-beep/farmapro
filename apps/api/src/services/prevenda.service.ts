import pg from 'pg';
import {
  ContextoTenant,
  CriarPreVendaDTO,
  PreVenda,
  PreVendaItem,
  ConsultaProdutoBalcao,
} from '@farmapro/shared';

export class PreVendaService {
  /**
   * Gera um código curto e legível de comanda para o balcão (Ex: PV-1048).
   */
  static async gerarCodigoComanda(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
  ): Promise<string> {
    try {
      const res = await client.query<{ num: string }>(
        `SELECT nextval('seq_comandas_balcao') as num`
      );
      const seq = res.rows[0]?.num || '1001';
      return `PV-${seq}`;
    } catch {
      // Fallback robusto se a sequence não tiver sido criada
      const resCount = await client.query<{ total: string }>(
        `SELECT COUNT(*) as total FROM pre_vendas WHERE empresa_id = $1 AND filial_id = $2`,
        [empresaId, filialId]
      );
      const nextNum = 1000 + Number(resCount.rows[0]?.total || 0) + 1;
      return `PV-${nextNum}`;
    }
  }

  /**
   * Consulta completa de medicamentos e produtos para a tela do Balcão.
   * Retorna dados farmacêuticos, preço balcão, saldo total e destaque do lote FEFO (primeiro a vencer).
   */
  static async consultarProdutosBalcao(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    termoBusca: string,
  ): Promise<ConsultaProdutoBalcao[]> {
    const termo = termoBusca.trim();
    if (!termo || termo.length < 2) {
      return [];
    }

    const termoLike = `%${termo}%`;

    const sql = `
      SELECT 
        p.id AS produto_id,
        COALESCE(pcb.codigo_barras, '') AS codigo_barras,
        p.nome_comercial,
        p.nome_generico,
        COALESCE(mdf.principio_ativo, p.nome_generico, '') AS principio_ativo,
        p.apresentacao,
        p.fabricante,
        p.tipo_produto,
        COALESCE(mdf.classificacao_receita, 'ISENTO') AS classificacao_receita,
        COALESCE(pf.preco_venda_centavos, 0) AS preco_venda_centavos,
        COALESCE(es.quantidade_disponivel, 0) AS estoque_total
      FROM produtos p
      LEFT JOIN produtos_filiais pf ON pf.produto_id = p.id AND pf.filial_id = $2
      LEFT JOIN estoque_saldos es ON es.produto_id = p.id AND es.filial_id = $2
      LEFT JOIN (
        SELECT DISTINCT ON (produto_id) produto_id, codigo_barras 
        FROM produtos_codigos_barras 
        ORDER BY produto_id, e_principal DESC
      ) pcb ON pcb.produto_id = p.id
      LEFT JOIN medicamentos_dados_farmaceuticos mdf ON mdf.produto_id = p.id
      WHERE p.empresa_id = $1
        AND (
          p.nome_comercial ILIKE $3
          OR p.nome_generico ILIKE $3
          OR mdf.principio_ativo ILIKE $3
          OR p.fabricante ILIKE $3
          OR pcb.codigo_barras = $4
          OR p.id::text = $4
        )
      ORDER BY p.nome_comercial ASC
      LIMIT 30;
    `;

    const res = await client.query<{
      produto_id: string;
      codigo_barras: string;
      nome_comercial: string;
      nome_generico: string | null;
      principio_ativo: string;
      apresentacao: string;
      fabricante: string;
      tipo_produto: string;
      classificacao_receita: string;
      preco_venda_centavos: string | number;
      estoque_total: string | number;
    }>(sql, [tenant.empresaId, tenant.filialId, termoLike, termo]);

    const resultado: ConsultaProdutoBalcao[] = [];

    for (const row of res.rows) {
      // Buscar lotes válidos e identificar o lote FEFO
      const sqlLotes = `
        SELECT 
          id,
          numero_lote,
          data_validade,
          quantidade_disponivel,
          status,
          (data_validade - CURRENT_DATE) AS dias_ate_vencimento
        FROM lotes
        WHERE empresa_id = $1 
          AND filial_id = $2 
          AND produto_id = $3
          AND status = 'ATIVO'
          AND data_validade > CURRENT_DATE
        ORDER BY data_validade ASC;
      `;

      const resLotes = await client.query<{
        id: string;
        numero_lote: string;
        data_validade: string;
        quantidade_disponivel: string | number;
        status: string;
        dias_ate_vencimento: number;
      }>(sqlLotes, [tenant.empresaId, tenant.filialId, row.produto_id]);

      const lotesValidos = resLotes.rows.map((l) => ({
        id: l.id,
        numeroLote: l.numero_lote,
        dataValidade: typeof l.data_validade === 'string' ? l.data_validade.slice(0, 10) : new Date(l.data_validade).toISOString().slice(0, 10),
        quantidadeDisponivel: Number(l.quantidade_disponivel || 0),
        status: l.status,
      }));

      const primeiroLote = resLotes.rows[0];
      const loteFefo = primeiroLote
        ? {
            id: primeiroLote.id,
            numeroLote: primeiroLote.numero_lote,
            dataValidade: typeof primeiroLote.data_validade === 'string' ? primeiroLote.data_validade.slice(0, 10) : new Date(primeiroLote.data_validade).toISOString().slice(0, 10),
            diasAteVencimento: Number(primeiroLote.dias_ate_vencimento || 0),
            quantidadeDisponivel: Number(primeiroLote.quantidade_disponivel || 0),
          }
        : undefined;

      resultado.push({
        id: row.produto_id,
        codigoBarras: row.codigo_barras,
        nomeComercial: row.nome_comercial,
        nomeGenerico: row.nome_generico || undefined,
        principioAtivo: row.principio_ativo || row.nome_generico || undefined,
        apresentacao: row.apresentacao,
        fabricante: row.fabricante,
        tipoProduto: row.tipo_produto,
        classificacaoReceita: row.classificacao_receita,
        precoVendaCentavos: Number(row.preco_venda_centavos),
        estoqueTotal: Number(row.estoque_total),
        loteFefo,
        lotesValidos,
      });
    }

    return resultado;
  }

  /**
   * Criação de Pré-Venda / Comanda no Balcão de Atendimento.
   * Operação isolada: não movimenta caixa nem altera estoque definitivo.
   */
  static async criarPreVenda(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    dto: CriarPreVendaDTO,
  ): Promise<PreVenda> {
    if (!dto.itens || dto.itens.length === 0) {
      throw new Error('A pré-venda deve conter pelo menos um produto selecionado.');
    }

    const filialId = dto.filialId || tenant.filialId;
    if (!filialId) {
      throw new Error('Filial não informada no contexto da pré-venda.');
    }

    const codigoComanda = await this.gerarCodigoComanda(client, tenant.empresaId, filialId);

    // Calcular valores dos itens
    let subtotalCentavos = 0;
    let descontoItensCentavos = 0;

    const itensProcessados: Array<{
      produtoId: string;
      loteId?: string;
      numeroItem: number;
      codigoBarras: string;
      nomeProduto: string;
      apresentacao: string;
      quantidade: number;
      precoUnitarioCentavos: number;
      descontoUnitarioCentavos: number;
      totalItemCentavos: number;
      exigeReceita: boolean;
      classificacaoReceita: string;
    }> = [];

    for (let i = 0; i < dto.itens.length; i++) {
      const item = dto.itens[i]!;
      if (item.quantidade <= 0) {
        throw new Error(`Quantidade inválida para o item #${i + 1}: deve ser maior que zero.`);
      }

      // Validar dados do produto
      const resProd = await client.query<{
        id: string;
        nome_comercial: string;
        apresentacao: string;
        preco_venda_centavos: string | number;
        classificacao_receita: string | null;
        codigo_barras: string | null;
      }>(
        `
        SELECT 
          p.id,
          p.nome_comercial,
          p.apresentacao,
          COALESCE(pf.preco_venda_centavos, 0) AS preco_venda_centavos,
          mdf.classificacao_receita,
          pcb.codigo_barras
        FROM produtos p
        LEFT JOIN produtos_filiais pf ON pf.produto_id = p.id AND pf.filial_id = $2
        LEFT JOIN medicamentos_dados_farmaceuticos mdf ON mdf.produto_id = p.id
        LEFT JOIN (
          SELECT DISTINCT ON (produto_id) produto_id, codigo_barras 
          FROM produtos_codigos_barras 
          ORDER BY produto_id, e_principal DESC
        ) pcb ON pcb.produto_id = p.id
        WHERE p.id = $1 AND p.empresa_id = $3
      `,
        [item.produtoId, filialId, tenant.empresaId]
      );

      const prod = resProd.rows[0];
      if (!prod) {
        throw new Error(`Produto #${item.produtoId} não encontrado para a empresa.`);
      }

      const precoUnit = item.precoUnitarioCentavos ?? Number(prod.preco_venda_centavos);
      const descUnit = item.descontoUnitarioCentavos ?? 0;
      const subtotalItem = Math.max(0, (precoUnit - descUnit) * item.quantidade);

      subtotalCentavos += precoUnit * item.quantidade;
      descontoItensCentavos += descUnit * item.quantidade;

      itensProcessados.push({
        produtoId: item.produtoId,
        loteId: item.loteId,
        numeroItem: i + 1,
        codigoBarras: item.codigoBarras || prod.codigo_barras || '',
        nomeProduto: item.nomeProduto || prod.nome_comercial,
        apresentacao: item.apresentacao || prod.apresentacao || '',
        quantidade: item.quantidade,
        precoUnitarioCentavos: precoUnit,
        descontoUnitarioCentavos: descUnit,
        totalItemCentavos: subtotalItem,
        exigeReceita:
          prod.classificacao_receita !== 'ISENTO' && Boolean(prod.classificacao_receita),
        classificacaoReceita: prod.classificacao_receita || 'ISENTO',
      });
    }

    const descontoGlobalCentavos = dto.descontoCentavos || 0;
    const totalDesconto = descontoItensCentavos + descontoGlobalCentavos;
    const totalCentavos = Math.max(0, subtotalCentavos - totalDesconto);

    // Inserção da Pré-Venda
    const resPreVenda = await client.query<{
      id: string;
      criado_em: string;
    }>(
      `
      INSERT INTO pre_vendas (
        empresa_id,
        filial_id,
        codigo_comanda,
        atendente_id,
        identificacao_balcao,
        cliente_id,
        cliente_nome,
        cliente_cpf,
        subtotal_centavos,
        desconto_centavos,
        total_centavos,
        status,
        validade_minutos,
        observacoes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDENTE', 120, $12
      ) RETURNING id, criado_em;
    `,
      [
        tenant.empresaId,
        filialId,
        codigoComanda,
        tenant.usuarioId,
        dto.identificacaoBalcao || 'Balcão 01',
        dto.clienteId || null,
        dto.clienteNome || null,
        dto.clienteCpf || null,
        subtotalCentavos,
        totalDesconto,
        totalCentavos,
        dto.observacoes || null,
      ]
    );

    const preVendaId = resPreVenda.rows[0]!.id;
    const criadoEm = resPreVenda.rows[0]!.criado_em;

    // Inserção dos itens
    const itensRetorno: PreVendaItem[] = [];

    for (const it of itensProcessados) {
      const resItem = await client.query<{ id: string; criado_em: string }>(
        `
        INSERT INTO pre_venda_itens (
          empresa_id,
          filial_id,
          pre_venda_id,
          produto_id,
          lote_id,
          numero_item,
          codigo_barras,
          nome_produto,
          apresentacao,
          quantidade,
          preco_unitario_centavos,
          desconto_unitario_centavos,
          total_item_centavos,
          exige_receita,
          classificacao_receita
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING id, criado_em;
      `,
        [
          tenant.empresaId,
          filialId,
          preVendaId,
          it.produtoId,
          it.loteId || null,
          it.numeroItem,
          it.codigoBarras,
          it.nomeProduto,
          it.apresentacao,
          it.quantidade,
          it.precoUnitarioCentavos,
          it.descontoUnitarioCentavos,
          it.totalItemCentavos,
          it.exigeReceita,
          it.classificacaoReceita,
        ]
      );

      itensRetorno.push({
        id: resItem.rows[0]!.id,
        empresaId: tenant.empresaId,
        filialId,
        preVendaId,
        produtoId: it.produtoId,
        loteId: it.loteId,
        numeroItem: it.numeroItem,
        codigoBarras: it.codigoBarras,
        nomeProduto: it.nomeProduto,
        apresentacao: it.apresentacao,
        quantidade: it.quantidade,
        precoUnitarioCentavos: it.precoUnitarioCentavos,
        descontoUnitarioCentavos: it.descontoUnitarioCentavos,
        totalItemCentavos: it.totalItemCentavos,
        exigeReceita: it.exigeReceita,
        classificacaoReceita: it.classificacaoReceita,
        criadoEm: resItem.rows[0]!.criado_em,
      });
    }

    // Buscar nome do atendente
    const resAtendente = await client.query<{ nome: string }>(
      `SELECT nome FROM usuarios WHERE id = $1`,
      [tenant.usuarioId]
    );

    return {
      id: preVendaId,
      empresaId: tenant.empresaId,
      filialId,
      codigoComanda,
      atendenteId: tenant.usuarioId || '',
      atendenteNome: resAtendente.rows[0]?.nome || 'Atendente',
      identificacaoBalcao: dto.identificacaoBalcao || 'Balcão 01',
      clienteId: dto.clienteId,
      clienteNome: dto.clienteNome,
      clienteCpf: dto.clienteCpf,
      subtotalCentavos,
      descontoCentavos: totalDesconto,
      totalCentavos,
      status: 'PENDENTE',
      validadeMinutos: 120,
      observacoes: dto.observacoes,
      criadoEm,
      itens: itensRetorno,
    };
  }

  /**
   * Busca e carrega uma Comanda no Caixa/PDV pelo código único (Ex: PV-1048).
   * Valida isolamento de tenant e filial, e confere se a comanda já não foi finalizada ou cancelada.
   */
  static async buscarPorCodigo(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    codigoComanda: string,
  ): Promise<PreVenda> {
    const codigoLimpo = codigoComanda.trim().toUpperCase();

    const sql = `
      SELECT 
        pv.id,
        pv.empresa_id,
        pv.filial_id,
        pv.codigo_comanda,
        pv.atendente_id,
        u.nome AS atendente_nome,
        pv.identificacao_balcao,
        pv.cliente_id,
        pv.cliente_nome,
        pv.cliente_cpf,
        pv.subtotal_centavos,
        pv.desconto_centavos,
        pv.total_centavos,
        pv.status,
        pv.venda_id,
        pv.caixa_operador_id,
        pv.validade_minutos,
        pv.observacoes,
        pv.criado_em,
        pv.atualizado_em,
        pv.finalizado_em,
        pv.cancelado_em
      FROM pre_vendas pv
      JOIN usuarios u ON u.id = pv.atendente_id
      WHERE pv.empresa_id = $1 
        AND pv.filial_id = $2 
        AND UPPER(pv.codigo_comanda) = $3;
    `;

    const res = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      codigo_comanda: string;
      atendente_id: string;
      atendente_nome: string;
      identificacao_balcao: string;
      cliente_id: string | null;
      cliente_nome: string | null;
      cliente_cpf: string | null;
      subtotal_centavos: string | number;
      desconto_centavos: string | number;
      total_centavos: string | number;
      status: string;
      venda_id: string | null;
      caixa_operador_id: string | null;
      validade_minutos: number;
      observacoes: string | null;
      criado_em: string;
      atualizado_em: string | null;
      finalizado_em: string | null;
      cancelado_em: string | null;
    }>(sql, [tenant.empresaId, tenant.filialId, codigoLimpo]);

    const pv = res.rows[0];
    if (!pv) {
      throw new Error(`Pré-venda / Comanda "${codigoComanda}" não foi encontrada nesta filial.`);
    }

    // Carregar itens
    const resItens = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      pre_venda_id: string;
      produto_id: string;
      lote_id: string | null;
      numero_item: number;
      codigo_barras: string | null;
      nome_produto: string;
      apresentacao: string | null;
      quantidade: string | number;
      preco_unitario_centavos: string | number;
      desconto_unitario_centavos: string | number;
      total_item_centavos: string | number;
      exige_receita: boolean;
      classificacao_receita: string | null;
      criado_em: string;
    }>(
      `
      SELECT * 
      FROM pre_venda_itens 
      WHERE pre_venda_id = $1 
      ORDER BY numero_item ASC;
    `,
      [pv.id]
    );

    const itens: PreVendaItem[] = resItens.rows.map((row) => ({
      id: row.id,
      empresaId: row.empresa_id,
      filialId: row.filial_id,
      preVendaId: row.pre_venda_id,
      produtoId: row.produto_id,
      loteId: row.lote_id || undefined,
      numeroItem: Number(row.numero_item),
      codigoBarras: row.codigo_barras || undefined,
      nomeProduto: row.nome_produto,
      apresentacao: row.apresentacao || undefined,
      quantidade: Number(row.quantidade),
      precoUnitarioCentavos: Number(row.preco_unitario_centavos),
      descontoUnitarioCentavos: Number(row.desconto_unitario_centavos),
      totalItemCentavos: Number(row.total_item_centavos),
      exigeReceita: row.exige_receita,
      classificacaoReceita: row.classificacao_receita || undefined,
      criadoEm: row.criado_em,
    }));

    return {
      id: pv.id,
      empresaId: pv.empresa_id,
      filialId: pv.filial_id,
      codigoComanda: pv.codigo_comanda,
      atendenteId: pv.atendente_id,
      atendenteNome: pv.atendente_nome,
      identificacaoBalcao: pv.identificacao_balcao,
      clienteId: pv.cliente_id || undefined,
      clienteNome: pv.cliente_nome || undefined,
      clienteCpf: pv.cliente_cpf || undefined,
      subtotalCentavos: Number(pv.subtotal_centavos),
      descontoCentavos: Number(pv.desconto_centavos),
      totalCentavos: Number(pv.total_centavos),
      status: pv.status as any,
      vendaId: pv.venda_id || undefined,
      caixaOperadorId: pv.caixa_operador_id || undefined,
      validadeMinutos: Number(pv.validade_minutos),
      observacoes: pv.observacoes || undefined,
      criadoEm: pv.criado_em,
      atualizadoEm: pv.atualizado_em || undefined,
      finalizadoEm: pv.finalizado_em || undefined,
      canceladoEm: pv.cancelado_em || undefined,
      itens,
    };
  }

  /**
   * Lista pré-vendas com status PENDENTE para a filial ativa.
   */
  static async listarPendentes(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
  ): Promise<PreVenda[]> {
    const sql = `
      SELECT 
        pv.id,
        pv.empresa_id,
        pv.filial_id,
        pv.codigo_comanda,
        pv.atendente_id,
        u.nome AS atendente_nome,
        pv.identificacao_balcao,
        pv.cliente_id,
        pv.cliente_nome,
        pv.cliente_cpf,
        pv.subtotal_centavos,
        pv.desconto_centavos,
        pv.total_centavos,
        pv.status,
        pv.validade_minutos,
        pv.observacoes,
        pv.criado_em
      FROM pre_vendas pv
      JOIN usuarios u ON u.id = pv.atendente_id
      WHERE pv.empresa_id = $1 
        AND pv.filial_id = $2 
        AND pv.status = 'PENDENTE'
      ORDER BY pv.criado_em DESC
      LIMIT 50;
    `;

    const res = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      codigo_comanda: string;
      atendente_id: string;
      atendente_nome: string;
      identificacao_balcao: string;
      cliente_id: string | null;
      cliente_nome: string | null;
      cliente_cpf: string | null;
      subtotal_centavos: string | number;
      desconto_centavos: string | number;
      total_centavos: string | number;
      status: string;
      validade_minutos: number;
      observacoes: string | null;
      criado_em: string;
    }>(sql, [tenant.empresaId, tenant.filialId]);

    return res.rows.map((pv) => ({
      id: pv.id,
      empresaId: pv.empresa_id,
      filialId: pv.filial_id,
      codigoComanda: pv.codigo_comanda,
      atendenteId: pv.atendente_id,
      atendenteNome: pv.atendente_nome,
      identificacaoBalcao: pv.identificacao_balcao,
      clienteId: pv.cliente_id || undefined,
      clienteNome: pv.cliente_nome || undefined,
      clienteCpf: pv.cliente_cpf || undefined,
      subtotalCentavos: Number(pv.subtotal_centavos),
      descontoCentavos: Number(pv.desconto_centavos),
      totalCentavos: Number(pv.total_centavos),
      status: pv.status as any,
      validadeMinutos: Number(pv.validade_minutos),
      observacoes: pv.observacoes || undefined,
      criadoEm: pv.criado_em,
      itens: [],
    }));
  }

  /**
   * Pesquisa pré-vendas com normalização de CPF, busca por nome e código de comanda.
   * Multi-tenant: filtra estritamente por empresa_id e filial_id.
   */
  static async pesquisarPreVendas(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    termoBusca: string,
  ): Promise<PreVenda[]> {
    const termo = (termoBusca || '').trim();
    if (!termo) {
      return this.listarPendentes(client, tenant);
    }

    const termoDigitos = termo.replace(/\D/g, '');
    const termoLike = `%${termo}%`;
    const termoDigitosLike = termoDigitos ? `%${termoDigitos}%` : '';

    const sql = `
      SELECT 
        pv.id,
        pv.empresa_id,
        pv.filial_id,
        pv.codigo_comanda,
        pv.atendente_id,
        u.nome AS atendente_nome,
        pv.identificacao_balcao,
        pv.cliente_id,
        pv.cliente_nome,
        pv.cliente_cpf,
        pv.subtotal_centavos,
        pv.desconto_centavos,
        pv.total_centavos,
        pv.status,
        pv.validade_minutos,
        pv.observacoes,
        pv.criado_em
      FROM pre_vendas pv
      JOIN usuarios u ON u.id = pv.atendente_id
      WHERE pv.empresa_id = $1 
        AND pv.filial_id = $2 
        AND (
          pv.codigo_comanda ILIKE $3
          OR pv.cliente_nome ILIKE $3
          OR ($4 <> '' AND REGEXP_REPLACE(COALESCE(pv.cliente_cpf, ''), '\\D', '', 'g') LIKE $5)
        )
      ORDER BY pv.criado_em DESC
      LIMIT 50;
    `;

    const res = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      codigo_comanda: string;
      atendente_id: string;
      atendente_nome: string;
      identificacao_balcao: string;
      cliente_id: string | null;
      cliente_nome: string | null;
      cliente_cpf: string | null;
      subtotal_centavos: string | number;
      desconto_centavos: string | number;
      total_centavos: string | number;
      status: string;
      validade_minutos: number;
      observacoes: string | null;
      criado_em: string;
    }>(sql, [tenant.empresaId, tenant.filialId, termoLike, termoDigitos, termoDigitosLike || '%']);

    return res.rows.map((pv) => ({
      id: pv.id,
      empresaId: pv.empresa_id,
      filialId: pv.filial_id,
      codigoComanda: pv.codigo_comanda,
      atendenteId: pv.atendente_id,
      atendenteNome: pv.atendente_nome,
      identificacaoBalcao: pv.identificacao_balcao,
      clienteId: pv.cliente_id || undefined,
      clienteNome: pv.cliente_nome || undefined,
      clienteCpf: pv.cliente_cpf || undefined,
      subtotalCentavos: Number(pv.subtotal_centavos),
      descontoCentavos: Number(pv.desconto_centavos),
      totalCentavos: Number(pv.total_centavos),
      status: pv.status as any,
      validadeMinutos: Number(pv.validade_minutos),
      observacoes: pv.observacoes || undefined,
      criadoEm: pv.criado_em,
      itens: [],
    }));
  }

  /**
   * Cancela uma pré-venda pendente.
   */
  static async cancelarPreVenda(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    preVendaId: string,
    motivo: string,
  ): Promise<void> {
    const res = await client.query<{ status: string }>(
      `SELECT status FROM pre_vendas WHERE id = $1 AND empresa_id = $2 AND filial_id = $3`,
      [preVendaId, tenant.empresaId, tenant.filialId]
    );

    if (res.rowCount === 0 || !res.rows[0]) {
      throw new Error('Pré-venda não encontrada para cancelamento.');
    }

    if (res.rows[0].status === 'FINALIZADA') {
      throw new Error('Não é possível cancelar uma pré-venda que já foi finalizada no Caixa.');
    }

    await client.query(
      `
      UPDATE pre_vendas 
      SET status = 'CANCELADA',
          cancelado_em = NOW(),
          observacoes = COALESCE(observacoes || ' | ', '') || $1
      WHERE id = $2 AND empresa_id = $3 AND filial_id = $4;
    `,
      [`Cancelado: ${motivo}`, preVendaId, tenant.empresaId, tenant.filialId]
    );
  }

  /**
   * Exclui fisicamente uma pré-venda pendente no Balcão.
   * Não permite excluir pré-venda finalizada no Caixa.
   */
  static async excluirPreVenda(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    preVendaId: string,
  ): Promise<void> {
    const res = await client.query<{ status: string }>(
      `SELECT status FROM pre_vendas WHERE id = $1 AND empresa_id = $2 AND filial_id = $3`,
      [preVendaId, tenant.empresaId, tenant.filialId]
    );

    if (res.rowCount === 0 || !res.rows[0]) {
      throw new Error('Pré-venda não encontrada para exclusão.');
    }

    if (res.rows[0].status === 'FINALIZADA') {
      throw new Error('Não é possível excluir uma pré-venda que já foi finalizada no Caixa.');
    }

    await client.query(
      `DELETE FROM pre_venda_itens WHERE pre_venda_id = $1 AND empresa_id = $2;`,
      [preVendaId, tenant.empresaId]
    );

    await client.query(
      `DELETE FROM pre_vendas WHERE id = $1 AND empresa_id = $2 AND filial_id = $3;`,
      [preVendaId, tenant.empresaId, tenant.filialId]
    );
  }

  /**
   * Finaliza a Pré-venda no Caixa ao concluir a venda.
   * Chamado internamente dentro da transação da Venda.
   */
  static async finalizarPreVendaNoCaixa(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    preVendaId: string,
    vendaId: string,
    caixaOperadorId: string,
  ): Promise<void> {
    const res = await client.query<{ status: string }>(
      `SELECT status FROM pre_vendas WHERE id = $1 AND empresa_id = $2 FOR UPDATE`,
      [preVendaId, tenant.empresaId]
    );

    if (res.rowCount === 0 || !res.rows[0]) {
      throw new Error('Pré-venda vinculada não encontrada.');
    }

    if (res.rows[0].status === 'FINALIZADA') {
      throw new Error('Esta comanda já foi finalizada anteriormente no Caixa.');
    }

    if (res.rows[0].status === 'CANCELADA') {
      throw new Error('Esta comanda foi cancelada e não pode ser finalizada.');
    }

    await client.query(
      `
      UPDATE pre_vendas 
      SET status = 'FINALIZADA',
          venda_id = $1,
          caixa_operador_id = $2,
          finalizado_em = NOW(),
          atualizado_em = NOW()
      WHERE id = $3 AND empresa_id = $4;
    `,
      [vendaId, caixaOperadorId, preVendaId, tenant.empresaId]
    );
  }

  /**
   * Atualização de Pré-Venda existente no Balcão de Atendimento.
   * Preserva rigorosamente o código de comanda original (ex: PV-000157),
   * atualiza itens, subtotais e totais, sem alterar Caixa nem movimentar estoque definitivo.
   */
  static async atualizarPreVenda(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    preVendaId: string,
    dto: CriarPreVendaDTO,
  ): Promise<PreVenda> {
    if (!dto.itens || dto.itens.length === 0) {
      throw new Error('A pré-venda deve conter pelo menos um produto selecionado.');
    }

    const filialId = dto.filialId || tenant.filialId;

    // Verificar se existe a pré-venda e se pode ser editada
    const resExistente = await client.query<{
      id: string;
      codigo_comanda: string;
      status: string;
      criado_em: string;
      atendente_id: string;
      identificacao_balcao: string;
    }>(
      `
      SELECT id, codigo_comanda, status, criado_em, atendente_id, identificacao_balcao
      FROM pre_vendas
      WHERE id = $1 AND empresa_id = $2 AND filial_id = $3
      FOR UPDATE;
    `,
      [preVendaId, tenant.empresaId, filialId]
    );

    if (resExistente.rowCount === 0 || !resExistente.rows[0]) {
      throw new Error('Pré-venda não encontrada para atualização.');
    }

    const preVendaAtual = resExistente.rows[0]!;

    if (preVendaAtual.status === 'FINALIZADA') {
      throw new Error('Não é possível editar uma pré-venda que já foi finalizada no Caixa.');
    }

    if (preVendaAtual.status === 'CANCELADA') {
      throw new Error('Não é possível editar uma pré-venda cancelada.');
    }

    // Calcular valores dos itens
    let subtotalCentavos = 0;
    let descontoItensCentavos = 0;

    const itensProcessados: Array<{
      produtoId: string;
      loteId?: string;
      numeroItem: number;
      codigoBarras: string;
      nomeProduto: string;
      apresentacao: string;
      quantidade: number;
      precoUnitarioCentavos: number;
      descontoUnitarioCentavos: number;
      totalItemCentavos: number;
      exigeReceita: boolean;
      classificacaoReceita: string;
    }> = [];

    for (let i = 0; i < dto.itens.length; i++) {
      const item = dto.itens[i]!;
      if (item.quantidade <= 0) {
        throw new Error(`Quantidade inválida para o item #${i + 1}: deve ser maior que zero.`);
      }

      const resProd = await client.query<{
        id: string;
        nome_comercial: string;
        apresentacao: string;
        preco_venda_centavos: string | number;
        classificacao_receita: string | null;
        codigo_barras: string | null;
      }>(
        `
        SELECT 
          p.id,
          p.nome_comercial,
          p.apresentacao,
          COALESCE(pf.preco_venda_centavos, 0) AS preco_venda_centavos,
          mdf.classificacao_receita,
          pcb.codigo_barras
        FROM produtos p
        LEFT JOIN produtos_filiais pf ON pf.produto_id = p.id AND pf.filial_id = $2
        LEFT JOIN medicamentos_dados_farmaceuticos mdf ON mdf.produto_id = p.id
        LEFT JOIN (
          SELECT DISTINCT ON (produto_id) produto_id, codigo_barras 
          FROM produtos_codigos_barras 
          ORDER BY produto_id, e_principal DESC
        ) pcb ON pcb.produto_id = p.id
        WHERE p.id = $1 AND p.empresa_id = $3
      `,
        [item.produtoId, filialId, tenant.empresaId]
      );

      const prod = resProd.rows[0];
      if (!prod) {
        throw new Error(`Produto #${item.produtoId} não encontrado para a empresa.`);
      }

      const precoUnit = item.precoUnitarioCentavos ?? Number(prod.preco_venda_centavos);
      const descUnit = item.descontoUnitarioCentavos ?? 0;
      const totalItem = Math.max(0, (precoUnit * item.quantidade) - (descUnit * item.quantidade));

      subtotalCentavos += precoUnit * item.quantidade;
      descontoItensCentavos += descUnit * item.quantidade;

      itensProcessados.push({
        produtoId: item.produtoId,
        loteId: item.loteId,
        numeroItem: i + 1,
        codigoBarras: prod.codigo_barras || '',
        nomeProduto: prod.nome_comercial,
        apresentacao: prod.apresentacao,
        quantidade: item.quantidade,
        precoUnitarioCentavos: precoUnit,
        descontoUnitarioCentavos: descUnit,
        totalItemCentavos: totalItem,
        exigeReceita: (prod.classificacao_receita || '').includes('RECEITA') || (prod.classificacao_receita || '').includes('CONTROLADO'),
        classificacaoReceita: prod.classificacao_receita || 'ISENTO',
      });
    }

    const descontoGlobal = dto.descontoGlobalCentavos || dto.descontoCentavos || 0;
    const totalDesconto = Math.min(subtotalCentavos, descontoItensCentavos + descontoGlobal);
    const totalCentavos = Math.max(0, subtotalCentavos - totalDesconto);

    // 1. Atualizar registro pai (pre_vendas) PRESERVANDO rigorosamente codigo_comanda e criado_em
    await client.query(
      `
      UPDATE pre_vendas
      SET cliente_id = $1,
          cliente_nome = $2,
          cliente_cpf = $3,
          subtotal_centavos = $4,
          desconto_centavos = $5,
          total_centavos = $6,
          observacoes = $7,
          status = 'PENDENTE',
          atualizado_em = NOW()
      WHERE id = $8 AND empresa_id = $9 AND filial_id = $10;
    `,
      [
        dto.clienteId || null,
        dto.clienteNome || null,
        dto.clienteCpf || null,
        subtotalCentavos,
        totalDesconto,
        totalCentavos,
        dto.observacoes || null,
        preVendaId,
        tenant.empresaId,
        filialId,
      ]
    );

    // 2. Limpar itens antigos e reinserir itens atualizados
    await client.query(
      `DELETE FROM pre_venda_itens WHERE pre_venda_id = $1 AND empresa_id = $2;`,
      [preVendaId, tenant.empresaId]
    );

    const itensRetorno: PreVendaItem[] = [];

    for (const it of itensProcessados) {
      const resItem = await client.query<{ id: string; criado_em: string }>(
        `
        INSERT INTO pre_venda_itens (
          empresa_id,
          filial_id,
          pre_venda_id,
          produto_id,
          lote_id,
          numero_item,
          codigo_barras,
          nome_produto,
          apresentacao,
          quantidade,
          preco_unitario_centavos,
          desconto_unitario_centavos,
          total_item_centavos,
          exige_receita,
          classificacao_receita
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING id, criado_em;
      `,
        [
          tenant.empresaId,
          filialId,
          preVendaId,
          it.produtoId,
          it.loteId || null,
          it.numeroItem,
          it.codigoBarras,
          it.nomeProduto,
          it.apresentacao,
          it.quantidade,
          it.precoUnitarioCentavos,
          it.descontoUnitarioCentavos,
          it.totalItemCentavos,
          it.exigeReceita,
          it.classificacaoReceita,
        ]
      );

      itensRetorno.push({
        id: resItem.rows[0]!.id,
        empresaId: tenant.empresaId,
        filialId,
        preVendaId,
        produtoId: it.produtoId,
        loteId: it.loteId,
        numeroItem: it.numeroItem,
        codigoBarras: it.codigoBarras,
        nomeProduto: it.nomeProduto,
        apresentacao: it.apresentacao,
        quantidade: it.quantidade,
        precoUnitarioCentavos: it.precoUnitarioCentavos,
        descontoUnitarioCentavos: it.descontoUnitarioCentavos,
        totalItemCentavos: it.totalItemCentavos,
        exigeReceita: it.exigeReceita,
        classificacaoReceita: it.classificacaoReceita,
        criadoEm: resItem.rows[0]!.criado_em,
      });
    }

    return {
      id: preVendaId,
      empresaId: tenant.empresaId,
      filialId: filialId || '',
      codigoComanda: preVendaAtual.codigo_comanda, // Rigorosamente preservado
      atendenteId: preVendaAtual.atendente_id,
      identificacaoBalcao: preVendaAtual.identificacao_balcao,
      clienteId: dto.clienteId,
      clienteNome: dto.clienteNome,
      clienteCpf: dto.clienteCpf,
      subtotalCentavos,
      descontoCentavos: totalDesconto,
      totalCentavos,
      status: 'PENDENTE',
      validadeMinutos: 120,
      observacoes: dto.observacoes,
      criadoEm: preVendaAtual.criado_em,
      atualizadoEm: new Date().toISOString(),
      itens: itensRetorno,
    };
  }
}
