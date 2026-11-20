import pg from 'pg';
import {
  AlterarStatusPedidoDTO,
  AtualizarFornecedorDTO,
  CadastrarFornecedorDTO,
  ConsolidarSolicitacoesDTO,
  ContextoTenant,
  CriarPedidoCompraDTO,
  CriarSolicitacaoCompraDTO,
  DecisaoFornecedorDTO,
  DecisaoSolicitacaoCompraDTO,
  DesativarFornecedorFilialDTO,
  Fornecedor,
  PedidoCompra,
  PedidoCompraHistorico,
  PedidoCompraItem,
  SolicitacaoCompra,
  SolicitacaoCompraItem,
  StatusFornecedor,
  StatusPedidoCompra,
  StatusSolicitacaoCompra,
} from '@farmapro/shared';

export function validarCnpj(cnpj: string | undefined | null): boolean {
  if (!cnpj) return false;
  const digitos = cnpj.replace(/\D/g, '');
  if (digitos.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digitos)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    const peso = pesos1[i] ?? 0;
    soma += parseInt(digitos.charAt(i), 10) * peso;
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== parseInt(digitos.charAt(12), 10)) return false;

  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    const peso = pesos2[i] ?? 0;
    soma += parseInt(digitos.charAt(i), 10) * peso;
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  return digito2 === parseInt(digitos.charAt(13), 10);
}

export class ComprasService {
  // ============================================================================
  // 1. GESTÃO DE FORNECEDORES (Centralizados por Empresa)
  // ============================================================================

  static async cadastrarFornecedor(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    dto: CadastrarFornecedorDTO,
  ): Promise<Fornecedor> {
    const cnpjLimpo = (dto.cnpj || '').replace(/\D/g, '');

    // 1. Validação de formato e algoritmo do CNPJ
    if (!validarCnpj(cnpjLimpo)) {
      throw new Error(`CNPJ "${dto.cnpj}" é inválido segundo as regras da Receita Federal.`);
    }

    // 2. Prevenção de duplicidade por empresa
    const resDuplicado = await client.query<{ id: string }>(
      `SELECT id FROM fornecedores WHERE empresa_id = $1 AND cnpj = $2`,
      [tenant.empresaId, cnpjLimpo],
    );

    if (resDuplicado.rows.length > 0) {
      throw new Error(`Já existe um fornecedor cadastrado com o CNPJ ${dto.cnpj} nesta empresa.`);
    }

    const statusInicial: StatusFornecedor = dto.solicitarAprovacao
      ? 'PENDENTE_APROVACAO'
      : 'ATIVO';

    const contatoPrincipal = {
      nome: dto.contatoPrincipalNome || '',
      cargo: dto.contatoPrincipalCargo || '',
      telefone: dto.contatoPrincipalTelefone || '',
      email: dto.contatoPrincipalEmail || '',
    };

    const res = await client.query<{
      id: string;
      empresa_id: string;
      razao_social: string;
      nome_fantasia: string;
      cnpj: string;
      inscricao_estadual: string | null;
      email: string | null;
      telefone: string | null;
      contato_principal_nome: string | null;
      contato_principal_cargo: string | null;
      contato_principal_telefone: string | null;
      contato_principal_email: string | null;
      logradouro: string | null;
      numero: string | null;
      complemento: string | null;
      bairro: string | null;
      cidade: string | null;
      uf: string | null;
      cep: string | null;
      condicoes_comerciais: string | null;
      prazo_entrega_dias: number;
      dados_bancarios: Record<string, unknown> | null;
      observacoes: string | null;
      documentos: Record<string, unknown>[] | null;
      status: StatusFornecedor;
      solicitado_por_id: string | null;
      aprovado_por_id: string | null;
      data_aprovacao: string | null;
      criado_em: string;
      atualizado_em: string;
    }>(
      `INSERT INTO fornecedores (
        empresa_id, razao_social, nome_fantasia, cnpj, inscricao_estadual,
        email, telefone, contato_principal_nome, contato_principal_cargo,
        contato_principal_telefone, contato_principal_email,
        logradouro, numero, complemento, bairro, cidade, uf, cep,
        condicoes_comerciais, prazo_entrega_dias, dados_bancarios,
        observacoes, documentos, status, solicitado_por_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11,
        $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24, $25
      )
      RETURNING *`,
      [
        tenant.empresaId,
        dto.razaoSocial.trim(),
        dto.nomeFantasia.trim(),
        cnpjLimpo,
        dto.inscricaoEstadual?.trim() || null,
        dto.email?.trim() || null,
        dto.telefone?.trim() || null,
        contatoPrincipal.nome || null,
        contatoPrincipal.cargo || null,
        contatoPrincipal.telefone || null,
        contatoPrincipal.email || null,
        dto.logradouro?.trim() || null,
        dto.numero?.trim() || null,
        dto.complemento?.trim() || null,
        dto.bairro?.trim() || null,
        dto.cidade?.trim() || null,
        dto.uf?.trim().toUpperCase() || null,
        dto.cep ? dto.cep.replace(/\D/g, '') : null,
        dto.condicoesComerciais?.trim() || null,
        dto.prazoEntregaDias || 5,
        dto.dadosBancarios ? JSON.stringify(dto.dadosBancarios) : null,
        dto.observacoes?.trim() || null,
        JSON.stringify(dto.documentos || []),
        statusInicial,
        dto.solicitarAprovacao ? tenant.usuarioId : null,
      ],
    );

    const f = res.rows[0];
    if (!f) throw new Error('Falha ao cadastrar fornecedor.');

    return this.mapearFornecedor(f, []);
  }

