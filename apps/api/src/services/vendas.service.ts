import pg from 'pg';
import {
  CancelarVendaDTO,
  ContextoTenant,
  CriarVendaDTO,
  ItemVenda,
  PagamentoVenda,
  Venda,
  Voucher,
} from '@farmapro/shared';
import { PreVendaService } from './prevenda.service.js';

export interface ProdutoPesquisaVenda {
  id: string;
  codigoBarras: string;
  nomeComercial: string;
  apresentacao: string;
  fabricante: string;
  tipoProduto: string;
  classificacaoReceita: string;
  precoVendaCentavos: number;
  estoqueDisponivel: number;
  loteId?: string;
  numeroLote?: string;
  dataValidade?: string;
  statusLote?: string;
  loteVencido: boolean;
  loteBloqueado: boolean;
}

export class VendasService {
  /**
   * Pesquisa produtos disponíveis para venda no balcão (PDV).
   * Filtra lotes vencidos e bloqueados, garantindo conformidade sanitária.
   */
  static async pesquisarProdutos(
    client: pg.PoolClient | pg.Pool,
    params: {
      empresaId: string;
      filialId: string;
      termoBusca: string;
    },
  ): Promise<ProdutoPesquisaVenda[]> {
    const termo = params.termoBusca.trim();
    if (!termo) {
      return [];
    }

    const termoLike = `%${termo}%`;

    const sql = `
      SELECT 
        p.id AS produto_id,
        COALESCE(pcb.codigo_barras, '') AS codigo_barras,
        p.nome_comercial,
        p.apresentacao,
        p.fabricante,
        p.tipo_produto,
        COALESCE(mdf.classificacao_receita, 'ISENTO') AS classificacao_receita,
        COALESCE(pf.preco_venda_centavos, 0) AS preco_venda_centavos,
        COALESCE(es.quantidade_disponivel, 0) AS estoque_disponivel,
        l.id AS lote_id,
        l.numero_lote,
        l.data_validade,
        l.status AS status_lote,
        (l.data_validade <= CURRENT_DATE) AS lote_vencido,
        (l.status = 'BLOQUEADO') AS lote_bloqueado
      FROM produtos p
      LEFT JOIN produtos_filiais pf ON pf.produto_id = p.id AND pf.filial_id = $2
      LEFT JOIN estoque_saldos es ON es.produto_id = p.id AND es.filial_id = $2
      LEFT JOIN (
        SELECT DISTINCT ON (produto_id) produto_id, codigo_barras 
        FROM produtos_codigos_barras 
        ORDER BY produto_id, e_principal DESC
      ) pcb ON pcb.produto_id = p.id
      LEFT JOIN medicamentos_dados_farmaceuticos mdf ON mdf.produto_id = p.id
      LEFT JOIN LATERAL (
        SELECT id, numero_lote, data_validade, status
        FROM lotes
        WHERE produto_id = p.id AND filial_id = $2 AND status = 'ATIVO' AND data_validade > CURRENT_DATE
        ORDER BY data_validade ASC
        LIMIT 1
      ) l ON true
      WHERE p.empresa_id = $1
        AND (
          p.nome_comercial ILIKE $3
          OR p.nome_generico ILIKE $3
          OR pcb.codigo_barras = $4
          OR p.id::text = $4
        )
      ORDER BY p.nome_comercial ASC
      LIMIT 25;
    `;

    const res = await client.query<{
      produto_id: string;
      codigo_barras: string;
      nome_comercial: string;
      apresentacao: string;
      fabricante: string;
      tipo_produto: string;
      classificacao_receita: string;
      preco_venda_centavos: string;
      estoque_disponivel: string;
      lote_id?: string;
      numero_lote?: string;
      data_validade?: string;
      status_lote?: string;
      lote_vencido?: boolean;
      lote_bloqueado?: boolean;
    }>(sql, [params.empresaId, params.filialId, termoLike, termo]);

    return res.rows.map(r => ({
      id: r.produto_id,
      codigoBarras: r.codigo_barras,
      nomeComercial: r.nome_comercial,
      apresentacao: r.apresentacao,
      fabricante: r.fabricante,
      tipoProduto: r.tipo_produto,
      classificacaoReceita: r.classificacao_receita,
      precoVendaCentavos: Number(r.preco_venda_centavos),
      estoqueDisponivel: Number(r.estoque_disponivel),
      loteId: r.lote_id || undefined,
      numeroLote: r.numero_lote || undefined,
      dataValidade: r.data_validade || undefined,
      statusLote: r.status_lote || undefined,
      loteVencido: !!r.lote_vencido,
      loteBloqueado: !!r.lote_bloqueado,
    }));
  }

