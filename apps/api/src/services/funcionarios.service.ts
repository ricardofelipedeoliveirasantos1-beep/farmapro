import pg from 'pg';
import { CryptoService } from './crypto.service.js';
import { PermissoesService } from './permissoes.service.js';

export interface CriarFuncionarioInput {
  nome: string;
  email: string;
  cpf: string;
  senhaInicial: string;
  telefone?: string;
  crfNumero?: string;
  crfUf?: string;
  eResponsavelTecnico?: boolean;
  papelEmpresa?: 'ADMINISTRADOR' | 'COLABORADOR';
  filiais: Array<{
    filialId: string;
    cargoId: string;
    eFilialPadrao?: boolean;
    excecoesPermissoes?: Array<{
      permissaoId: string;
      concedida: boolean;
      motivo?: string;
    }>;
  }>;
}

export class FuncionariosService {
  /**
   * Lista colaboradores da empresa com seus cargos e filiais associadas.
   */
  static async listarFuncionarios(client: pg.PoolClient | pg.Pool, empresaId: string) {
    const res = await client.query<{
      usuario_id: string;
      nome: string;
      email: string;
      cpf: string;
      status_usuario: string;
      papel_empresa: string;
      crf_numero: string | null;
      crf_uf: string | null;
      e_responsavel_tecnico: boolean;
      ultimo_acesso_em: Date | null;
      criado_em: Date;
    }>(`
      SELECT 
        u.id as usuario_id,
        u.nome,
        u.email,
        u.cpf,
        u.status as status_usuario,
        ue.papel_empresa,
        u.crf_numero,
        u.crf_uf,
        u.e_responsavel_tecnico,
        u.ultimo_acesso_em,
        ue.criado_em
      FROM usuarios u
      JOIN usuarios_empresas ue ON ue.usuario_id = u.id
      WHERE ue.empresa_id = $1
      ORDER BY u.nome ASC;
    `, [empresaId]);

    const lista = [];

    for (const u of res.rows) {
      const filiaisRes = await client.query<{
        filial_id: string;
        filial_nome: string;
        cargo_id: string;
        cargo_nome: string;
        nivel_acesso: string;
        e_filial_padrao: boolean;
        status_filial: string;
      }>(`
        SELECT 
          f.id as filial_id,
          f.nome as filial_nome,
          c.id as cargo_id,
          c.nome as cargo_nome,
          c.nivel_acesso,
          uf.e_filial_padrao,
          uf.status as status_filial
        FROM usuarios_filiais uf
        JOIN filiais f ON f.id = uf.filial_id
        JOIN cargos c ON c.id = uf.cargo_id
        WHERE uf.usuario_id = $1 AND uf.empresa_id = $2;
      `, [u.usuario_id, empresaId]);

      lista.push({
        id: u.usuario_id,
        nome: u.nome,
        email: u.email,
        cpf: u.cpf,
        status: u.status_usuario,
        papelEmpresa: u.papel_empresa,
        crfNumero: u.crf_numero,
        crfUf: u.crf_uf,
        eResponsavelTecnico: u.e_responsavel_tecnico,
        ultimoAcessoEm: u.ultimo_acesso_em,
        criadoEm: u.criado_em,
        filiais: filiaisRes.rows.map(f => ({
          filialId: f.filial_id,
          filialNome: f.filial_nome,
          cargoId: f.cargo_id,
          cargoNome: f.cargo_nome,
          nivelAcesso: f.nivel_acesso,
          eFilialPadrao: f.e_filial_padrao,
          status: f.status_filial,
        })),
      });
    }

    return lista;
  }