  static async atualizarFornecedor(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    id: string,
    dto: AtualizarFornecedorDTO,
  ): Promise<Fornecedor> {
    const resAtual = await client.query<{
      id: string;
      empresa_id: string;
      razao_social: string;
      nome_fantasia: string;
      cnpj: string;
      dados_bancarios: Record<string, unknown> | null;
      status: StatusFornecedor;
    }>(
      `SELECT id, empresa_id, razao_social, nome_fantasia, cnpj, dados_bancarios, status
       FROM fornecedores
       WHERE id = $1 AND empresa_id = $2`,
      [id, tenant.empresaId],
    );

    const atual = resAtual.rows[0];
    if (!atual) {
      throw new Error('Fornecedor não encontrado nesta empresa.');
    }

    // Validação de Alterações Sensíveis (CNPJ, Razão Social, Dados Bancários)
    const novoCnpjLimpo = dto.cnpj ? dto.cnpj.replace(/\D/g, '') : undefined;
    const cnpjMudou = novoCnpjLimpo && novoCnpjLimpo !== atual.cnpj;
    const razaoSocialMudou = dto.razaoSocial && dto.razaoSocial.trim() !== atual.razao_social;
    const dadosBancariosMudou =
      dto.dadosBancarios &&
      JSON.stringify(dto.dadosBancarios) !== JSON.stringify(atual.dados_bancarios);

    if (cnpjMudou || razaoSocialMudou || dadosBancariosMudou) {
      if (!dto.justificativaSensivel || dto.justificativaSensivel.trim().length < 5) {
        throw new Error(
          'Alterações sensíveis (CNPJ, Razão Social ou Dados Bancários) exigem justificativa com no mínimo 5 caracteres.',
        );
      }
    }

    if (cnpjMudou && novoCnpjLimpo) {
      if (!validarCnpj(novoCnpjLimpo)) {
        throw new Error(`O novo CNPJ "${dto.cnpj}" é inválido.`);
      }

      const resDuplicado = await client.query<{ id: string }>(
        `SELECT id FROM fornecedores WHERE empresa_id = $1 AND cnpj = $2 AND id != $3`,
        [tenant.empresaId, novoCnpjLimpo, id],
      );

      if (resDuplicado.rows.length > 0) {
        throw new Error(`Já existe outro fornecedor cadastrado com o CNPJ ${dto.cnpj}.`);
      }
    }

    await client.query(
      `UPDATE fornecedores
       SET
         razao_social = COALESCE($1, razao_social),
         nome_fantasia = COALESCE($2, nome_fantasia),
         cnpj = COALESCE($3, cnpj),
         inscricao_estadual = COALESCE($4, inscricao_estadual),
         email = COALESCE($5, email),
         telefone = COALESCE($6, telefone),
         contato_principal_nome = COALESCE($7, contato_principal_nome),
         contato_principal_cargo = COALESCE($8, contato_principal_cargo),
         contato_principal_telefone = COALESCE($9, contato_principal_telefone),
         contato_principal_email = COALESCE($10, contato_principal_email),
         logradouro = COALESCE($11, logradouro),
         numero = COALESCE($12, numero),
         complemento = COALESCE($13, complemento),
         bairro = COALESCE($14, bairro),
         cidade = COALESCE($15, cidade),
         uf = COALESCE($16, uf),
         cep = COALESCE($17, cep),
         condicoes_comerciais = COALESCE($18, condicoes_comerciais),
         prazo_entrega_dias = COALESCE($19, prazo_entrega_dias),
         dados_bancarios = COALESCE($20, dados_bancarios),
         observacoes = COALESCE($21, observacoes),
         atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $22 AND empresa_id = $23
       RETURNING *`,
      [
        dto.razaoSocial?.trim() || null,
        dto.nomeFantasia?.trim() || null,
        novoCnpjLimpo || null,
        dto.inscricaoEstadual?.trim() || null,
        dto.email?.trim() || null,
        dto.telefone?.trim() || null,
        dto.contatoPrincipalNome?.trim() || null,
        dto.contatoPrincipalCargo?.trim() || null,
        dto.contatoPrincipalTelefone?.trim() || null,
        dto.contatoPrincipalEmail?.trim() || null,
        dto.logradouro?.trim() || null,
        dto.numero?.trim() || null,
        dto.complemento?.trim() || null,
        dto.bairro?.trim() || null,
        dto.cidade?.trim() || null,
        dto.uf?.trim().toUpperCase() || null,
        dto.cep ? dto.cep.replace(/\D/g, '') : null,
        dto.condicoesComerciais?.trim() || null,
        dto.prazoEntregaDias || null,
        dto.dadosBancarios ? JSON.stringify(dto.dadosBancarios) : null,
        dto.observacoes?.trim() || null,
        id,
        tenant.empresaId,
      ],
    );

    return this.obterFornecedorPorId(client, tenant, id);
  }

  static async decidirAprovacaoFornecedor(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    id: string,
    dto: DecisaoFornecedorDTO,
  ): Promise<Fornecedor> {
    const resAtual = await client.query<{ status: StatusFornecedor }>(
      `SELECT status FROM fornecedores WHERE id = $1 AND empresa_id = $2`,
      [id, tenant.empresaId],
    );

    const f = resAtual.rows[0];
    if (!f) throw new Error('Fornecedor não encontrado.');

    if (f.status !== 'PENDENTE_APROVACAO') {
      throw new Error(`Apenas fornecedores pendentes de aprovação podem ser avaliados (atual: ${f.status}).`);
    }

    if (dto.aprovado) {
      await client.query(
        `UPDATE fornecedores
         SET status = 'ATIVO',
             aprovado_por_id = $1,
             data_aprovacao = CURRENT_TIMESTAMP,
             motivo_rejeicao = NULL,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $2 AND empresa_id = $3`,
        [tenant.usuarioId, id, tenant.empresaId],
      );
    } else {
      if (!dto.motivo || dto.motivo.trim().length < 5) {
        throw new Error('A rejeição de fornecedor exige justificativa com no mínimo 5 caracteres.');
      }
      await client.query(
        `UPDATE fornecedores
         SET status = 'INATIVO',
             aprovado_por_id = $1,
             data_aprovacao = CURRENT_TIMESTAMP,
             motivo_rejeicao = $2,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $3 AND empresa_id = $4`,
        [tenant.usuarioId, dto.motivo.trim(), id, tenant.empresaId],
      );
    }

    return this.obterFornecedorPorId(client, tenant, id);
  }

  static async bloquearFornecedorGlobal(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    id: string,
    motivo: string,
  ): Promise<Fornecedor> {
    if (!motivo || motivo.trim().length < 5) {
      throw new Error('O bloqueio global exige justificativa com no mínimo 5 caracteres.');
    }

    const res = await client.query(
      `UPDATE fornecedores
       SET status = 'BLOQUEADO',
           motivo_bloqueio = $1,
           bloqueado_por_id = $2,
           data_bloqueio = CURRENT_TIMESTAMP,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $3 AND empresa_id = $4
       RETURNING id`,
      [motivo.trim(), tenant.usuarioId, id, tenant.empresaId],
    );

    if (res.rows.length === 0) {
      throw new Error('Fornecedor não encontrado para bloqueio.');
    }

    return this.obterFornecedorPorId(client, tenant, id);
  }