  /**
   * Finaliza uma venda no PDV de forma atômica e com bloqueio pessimista (FOR UPDATE).
   */
  static async criarVenda(
    client: pg.PoolClient | pg.Pool,
    dados: CriarVendaDTO,
    tenant: ContextoTenant,
    operadorId: string,
  ): Promise<Venda> {
    const filialId = dados.filialId || tenant.filialId;

    if (!dados.itens || dados.itens.length === 0) {
      throw new Error('A venda deve conter pelo menos um item.');
    }

    if (!dados.pagamentos || dados.pagamentos.length === 0) {
      throw new Error('Informe ao menos uma forma de pagamento para finalizar a venda.');
    }

    // 1. Validar que a sessão de caixa informada está ABERTA
    const resCaixa = await client.query<{ id: string; status: string; dispositivo_id: string }>(
      `SELECT id, status, dispositivo_id FROM caixas_sessoes 
       WHERE id = $1 AND empresa_id = $2 AND filial_id = $3
       FOR UPDATE`,
      [dados.caixaSessaoId, tenant.empresaId, filialId],
    );

    if (resCaixa.rows.length === 0) {
      throw new Error('Sessão de caixa informada não encontrada para esta filial.');
    }

    if (resCaixa.rows[0]?.status !== 'ABERTO') {
      throw new Error(`A sessão de caixa está ${resCaixa.rows[0]?.status}. Venda não autorizada.`);
    }

    const dispositivoId = dados.dispositivoId || resCaixa.rows[0]?.dispositivo_id || '';

    // 2. Calcular subtotal dos itens e validar estoques com bloqueio pessimista
    let subtotalCentavos = 0;
    let descontoItensCentavos = 0;

    interface ItemProcessado {
      produtoId: string;
      loteId?: string;
      codigoBarras: string;
      nomeProduto: string;
      apresentacao: string;
      quantidade: number;
      precoUnitarioCentavos: number;
      descontoCentavos: number;
      totalItemCentavos: number;
      exigeReceita: boolean;
    }

    const itensProcessados: ItemProcessado[] = [];

    for (let i = 0; i < dados.itens.length; i++) {
      const itemInput = dados.itens[i]!;

      if (itemInput.quantidade <= 0) {
        throw new Error(`Quantidade inválida para o item #${i + 1}.`);
      }

      if (itemInput.precoUnitarioCentavos < 0) {
        throw new Error(`Preço unitário inválido para o item #${i + 1}.`);
      }

      // Bloqueio pessimista no saldo consolidado de estoque
      const resSaldo = await client.query<{
        quantidade_fisica: string;
        quantidade_disponivel: string;
      }>(
        `SELECT quantidade_fisica, quantidade_disponivel 
         FROM estoque_saldos 
         WHERE filial_id = $1 AND produto_id = $2 
         FOR UPDATE`,
        [filialId, itemInput.produtoId],
      );

      if (resSaldo.rows.length === 0) {
        throw new Error(`Produto não cadastrado no estoque da filial (Produto ID: ${itemInput.produtoId}).`);
      }

      const saldoDisponivel = Number(resSaldo.rows[0]?.quantidade_disponivel || 0);
      if (saldoDisponivel < itemInput.quantidade) {
        throw new Error(
          `Estoque insuficiente para o produto. Disponível: ${saldoDisponivel}, Solicitado: ${itemInput.quantidade}.`,
        );
      }

      // Obter detalhes do produto e código de barras
      const resProd = await client.query<{
        nome_comercial: string;
        apresentacao: string;
        exige_receita: boolean;
        codigo_barras: string;
      }>(
        `SELECT 
          p.nome_comercial, 
          p.apresentacao,
          (mdf.classificacao_receita IS NOT NULL AND mdf.classificacao_receita != 'ISENTO') AS exige_receita,
          COALESCE(pcb.codigo_barras, '') AS codigo_barras
         FROM produtos p
         LEFT JOIN medicamentos_dados_farmaceuticos mdf ON mdf.produto_id = p.id
         LEFT JOIN produtos_codigos_barras pcb ON pcb.produto_id = p.id AND pcb.e_principal = true
         WHERE p.id = $1`,
        [itemInput.produtoId],
      );

      const prodInfo = resProd.rows[0];
      const nomeProduto = prodInfo?.nome_comercial || 'Produto sem nome';
      const apresentacao = prodInfo?.apresentacao || '';
      const codigoBarras = prodInfo?.codigo_barras || '';
      const exigeReceita = !!prodInfo?.exige_receita;

      // Validação rigorosa de Lotes (Vencimento e Bloqueio)
      let loteFinalId = itemInput.loteId;

      if (loteFinalId) {
        const resLote = await client.query<{
          id: string;
          numero_lote: string;
          data_validade: string | Date;
          status: string;
          quantidade_disponivel: string;
        }>(
          `SELECT id, numero_lote, data_validade, status, quantidade_disponivel 
           FROM lotes 
           WHERE id = $1 AND filial_id = $2 
           FOR UPDATE`,
          [loteFinalId, filialId],
        );

        if (resLote.rows.length === 0) {
          throw new Error(`Lote especificado não encontrado para o produto "${nomeProduto}".`);
        }

        const lote = resLote.rows[0]!;

        // 1. Bloqueio por Lote Vencido
        const dataValidade = new Date(lote.data_validade);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const dataValidadeFormatada =
          lote.data_validade instanceof Date
            ? lote.data_validade.toISOString().substring(0, 10)
            : String(lote.data_validade).substring(0, 10);

        if (dataValidade <= hoje || lote.status === 'VENCIDO') {
          throw new Error(
            `Venda bloqueada: O lote "${lote.numero_lote}" do produto "${nomeProduto}" está VENCIDO (Validade: ${dataValidadeFormatada}). A comercialização é estritamente proibida pela legislação sanitária da ANVISA.`,
          );
        }

        // 2. Bloqueio por Lote Interditado/Bloqueado
        if (lote.status === 'BLOQUEADO' || lote.status === 'QUARENTENA') {
          throw new Error(
            `Venda bloqueada: O lote "${lote.numero_lote}" do produto "${nomeProduto}" está com status ${lote.status}.`,
          );
        }

        // 3. Saldo do Lote
        if (Number(lote.quantidade_disponivel) < itemInput.quantidade) {
          throw new Error(
            `Estoque insuficiente no lote "${lote.numero_lote}". Disponível: ${lote.quantidade_disponivel}, Solicitado: ${itemInput.quantidade}.`,
          );
        }
      } else {
        // Alocação FEFO automática: busca lote ativo mais antigo não vencido com estoque suficiente
        const resLoteFefo = await client.query<{
          id: string;
          numero_lote: string;
          quantidade_disponivel: string;
        }>(
          `SELECT id, numero_lote, quantidade_disponivel 
           FROM lotes 
           WHERE filial_id = $1 AND produto_id = $2 
             AND status = 'ATIVO' 
             AND data_validade > CURRENT_DATE 
             AND quantidade_disponivel >= $3
           ORDER BY data_validade ASC 
           LIMIT 1 
           FOR UPDATE`,
          [filialId, itemInput.produtoId, itemInput.quantidade],
        );

        if (resLoteFefo.rows.length > 0) {
          loteFinalId = resLoteFefo.rows[0]?.id;
        }
      }

      const precoUnit = itemInput.precoUnitarioCentavos;
      const descItem = itemInput.descontoCentavos || 0;
      const subtotalItem = Math.round(itemInput.quantidade * precoUnit);
      const totalItem = Math.max(0, subtotalItem - descItem);

      subtotalCentavos += subtotalItem;
      descontoItensCentavos += descItem;

      itensProcessados.push({
        produtoId: itemInput.produtoId,
        loteId: loteFinalId,
        codigoBarras,
        nomeProduto,
        apresentacao,
        quantidade: itemInput.quantidade,
        precoUnitarioCentavos: precoUnit,
        descontoCentavos: descItem,
        totalItemCentavos: totalItem,
        exigeReceita,
      });
    }

    const descontoGlobal = dados.descontoTotalCentavos || 0;
    const descontoTotal = descontoItensCentavos + descontoGlobal;
    const totalVendaCentavos = Math.max(0, subtotalCentavos - descontoTotal);

    // 3. Validar Pagamentos e Regras de Vouchers
    let totalPagoCentavos = 0;
    let totalDinheiroCentavos = 0;
    const vouchersResgatados: { voucherId: string; valorCentavos: number }[] = [];

    for (const pag of dados.pagamentos) {
      if (pag.valorCentavos <= 0) {
        throw new Error('O valor de cada pagamento deve ser maior que zero.');
      }

      // Proibição explícita de Crediário Próprio
      if ((pag.formaPagamento as string) === 'CREDIARIO' || (pag.formaPagamento as string) === 'CARTEIRA_CREDITO') {
        throw new Error('Operação de crediário próprio ou carteira de crédito não é suportada no FarmaPro.');
      }

      if (pag.formaPagamento === 'DINHEIRO') {
        totalDinheiroCentavos += pag.valorCentavos;
      }

      // Regras de Negócio e Integridade de VOUCHER
      if (pag.formaPagamento === 'VOUCHER') {
        const voucherIdentificador = pag.voucherId || pag.codigoVoucher;
        if (!voucherIdentificador) {
          throw new Error('Identificação ou código do voucher não informado no pagamento.');
        }

        // Bloqueio pessimista do Voucher no banco
        const resVoucher = await client.query<{
          id: string;
          empresa_id: string;
          valor_centavos: string;
          status: string;
          codigo: string;
        }>(
          `SELECT id, empresa_id, valor_centavos, status, codigo 
           FROM vouchers 
           WHERE (id::text = $1 OR codigo = $1) AND empresa_id = $2 
           FOR UPDATE`,
          [voucherIdentificador, tenant.empresaId],
        );

        if (resVoucher.rows.length === 0) {
          throw new Error(
            'Voucher não encontrado ou pertencente a outra empresa farmácia (Isolamento multiempresa violado).',
          );
        }

        const voucher = resVoucher.rows[0]!;
        const valorVoucher = Number(voucher.valor_centavos);

        if (voucher.status !== 'DISPONIVEL') {
          throw new Error(
            `O voucher "${voucher.codigo}" não está disponível para resgate. Situação atual: ${voucher.status}.`,
          );
        }

        // Regra mandatória: O voucher deve ser resgatado 100% integralmente
        // Se a venda for menor que o valor do voucher, a operação DEVE ser bloqueada
        if (totalVendaCentavos < valorVoucher) {
          throw new Error(
            `O valor total da compra (R$ ${(totalVendaCentavos / 100).toFixed(2)}) é inferior ao valor do voucher (R$ ${(valorVoucher / 100).toFixed(2)}). O voucher deve ser utilizado integralmente em uma única operação. Não é permitida utilização parcial nem devolução de troco.`,
          );
        }

        if (pag.valorCentavos !== valorVoucher) {
          throw new Error(
            `O valor de resgate do voucher deve ser estritamente de R$ ${(valorVoucher / 100).toFixed(2)} (uso 100% integral).`,
          );
        }

        vouchersResgatados.push({
          voucherId: voucher.id,
          valorCentavos: valorVoucher,
        });
      }

      totalPagoCentavos += pag.valorCentavos;
    }

    // 4. Validação de Troco e Conferência Financeira
    const trocoCentavos = dados.trocoCentavos || 0;

    if (trocoCentavos > 0) {
      if (totalDinheiroCentavos === 0) {
        throw new Error('Troco só pode ser gerado em operações com pagamento em dinheiro em espécie.');
      }

      if (trocoCentavos > totalDinheiroCentavos) {
        throw new Error('O valor do troco não pode ser maior que o valor recebido em dinheiro.');
      }
    }

    const valorLiquidoRecebido = totalPagoCentavos - trocoCentavos;
    if (valorLiquidoRecebido !== totalVendaCentavos) {
      throw new Error(
        `A soma dos pagamentos líquidos (R$ ${(valorLiquidoRecebido / 100).toFixed(2)}) não confere com o total da venda (R$ ${(totalVendaCentavos / 100).toFixed(2)}).`,
      );
    }

    // 5. Inserir Registro Central de Venda
    const numeroCupom = `${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const serieTerminal = 'PDV-01';

    const resVenda = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      caixa_sessao_id: string;
      dispositivo_id: string;
      numero_cupom_sequencial: string;
      serie_terminal: string;
      operador_id: string;
      cliente_id?: string;
      subtotal_centavos: string;
      desconto_centavos: string;
      total_centavos: string;
      troco_centavos: string;
      status: 'CONCLUIDA';
      data_hora_emissao: string;
      observacoes?: string;
    }>(
      `INSERT INTO vendas (
        empresa_id, filial_id, caixa_sessao_id, dispositivo_id,
        operador_id, cliente_id, numero_cupom_sequencial, serie_terminal,
        subtotal_centavos, desconto_centavos, total_centavos, troco_centavos,
        status, data_hora_emissao, observacoes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'CONCLUIDA', NOW(), $13)
      RETURNING *`,
      [
        tenant.empresaId,
        filialId,
        dados.caixaSessaoId,
        dispositivoId,
        operadorId,
        dados.clienteId || null,
        numeroCupom,
        serieTerminal,
        subtotalCentavos,
        descontoTotal,
        totalVendaCentavos,
        trocoCentavos,
        dados.observacoes || null,
      ],
    );

    const vendaSalva = resVenda.rows[0]!;
    const vendaId = vendaSalva.id;

    // 6. Inserir Itens da Venda e Baixar Estoque
    const itensRetorno: ItemVenda[] = [];

    for (let idx = 0; idx < itensProcessados.length; idx++) {
      const item = itensProcessados[idx]!;

      // Inserir venda_item
      const resItem = await client.query<{ id: string }>(
        `INSERT INTO venda_itens (
          empresa_id, filial_id, venda_id, produto_id, lote_id, numero_item,
          quantidade, preco_unitario_centavos, desconto_unitario_centavos,
          total_item_centavos, exige_receita
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          tenant.empresaId,
          filialId,
          vendaId,
          item.produtoId,
          item.loteId || null,
          idx + 1,
          item.quantidade,
          item.precoUnitarioCentavos,
          item.descontoCentavos,
          item.totalItemCentavos,
          item.exigeReceita,
        ],
      );

