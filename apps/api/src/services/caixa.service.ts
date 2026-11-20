import pg from 'pg';
import {
  AbrirCaixaDTO,
  CaixaMovimentacao,
  CaixaSessao,
  ContextoTenant,
  FecharCaixaDTO,
  MovimentacaoCaixaDTO,
  ResumoCaixa,
  TrocarOperadorCaixaDTO,
} from '@farmapro/shared';

export class CaixaService {
  /**
   * Abre uma nova sessão de caixa no terminal/dispositivo da filial.
   */
  static async abrirCaixa(
    client: pg.PoolClient | pg.Pool,
    dados: AbrirCaixaDTO,
    tenant: ContextoTenant,
    usuarioId: string,
  ): Promise<CaixaSessao> {
    const filialId = dados.filialId || tenant.filialId;

    if (dados.saldoInicialCentavos < 0) {
      throw new Error('O saldo inicial de caixa não pode ser negativo.');
    }

    // 1. Verificar se o dispositivo já possui uma sessão aberta nesta filial
    const resAberto = await client.query<{ id: string }>(
      `SELECT id FROM caixas_sessoes 
       WHERE empresa_id = $1 AND filial_id = $2 AND dispositivo_id = $3 AND status = 'ABERTO' 
       LIMIT 1`,
      [tenant.empresaId, filialId, dados.dispositivoId],
    );

    if (resAberto.rows.length > 0) {
      throw new Error(
        `Já existe uma sessão de caixa aberta neste terminal (ID da Sessão: ${resAberto.rows[0]?.id}). Encerre-a antes de abrir um novo turno.`,
      );
    }

    // 2. Criar a sessão de caixa
    const resSessao = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      dispositivo_id: string;
      operador_abertura_id: string;
      operador_atual_id: string;
      saldo_inicial_centavos: string;
      status: 'ABERTO';
      aberto_em: string;
      observacoes?: string;
    }>(
      `INSERT INTO caixas_sessoes (
        empresa_id, filial_id, dispositivo_id, 
        operador_abertura_id, operador_atual_id, 
        saldo_inicial_centavos, status, aberto_em, observacoes
      ) VALUES ($1, $2, $3, $4, $4, $5, 'ABERTO', NOW(), $6)
      RETURNING *`,
      [
        tenant.empresaId,
        filialId,
        dados.dispositivoId,
        usuarioId,
        dados.saldoInicialCentavos,
        dados.observacoes || null,
      ],
    );

    const linha = resSessao.rows[0]!;

    // 3. Abrir a primeira sessão individual de operador (Handover audit)
    await client.query(
      `INSERT INTO caixas_operadores_sessoes (
        empresa_id, filial_id, caixa_sessao_id, usuario_id, assumido_em, status
      ) VALUES ($1, $2, $3, $4, NOW(), 'ABERTO')`,
      [tenant.empresaId, filialId, linha.id, usuarioId],
    );

    // 4. Registro na trilha de auditoria
    await client.query(
      `INSERT INTO auditoria_logs (
        empresa_id, filial_id, usuario_id, operacao, tabela_afetada, registro_afetado_id, dados_novos
      ) VALUES ($1, $2, $3, 'INSERT', 'caixas_sessoes', $4, $5)`,
      [
        tenant.empresaId,
        filialId,
        usuarioId,
        linha.id,
        JSON.stringify({
          acao: 'ABERTURA_CAIXA',
          saldoInicialCentavos: dados.saldoInicialCentavos,
          dispositivoId: dados.dispositivoId,
        }),
      ],
    );