  static async desbloquearFornecedorGlobal(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    id: string,
  ): Promise<Fornecedor> {
    await client.query(
      `UPDATE fornecedores
       SET status = 'ATIVO',
           motivo_bloqueio = NULL,
           bloqueado_por_id = NULL,
           data_bloqueio = NULL,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $1 AND empresa_id = $2`,
      [id, tenant.empresaId],
    );

    return this.obterFornecedorPorId(client, tenant, id);
  }

  static async desativarFornecedorFilial(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    dto: DesativarFornecedorFilialDTO,
  ): Promise<void> {
    if (!dto.motivo || dto.motivo.trim().length < 5) {
      throw new Error('A desativação local do fornecedor exige justificativa com no mínimo 5 caracteres.');
    }

    // Valida existência do fornecedor e da filial
    const resFornec = await client.query(
      `SELECT id FROM fornecedores WHERE id = $1 AND empresa_id = $2`,
      [dto.fornecedorId, tenant.empresaId],
    );
    if (resFornec.rows.length === 0) throw new Error('Fornecedor não encontrado.');

    const resFilial = await client.query(
      `SELECT id FROM filiais WHERE id = $1 AND empresa_id = $2`,
      [dto.filialId, tenant.empresaId],
    );
    if (resFilial.rows.length === 0) throw new Error('Filial não encontrada nesta empresa.');

    await client.query(
      `INSERT INTO fornecedores_filiais_desativados (
        empresa_id, fornecedor_id, filial_id, desativado_por_id, motivo
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (fornecedor_id, filial_id) DO UPDATE
      SET motivo = EXCLUDED.motivo,
          desativado_por_id = EXCLUDED.desativado_por_id,
          data_desativacao = CURRENT_TIMESTAMP`,
      [tenant.empresaId, dto.fornecedorId, dto.filialId, tenant.usuarioId, dto.motivo.trim()],
    );
  }

  static async reativarFornecedorFilial(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    fornecedorId: string,
    filialId: string,
  ): Promise<void> {
    await client.query(
      `DELETE FROM fornecedores_filiais_desativados
       WHERE empresa_id = $1 AND fornecedor_id = $2 AND filial_id = $3`,
      [tenant.empresaId, fornecedorId, filialId],
    );
  }

  static async listarFornecedores(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    filtros?: { status?: StatusFornecedor; busca?: string; filialId?: string },
  ): Promise<Fornecedor[]> {
    let sql = `
      SELECT f.*,
             COALESCE(
               (SELECT json_agg(ffd.filial_id)
                FROM fornecedores_filiais_desativados ffd
                WHERE ffd.fornecedor_id = f.id),
               '[]'::json
             ) AS filiais_desativadas
      FROM fornecedores f
      WHERE f.empresa_id = $1
    `;
    const params: unknown[] = [tenant.empresaId];

    if (filtros?.status) {
      params.push(filtros.status);
      sql += ` AND f.status = $${params.length}`;
    }

    if (filtros?.busca) {
      params.push(`%${filtros.busca.trim()}%`);
      sql += ` AND (f.razao_social ILIKE $${params.length} OR f.nome_fantasia ILIKE $${params.length} OR f.cnpj ILIKE $${params.length})`;
    }

    sql += ` ORDER BY f.nome_fantasia ASC`;

    const res = await client.query(sql, params);

    return res.rows.map(row => {
      const filiaisDesativadas = Array.isArray(row.filiais_desativadas)
        ? (row.filiais_desativadas as string[])
        : [];
      return this.mapearFornecedor(row, filiaisDesativadas);
    });
  }

  static async obterFornecedorPorId(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    id: string,
  ): Promise<Fornecedor> {
    const res = await client.query(
      `SELECT f.*,
              COALESCE(
                (SELECT json_agg(ffd.filial_id)
                 FROM fornecedores_filiais_desativados ffd
                 WHERE ffd.fornecedor_id = f.id),
                '[]'::json
              ) AS filiais_desativadas
       FROM fornecedores f
       WHERE f.id = $1 AND f.empresa_id = $2`,
      [id, tenant.empresaId],
    );

    const row = res.rows[0];
    if (!row) throw new Error('Fornecedor não encontrado.');

    const filiaisDesativadas = Array.isArray(row.filiais_desativadas)
      ? (row.filiais_desativadas as string[])
      : [];
    return this.mapearFornecedor(row, filiaisDesativadas);
  }

  // ============================================================================
  // 2. SOLICITAÇÕES DE COMPRA POR FILIAL
  // ============================================================================