      // Baixar estoque consolidado
      const resAtualizaEstoque = await client.query<{
        quantidade_fisica: string;
        quantidade_disponivel: string;
      }>(
        `UPDATE estoque_saldos 
         SET quantidade_fisica = quantidade_fisica - $1, atualizado_em = NOW() 
         WHERE filial_id = $2 AND produto_id = $3
         RETURNING quantidade_fisica, quantidade_disponivel`,
        [item.quantidade, filialId, item.produtoId],
      );

      const saldoPosterior = Number(resAtualizaEstoque.rows[0]?.quantidade_fisica || 0);
      const saldoAnterior = saldoPosterior + item.quantidade;

      // Se havia lote, baixar quantidade disponível do lote
      if (item.loteId) {
        await client.query(
          `UPDATE lotes 
           SET quantidade_disponivel = quantidade_disponivel - $1, atualizado_em = NOW() 
           WHERE id = $2`,
          [item.quantidade, item.loteId],
        );
      }

      // Inserir registro contábil no livro-razão (estoque_movimentacoes)
      await client.query(
        `INSERT INTO estoque_movimentacoes (
          empresa_id, filial_id, produto_id, lote_id, tipo_movimentacao,
          quantidade, custo_unitario_centavos, saldo_anterior, saldo_posterior,
          origem_documento_tipo, origem_documento_id, usuario_id, motivo
        ) VALUES ($1, $2, $3, $4, 'SAIDA_VENDA_PDV', $5, $6, $7, $8, 'VENDA', $9, $10, 'Venda Balcão PDV')`,
        [
          tenant.empresaId,
          filialId,
          item.produtoId,
          item.loteId || null,
          -item.quantidade,
          item.precoUnitarioCentavos,
          saldoAnterior,
          saldoPosterior,
          vendaId,
          operadorId,
        ],
      );

