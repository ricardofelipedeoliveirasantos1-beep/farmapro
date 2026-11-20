import pg from 'pg';

export interface CriarCargoInput {
  nome: string;
  descricao?: string;
  nivelAcesso: 'ADMIN' | 'GERENTE' | 'FARMACEUTICO' | 'OPERADOR_CAIXA' | 'ATENDENTE';
  permissoes: string[];
}

export class CargosService {
  /**
   * Lista todos os cargos cadastrados para a empresa com suas permissões associadas.
   */
  static async listarCargos(client: pg.PoolClient | pg.Pool, empresaId: string) {
    const res = await client.query<{
      id: string;
      nome: string;
      descricao: string | null;
      nivel_acesso: string;
      status: string;
      criado_em: Date;
    }>(`
      SELECT id, nome, descricao, nivel_acesso, status, criado_em
      FROM cargos
      WHERE empresa_id = $1
      ORDER BY nome ASC;
    `, [empresaId]);

    const lista = [];

    for (const c of res.rows) {
      const permsRes = await client.query<{ permissao_id: string }>(`
        SELECT permissao_id FROM cargos_permissoes WHERE cargo_id = $1 ORDER BY permissao_id ASC;
      `, [c.id]);

      lista.push({
        id: c.id,
        nome: c.nome,
        descricao: c.descricao,
        nivelAcesso: c.nivel_acesso,
        status: c.status,
        criadoEm: c.criado_em,
        permissoes: permsRes.rows.map(p => p.permissao_id),
      });
    }

    return lista;
  }

  /**
   * Retorna o catálogo completo de permissões atômicas disponíveis no FarmaPro.
   */
  static async listarCatalogoPermissoes(client: pg.PoolClient | pg.Pool) {
    const res = await client.query<{
      id: string;
      modulo: string;
      nome: string;
      descricao: string;
    }>(`
      SELECT id, modulo, nome, descricao
      FROM permissoes
      ORDER BY modulo ASC, nome ASC;
    `);

    return res.rows;
  }

  /**
   * Cria um novo cargo (predefinido ou personalizado) na empresa.
   * REGRA: Proibida a criação de cargo com o nome exclusivo "Estoquista".
   */
  static async criarCargo(client: pg.PoolClient | pg.Pool, empresaId: string, input: CriarCargoInput) {
    const nomeLimpo = input.nome.trim();

    if (/^estoquista$/i.test(nomeLimpo)) {
      throw new Error(
        'O cargo predefinido "Estoquista" foi removido da arquitetura FarmaPro. ' +
        'As permissões de estoque devem ser atribuídas a cargos funcionais (Gerente, Farmacêutico, Atendente, etc.).'
      );
    }

    const resCargo = await client.query<{ id: string }>(`
      INSERT INTO cargos (empresa_id, nome, descricao, nivel_acesso)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `, [empresaId, nomeLimpo, input.descricao || null, input.nivelAcesso]);

    const cargoId = resCargo.rows[0]!.id;

    // Inserir permissões associadas
    if (input.permissoes && input.permissoes.length > 0) {
      for (const p of input.permissoes) {
        await client.query(`
          INSERT INTO cargos_permissoes (cargo_id, permissao_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [cargoId, p]);
      }
    }

    return { id: cargoId, nome: nomeLimpo, nivelAcesso: input.nivelAcesso };
  }

  /**
   * Atualiza as permissões e dados de um cargo existente.
   */
  static async atualizarCargo(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    cargoId: string,
    input: Partial<CriarCargoInput>,
  ) {
    if (input.nome && /^estoquista$/i.test(input.nome.trim())) {
      throw new Error('Não é permitido renomear cargos para "Estoquista".');
    }

    // 1. Atualizar dados cadastrais
    if (input.nome || input.descricao !== undefined || input.nivelAcesso) {
      await client.query(`
        UPDATE cargos
        SET 
          nome = COALESCE($1, nome),
          descricao = COALESCE($2, descricao),
          nivel_acesso = COALESCE($3, nivel_acesso),
          atualizado_em = NOW()
        WHERE id = $4 AND empresa_id = $5;
      `, [input.nome || null, input.descricao, input.nivelAcesso || null, cargoId, empresaId]);
    }

    // 2. Substituir permissões se fornecidas
    if (input.permissoes) {
      await client.query(`DELETE FROM cargos_permissoes WHERE cargo_id = $1;`, [cargoId]);
      for (const p of input.permissoes) {
        await client.query(`
          INSERT INTO cargos_permissoes (cargo_id, permissao_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [cargoId, p]);
      }
    }

    return { sucesso: true };
  }
}