  static async criarSolicitacaoCompra(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    dto: CriarSolicitacaoCompraDTO,
  ): Promise<SolicitacaoCompra> {
    if (!dto.itens || dto.itens.length === 0) {
      throw new Error('A solicitação de compra deve conter ao menos um item.');
    }

    if (!dto.justificativaGeral || dto.justificativaGeral.trim().length < 5) {
      throw new Error('A justificativa da solicitação deve conter no mínimo 5 caracteres.');
    }

    // Calcula próximo número sequencial na empresa
    const resSeq = await client.query<{ max_seq: string }>(
      `SELECT COALESCE(MAX(numero_sequencial), 0) AS max_seq
       FROM solicitacoes_compra
       WHERE empresa_id = $1`,
      [tenant.empresaId],
    );
    const proximoSeq = Number(resSeq.rows[0]?.max_seq || 0) + 1;

    const statusInicial: StatusSolicitacaoCompra =
      dto.enviarParaAprovacao === false ? 'RASCUNHO' : 'PENDENTE_APROVACAO';

    const resSol = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      numero_sequencial: number;
      solicitado_por_id: string;
      justificativa_geral: string;
      prioridade: string;
      status: StatusSolicitacaoCompra;
      criado_em: string;
      atualizado_em: string;
    }>(
      `INSERT INTO solicitacoes_compra (
        empresa_id, filial_id, numero_sequencial, solicitado_por_id,
        justificativa_geral, prioridade, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        tenant.empresaId,
        dto.filialId,
        proximoSeq,
        tenant.usuarioId,
        dto.justificativaGeral.trim(),
        dto.prioridade || 'MEDIA',
        statusInicial,
      ],
    );

    const sol = resSol.rows[0];
    if (!sol) throw new Error('Falha ao criar solicitação de compra.');

    // Inserção dos itens
    for (const item of dto.itens) {
      if (item.quantidadeSolicitada <= 0) {
        throw new Error('A quantidade solicitada deve ser maior que zero.');
      }

      await client.query(
        `INSERT INTO solicitacao_compra_itens (
          empresa_id, solicitacao_id, produto_id, quantidade_solicitada, justificativa_item
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          tenant.empresaId,
          sol.id,
          item.produtoId,
          item.quantidadeSolicitada,
          item.justificativaItem?.trim() || null,
        ],
      );
    }

    return this.obterSolicitacaoPorId(client, tenant, sol.id);
  }

  static async decidirSolicitacaoCompra(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    solicitacaoId: string,
    dto: DecisaoSolicitacaoCompraDTO,
  ): Promise<SolicitacaoCompra> {
    if (!dto.justificativa || dto.justificativa.trim().length < 5) {
      throw new Error('A decisão sobre a solicitação exige justificativa com no mínimo 5 caracteres.');
    }

    const resSol = await client.query<{ status: StatusSolicitacaoCompra }>(
      `SELECT status FROM solicitacoes_compra WHERE id = $1 AND empresa_id = $2`,
      [solicitacaoId, tenant.empresaId],
    );

    const sol = resSol.rows[0];
    if (!sol) throw new Error('Solicitação de compra não encontrada.');

    if (sol.status !== 'PENDENTE_APROVACAO' && sol.status !== 'RASCUNHO') {
      throw new Error(`A solicitação não está aberta para aprovação (status: ${sol.status}).`);
    }

    let novoStatus: StatusSolicitacaoCompra;

    if (dto.acao === 'APROVAR_TOTAL') {
      novoStatus = 'APROVADA_TOTAL';
      // Aprova quantidade total de todos os itens
      await client.query(
        `UPDATE solicitacao_compra_itens
         SET quantidade_aprovada = quantidade_solicitada
         WHERE solicitacao_id = $1 AND empresa_id = $2`,
        [solicitacaoId, tenant.empresaId],
      );
    } else if (dto.acao === 'APROVAR_PARCIAL') {
      novoStatus = 'APROVADA_PARCIAL';
      if (!dto.itensAprovados || dto.itensAprovados.length === 0) {
        throw new Error('Para aprovação parcial, informe a quantidade de cada item aprovado.');
      }

      for (const itemAp of dto.itensAprovados) {
        if (itemAp.quantidadeAprovada < 0) {
          throw new Error('A quantidade aprovada não pode ser negativa.');
        }

        await client.query(
          `UPDATE solicitacao_compra_itens
           SET quantidade_aprovada = $1
           WHERE id = $2 AND solicitacao_id = $3 AND empresa_id = $4`,
          [itemAp.quantidadeAprovada, itemAp.itemId, solicitacaoId, tenant.empresaId],
        );
      }
    } else if (dto.acao === 'REJEITAR') {
      novoStatus = 'REJEITADA';
      await client.query(
        `UPDATE solicitacao_compra_itens
         SET quantidade_aprovada = 0
         WHERE solicitacao_id = $1 AND empresa_id = $2`,
        [solicitacaoId, tenant.empresaId],
      );
    } else if (dto.acao === 'SOLICITAR_CORRECAO') {
      novoStatus = 'RASCUNHO';
    } else {
      throw new Error(`Ação de decisão inválida: ${dto.acao}`);
    }

    await client.query(
      `UPDATE solicitacoes_compra
       SET status = $1,
           aprovado_por_id = $2,
           data_decisao = CURRENT_TIMESTAMP,
           justificativa_decisao = $3,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $4 AND empresa_id = $5`,
      [novoStatus, tenant.usuarioId, dto.justificativa.trim(), solicitacaoId, tenant.empresaId],
    );

    return this.obterSolicitacaoPorId(client, tenant, solicitacaoId);
  }

  static async listarSolicitacoesCompra(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    filtros?: { filialId?: string; status?: StatusSolicitacaoCompra },
  ): Promise<SolicitacaoCompra[]> {
    let sql = `
      SELECT sc.*,
             f.nome AS nome_filial,
             u.nome AS nome_solicitante
      FROM solicitacoes_compra sc
      JOIN filiais f ON f.id = sc.filial_id
      JOIN usuarios u ON u.id = sc.solicitado_por_id
      WHERE sc.empresa_id = $1
    `;
    const params: unknown[] = [tenant.empresaId];

    if (filtros?.filialId) {
      params.push(filtros.filialId);
      sql += ` AND sc.filial_id = $${params.length}`;
    }

    if (filtros?.status) {
      params.push(filtros.status);
      sql += ` AND sc.status = $${params.length}`;
    }

    sql += ` ORDER BY sc.criado_em DESC`;

    const res = await client.query(sql, params);
    const resultado: SolicitacaoCompra[] = [];

    for (const row of res.rows) {
      const itens = await this.obterItensSolicitacao(client, tenant.empresaId, row.id);
      resultado.push({
        id: row.id,
        empresaId: row.empresa_id,
        filialId: row.filial_id,
        nomeFilial: row.nome_filial,
        numeroSequencial: row.numero_sequencial,
        solicitadoPorId: row.solicitado_por_id,
        nomeSolicitante: row.nome_solicitante,
        justificativaGeral: row.justificativa_geral,
        prioridade: row.prioridade,
        status: row.status,
        aprovadoPorId: row.aprovado_por_id,
        dataDecisao: row.data_decisao,
        justificativaDecisao: row.justificativa_decisao,
        pedidoCompraConsolidadoId: row.pedido_compra_consolidado_id,
        criadoEm: row.criado_em,
        atualizadoEm: row.atualizado_em,
        itens,
      });
    }

    return resultado;
  }

  static async obterSolicitacaoPorId(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    id: string,
  ): Promise<SolicitacaoCompra> {
    const res = await client.query(
      `SELECT sc.*,
              f.nome AS nome_filial,
              u.nome AS nome_solicitante
       FROM solicitacoes_compra sc
       JOIN filiais f ON f.id = sc.filial_id
       JOIN usuarios u ON u.id = sc.solicitado_por_id
       WHERE sc.id = $1 AND sc.empresa_id = $2`,
      [id, tenant.empresaId],
    );

    const row = res.rows[0];
    if (!row) throw new Error('Solicitação de compra não encontrada.');

    const itens = await this.obterItensSolicitacao(client, tenant.empresaId, row.id);

    return {
      id: row.id,
      empresaId: row.empresa_id,
      filialId: row.filial_id,
      nomeFilial: row.nome_filial,
      numeroSequencial: row.numero_sequencial,
      solicitadoPorId: row.solicitado_por_id,
      nomeSolicitante: row.nome_solicitante,
      justificativaGeral: row.justificativa_geral,
      prioridade: row.prioridade,
      status: row.status,
      aprovadoPorId: row.aprovado_por_id,
      dataDecisao: row.data_decisao,
      justificativaDecisao: row.justificativa_decisao,
      pedidoCompraConsolidadoId: row.pedido_compra_consolidado_id,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
      itens,
    };
  }

  // ============================================================================
  // 3. PEDIDOS DE COMPRA CENTRALIZADOS
  // ============================================================================

  static async criarPedidoCompra(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    dto: CriarPedidoCompraDTO,
  ): Promise<PedidoCompra> {
    // 1. Validar Fornecedor
    const resFornec = await client.query<{
      id: string;
      status: StatusFornecedor;
      razao_social: string;
    }>(
      `SELECT id, status, razao_social
       FROM fornecedores
       WHERE id = $1 AND empresa_id = $2`,
      [dto.fornecedorId, tenant.empresaId],
    );

    const fornecedor = resFornec.rows[0];
    if (!fornecedor) {
      throw new Error('Fornecedor não encontrado nesta empresa.');
    }

    if (fornecedor.status === 'BLOQUEADO') {
      throw new Error(
        `Fornecedor "${fornecedor.razao_social}" está globalmente bloqueado para novas compras.`,
      );
    }

    if (fornecedor.status !== 'ATIVO') {
      throw new Error(
        `Fornecedor "${fornecedor.razao_social}" não está ativo (status atual: ${fornecedor.status}).`,
      );
    }

    // 2. Validar Itens
    if (!dto.itens || dto.itens.length === 0) {
      throw new Error('O pedido de compra deve conter ao menos um produto.');
    }

    // 3. Validar se o fornecedor está desativado para alguma filial de destino
    const filiaisDestino = Array.from(new Set(dto.itens.map(i => i.filialDestinoId)));
    for (const fId of filiaisDestino) {
      const resDesat = await client.query(
        `SELECT id FROM fornecedores_filiais_desativados
         WHERE empresa_id = $1 AND fornecedor_id = $2 AND filial_id = $3`,
        [tenant.empresaId, dto.fornecedorId, fId],
      );

      if (resDesat.rows.length > 0) {
        throw new Error(
          `O fornecedor está desativado para a filial de destino informada no pedido (${fId}).`,
        );
      }
    }

    const destinadoMultiplasFiliais = filiaisDestino.length > 1;

    // 4. Calcular Valores Monetários em Centavos Inteiros
    let subtotalCentavos = 0;
    let descontoTotalCentavos = 0;

    for (const item of dto.itens) {
      if (item.quantidadePedida <= 0) {
        throw new Error('A quantidade pedida de cada item deve ser maior que zero.');
      }
      if (item.valorUnitarioCentavos < 0) {
        throw new Error('O valor unitário não pode ser negativo.');
      }

      const itemDesc = item.descontoCentavos || 0;
      subtotalCentavos += item.quantidadePedida * item.valorUnitarioCentavos;
      descontoTotalCentavos += itemDesc;
    }

    const freteCentavos = dto.valorFreteCentavos || 0;
    const totalCentavos = subtotalCentavos - descontoTotalCentavos + freteCentavos;

    // 5. Gerar número de pedido único por empresa
    const anoAtual = new Date().getFullYear();
    const resSeq = await client.query<{ max_seq: string }>(
      `SELECT COALESCE(MAX(numero_sequencial), 0) AS max_seq
       FROM pedidos_compra
       WHERE empresa_id = $1`,
      [tenant.empresaId],
    );
    const seq = Number(resSeq.rows[0]?.max_seq || 0) + 1;
    const numeroPedido = `PC-${anoAtual}-${seq.toString().padStart(4, '0')}`;

    const statusInicial: StatusPedidoCompra =
      dto.enviarParaAprovacao === true ? 'PENDENTE_APROVACAO' : 'RASCUNHO';

    // 6. Inserir Pedido de Compra
    const resPedido = await client.query<{ id: string }>(
      `INSERT INTO pedidos_compra (
        empresa_id, fornecedor_id, numero_pedido, numero_sequencial,
        filial_destino_principal_id, destinado_multiplas_filiais, status,
        valor_subtotal_centavos, valor_desconto_centavos, valor_frete_centavos,
        valor_total_centavos, condicoes_pagamento, prazo_entrega_previsto,
        observacoes, criado_por_id
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13,
        $14, $15
      )
      RETURNING id`,
      [
        tenant.empresaId,
        dto.fornecedorId,
        numeroPedido,
        seq,
        dto.filialDestinoPrincipalId || (filiaisDestino[0] ?? null),
        destinadoMultiplasFiliais,
        statusInicial,
        subtotalCentavos,
        descontoTotalCentavos,
        freteCentavos,
        totalCentavos,
        dto.condicoesPagamento?.trim() || null,
        dto.prazoEntregaPrevisto || null,
        dto.observacoes?.trim() || null,
        tenant.usuarioId,
      ],
    );

    const pedidoId = resPedido.rows[0]?.id;
    if (!pedidoId) throw new Error('Falha ao criar cabeçalho do pedido de compra.');

    // 7. Inserir Itens do Pedido de Compra
    for (const item of dto.itens) {
      const itemDesc = item.descontoCentavos || 0;
      const itemTotal = item.quantidadePedida * item.valorUnitarioCentavos - itemDesc;

      await client.query(
        `INSERT INTO pedidos_compra_itens (
          empresa_id, pedido_id, produto_id, filial_destino_id,
          quantidade_pedida, valor_unitario_centavos, desconto_centavos,
          valor_total_centavos, solicitacao_item_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tenant.empresaId,
          pedidoId,
          item.produtoId,
          item.filialDestinoId,
          item.quantidadePedida,
          item.valorUnitarioCentavos,
          itemDesc,
          itemTotal,
          item.solicitacaoItemId || null,
        ],
      );
    }

    // 8. Registro de Auditoria no Histórico
    await client.query(
      `INSERT INTO pedidos_compra_historico (
        empresa_id, pedido_id, status_anterior, status_novo,
        usuario_id, motivo_alteracao, alteracoes_detalhe
      ) VALUES ($1, $2, NULL, $3, $4, 'Criação do pedido de compra', $5)`,
      [
        tenant.empresaId,
        pedidoId,
        statusInicial,
        tenant.usuarioId,
        JSON.stringify({ totalCentavos, itensQtd: dto.itens.length }),
      ],
    );

    // NOTA TÉCNICA OBRIGATÓRIA:
    // A criação do pedido de compra NÃO altera estoques físicos nem reservas.
    return this.obterPedidoCompraPorId(client, tenant, pedidoId);
  }

  static async consolidarSolicitacoesEmPedido(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    dto: ConsolidarSolicitacoesDTO,
  ): Promise<PedidoCompra> {
    if (!dto.solicitacaoIds || dto.solicitacaoIds.length === 0) {
      throw new Error('Informe ao menos uma solicitação para consolidação.');
    }

    // Valida se as solicitações foram devidamente aprovadas
    const resSols = await client.query<{ id: string; status: StatusSolicitacaoCompra; filial_id: string }>(
      `SELECT id, status, filial_id
       FROM solicitacoes_compra
       WHERE id = ANY($1::uuid[]) AND empresa_id = $2`,
      [dto.solicitacaoIds, tenant.empresaId],
    );

    if (resSols.rows.length !== dto.solicitacaoIds.length) {
      throw new Error('Uma ou mais solicitações de compra informadas não foram encontradas.');
    }

    for (const sol of resSols.rows) {
      if (sol.status !== 'APROVADA_TOTAL' && sol.status !== 'APROVADA_PARCIAL') {
        throw new Error(
          `Apenas solicitações previamente aprovadas podem ser consolidadas (solicitação ${sol.id} com status ${sol.status}).`,
        );
      }
    }

    // Busca os itens aprovados das solicitações
    const resItens = await client.query<{
      id: string;
      solicitacao_id: string;
      produto_id: string;
      quantidade_aprovada: number;
      filial_id: string;
    }>(
      `SELECT sci.id, sci.solicitacao_id, sci.produto_id, sci.quantidade_aprovada, sc.filial_id
       FROM solicitacao_compra_itens sci
       JOIN solicitacoes_compra sc ON sc.id = sci.solicitacao_id
       WHERE sci.solicitacao_id = ANY($1::uuid[])
         AND sci.empresa_id = $2
         AND sci.quantidade_aprovada > 0`,
      [dto.solicitacaoIds, tenant.empresaId],
    );

    if (resItens.rows.length === 0) {
      throw new Error('Nenhum item aprovado com quantidade maior que zero foi encontrado para consolidação.');
    }

    const mapaPrecos = new Map<string, { precoCentavos: number; descontoCentavos: number }>();
    for (const p of dto.itensComPreco) {
      mapaPrecos.set(p.solicitacaoItemId, {
        precoCentavos: p.valorUnitarioCentavos,
        descontoCentavos: p.descontoCentavos || 0,
      });
    }

    // Monta DTO para criar o Pedido de Compra Consolidado
    const itensPedido = resItens.rows.map(item => {
      const preco = mapaPrecos.get(item.id) || { precoCentavos: 1000, descontoCentavos: 0 };
      return {
        produtoId: item.produto_id,
        filialDestinoId: item.filial_id,
        quantidadePedida: item.quantidade_aprovada,
        valorUnitarioCentavos: preco.precoCentavos,
        descontoCentavos: preco.descontoCentavos,
        solicitacaoItemId: item.id,
      };
    });

    const pedido = await this.criarPedidoCompra(client, tenant, {
      fornecedorId: dto.fornecedorId,
      condicoesPagamento: dto.condicoesPagamento,
      prazoEntregaPrevisto: dto.prazoEntregaPrevisto,
      valorFreteCentavos: dto.valorFreteCentavos,
      observacoes: dto.observacoes,
      enviarParaAprovacao: true,
      itens: itensPedido,
    });

    // Atualiza o status das solicitações consolidadas
    await client.query(
      `UPDATE solicitacoes_compra
       SET status = 'CONSOLIDADA',
           pedido_compra_consolidado_id = $1,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = ANY($2::uuid[]) AND empresa_id = $3`,
      [pedido.id, dto.solicitacaoIds, tenant.empresaId],
    );

    return pedido;
  }

  static async alterarStatusPedido(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    pedidoId: string,
    dto: AlterarStatusPedidoDTO,
  ): Promise<PedidoCompra> {
    const resAtual = await client.query<{
      status: StatusPedidoCompra;
      numero_pedido: string;
    }>(
      `SELECT status, numero_pedido
       FROM pedidos_compra
       WHERE id = $1 AND empresa_id = $2`,
      [pedidoId, tenant.empresaId],
    );

    const atual = resAtual.rows[0];
    if (!atual) throw new Error('Pedido de compra não encontrado nesta empresa.');

    if (atual.status === 'CONCLUIDO' || atual.status === 'CANCELADO') {
      throw new Error(`Não é permitido alterar o status de um pedido já ${atual.status}.`);
    }

    // Validação estrita do fluxo de estados:
    // Não considerar concluído apenas porque foi enviado ao fornecedor
    if (atual.status === 'ENVIADO_FORNECEDOR' && dto.novoStatus === 'CONCLUIDO') {
      throw new Error(
        'Um pedido enviado ao fornecedor não pode ser concluído diretamente sem confirmação e recebimento.',
      );
    }

    if (dto.novoStatus === 'CANCELADO') {
      if (!dto.motivo || dto.motivo.trim().length < 5) {
        throw new Error('O cancelamento do pedido exige justificativa com no mínimo 5 caracteres.');
      }
    }

    let camposUpdate = `status = $1, atualizado_em = CURRENT_TIMESTAMP`;
    const params: unknown[] = [dto.novoStatus, pedidoId, tenant.empresaId];

    if (dto.novoStatus === 'APROVADO') {
      camposUpdate += `, aprovado_por_id = '${tenant.usuarioId}', data_aprovacao = CURRENT_TIMESTAMP`;
    } else if (dto.novoStatus === 'ENVIADO_FORNECEDOR') {
      camposUpdate += `, data_envio = CURRENT_TIMESTAMP`;
    } else if (dto.novoStatus === 'CONFIRMADO_FORNECEDOR') {
      camposUpdate += `, data_confirmacao = CURRENT_TIMESTAMP`;
    } else if (dto.novoStatus === 'CANCELADO') {
      camposUpdate += `, cancelado_por_id = '${tenant.usuarioId}', data_cancelamento = CURRENT_TIMESTAMP, motivo_cancelamento = '${dto.motivo?.trim()}'`;
    }

    await client.query(
      `UPDATE pedidos_compra
       SET ${camposUpdate}
       WHERE id = $2 AND empresa_id = $3`,
      params,
    );

    // Registro no histórico de auditoria
    await client.query(
      `INSERT INTO pedidos_compra_historico (
        empresa_id, pedido_id, status_anterior, status_novo,
        usuario_id, motivo_alteracao, alteracoes_detalhe
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tenant.empresaId,
        pedidoId,
        atual.status,
        dto.novoStatus,
        tenant.usuarioId,
        dto.motivo?.trim() || `Transição de status para ${dto.novoStatus}`,
        JSON.stringify(dto.detalhes || {}),
      ],
    );

    // Garantia de que nenhuma alteração de status altera o estoque físico
    return this.obterPedidoCompraPorId(client, tenant, pedidoId);
  }

  static async listarPedidosCompra(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    filtros?: { fornecedorId?: string; status?: StatusPedidoCompra; filialId?: string },
  ): Promise<PedidoCompra[]> {
    let sql = `
      SELECT pc.*,
             f.razao_social AS razao_social_fornecedor,
             f.nome_fantasia AS nome_fantasia_fornecedor,
             u.nome AS nome_criador
      FROM pedidos_compra pc
      JOIN fornecedores f ON f.id = pc.fornecedor_id
      JOIN usuarios u ON u.id = pc.criado_por_id
      WHERE pc.empresa_id = $1
    `;
    const params: unknown[] = [tenant.empresaId];

    if (filtros?.fornecedorId) {
      params.push(filtros.fornecedorId);
      sql += ` AND pc.fornecedor_id = $${params.length}`;
    }

    if (filtros?.status) {
      params.push(filtros.status);
      sql += ` AND pc.status = $${params.length}`;
    }

    if (filtros?.filialId) {
      params.push(filtros.filialId);
      sql += ` AND (pc.filial_destino_principal_id = $${params.length} OR EXISTS (
        SELECT 1 FROM pedidos_compra_itens pci
        WHERE pci.pedido_id = pc.id AND pci.filial_destino_id = $${params.length}
      ))`;
    }

    sql += ` ORDER BY pc.criado_em DESC`;

    const res = await client.query(sql, params);
    const resultado: PedidoCompra[] = [];

    for (const row of res.rows) {
      const itens = await this.obterItensPedido(client, tenant.empresaId, row.id);
      resultado.push(this.mapearPedido(row, itens, []));
    }

    return resultado;
  }

  static async obterPedidoCompraPorId(
    client: pg.PoolClient | pg.Pool,
    tenant: ContextoTenant,
    id: string,
  ): Promise<PedidoCompra> {
    const res = await client.query(
      `SELECT pc.*,
              f.razao_social AS razao_social_fornecedor,
              f.nome_fantasia AS nome_fantasia_fornecedor,
              u.nome AS nome_criador
       FROM pedidos_compra pc
       JOIN fornecedores f ON f.id = pc.fornecedor_id
       JOIN usuarios u ON u.id = pc.criado_por_id
       WHERE pc.id = $1 AND pc.empresa_id = $2`,
      [id, tenant.empresaId],
    );

    const row = res.rows[0];
    if (!row) throw new Error('Pedido de compra não encontrado.');

    const itens = await this.obterItensPedido(client, tenant.empresaId, row.id);
    const historico = await this.obterHistoricoPedido(client, tenant.empresaId, row.id);

    return this.mapearPedido(row, itens, historico);
  }

  // ============================================================================
  // HELPERS PRIVADOS
  // ============================================================================

  private static mapearFornecedor(
    row: Record<string, unknown>,
    filiaisDesativadas: string[],
  ): Fornecedor {
    const dadosBancarios =
      typeof row.dados_bancarios === 'string'
        ? JSON.parse(row.dados_bancarios)
        : row.dados_bancarios || undefined;

    const documentos =
      typeof row.documentos === 'string'
        ? JSON.parse(row.documentos)
        : Array.isArray(row.documentos)
        ? row.documentos
        : undefined;

    return {
      id: String(row.id),
      empresaId: String(row.empresa_id),
      razaoSocial: String(row.razao_social),
      nomeFantasia: String(row.nome_fantasia),
      cnpj: String(row.cnpj),
      inscricaoEstadual: row.inscricao_estadual ? String(row.inscricao_estadual) : undefined,
      email: row.email ? String(row.email) : undefined,
      telefone: row.telefone ? String(row.telefone) : undefined,
      contatoPrincipal: row.contato_principal_nome
        ? {
            nome: String(row.contato_principal_nome),
            cargo: row.contato_principal_cargo ? String(row.contato_principal_cargo) : undefined,
            telefone: row.contato_principal_telefone
              ? String(row.contato_principal_telefone)
              : undefined,
            email: row.contato_principal_email ? String(row.contato_principal_email) : undefined,
          }
        : undefined,
      logradouro: row.logradouro ? String(row.logradouro) : undefined,
      numero: row.numero ? String(row.numero) : undefined,
      complemento: row.complemento ? String(row.complemento) : undefined,
      bairro: row.bairro ? String(row.bairro) : undefined,
      cidade: row.cidade ? String(row.cidade) : undefined,
      uf: row.uf ? String(row.uf) : undefined,
      cep: row.cep ? String(row.cep) : undefined,
      condicoesComerciais: row.condicoes_comerciais
        ? String(row.condicoes_comerciais)
        : undefined,
      prazoEntregaDias: Number(row.prazo_entrega_dias || 5),
      dadosBancarios,
      observacoes: row.observacoes ? String(row.observacoes) : undefined,
      documentos,
      status: row.status as StatusFornecedor,
      solicitadoPorId: row.solicitado_por_id ? String(row.solicitado_por_id) : undefined,
      aprovadoPorId: row.aprovado_por_id ? String(row.aprovado_por_id) : undefined,
      dataAprovacao: row.data_aprovacao ? String(row.data_aprovacao) : undefined,
      motivoRejeicao: row.motivo_rejeicao ? String(row.motivo_rejeicao) : undefined,
      motivoBloqueio: row.motivo_bloqueio ? String(row.motivo_bloqueio) : undefined,
      bloqueadoPorId: row.bloqueado_por_id ? String(row.bloqueado_por_id) : undefined,
      dataBloqueio: row.data_bloqueio ? String(row.data_bloqueio) : undefined,
      criadoEm: String(row.criado_em),
      atualizadoEm: String(row.atualizado_em),
      desativadoParaFiliais: filiaisDesativadas,
    };
  }

  private static mapearPedido(
    row: Record<string, unknown>,
    itens: PedidoCompraItem[],
    historico: PedidoCompraHistorico[],
  ): PedidoCompra {
    return {
      id: String(row.id),
      empresaId: String(row.empresa_id),
      fornecedorId: String(row.fornecedor_id),
      razaoSocialFornecedor: row.razao_social_fornecedor
        ? String(row.razao_social_fornecedor)
        : undefined,
      nomeFantasiaFornecedor: row.nome_fantasia_fornecedor
        ? String(row.nome_fantasia_fornecedor)
        : undefined,
      numeroPedido: String(row.numero_pedido),
      numeroSequencial: Number(row.numero_sequencial),
      filialDestinoPrincipalId: row.filial_destino_principal_id
        ? String(row.filial_destino_principal_id)
        : undefined,
      destinadoMultiplasFiliais: Boolean(row.destinado_multiplas_filiais),
      status: row.status as StatusPedidoCompra,
      valorSubtotalCentavos: Number(row.valor_subtotal_centavos || 0),
      valorDescontoCentavos: Number(row.valor_desconto_centavos || 0),
      valorFreteCentavos: Number(row.valor_frete_centavos || 0),
      valorTotalCentavos: Number(row.valor_total_centavos || 0),
      condicoesPagamento: row.condicoes_pagamento ? String(row.condicoes_pagamento) : undefined,
      prazoEntregaPrevisto: row.prazo_entrega_previsto
        ? String(row.prazo_entrega_previsto)
        : undefined,
      observacoes: row.observacoes ? String(row.observacoes) : undefined,
      criadoPorId: String(row.criado_por_id),
      nomeCriador: row.nome_criador ? String(row.nome_criador) : undefined,
      aprovadoPorId: row.aprovado_por_id ? String(row.aprovado_por_id) : undefined,
      dataAprovacao: row.data_aprovacao ? String(row.data_aprovacao) : undefined,
      dataEnvio: row.data_envio ? String(row.data_envio) : undefined,
      dataConfirmacao: row.data_confirmacao ? String(row.data_confirmacao) : undefined,
      canceladoPorId: row.cancelado_por_id ? String(row.cancelado_por_id) : undefined,
      dataCancelamento: row.data_cancelamento ? String(row.data_cancelamento) : undefined,
      motivoCancelamento: row.motivo_cancelamento ? String(row.motivo_cancelamento) : undefined,
      criadoEm: String(row.criado_em),
      atualizadoEm: String(row.atualizado_em),
      itens,
      historico,
    };
  }

  private static async obterItensSolicitacao(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    solicitacaoId: string,
  ): Promise<SolicitacaoCompraItem[]> {
    const res = await client.query<{
      id: string;
      empresa_id: string;
      solicitacao_id: string;
      produto_id: string;
      quantidade_solicitada: number;
      quantidade_aprovada: number | null;
      justificativa_item: string | null;
      nome_comercial: string;
      codigo_barras: string;
    }>(
      `SELECT sci.*, p.nome_comercial, '' AS codigo_barras
       FROM solicitacao_compra_itens sci
       JOIN produtos p ON p.id = sci.produto_id
       WHERE sci.solicitacao_id = $1 AND sci.empresa_id = $2`,
      [solicitacaoId, empresaId],
    );

    return res.rows.map(i => ({
      id: i.id,
      empresaId: i.empresa_id,
      solicitacaoId: i.solicitacao_id,
      produtoId: i.produto_id,
      nomeProduto: i.nome_comercial,
      codigoBarras: i.codigo_barras,
      quantidadeSolicitada: Number(i.quantidade_solicitada),
      quantidadeAprovada: i.quantidade_aprovada !== null ? Number(i.quantidade_aprovada) : undefined,
      justificativaItem: i.justificativa_item || undefined,
    }));
  }

  private static async obterItensPedido(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    pedidoId: string,
  ): Promise<PedidoCompraItem[]> {
    const res = await client.query<{
      id: string;
      empresa_id: string;
      pedido_id: string;
      produto_id: string;
      filial_destino_id: string;
      quantidade_pedida: number;
      quantidade_entregue: number;
      valor_unitario_centavos: string;
      desconto_centavos: string;
      valor_total_centavos: string;
      solicitacao_item_id: string | null;
      nome_comercial: string;
      codigo_barras: string;
      nome_filial: string;
    }>(
      `SELECT pci.*, p.nome_comercial, '' AS codigo_barras, f.nome AS nome_filial
       FROM pedidos_compra_itens pci
       JOIN produtos p ON p.id = pci.produto_id
       JOIN filiais f ON f.id = pci.filial_destino_id
       WHERE pci.pedido_id = $1 AND pci.empresa_id = $2`,
      [pedidoId, empresaId],
    );

    return res.rows.map(i => ({
      id: i.id,
      empresaId: i.empresa_id,
      pedidoId: i.pedido_id,
      produtoId: i.produto_id,
      nomeProduto: i.nome_comercial,
      codigoBarras: i.codigo_barras,
      filialDestinoId: i.filial_destino_id,
      nomeFilialDestino: i.nome_filial,
      quantidadePedida: Number(i.quantidade_pedida),
      quantidadeEntregue: Number(i.quantidade_entregue || 0),
      valorUnitarioCentavos: Number(i.valor_unitario_centavos),
      descontoCentavos: Number(i.desconto_centavos || 0),
      valorTotalCentavos: Number(i.valor_total_centavos),
      solicitacaoItemId: i.solicitacao_item_id || undefined,
    }));
  }

  private static async obterHistoricoPedido(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    pedidoId: string,
  ): Promise<PedidoCompraHistorico[]> {
    const res = await client.query<{
      id: string;
      empresa_id: string;
      pedido_id: string;
      status_anterior: string | null;
      status_novo: string;
      usuario_id: string;
      motivo_alteracao: string | null;
      alteracoes_detalhe: Record<string, unknown> | null;
      data_registro: string;
      nome_usuario: string;
    }>(
      `SELECT pch.*, u.nome AS nome_usuario
       FROM pedidos_compra_historico pch
       JOIN usuarios u ON u.id = pch.usuario_id
       WHERE pch.pedido_id = $1 AND pch.empresa_id = $2
       ORDER BY pch.data_registro ASC`,
      [pedidoId, empresaId],
    );

    return res.rows.map(h => ({
      id: h.id,
      empresaId: h.empresa_id,
      pedidoId: h.pedido_id,
      statusAnterior: h.status_anterior || undefined,
      statusNovo: h.status_novo,
      usuarioId: h.usuario_id,
      nomeUsuario: h.nome_usuario,
      motivoAlteracao: h.motivo_alteracao || undefined,
      alteracoesDetalhe: h.alteracoes_detalhe || undefined,
      dataRegistro: h.data_registro,
    }));
  }
}
