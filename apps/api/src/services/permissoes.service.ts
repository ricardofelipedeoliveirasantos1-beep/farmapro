import pg from 'pg';

export interface PermissoesEfetivasResultado {
  cargoId: string;
  cargoNome: string;
  nivelAcesso: 'ADMIN' | 'GERENTE' | 'FARMACEUTICO' | 'OPERADOR_CAIXA' | 'ATENDENTE';
  papelEmpresa: 'PROPRIETARIO' | 'ADMINISTRADOR' | 'COLABORADOR';
  permissoesBaseCargo: string[];
  permissoesConcedidasExcecao: string[];
  permissoesRevogadasExcecao: string[];
  permissoesEfetivas: string[];
}

export class PermissoesService {
  /**
   * Calcula as permissões efetivas de um colaborador em determinada filial da empresa.
   * Regra de Composição:
   * 1. Permissões base do Cargo associado ao usuário na filial.
   * 2. + Permissões concedidas excepcionalmente para a filial.
   * 3. - Permissões revogadas excepcionalmente para a filial.
   * 4. Proprietário da empresa possui acesso irrestrito a todas as permissões.
   */
  static async calcularPermissoesEfetivas(
    client: pg.PoolClient | pg.Pool,
    params: {
      usuarioId: string;
      empresaId: string;
      filialId: string;
    },
  ): Promise<PermissoesEfetivasResultado | null> {
    // 1. Obter papel geral do usuário na empresa
    const resEmpresa = await client.query<{ papel_empresa: string; status: string }>(`
      SELECT papel_empresa, status
      FROM usuarios_empresas
      WHERE usuario_id = $1 AND empresa_id = $2;
    `, [params.usuarioId, params.empresaId]);

    const empresaRow = resEmpresa.rows[0];
    if (!empresaRow || empresaRow.status !== 'ATIVO') {
      return null;
    }

    const papelEmpresa = empresaRow.papel_empresa as 'PROPRIETARIO' | 'ADMINISTRADOR' | 'COLABORADOR';

    // 2. Se for PROPRIETARIO, retorna todas as permissões cadastradas no sistema
    if (papelEmpresa === 'PROPRIETARIO') {
      const todasPerms = await client.query<{ id: string }>(`SELECT id FROM permissoes ORDER BY id;`);
      const listaTodas = todasPerms.rows.map(r => r.id);
      return {
        cargoId: 'proprietario',
        cargoNome: 'Proprietário',
        nivelAcesso: 'ADMIN',
        papelEmpresa: 'PROPRIETARIO',
        permissoesBaseCargo: listaTodas,
        permissoesConcedidasExcecao: [],
        permissoesRevogadasExcecao: [],
        permissoesEfetivas: listaTodas,
      };
    }

    // 3. Obter vínculo do usuário com a filial e seu cargo correspondente
    const resFilial = await client.query<{
      usuario_filial_id: string;
      cargo_id: string;
      cargo_nome: string;
      nivel_acesso: string;
      status: string;
    }>(`
      SELECT 
        uf.id as usuario_filial_id,
        c.id as cargo_id,
        c.nome as cargo_nome,
        c.nivel_acesso,
        uf.status
      FROM usuarios_filiais uf
      JOIN cargos c ON c.id = uf.cargo_id
      WHERE uf.usuario_id = $1 AND uf.filial_id = $2 AND uf.empresa_id = $3;
    `, [params.usuarioId, params.filialId, params.empresaId]);

    const filialRow = resFilial.rows[0];
    if (!filialRow || filialRow.status !== 'ATIVO') {
      return null;
    }

    const { usuario_filial_id, cargo_id, cargo_nome, nivel_acesso } = filialRow;

    // 4. Buscar permissões base do cargo
    const resBase = await client.query<{ permissao_id: string }>(`
      SELECT permissao_id FROM cargos_permissoes WHERE cargo_id = $1;
    `, [cargo_id]);
    const baseSet = new Set(resBase.rows.map(r => r.permissao_id));

    // 5. Buscar exceções registradas para a filial específica
    const resExcecoes = await client.query<{ permissao_id: string; concedida: boolean }>(`
      SELECT permissao_id, concedida 
      FROM usuarios_filiais_permissoes 
      WHERE usuario_filial_id = $1;
    `, [usuario_filial_id]);

    const concedidas: string[] = [];
    const revogadas: string[] = [];

    for (const exc of resExcecoes.rows) {
      if (exc.concedida) {
        concedidas.push(exc.permissao_id);
        baseSet.add(exc.permissao_id);
      } else {
        revogadas.push(exc.permissao_id);
        baseSet.delete(exc.permissao_id);
      }
    }

    return {
      cargoId: cargo_id,
      cargoNome: cargo_nome,
      nivelAcesso: nivel_acesso as 'ADMIN' | 'GERENTE' | 'FARMACEUTICO' | 'OPERADOR_CAIXA' | 'ATENDENTE',
      papelEmpresa,
      permissoesBaseCargo: resBase.rows.map(r => r.permissao_id),
      permissoesConcedidasExcecao: concedidas,
      permissoesRevogadasExcecao: revogadas,
      permissoesEfetivas: Array.from(baseSet).sort(),
    };
  }
}