      itensRetorno.push({
        id: resItem.rows[0]!.id,
        produtoId: item.produtoId,
        loteId: item.loteId,
        codigoBarras: item.codigoBarras,
        nomeProduto: item.nomeProduto,
        apresentacao: item.apresentacao,
        quantidade: item.quantidade,
        precoUnitarioCentavos: item.precoUnitarioCentavos,
        descontoCentavos: item.descontoCentavos,
        subtotalCentavos: item.totalItemCentavos,
        exigeReceita: item.exigeReceita,
      });
    }

    // 7. Inserir Formas de Pagamento e Efetivar Baixa de Vouchers
    const pagamentosRetorno: PagamentoVenda[] = [];

    for (const pag of dados.pagamentos) {
      let voucherIdVinculado = pag.voucherId;

      if (pag.formaPagamento === 'VOUCHER') {
        const vInfo = vouchersResgatados.find(v => v.valorCentavos === pag.valorCentavos);
        if (vInfo) {
          voucherIdVinculado = vInfo.voucherId;

          // Atualizar o status do Voucher para UTILIZADO
          await client.query(
            `UPDATE vouchers SET 
              status = 'UTILIZADO',
              utilizado_em = NOW(),
              utilizado_por_id = $1,
              filial_resgate_id = $2,
              venda_resgate_id = $3
             WHERE id = $4`,
            [operadorId, filialId, vendaId, vInfo.voucherId],
          );

          // Inserir histórico de auditoria do voucher
          await client.query(
            `INSERT INTO vouchers_historico (
              empresa_id, filial_id, voucher_id, operacao,
              status_anterior, status_novo, venda_id, operador_id, justificativa
            ) VALUES ($1, $2, $3, 'RESGATE_UTILIZACAO', 'DISPONIVEL', 'UTILIZADO', $4, $5, 'Resgate integral em venda no PDV')`,
            [tenant.empresaId, filialId, vInfo.voucherId, vendaId, operadorId],
          );
        }
      }

      const resPag = await client.query<{ id: string }>(
        `INSERT INTO venda_pagamentos (
          empresa_id, filial_id, venda_id, forma_pagamento, valor_centavos,
          parcelas, bandeira_cartao, autorizacao_tef_nsu, voucher_id, detalhes_transacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          tenant.empresaId,
          filialId,
          vendaId,
          pag.formaPagamento,
          pag.valorCentavos,
          pag.parcelas || 1,
          pag.bandeiraCartao || null,
          pag.autorizacaoTefNsu || null,
          voucherIdVinculado || null,
          JSON.stringify(pag.detalhes || {}),
        ],
      );

      pagamentosRetorno.push({
        id: resPag.rows[0]!.id,
        formaPagamento: pag.formaPagamento,
        valorCentavos: pag.valorCentavos,
        parcelas: pag.parcelas || 1,
        bandeiraCartao: pag.bandeiraCartao,
        autorizacaoTefNsu: pag.autorizacaoTefNsu,
        voucherId: voucherIdVinculado,
        detalhes: pag.detalhes,
      });
    }

    // 8. Trilha de Auditoria Geral
    await client.query(
      `INSERT INTO auditoria_logs (
        empresa_id, filial_id, usuario_id, operacao, tabela_afetada, registro_afetado_id, dados_novos
      ) VALUES ($1, $2, $3, 'INSERT', 'vendas', $4, $5)`,
      [
        tenant.empresaId,
        filialId,
        operadorId,
        vendaId,
        JSON.stringify({
          acao: 'CONCLUSAO_VENDA',
          totalCentavos: totalVendaCentavos,
          numeroCupom,
          qtdItens: itensRetorno.length,
        }),
      ],
    );

    // Se a venda originou-se de uma comanda / pré-venda gerada no Balcão
    if (dados.preVendaId || dados.codigoComanda) {
      let targetPreVendaId = dados.preVendaId;
      if (!targetPreVendaId && dados.codigoComanda) {
        const resPv = await client.query<{ id: string }>(
          `SELECT id FROM pre_vendas WHERE empresa_id = $1 AND filial_id = $2 AND UPPER(codigo_comanda) = $3`,
          [tenant.empresaId, filialId, dados.codigoComanda.trim().toUpperCase()],
        );
        targetPreVendaId = resPv.rows[0]?.id;
      }

      if (targetPreVendaId) {
        await PreVendaService.finalizarPreVendaNoCaixa(
          client,
          tenant,
          targetPreVendaId,
          vendaId,
          operadorId,
        );
      }
    }

    return {
      id: vendaId,
      empresaId: vendaSalva.empresa_id,
      filialId: vendaSalva.filial_id,
      caixaSessaoId: vendaSalva.caixa_sessao_id,
      dispositivoId: vendaSalva.dispositivo_id,
      numeroCupom: vendaSalva.numero_cupom_sequencial,
      serieCaixa: vendaSalva.serie_terminal,
      operadorId: vendaSalva.operador_id,
      clienteId: vendaSalva.cliente_id || undefined,
      dataHora: vendaSalva.data_hora_emissao,
      itens: itensRetorno,
      pagamentos: pagamentosRetorno,
      subtotalCentavos: Number(vendaSalva.subtotal_centavos),
      descontoTotalCentavos: Number(vendaSalva.desconto_centavos),
      totalCentavos: Number(vendaSalva.total_centavos),
      trocoCentavos: Number(vendaSalva.troco_centavos),
      status: 'CONCLUIDA',
      sincronizadoComNuvem: true,
      observacoes: vendaSalva.observacoes || undefined,
    };
  }

  /**
   * Cancela uma venda autorizada com estorno de estoque, integridade financeira e opção de voucher.
   */
  static async cancelarVenda(
    client: pg.PoolClient | pg.Pool,
    dados: CancelarVendaDTO,
    tenant: ContextoTenant,
    operadorId: string,
  ): Promise<{ venda: Venda; voucherGerado?: Voucher }> {
    if (!dados.motivo || dados.motivo.trim().length < 5) {
      throw new Error('A justificativa detalhada para o cancelamento da venda é obrigatória.');
    }

    const autorizadorId = dados.autorizadorId || operadorId;

    // 1. Obter e bloquear a venda com FOR UPDATE
    const resVenda = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      caixa_sessao_id: string;
      dispositivo_id: string;
      operador_id: string;
      cliente_id?: string;
      numero_cupom_sequencial: string;
      serie_terminal: string;
      subtotal_centavos: string;
      desconto_centavos: string;
      total_centavos: string;
      troco_centavos: string;
      status: string;
      data_hora_emissao: string;
    }>(
      `SELECT * FROM vendas 
       WHERE id = $1 AND empresa_id = $2 
       FOR UPDATE`,
      [dados.vendaId, tenant.empresaId],
    );

    if (resVenda.rows.length === 0) {
      throw new Error('Venda não encontrada ou não pertencente a esta farmácia.');
    }

    const venda = resVenda.rows[0]!;

    // 2. Idempotência: Impedir cancelamento duplicado
    if (venda.status === 'CANCELADA') {
      throw new Error('Esta venda já se encontra cancelada.');
    }

    const totalVendaCentavos = Number(venda.total_centavos);

    // 3. Obter itens para estorno de estoque
    const resItens = await client.query<{
      id: string;
      produto_id: string;
      lote_id?: string;
      quantidade: string;
      preco_unitario_centavos: string;
    }>(
      `SELECT id, produto_id, lote_id, quantidade, preco_unitario_centavos 
       FROM venda_itens 
       WHERE venda_id = $1`,
      [venda.id],
    );

    for (const item of resItens.rows) {
      const qtd = Number(item.quantidade);

      // Incrementar estoque físico consolidado
      const resEstoque = await client.query<{
        quantidade_fisica: string;
      }>(
        `UPDATE estoque_saldos 
         SET quantidade_fisica = quantidade_fisica + $1, atualizado_em = NOW() 
         WHERE filial_id = $2 AND produto_id = $3
         RETURNING quantidade_fisica`,
        [qtd, venda.filial_id, item.produto_id],
      );

      const saldoPosterior = Number(resEstoque.rows[0]?.quantidade_fisica || 0);
      const saldoAnterior = saldoPosterior - qtd;

      // Se havia lote, devolver ao saldo disponível do lote
      if (item.lote_id) {
        await client.query(
          `UPDATE lotes 
           SET quantidade_disponivel = quantidade_disponivel + $1, atualizado_em = NOW() 
           WHERE id = $2`,
          [qtd, item.lote_id],
        );
      }

      // Registro de estorno no livro-razão de estoque
      await client.query(
        `INSERT INTO estoque_movimentacoes (
          empresa_id, filial_id, produto_id, lote_id, tipo_movimentacao,
          quantidade, custo_unitario_centavos, saldo_anterior, saldo_posterior,
          origem_documento_tipo, origem_documento_id, usuario_id, motivo
        ) VALUES ($1, $2, $3, $4, 'ESTORNO_CANCELAMENTO_VENDA', $5, $6, $7, $8, 'CANCELAMENTO_VENDA', $9, $10, $11)`,
        [
          tenant.empresaId,
          venda.filial_id,
          item.produto_id,
          item.lote_id || null,
          qtd,
          Number(item.preco_unitario_centavos),
          saldoAnterior,
          saldoPosterior,
          venda.id,
          operadorId,
          `Estorno cancelamento de venda: ${dados.motivo}`,
        ],
      );
    }

    // 4. Se a venda foi paga com Voucher, registrar o estorno da utilização do voucher
    const resVouchersPagos = await client.query<{ voucher_id: string }>(
      `SELECT voucher_id FROM venda_pagamentos 
       WHERE venda_id = $1 AND forma_pagamento = 'VOUCHER' AND voucher_id IS NOT NULL`,
      [venda.id],
    );

    for (const vRow of resVouchersPagos.rows) {
      await client.query(
        `INSERT INTO vouchers_historico (
          empresa_id, filial_id, voucher_id, operacao,
          status_anterior, status_novo, venda_id, operador_id, justificativa
        ) VALUES ($1, $2, $3, 'ESTORNO_VENDA_RESGATE', 'UTILIZADO', 'CANCELADO', $4, $5, $6)`,
        [
          tenant.empresaId,
          venda.filial_id,
          vRow.voucher_id,
          venda.id,
          operadorId,
          `Estorno da venda resgate: ${dados.motivo}`,
        ],
      );
    }

    // 5. Emissão de Novo Voucher no Cancelamento (opcional sob autorização)
    let voucherGerado: Voucher | undefined = undefined;

    if (dados.emitirVoucher && totalVendaCentavos > 0) {
      // Verificar se já não existe voucher emitido para esta venda (Constraint uq_voucher_venda_origem)
      const resVchExistente = await client.query(
        `SELECT id FROM vouchers WHERE venda_origem_id = $1`,
        [venda.id],
      );

      if (resVchExistente.rows.length > 0) {
        throw new Error(
          'Já existe um voucher emitido originado deste cancelamento de venda. Emissão duplicada bloqueada.',
        );
      }

      const ano = new Date().getFullYear();
      const codigoVoucher = `VCH-${ano}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const resNovoVoucher = await client.query<{
        id: string;
        empresa_id: string;
        filial_id: string;
        codigo: string;
        valor_centavos: string;
        cliente_id?: string;
        venda_origem_id: string;
        motivo_cancelamento_origem: string;
        status: 'DISPONIVEL';
        emitido_em: string;
        emitido_por_id: string;
        autorizado_por_id: string;
        criado_em: string;
        atualizado_em: string;
      }>(
        `INSERT INTO vouchers (
          empresa_id, filial_id, codigo, valor_centavos, cliente_id,
          venda_origem_id, motivo_cancelamento_origem, status,
          emitido_por_id, autorizado_por_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DISPONIVEL', $8, $9)
        RETURNING *`,
        [
          tenant.empresaId,
          venda.filial_id,
          codigoVoucher,
          totalVendaCentavos,
          venda.cliente_id || null,
          venda.id,
          dados.motivo,
          operadorId,
          autorizadorId,
        ],
      );

      const vCriado = resNovoVoucher.rows[0]!;

      // Trilha de auditoria do voucher
      await client.query(
        `INSERT INTO vouchers_historico (
          empresa_id, filial_id, voucher_id, operacao,
          status_anterior, status_novo, venda_id, operador_id, justificativa
        ) VALUES ($1, $2, $3, 'EMISSAO', NULL, 'DISPONIVEL', $4, $5, $6)`,
        [
          tenant.empresaId,
          venda.filial_id,
          vCriado.id,
          venda.id,
          operadorId,
          `Emissão autorizada de voucher no cancelamento da venda: ${dados.motivo}`,
        ],
      );

      // Trilha de auditoria geral da emissão do voucher
      await client.query(
        `INSERT INTO auditoria_logs (
          empresa_id, filial_id, usuario_id, operacao, tabela_afetada, registro_afetado_id, dados_novos
        ) VALUES ($1, $2, $3, 'EMISSAO_VOUCHER_CANCELAMENTO', 'vouchers', $4, $5)`,
        [
          tenant.empresaId,
          venda.filial_id,
          operadorId,
          vCriado.id,
          JSON.stringify({
            codigo: codigoVoucher,
            valorCentavos: totalVendaCentavos,
            vendaOrigemId: venda.id,
          }),
        ],
      );

      voucherGerado = {
        id: vCriado.id,
        empresaId: vCriado.empresa_id,
        filialId: vCriado.filial_id,
        codigo: vCriado.codigo,
        valorCentavos: Number(vCriado.valor_centavos),
        clienteId: vCriado.cliente_id || undefined,
        vendaOrigemId: vCriado.venda_origem_id,
        motivoCancelamentoOrigem: vCriado.motivo_cancelamento_origem,
        status: 'DISPONIVEL',
        emitidoEm: vCriado.emitido_em,
        emitidoPorId: vCriado.emitido_por_id,
        autorizadoPorId: vCriado.autorizado_por_id,
        criadoEm: vCriado.criado_em,
        atualizadoEm: vCriado.atualizado_em,
      };
    }

    // 6. Atualizar a Venda para status CANCELADA
    const resVendaAtualizada = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      caixa_sessao_id: string;
      dispositivo_id: string;
      operador_id: string;
      cliente_id?: string;
      numero_cupom_sequencial: string;
      serie_terminal: string;
      subtotal_centavos: string;
      desconto_centavos: string;
      total_centavos: string;
      troco_centavos: string;
      status: 'CANCELADA';
      data_hora_emissao: string;
      cancelado_por_id: string;
      motivo_cancelamento: string;
      cancelado_em: string;
      voucher_gerado_id?: string;
    }>(
      `UPDATE vendas SET
        status = 'CANCELADA',
        cancelado_por_id = $1,
        motivo_cancelamento = $2,
        cancelado_em = NOW(),
        voucher_gerado_id = $3,
        atualizado_em = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        autorizadorId,
        dados.motivo,
        voucherGerado ? voucherGerado.id : null,
        venda.id,
      ],
    );

    const vAtualizada = resVendaAtualizada.rows[0]!;

    // 7. Trilha de Auditoria Geral do Cancelamento
    await client.query(
      `INSERT INTO auditoria_logs (
        empresa_id, filial_id, usuario_id, operacao, tabela_afetada, registro_afetado_id, dados_novos
      ) VALUES ($1, $2, $3, 'CANCELAMENTO_VENDA_TOTAL', 'vendas', $4, $5)`,
      [
        tenant.empresaId,
        venda.filial_id,
        operadorId,
        venda.id,
        JSON.stringify({
          motivo: dados.motivo,
          autorizadoPorId: autorizadorId,
          totalCentavos: totalVendaCentavos,
          voucherGerado: voucherGerado?.codigo || null,
        }),
      ],
    );

    return {
      venda: {
        id: vAtualizada.id,
        empresaId: vAtualizada.empresa_id,
        filialId: vAtualizada.filial_id,
        caixaSessaoId: vAtualizada.caixa_sessao_id,
        dispositivoId: vAtualizada.dispositivo_id,
        numeroCupom: vAtualizada.numero_cupom_sequencial,
        serieCaixa: vAtualizada.serie_terminal,
        operadorId: vAtualizada.operador_id,
        clienteId: vAtualizada.cliente_id || undefined,
        dataHora: vAtualizada.data_hora_emissao,
        itens: [],
        pagamentos: [],
        subtotalCentavos: Number(vAtualizada.subtotal_centavos),
        descontoTotalCentavos: Number(vAtualizada.desconto_centavos),
        totalCentavos: Number(vAtualizada.total_centavos),
        trocoCentavos: Number(vAtualizada.troco_centavos),
        status: 'CANCELADA',
        sincronizadoComNuvem: true,
        canceladoPorId: vAtualizada.cancelado_por_id,
        motivoCancelamento: vAtualizada.motivo_cancelamento,
        canceladoEm: vAtualizada.cancelado_em,
        voucherGeradoId: vAtualizada.voucher_gerado_id || undefined,
      },
      voucherGerado,
    };
  }

  /**
   * Obtém detalhes de uma venda pelo ID com itens e pagamentos.
   */
  static async obterVendaPorId(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    vendaId: string,
  ): Promise<Venda | null> {
    const resVenda = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      caixa_sessao_id: string;
      dispositivo_id: string;
      numero_cupom_sequencial: string;
      serie_terminal: string;
      operador_id: string;
      cliente_id?: string;
      subtotal_centavos: string;
      desconto_centavos: string;
      total_centavos: string;
      troco_centavos: string;
      status: 'ABERTA' | 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA' | 'ESTORNADA';
      data_hora_emissao: string;
      cancelado_por_id?: string;
      motivo_cancelamento?: string;
      cancelado_em?: string;
      voucher_gerado_id?: string;
      observacoes?: string;
    }>(
      `SELECT * FROM vendas 
       WHERE id = $1 AND empresa_id = $2 AND filial_id = $3`,
      [vendaId, empresaId, filialId],
    );

    if (resVenda.rows.length === 0) {
      return null;
    }

    const row = resVenda.rows[0]!;

    // Itens
    const resItens = await client.query<{
      id: string;
      produto_id: string;
      lote_id?: string;
      nome_comercial: string;
      apresentacao: string;
      codigo_barras: string;
      quantidade: string;
      preco_unitario_centavos: string;
      desconto_unitario_centavos: string;
      total_item_centavos: string;
      exige_receita: boolean;
    }>(
      `SELECT 
        vi.id, vi.produto_id, vi.lote_id, p.nome_comercial, p.apresentacao,
        COALESCE(pcb.codigo_barras, '') AS codigo_barras,
        vi.quantidade, vi.preco_unitario_centavos, vi.desconto_unitario_centavos,
        vi.total_item_centavos, vi.exige_receita
       FROM venda_itens vi
       INNER JOIN produtos p ON p.id = vi.produto_id
       LEFT JOIN produtos_codigos_barras pcb ON pcb.produto_id = p.id AND pcb.e_principal = true
       WHERE vi.venda_id = $1`,
      [vendaId],
    );

    // Pagamentos
    const resPags = await client.query<{
      id: string;
      forma_pagamento: string;
      valor_centavos: string;
      parcelas: number;
      bandeira_cartao?: string;
      autorizacao_tef_nsu?: string;
      voucher_id?: string;
      detalhes_transacao?: Record<string, unknown>;
    }>(
      `SELECT * FROM venda_pagamentos WHERE venda_id = $1`,
      [vendaId],
    );

    return {
      id: row.id,
      empresaId: row.empresa_id,
      filialId: row.filial_id,
      caixaSessaoId: row.caixa_sessao_id,
      dispositivoId: row.dispositivo_id,
      numeroCupom: row.numero_cupom_sequencial,
      serieCaixa: row.serie_terminal,
      operadorId: row.operador_id,
      clienteId: row.cliente_id || undefined,
      dataHora: row.data_hora_emissao,
      itens: resItens.rows.map(it => ({
        id: it.id,
        produtoId: it.produto_id,
        loteId: it.lote_id || undefined,
        codigoBarras: it.codigo_barras,
        nomeProduto: it.nome_comercial,
        apresentacao: it.apresentacao,
        quantidade: Number(it.quantidade),
        precoUnitarioCentavos: Number(it.preco_unitario_centavos),
        descontoCentavos: Number(it.desconto_unitario_centavos),
        subtotalCentavos: Number(it.total_item_centavos),
        exigeReceita: it.exige_receita,
      })),
      pagamentos: resPags.rows.map(pgItem => ({
        id: pgItem.id,
        formaPagamento: pgItem.forma_pagamento as PagamentoVenda['formaPagamento'],
        valorCentavos: Number(pgItem.valor_centavos),
        parcelas: pgItem.parcelas,
        bandeiraCartao: pgItem.bandeira_cartao || undefined,
        autorizacaoTefNsu: pgItem.autorizacao_tef_nsu || undefined,
        voucherId: pgItem.voucher_id || undefined,
        detalhes: pgItem.detalhes_transacao || undefined,
      })),
      subtotalCentavos: Number(row.subtotal_centavos),
      descontoTotalCentavos: Number(row.desconto_centavos),
      totalCentavos: Number(row.total_centavos),
      trocoCentavos: Number(row.troco_centavos),
      status: row.status,
      sincronizadoComNuvem: true,
      canceladoPorId: row.cancelado_por_id || undefined,
      motivoCancelamento: row.motivo_cancelamento || undefined,
      canceladoEm: row.cancelado_em || undefined,
      voucherGeradoId: row.voucher_gerado_id || undefined,
      observacoes: row.observacoes || undefined,
    };
  }

  /**
   * Lista vendas da filial com suporte a filtros e ordenação por data.
   */
  static async listarVendas(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    filtros?: {
      status?: string;
      dataInicio?: string;
      dataFim?: string;
      limite?: number;
    },
  ): Promise<Venda[]> {
    const limite = filtros?.limite || 50;
    const condicoes = ['empresa_id = $1', 'filial_id = $2'];
    const params: unknown[] = [empresaId, filialId];

    if (filtros?.status) {
      params.push(filtros.status);
      condicoes.push(`status = $${params.length}`);
    }

    if (filtros?.dataInicio) {
      params.push(filtros.dataInicio);
      condicoes.push(`data_hora_emissao >= $${params.length}`);
    }

    if (filtros?.dataFim) {
      params.push(filtros.dataFim);
      condicoes.push(`data_hora_emissao <= $${params.length}`);
    }

    params.push(limite);
    const sql = `
      SELECT * FROM vendas 
      WHERE ${condicoes.join(' AND ')} 
      ORDER BY data_hora_emissao DESC 
      LIMIT $${params.length}
    `;

    const res = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      caixa_sessao_id: string;
      dispositivo_id: string;
      numero_cupom_sequencial: string;
      serie_terminal: string;
      operador_id: string;
      cliente_id?: string;
      subtotal_centavos: string;
      desconto_centavos: string;
      total_centavos: string;
      troco_centavos: string;
      status: 'ABERTA' | 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA' | 'ESTORNADA';
      data_hora_emissao: string;
      cancelado_por_id?: string;
      motivo_cancelamento?: string;
      cancelado_em?: string;
      voucher_gerado_id?: string;
      observacoes?: string;
    }>(sql, params);

    return res.rows.map(row => ({
      id: row.id,
      empresaId: row.empresa_id,
      filialId: row.filial_id,
      caixaSessaoId: row.caixa_sessao_id,
      dispositivoId: row.dispositivo_id,
      numeroCupom: row.numero_cupom_sequencial,
      serieCaixa: row.serie_terminal,
      operadorId: row.operador_id,
      clienteId: row.cliente_id || undefined,
      dataHora: row.data_hora_emissao,
      itens: [],
      pagamentos: [],
      subtotalCentavos: Number(row.subtotal_centavos),
      descontoTotalCentavos: Number(row.desconto_centavos),
      totalCentavos: Number(row.total_centavos),
      trocoCentavos: Number(row.troco_centavos),
      status: row.status,
      sincronizadoComNuvem: true,
      canceladoPorId: row.cancelado_por_id || undefined,
      motivoCancelamento: row.motivo_cancelamento || undefined,
      canceladoEm: row.cancelado_em || undefined,
      voucherGeradoId: row.voucher_gerado_id || undefined,
      observacoes: row.observacoes || undefined,
    }));
  }
}