  /**
   * Cadastra novo colaborador vinculado à empresa e a filiais com cargos específicos.
   */
  static async cadastrarFuncionario(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    input: CriarFuncionarioInput,
    autorizadoPorId: string,
  ) {
    const emailLimpo = input.email.trim().toLowerCase();
    const cpfLimpo = input.cpf.replace(/\D/g, '');

    // 1. Verificar duplicidade de e-mail ou CPF
    const resCheck = await client.query(`
      SELECT id FROM usuarios WHERE email = $1 OR cpf = $2;
    `, [emailLimpo, cpfLimpo]);

    let usuarioId: string;

    if (resCheck.rows.length > 0) {
      usuarioId = resCheck.rows[0].id;
      // Verificar se já está vinculado à empresa
      const resVinc = await client.query(`
        SELECT id FROM usuarios_empresas WHERE usuario_id = $1 AND empresa_id = $2;
      `, [usuarioId, empresaId]);
      if (resVinc.rows.length > 0) {
        throw new Error('Este funcionário já possui vínculo ativo com esta farmácia.');
      }
    } else {
      // Criar usuário com hash Argon2id
      const hashSenha = await CryptoService.gerarHashSenha(input.senhaInicial);
      const resInsertUser = await client.query<{ id: string }>(`
        INSERT INTO usuarios (nome, email, cpf, hash_senha, telefone, crf_numero, crf_uf, e_responsavel_tecnico)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id;
      `, [
        input.nome.trim(),
        emailLimpo,
        cpfLimpo,
        hashSenha,
        input.telefone || null,
        input.crfNumero || null,
        input.crfUf || null,
        input.eResponsavelTecnico || false,
      ]);
      usuarioId = resInsertUser.rows[0]!.id;
    }

    // 2. Criar Vínculo com a Empresa
    await client.query(`
      INSERT INTO usuarios_empresas (usuario_id, empresa_id, papel_empresa)
      VALUES ($1, $2, $3);
    `, [usuarioId, empresaId, input.papelEmpresa || 'COLABORADOR']);

    // 3. Vincular às Filiais e Cargos
    for (const f of input.filiais) {
      const resUf = await client.query<{ id: string }>(`
        INSERT INTO usuarios_filiais (usuario_id, empresa_id, filial_id, cargo_id, e_filial_padrao)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `, [usuarioId, empresaId, f.filialId, f.cargoId, f.eFilialPadrao || false]);

      const usuarioFilialId = resUf.rows[0]!.id;

      // Inserir exceções de permissão na filial, se houver
      if (f.excecoesPermissoes && f.excecoesPermissoes.length > 0) {
        for (const exc of f.excecoesPermissoes) {
          await client.query(`
            INSERT INTO usuarios_filiais_permissoes (usuario_filial_id, permissao_id, concedida, motivo_concessao, concedido_por_id)
            VALUES ($1, $2, $3, $4, $5);
          `, [usuarioFilialId, exc.permissaoId, exc.concedida, exc.motivo || null, autorizadoPorId]);
        }
      }
    }

    return { id: usuarioId, nome: input.nome, email: emailLimpo };
  }

  /**
   * Altera o status de acesso do funcionário (ATIVO, BLOQUEADO, INATIVO).
   */
  static async alterarStatusFuncionario(
    client: pg.PoolClient | pg.Pool,
    empresaId: string,
    usuarioId: string,
    novoStatus: 'ATIVO' | 'BLOQUEADO' | 'INATIVO',
  ) {
    // 1. Atualizar vínculo na empresa
    const res = await client.query(`
      UPDATE usuarios_empresas
      SET status = $1, atualizado_em = NOW()
      WHERE usuario_id = $2 AND empresa_id = $3;
    `, [novoStatus, usuarioId, empresaId]);

    if (res.rowCount === 0) {
      throw new Error('Funcionário não encontrado nesta empresa.');
    }

    // 2. Se for bloqueado, revoga todas as sessões ativas do usuário
    if (novoStatus === 'BLOQUEADO') {
      await client.query(`
        UPDATE usuarios_sessoes
        SET revogado_em = NOW()
        WHERE usuario_id = $1 AND empresa_id = $2 AND revogado_em IS NULL;
      `, [usuarioId, empresaId]);
    }
  }

  /**
   * Configura ou redefine o PIN de 6 dígitos de um colaborador para determinado terminal de PDV.
   */
  static async configurarPinDispositivo(
    client: pg.PoolClient | pg.Pool,
    params: {
      empresaId: string;
      filialId: string;
      usuarioId: string;
      dispositivoId: string;
      pinNovo: string;
    },
  ) {
    const pinHash = await CryptoService.gerarHashPin(params.pinNovo);

    await client.query(`
      INSERT INTO usuarios_pins (usuario_id, empresa_id, filial_id, dispositivo_id, pin_hash, tentativas_falhas, bloqueado_ate, ativo)
      VALUES ($1, $2, $3, $4, $5, 0, NULL, TRUE)
      ON CONFLICT (usuario_id, dispositivo_id) DO UPDATE SET
        pin_hash = EXCLUDED.pin_hash,
        tentativas_falhas = 0,
        bloqueado_ate = NULL,
        ativo = TRUE,
        atualizado_em = NOW();
    `, [params.usuarioId, params.empresaId, params.filialId, params.dispositivoId, pinHash]);

    return { sucesso: true, mensagem: 'PIN de 6 dígitos configurado com sucesso para este terminal.' };
  }

  /**
   * Obtém a lista de permissões efetivas para pré-visualização antes de salvar.
   */
  static async obterPermissoesEfetivasPreview(
    client: pg.PoolClient | pg.Pool,
    params: {
      usuarioId: string;
      empresaId: string;
      filialId: string;
    },
  ) {
    return PermissoesService.calcularPermissoesEfetivas(client, params);
  }
}