    return {
      id: linha.id,
      empresaId: linha.empresa_id,
      filialId: linha.filial_id,
      dispositivoId: linha.dispositivo_id,
      operadorAberturaId: linha.operador_abertura_id,
      operadorAtualId: linha.operador_atual_id,
      saldoInicialCentavos: Number(linha.saldo_inicial_centavos),
      status: 'ABERTO',
      abertoEm: linha.aberto_em,
      observacoes: linha.observacoes || undefined,
    };
  }

  /**
   * Registra movimentação de dinheiro físico na gaveta (Suprimento ou Sangria).
   */
  static async registrarMovimentacao(
    client: pg.PoolClient | pg.Pool,
    dados: MovimentacaoCaixaDTO,
    tenant: ContextoTenant,
    usuarioId: string,
  ): Promise<CaixaMovimentacao> {
    if (dados.valorCentavos <= 0) {
      throw new Error('O valor da movimentação de caixa deve ser maior que zero.');
    }

    if (!dados.motivo || dados.motivo.trim().length < 3) {
      throw new Error('O motivo da movimentação de caixa é obrigatório.');
    }

    // 1. Validar status da sessão
    const resSessao = await client.query<{
      id: string;
      filial_id: string;
      status: string;
      saldo_inicial_centavos: string;
    }>(
      `SELECT id, filial_id, status, saldo_inicial_centavos 
       FROM caixas_sessoes 
       WHERE id = $1 AND empresa_id = $2`,
      [dados.caixaSessaoId, tenant.empresaId],
    );

    if (resSessao.rows.length === 0) {
      throw new Error('Sessão de caixa não encontrada.');
    }

    const sessao = resSessao.rows[0]!;
    if (sessao.status !== 'ABERTO') {
      throw new Error(`Não é possível realizar movimentações em uma sessão com status ${sessao.status}.`);
    }

    // 2. Se for sangria, verificar se há saldo físico suficiente em dinheiro na gaveta
    if (dados.tipoMovimentacao === 'SANGRIA' || dados.tipoMovimentacao === 'SANGRIA_AUTOMATICA') {
      const resumo = await this.obterResumoCaixa(
        client,
        tenant.empresaId,
        sessao.filial_id,
        dados.caixaSessaoId,
      );

      if (dados.valorCentavos > resumo.saldoGavetaDinheiroEsperadoCentavos) {
        throw new Error(
          `Saldo insuficiente em dinheiro na gaveta. Saldo disponível: R$ ${(resumo.saldoGavetaDinheiroEsperadoCentavos / 100).toFixed(2)}, valor solicitado para sangria: R$ ${(dados.valorCentavos / 100).toFixed(2)}.`,
        );
      }
    }

    // 3. Inserir movimentação
    const resMov = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      caixa_sessao_id: string;
      tipo_movimentacao: 'SUPRIMENTO' | 'SANGRIA' | 'SANGRIA_AUTOMATICA';
      valor_centavos: string;
      motivo: string;
      usuario_id: string;
      autorizado_por_id?: string;
      criado_em: string;
    }>(
      `INSERT INTO caixas_movimentacoes (
        empresa_id, filial_id, caixa_sessao_id, tipo_movimentacao, valor_centavos, motivo, usuario_id, autorizado_por_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        tenant.empresaId,
        sessao.filial_id,
        dados.caixaSessaoId,
        dados.tipoMovimentacao,
        dados.valorCentavos,
        dados.motivo.trim(),
        usuarioId,
        dados.autorizadorId || usuarioId,
      ],
    );

    const mov = resMov.rows[0]!;

    // 4. Log de auditoria específico
    const operacaoAuditoria =
      dados.tipoMovimentacao === 'SUPRIMENTO' ? 'SUPRIMENTO_CAIXA' : 'SANGRIA_CAIXA';

    await client.query(
      `INSERT INTO auditoria_logs (
        empresa_id, filial_id, usuario_id, operacao, tabela_afetada, registro_afetado_id, dados_novos
      ) VALUES ($1, $2, $3, $4, 'caixas_movimentacoes', $5, $6)`,
      [
        tenant.empresaId,
        sessao.filial_id,
        usuarioId,
        operacaoAuditoria,
        mov.id,
        JSON.stringify({
          caixaSessaoId: dados.caixaSessaoId,
          tipo: dados.tipoMovimentacao,
          valorCentavos: dados.valorCentavos,
          motivo: dados.motivo,
        }),
      ],
    );

    return {
      id: mov.id,
      empresaId: mov.empresa_id,
      filialId: mov.filial_id,
      caixaSessaoId: mov.caixa_sessao_id,
      tipoMovimentacao: mov.tipo_movimentacao,
      valorCentavos: Number(mov.valor_centavos),
      motivo: mov.motivo,
      usuarioId: mov.usuario_id,
      autorizadoPorId: mov.autorizado_por_id || undefined,
      criadoEm: mov.criado_em,
    };
  }

  /**
   * Realiza a troca de operador (Handover) no mesmo terminal sem fechar a sessão do PDV.
   */
  static async trocarOperador(
    client: pg.PoolClient | pg.Pool,
    dados: TrocarOperadorCaixaDTO,
    tenant: ContextoTenant,
    autorizadorId: string,
  ): Promise<{ sucesso: boolean; mensagem: string; novoOperadorId: string }> {
    // 1. Validar sessão
    const resSessao = await client.query<{
      id: string;
      filial_id: string;
      status: string;
      operador_atual_id: string;
    }>(
      `SELECT id, filial_id, status, operador_atual_id 
       FROM caixas_sessoes 
       WHERE id = $1 AND empresa_id = $2`,
      [dados.caixaSessaoId, tenant.empresaId],
    );

    if (resSessao.rows.length === 0) {
      throw new Error('Sessão de caixa não encontrada.');
    }

    const sessao = resSessao.rows[0]!;
    if (sessao.status !== 'ABERTO') {
      throw new Error('Apenas caixas abertos permitem troca de operador.');
    }

    if (sessao.operador_atual_id === dados.novoOperadorId) {
      throw new Error('O operador selecionado já é o operador ativo no caixa.');
    }

    // 2. Encerrar a sessão do operador atual em caixas_operadores_sessoes
    await client.query(
      `UPDATE caixas_operadores_sessoes 
       SET status = 'FECHADO', entregue_em = NOW(), 
           saldo_fechamento_declarado_centavos = $1, 
           justificativa_diferenca = $2
       WHERE caixa_sessao_id = $3 AND usuario_id = $4 AND status = 'ABERTO'`,
      [
        dados.saldoDeclaradoOperadorAnteriorCentavos ?? null,
        dados.justificativaDiferenca || null,
        dados.caixaSessaoId,
        sessao.operador_atual_id,
      ],
    );

    // 3. Abrir nova sessão para o operador entrante
    await client.query(
      `INSERT INTO caixas_operadores_sessoes (
        empresa_id, filial_id, caixa_sessao_id, usuario_id, assumido_em, status
      ) VALUES ($1, $2, $3, $4, NOW(), 'ABERTO')`,
      [tenant.empresaId, sessao.filial_id, dados.caixaSessaoId, dados.novoOperadorId],
    );

    // 4. Atualizar o operador atual na sessão principal
    await client.query(
      `UPDATE caixas_sessoes SET operador_atual_id = $1 WHERE id = $2`,
      [dados.novoOperadorId, dados.caixaSessaoId],
    );

    // 5. Auditoria da troca
    await client.query(
      `INSERT INTO auditoria_logs (
        empresa_id, filial_id, usuario_id, operacao, tabela_afetada, registro_afetado_id, dados_novos
      ) VALUES ($1, $2, $3, 'UPDATE', 'caixas_sessoes', $4, $5)`,
      [
        tenant.empresaId,
        sessao.filial_id,
        autorizadorId,
        dados.caixaSessaoId,
        JSON.stringify({
          acao: 'TROCA_OPERADOR',
          operadorAnteriorId: sessao.operador_atual_id,
          novoOperadorId: dados.novoOperadorId,
        }),
      ],
    );

    return {
      sucesso: true,
      mensagem: 'Troca de operador realizada com sucesso.',
      novoOperadorId: dados.novoOperadorId,
    };
  }

  /**
   * Encerra a sessão de caixa com conciliação cega e exigência de justificativa em divergência.
   */
  static async fecharCaixa(
    client: pg.PoolClient | pg.Pool,
    dados: FecharCaixaDTO,
    tenant: ContextoTenant,
    usuarioId: string,
  ): Promise<CaixaSessao> {
    if (dados.saldoDeclaradoCentavos < 0) {
      throw new Error('O saldo informado no fechamento não pode ser negativo.');
    }

    // 1. Obter a sessão e validar se está aberta
    const resSessao = await client.query<{
      id: string;
      filial_id: string;
      dispositivo_id: string;
      operador_abertura_id: string;
      operador_atual_id: string;
      saldo_inicial_centavos: string;
      status: string;
      aberto_em: string;
    }>(
      `SELECT * FROM caixas_sessoes 
       WHERE id = $1 AND empresa_id = $2`,
      [dados.caixaSessaoId, tenant.empresaId],
    );

    if (resSessao.rows.length === 0) {
      throw new Error('Sessão de caixa não encontrada.');
    }

    const sessao = resSessao.rows[0]!;
    if (sessao.status !== 'ABERTO') {
      throw new Error(`Esta sessão de caixa já está ${sessao.status}.`);
    }

    // 2. Apurar o saldo físico real de dinheiro na gaveta
    const resumo = await this.obterResumoCaixa(
      client,
      tenant.empresaId,
      sessao.filial_id,
      dados.caixaSessaoId,
    );

    const saldoApurado = resumo.saldoGavetaDinheiroEsperadoCentavos;
    const diferenca = dados.saldoDeclaradoCentavos - saldoApurado;

    // 3. Regra de negócio: Justificativa obrigatória quando houver divergência
    if (diferenca !== 0) {
      if (!dados.justificativaDiferenca || dados.justificativaDiferenca.trim().length < 5) {
        throw new Error(
          `Divergência de caixa identificada (Diferença: R$ ${(diferenca / 100).toFixed(2)}). A justificativa detalhada é obrigatória para autorizar o fechamento com divergência.`,
        );
      }
    }

    // 4. Encerrar sessões de operadores ativas
    await client.query(
      `UPDATE caixas_operadores_sessoes 
       SET status = 'FECHADO', entregue_em = NOW(),
           saldo_fechamento_declarado_centavos = $1,
           saldo_fechamento_apurado_centavos = $2,
           diferenca_fechamento_centavos = $3,
           justificativa_diferenca = $4
       WHERE caixa_sessao_id = $5 AND status = 'ABERTO'`,
      [
        dados.saldoDeclaradoCentavos,
        saldoApurado,
        diferenca,
        dados.justificativaDiferenca || null,
        dados.caixaSessaoId,
      ],
    );

    // 5. Atualizar a sessão principal para FECHADO
    const resAtualizado = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      dispositivo_id: string;
      operador_abertura_id: string;
      operador_fechamento_id: string;
      operador_atual_id: string;
      saldo_inicial_centavos: string;
      saldo_fechamento_declarado_centavos: string;
      saldo_fechamento_apurado_centavos: string;
      diferenca_fechamento_centavos: string;
      justificativa_diferenca?: string;
      status: 'FECHADO';
      aberto_em: string;
      fechado_em: string;
      observacoes?: string;
    }>(
      `UPDATE caixas_sessoes SET
        operador_fechamento_id = $1,
        saldo_fechamento_declarado_centavos = $2,
        saldo_fechamento_apurado_centavos = $3,
        diferenca_fechamento_centavos = $4,
        justificativa_diferenca = $5,
        status = 'FECHADO',
        fechado_em = NOW(),
        observacoes = COALESCE($6, observacoes)
       WHERE id = $7
       RETURNING *`,
      [
        usuarioId,
        dados.saldoDeclaradoCentavos,
        saldoApurado,
        diferenca,
        dados.justificativaDiferenca || null,
        dados.observacoes || null,
        dados.caixaSessaoId,
      ],
    );

    const linhaAtualizada = resAtualizado.rows[0]!;

    // 6. Log de auditoria do fechamento
    await client.query(
      `INSERT INTO auditoria_logs (
        empresa_id, filial_id, usuario_id, operacao, tabela_afetada, registro_afetado_id, dados_novos
      ) VALUES ($1, $2, $3, 'UPDATE', 'caixas_sessoes', $4, $5)`,
      [
        tenant.empresaId,
        sessao.filial_id,
        usuarioId,
        dados.caixaSessaoId,
        JSON.stringify({
          acao: 'FECHAMENTO_CAIXA',
          saldoDeclaradoCentavos: dados.saldoDeclaradoCentavos,
          saldoApuradoCentavos: saldoApurado,
          diferencaCentavos: diferenca,
          justificativa: dados.justificativaDiferenca || null,
        }),
      ],
    );

    return {
      id: linhaAtualizada.id,
      empresaId: linhaAtualizada.empresa_id,
      filialId: linhaAtualizada.filial_id,
      dispositivoId: linhaAtualizada.dispositivo_id,
      operadorAberturaId: linhaAtualizada.operador_abertura_id,
      operadorAtualId: linhaAtualizada.operador_atual_id,
      operadorFechamentoId: linhaAtualizada.operador_fechamento_id,
      saldoInicialCentavos: Number(linhaAtualizada.saldo_inicial_centavos),
      saldoFechamentoDeclaradoCentavos: Number(linhaAtualizada.saldo_fechamento_declarado_centavos),
      saldoFechamentoApuradoCentavos: Number(linhaAtualizada.saldo_fechamento_apurado_centavos),
      diferencaFechamentoCentavos: Number(linhaAtualizada.diferenca_fechamento_centavos),
      justificativaDiferenca: linhaAtualizada.justificativa_diferenca || undefined,
      status: 'FECHADO',
      abertoEm: linhaAtualizada.aberto_em,
      fechadoEm: linhaAtualizada.fechado_em,
      observacoes: linhaAtualizada.observacoes || undefined,
    };
  }

  /**
   * Apura métricas consolidadas da sessão de caixa (vendas, modalidades e saldo de gaveta).
   */
  static async obterResumoCaixa(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    caixaSessaoId: string,
  ): Promise<ResumoCaixa> {
    // 1. Obter dados cadastrais da sessão
    const resSessao = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      dispositivo_id: string;
      operador_abertura_id: string;
      operador_atual_id?: string;
      saldo_inicial_centavos: string;
      status: 'ABERTO' | 'FECHADO' | 'EM_CONFERENCIA';
      aberto_em: string;
      fechado_em?: string;
    }>(
      `SELECT * FROM caixas_sessoes 
       WHERE id = $1 AND empresa_id = $2 AND filial_id = $3`,
      [caixaSessaoId, empresaId, filialId],
    );

    if (resSessao.rows.length === 0) {
      throw new Error('Sessão de caixa não encontrada.');
    }

    const sessao = resSessao.rows[0]!;
    const saldoInicial = Number(sessao.saldo_inicial_centavos);

    // 2. Apurar Suprimentos e Sangrias
    const resMov = await client.query<{
      tipo_movimentacao: string;
      total: string;
    }>(
      `SELECT tipo_movimentacao, COALESCE(SUM(valor_centavos), 0) AS total
       FROM caixas_movimentacoes
       WHERE caixa_sessao_id = $1
       GROUP BY tipo_movimentacao`,
      [caixaSessaoId],
    );

    let totalSuprimentos = 0;
    let totalSangrias = 0;

    for (const row of resMov.rows) {
      const val = Number(row.total);
      if (row.tipo_movimentacao === 'SUPRIMENTO') {
        totalSuprimentos += val;
      } else if (
        row.tipo_movimentacao === 'SANGRIA' ||
        row.tipo_movimentacao === 'SANGRIA_AUTOMATICA'
      ) {
        totalSangrias += val;
      }
    }

    // 3. Apurar Vendas por forma de pagamento e trocos devolvidos
    const resVendas = await client.query<{
      forma_pagamento: string;
      total_forma: string;
    }>(
      `SELECT vp.forma_pagamento, COALESCE(SUM(vp.valor_centavos), 0) AS total_forma
       FROM venda_pagamentos vp
       INNER JOIN vendas v ON v.id = vp.venda_id
       WHERE v.caixa_sessao_id = $1 AND v.status = 'CONCLUIDA'
       GROUP BY vp.forma_pagamento`,
      [caixaSessaoId],
    );

    let totalVendasDinheiroBruto = 0;
    let totalVendasPix = 0;
    let totalVendasCartaoDebito = 0;
    let totalVendasCartaoCredito = 0;
    let totalVendasVoucher = 0;

    for (const row of resVendas.rows) {
      const val = Number(row.total_forma);
      switch (row.forma_pagamento) {
        case 'DINHEIRO':
          totalVendasDinheiroBruto += val;
          break;
        case 'PIX':
          totalVendasPix += val;
          break;
        case 'CARTAO_DEBITO':
          totalVendasCartaoDebito += val;
          break;
        case 'CARTAO_CREDITO':
          totalVendasCartaoCredito += val;
          break;
        case 'VOUCHER':
          totalVendasVoucher += val;
          break;
      }
    }

    // Apurar Troco Total devolvido nas vendas em dinheiro concluídas
    const resTroco = await client.query<{
      total_troco: string;
      vendas_concluidas: string;
      vendas_canceladas: string;
    }>(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'CONCLUIDA' THEN troco_centavos ELSE 0 END), 0) AS total_troco,
        COUNT(CASE WHEN status = 'CONCLUIDA' THEN 1 END) AS vendas_concluidas,
        COUNT(CASE WHEN status = 'CANCELADA' THEN 1 END) AS vendas_canceladas
       FROM vendas
       WHERE caixa_sessao_id = $1`,
      [caixaSessaoId],
    );

    const totalTrocoDevolvido = Number(resTroco.rows[0]?.total_troco || 0);
    const qtdConcluidas = Number(resTroco.rows[0]?.vendas_concluidas || 0);
    const qtdCanceladas = Number(resTroco.rows[0]?.vendas_canceladas || 0);

    // O dinheiro líquido das vendas que permanece na gaveta é (dinheiro recebido - troco devolvido)
    const netDinheiroVendas = totalVendasDinheiroBruto - totalTrocoDevolvido;

    // Regra mandatória:
    // A gaveta física de dinheiro é composta EXCLUSIVAMENTE por:
    // Saldo Inicial + Suprimentos - Sangrias + Dinheiro Líquido de Vendas
    // Pagamentos em PIX, Cartão e Voucher NÃO entram na gaveta física de dinheiro!
    const saldoGavetaDinheiro =
      saldoInicial + totalSuprimentos - totalSangrias + netDinheiroVendas;

    return {
      caixaSessaoId: sessao.id,
      empresaId: sessao.empresa_id,
      filialId: sessao.filial_id,
      dispositivoId: sessao.dispositivo_id,
      operadorAberturaId: sessao.operador_abertura_id,
      operadorAtualId: sessao.operador_atual_id || sessao.operador_abertura_id,
      status: sessao.status,
      abertoEm: sessao.aberto_em,
      fechadoEm: sessao.fechado_em || undefined,
      saldoInicialCentavos: saldoInicial,
      totalVendasDinheiroCentavos: totalVendasDinheiroBruto,
      totalVendasPixCentavos: totalVendasPix,
      totalVendasCartaoDebitoCentavos: totalVendasCartaoDebito,
      totalVendasCartaoCreditoCentavos: totalVendasCartaoCredito,
      totalVendasVoucherCentavos: totalVendasVoucher,
      totalSuprimentosCentavos: totalSuprimentos,
      totalSangriasCentavos: totalSangrias,
      totalTrocoDevolvidoCentavos: totalTrocoDevolvido,
      saldoGavetaDinheiroEsperadoCentavos: saldoGavetaDinheiro,
      quantidadeVendasConcluidas: qtdConcluidas,
      quantidadeVendasCanceladas: qtdCanceladas,
    };
  }

  /**
   * Obtém a sessão de caixa atualmente aberta para o dispositivo / filial.
   */
  static async obterCaixaAtivo(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    dispositivoId?: string,
  ): Promise<CaixaSessao | null> {
    const query = dispositivoId
      ? `SELECT * FROM caixas_sessoes 
         WHERE empresa_id = $1 AND filial_id = $2 AND dispositivo_id = $3 AND status = 'ABERTO' 
         ORDER BY aberto_em DESC LIMIT 1`
      : `SELECT * FROM caixas_sessoes 
         WHERE empresa_id = $1 AND filial_id = $2 AND status = 'ABERTO' 
         ORDER BY aberto_em DESC LIMIT 1`;

    const params = dispositivoId ? [empresaId, filialId, dispositivoId] : [empresaId, filialId];
    const res = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      dispositivo_id: string;
      operador_abertura_id: string;
      operador_atual_id?: string;
      saldo_inicial_centavos: string;
      status: 'ABERTO';
      aberto_em: string;
      observacoes?: string;
    }>(query, params);

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0]!;
    return {
      id: row.id,
      empresaId: row.empresa_id,
      filialId: row.filial_id,
      dispositivoId: row.dispositivo_id,
      operadorAberturaId: row.operador_abertura_id,
      operadorAtualId: row.operador_atual_id,
      saldoInicialCentavos: Number(row.saldo_inicial_centavos),
      status: 'ABERTO',
      abertoEm: row.aberto_em,
      observacoes: row.observacoes || undefined,
    };
  }

  /**
   * Lista histórico de movimentações da sessão.
   */
  static async listarMovimentacoes(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    filialId: string,
    caixaSessaoId: string,
  ): Promise<CaixaMovimentacao[]> {
    const res = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      caixa_sessao_id: string;
      tipo_movimentacao: 'SUPRIMENTO' | 'SANGRIA' | 'SANGRIA_AUTOMATICA';
      valor_centavos: string;
      motivo: string;
      usuario_id: string;
      autorizado_por_id?: string;
      criado_em: string;
    }>(
      `SELECT * FROM caixas_movimentacoes 
       WHERE caixa_sessao_id = $1 AND empresa_id = $2 AND filial_id = $3
       ORDER BY criado_em ASC`,
      [caixaSessaoId, empresaId, filialId],
    );

    return res.rows.map(m => ({
      id: m.id,
      empresaId: m.empresa_id,
      filialId: m.filial_id,
      caixaSessaoId: m.caixa_sessao_id,
      tipoMovimentacao: m.tipo_movimentacao,
      valorCentavos: Number(m.valor_centavos),
      motivo: m.motivo,
      usuarioId: m.usuario_id,
      autorizadoPorId: m.autorizado_por_id || undefined,
      criadoEm: m.criado_em,
    }));
  }
}
