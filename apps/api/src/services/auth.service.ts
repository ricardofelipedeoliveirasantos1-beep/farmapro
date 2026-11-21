import pg from 'pg';
import { CryptoService } from './crypto.service.js';
import { JwtService, PayloadAccessToken } from './jwt.service.js';
import { PermissoesService } from './permissoes.service.js';

export interface UsuarioAutenticadoDTO {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  eResponsavelTecnico: boolean;
  status: string;
}

export interface EmpresaVinculadaDTO {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  papelEmpresa: 'PROPRIETARIO' | 'ADMINISTRADOR' | 'COLABORADOR';
  filiais: Array<{
    id: string;
    codigoFilial: string;
    nome: string;
    eMatriz: boolean;
    cargoNome: string;
  }>;
}

export class AuthService {
  /**
   * Realiza login padrão por e-mail e senha.
   */
  static async login(
    client: pg.PoolClient | pg.Pool,
    params: {
      email: string;
      senha: string;
      ip?: string;
      userAgent?: string;
    },
  ) {
    const emailLimpo = params.email.trim().toLowerCase();

    // 1. Verificar Rate Limiting por e-mail / IP
    const chaveRateLimit = `login:${emailLimpo}`;
    const resRate = await client.query<{ tentativas: number; bloqueado_ate: Date | null }>(`
      SELECT tentativas, bloqueado_ate 
      FROM tentativas_login_rate_limit 
      WHERE chave_identificador = $1;
    `, [chaveRateLimit]);

    if (resRate.rows.length > 0 && resRate.rows[0]) {
      const { bloqueado_ate } = resRate.rows[0];
      if (bloqueado_ate && new Date(bloqueado_ate) > new Date()) {
        const segundosRestantes = Math.ceil((new Date(bloqueado_ate).getTime() - Date.now()) / 1000);
        throw new Error(`Muitas tentativas incorretas. Conta temporariamente bloqueada. Tente novamente em ${segundosRestantes} segundos.`);
      }
    }

    // 2. Buscar Usuário
    const resUser = await client.query<{
      id: string;
      nome: string;
      email: string;
      cpf: string;
      hash_senha: string;
      e_responsavel_tecnico: boolean;
      status: string;
    }>(`
      SELECT id, nome, email, cpf, hash_senha, e_responsavel_tecnico, status
      FROM usuarios
      WHERE email = $1;
    `, [emailLimpo]);

    const usuario = resUser.rows[0];
    if (!usuario) {
      await this.registrarTentativaFalha(client, chaveRateLimit);
      throw new Error('E-mail ou senha incorretos.');
    }

    // 3. Validar Status do Usuário
    if (usuario.status === 'BLOQUEADO') {
      throw new Error('Acesso bloqueado pelo administrador da farmácia.');
    }
    if (usuario.status === 'INATIVO') {
      throw new Error('Usuário inativo. Entre em contato com seu gestor.');
    }

    // 4. Validar Senha via Argon2id
    const senhaCorreta = await CryptoService.verificarSenha(usuario.hash_senha, params.senha);
    if (!senhaCorreta) {
      await this.registrarTentativaFalha(client, chaveRateLimit);
      throw new Error('E-mail ou senha incorretos.');
    }

    // Limpar tentativas de rate limit após sucesso
    await client.query(`DELETE FROM tentativas_login_rate_limit WHERE chave_identificador = $1;`, [chaveRateLimit]);

    // 5. Atualizar último acesso
    await client.query(`UPDATE usuarios SET ultimo_acesso_em = NOW() WHERE id = $1;`, [usuario.id]);

    // 6. Buscar Empresas e Filiais Vinculadas
    const empresas = await this.buscarEmpresasEFiliaisUsuario(client, usuario.id);

    // 7. Gerar Tokens de Sessão
    const payloadJwt: PayloadAccessToken = {
      sub: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    };

    const accessToken = JwtService.gerarAccessToken(payloadJwt);
    const refreshToken = CryptoService.gerarTokenAleatorio(48);
    const refreshTokenHash = CryptoService.gerarHashSha256(refreshToken);

    // Salvar sessão
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    await client.query(`
      INSERT INTO usuarios_sessoes (usuario_id, refresh_token_hash, ip_origem, user_agent, expira_em)
      VALUES ($1, $2, $3, $4, $5);
    `, [usuario.id, refreshTokenHash, params.ip || null, params.userAgent || null, expiraEm]);

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cpf: usuario.cpf,
        eResponsavelTecnico: usuario.e_responsavel_tecnico,
        status: usuario.status,
      },
      empresas,
    };
  }

  /**
   * Estabelece o Contexto Multiempresa de forma segura a partir da identidade autenticada.
   * NUNCA confia em IDs enviados livremente: valida a associação estrita no banco.
   */
  static async selecionarContextoEmpresaFilial(
    client: pg.PoolClient | pg.Pool,
    params: {
      usuarioId: string;
      empresaId: string;
      filialId: string;
    },
  ) {
    // 1. Validar que o usuário está ATIVO
    const resUser = await client.query<{ nome: string; email: string; status: string }>(`
      SELECT nome, email, status FROM usuarios WHERE id = $1;
    `, [params.usuarioId]);

    const usuario = resUser.rows[0];
    if (!usuario || usuario.status !== 'ATIVO') {
      throw new Error('Usuário inválido ou inativo.');
    }

    const { nome, email } = usuario;

    // 2. Calcular permissões efetivas (já valida se o usuário possui vínculo ativo com empresa e filial)
    const perms = await PermissoesService.calcularPermissoesEfetivas(client, params);
    if (!perms) {
      throw new Error('Usuário não possui autorização ou vínculo ativo com a empresa/filial selecionada.');
    }

    // 3. Emitir novo Access Token agora contendo o Tenant validado e as permissões atômicas
    const payloadComTenant: PayloadAccessToken = {
      sub: params.usuarioId,
      nome,
      email,
      empresaId: params.empresaId,
      filialId: params.filialId,
      papelEmpresa: perms.papelEmpresa,
      cargoNome: perms.cargoNome,
      nivelAcesso: perms.nivelAcesso,
      permissoes: perms.permissoesEfetivas,
      origemPin: false,
    };

    const novoAccessToken = JwtService.gerarAccessToken(payloadComTenant);

    return {
      accessToken: novoAccessToken,
      tenant: {
        empresaId: params.empresaId,
        filialId: params.filialId,
      },
      cargo: {
        id: perms.cargoId,
        nome: perms.cargoNome,
        nivelAcesso: perms.nivelAcesso,
        papelEmpresa: perms.papelEmpresa,
      },
      permissoesEfetivas: perms.permissoesEfetivas,
    };
  }

  /**
   * Autenticação rápida por PIN de 6 dígitos em terminal pré-autorizado.
   */
  static async loginPin(
    client: pg.PoolClient | pg.Pool,
    params: {
      pin: string;
      usuarioId: string;
      identificadorHardware: string;
    },
  ) {
    // 1. Validar formato do PIN
    if (!/^\d{6}$/.test(params.pin)) {
      throw new Error('O PIN deve conter exatamente 6 dígitos numéricos.');
    }

    // 2. Validar se o dispositivo existe e está ativo
    const resDisp = await client.query<{
      id: string;
      empresa_id: string;
      filial_id: string;
      nome_terminal: string;
      ativo: boolean;
    }>(`
      SELECT id, empresa_id, filial_id, nome_terminal, ativo
      FROM dispositivos_autorizados
      WHERE identificador_hardware = $1;
    `, [params.identificadorHardware]);

    const disp = resDisp.rows[0];
    if (!disp || !disp.ativo) {
      throw new Error('Dispositivo não autorizado para login rápido por PIN.');
    }

    // 3. Buscar cadastro do PIN do usuário no dispositivo
    const resPin = await client.query<{
      id: string;
      pin_hash: string;
      tentativas_falhas: number;
      bloqueado_ate: Date | null;
      ativo: boolean;
    }>(`
      SELECT id, pin_hash, tentativas_falhas, bloqueado_ate, ativo
      FROM usuarios_pins
      WHERE usuario_id = $1 AND dispositivo_id = $2;
    `, [params.usuarioId, disp.id]);

    const pinRecord = resPin.rows[0];
    if (!pinRecord || !pinRecord.ativo) {
      throw new Error('Funcionário não possui PIN configurado para este terminal.');
    }

    // 4. Verificar se o PIN está bloqueado por tentativas excessivas
    if (pinRecord.bloqueado_ate && new Date(pinRecord.bloqueado_ate) > new Date()) {
      const segundos = Math.ceil((new Date(pinRecord.bloqueado_ate).getTime() - Date.now()) / 1000);
      throw new Error(`PIN temporariamente bloqueado por excesso de tentativas. Aguarde ${segundos} segundos.`);
    }

    // 5. Validar o PIN via Argon2id
    const pinCorreto = await CryptoService.verificarPin(pinRecord.pin_hash, params.pin);

    if (!pinCorreto) {
      const novasFalhas = pinRecord.tentativas_falhas + 1;
      let bloqueio: Date | null = null;

      if (novasFalhas >= 3) {
        bloqueio = new Date(Date.now() + 15 * 60 * 1000); // Bloqueio por 15 minutos
      }

      await client.query(`
        UPDATE usuarios_pins
        SET tentativas_falhas = $1, bloqueado_ate = $2, atualizado_em = NOW()
        WHERE id = $3;
      `, [novasFalhas, bloqueio, pinRecord.id]);

      if (bloqueio) {
        throw new Error('PIN bloqueado por 15 minutos devido a 3 tentativas incorretas.');
      }

      throw new Error(`PIN incorreto. Tentativa ${novasFalhas} de 3.`);
    }

    // Resetar tentativas falhas
    await client.query(`
      UPDATE usuarios_pins
      SET tentativas_falhas = 0, bloqueado_ate = NULL, atualizado_em = NOW()
      WHERE id = $1;
    `, [pinRecord.id]);

    // 6. Buscar dados do usuário e calcular permissões na filial do terminal
    const resUser = await client.query<{ nome: string; email: string; status: string }>(`
      SELECT nome, email, status FROM usuarios WHERE id = $1;
    `, [params.usuarioId]);

    const usuario = resUser.rows[0];
    if (!usuario || usuario.status !== 'ATIVO') {
      throw new Error('Usuário inativo ou bloqueado.');
    }

    const { nome, email } = usuario;

    const perms = await PermissoesService.calcularPermissoesEfetivas(client, {
      usuarioId: params.usuarioId,
      empresaId: disp.empresa_id,
      filialId: disp.filial_id,
    });

    if (!perms) {
      throw new Error('Colaborador não está vinculado à filial deste terminal.');
    }

    // 7. Emitir token com flag de origemPin: true (Impede operações sensíveis)
    const payloadJwt: PayloadAccessToken = {
      sub: params.usuarioId,
      nome,
      email,
      empresaId: disp.empresa_id,
      filialId: disp.filial_id,
      papelEmpresa: perms.papelEmpresa,
      cargoNome: perms.cargoNome,
      nivelAcesso: perms.nivelAcesso,
      permissoes: perms.permissoesEfetivas,
      origemPin: true, // REGRA DE SEGURANÇA: Sessão originada por PIN
      dispositivoId: disp.id,
    };

    const accessToken = JwtService.gerarAccessToken(payloadJwt);

    return {
      accessToken,
      origemPin: true,
      usuario: { id: params.usuarioId, nome, email },
      terminal: { id: disp.id, nome: disp.nome_terminal },
      filialId: disp.filial_id,
      empresaId: disp.empresa_id,
      permissoes: perms.permissoesEfetivas,
    };
  }

  /**
   * Autenticação operacional independente por Matrícula e Senha Numérica de 6 dígitos.
   * Utilizada exclusivamente para entrada direta no PDV (Caixa) ou Painel de Venda (Balcão).
   */
  static async autenticarPorMatricula(
    client: pg.PoolClient | pg.Pool,
    params: {
      matricula: string;
      senhaNumerica: string;
      estacao: 'CAIXA' | 'BALCAO';
      empresaId?: string;
      filialId?: string;
      ip?: string;
    },
  ) {
    const matriculaLimpa = (params.matricula || '').trim();
    const senhaLimpa = (params.senhaNumerica || '').trim();

    if (!matriculaLimpa) {
      throw new Error('Matrícula é obrigatória.');
    }

    if (!/^\d{6}$/.test(senhaLimpa)) {
      throw new Error('A senha operacional deve conter exclusivamente 6 dígitos numéricos.');
    }

    // 1. Localizar vínculo do colaborador por matrícula
    const resColab = await client.query<{
      usuario_empresa_id: string;
      usuario_id: string;
      empresa_id: string;
      matricula: string;
      senha_operacional_hash: string | null;
      tentativas_falhas_operacional: number;
      bloqueado_operacional_ate: Date | null;
      papel_empresa: 'PROPRIETARIO' | 'ADMINISTRADOR' | 'COLABORADOR';
      usuario_empresa_status: string;
      nome: string;
      email: string;
      cpf: string;
      usuario_status: string;
      empresa_nome: string;
    }>(`
      SELECT 
        ue.id as usuario_empresa_id,
        ue.usuario_id,
        ue.empresa_id,
        ue.matricula,
        ue.senha_operacional_hash,
        ue.tentativas_falhas_operacional,
        ue.bloqueado_operacional_ate,
        ue.papel_empresa,
        ue.status as usuario_empresa_status,
        u.nome,
        u.email,
        u.cpf,
        u.status as usuario_status,
        e.nome_fantasia as empresa_nome
      FROM usuarios_empresas ue
      JOIN usuarios u ON u.id = ue.usuario_id
      JOIN empresas e ON e.id = ue.empresa_id
      WHERE (UPPER(TRIM(ue.matricula)) = UPPER(TRIM($1)) OR u.cpf = $1)
        AND ($2::UUID IS NULL OR ue.empresa_id = $2::UUID)
      ORDER BY ue.criado_em ASC
      LIMIT 1;
    `, [matriculaLimpa, params.empresaId || null]);

    const colab = resColab.rows[0];
    if (!colab) {
      await client.query(`
        INSERT INTO tentativas_acesso_operacional (empresa_id, filial_id, matricula, estacao, sucesso, motivo_falha, ip_origem)
        VALUES ($1, $2, $3, $4, false, 'MATRICULA_INEXISTENTE', $5);
      `, [params.empresaId || null, params.filialId || null, matriculaLimpa, params.estacao, params.ip || null]);
      throw new Error('Matrícula não encontrada.');
    }

    // 2. Validar Status do Colaborador
    if (colab.usuario_status === 'BLOQUEADO' || colab.usuario_empresa_status === 'BLOQUEADO') {
      await client.query(`
        INSERT INTO tentativas_acesso_operacional (empresa_id, filial_id, matricula, estacao, sucesso, motivo_falha, ip_origem)
        VALUES ($1, $2, $3, $4, false, 'COLABORADOR_BLOQUEADO', $5);
      `, [colab.empresa_id, params.filialId || null, matriculaLimpa, params.estacao, params.ip || null]);
      throw new Error('Colaborador bloqueado pelo administrador da farmácia.');
    }

    if (colab.usuario_status === 'INATIVO' || colab.usuario_empresa_status === 'INATIVO') {
      await client.query(`
        INSERT INTO tentativas_acesso_operacional (empresa_id, filial_id, matricula, estacao, sucesso, motivo_falha, ip_origem)
        VALUES ($1, $2, $3, $4, false, 'COLABORADOR_INATIVO', $5);
      `, [colab.empresa_id, params.filialId || null, matriculaLimpa, params.estacao, params.ip || null]);
      throw new Error('Colaborador inativo. Entre em contato com seu gestor.');
    }

    // 3. Verificar Bloqueio Temporário por Tentativas Excessivas
    if (colab.bloqueado_operacional_ate && new Date(colab.bloqueado_operacional_ate) > new Date()) {
      const segundosRestantes = Math.ceil(
        (new Date(colab.bloqueado_operacional_ate).getTime() - Date.now()) / 1000
      );
      await client.query(`
        INSERT INTO tentativas_acesso_operacional (empresa_id, filial_id, matricula, estacao, sucesso, motivo_falha, ip_origem)
        VALUES ($1, $2, $3, $4, false, 'BLOQUEIO_TEMPORARIO', $5);
      `, [colab.empresa_id, params.filialId || null, matriculaLimpa, params.estacao, params.ip || null]);
      throw new Error(`Acesso bloqueado por tentativas consecutivas inválidas. Aguarde ${segundosRestantes} segundos.`);
    }

    // 4. Validar Senha de 6 Dígitos com Argon2id
    let senhaCorreta = false;
    if (colab.senha_operacional_hash) {
      senhaCorreta = await CryptoService.verificarPin(colab.senha_operacional_hash, senhaLimpa);
    } else {
      // Fallback para PIN existente em usuarios_pins ou senha padrão de demonstração
      const resPin = await client.query<{ pin_hash: string }>(`
        SELECT pin_hash FROM usuarios_pins 
        WHERE usuario_id = $1 AND empresa_id = $2 
        LIMIT 1;
      `, [colab.usuario_id, colab.empresa_id]);

      if (resPin.rows.length > 0 && resPin.rows[0]?.pin_hash) {
        senhaCorreta = await CryptoService.verificarPin(resPin.rows[0].pin_hash, senhaLimpa);
      } else if (senhaLimpa === '123456') {
        senhaCorreta = true;
      }
    }

    if (!senhaCorreta) {
      const novasFalhas = (colab.tentativas_falhas_operacional || 0) + 1;
      let bloqueio: Date | null = null;

      if (novasFalhas >= 3) {
        bloqueio = new Date(Date.now() + 15 * 60 * 1000); // Bloqueio por 15 minutos
      }

      await client.query(`
        UPDATE usuarios_empresas
        SET tentativas_falhas_operacional = $1, bloqueado_operacional_ate = $2, atualizado_em = NOW()
        WHERE id = $3;
      `, [novasFalhas, bloqueio, colab.usuario_empresa_id]);

      await client.query(`
        INSERT INTO tentativas_acesso_operacional (empresa_id, filial_id, matricula, estacao, sucesso, motivo_falha, ip_origem)
        VALUES ($1, $2, $3, $4, false, 'SENHA_INCORRETA', $5);
      `, [colab.empresa_id, params.filialId || null, matriculaLimpa, params.estacao, params.ip || null]);

      if (bloqueio) {
        throw new Error('Acesso bloqueado por 15 minutos devido a 3 tentativas incorretas.');
      }

      throw new Error(`Senha incorreta. Tentativa ${novasFalhas} de 3.`);
    }

    // 5. Sucesso na senha: resetar contador de falhas
    await client.query(`
      UPDATE usuarios_empresas
      SET tentativas_falhas_operacional = 0, bloqueado_operacional_ate = NULL, atualizado_em = NOW()
      WHERE id = $1;
    `, [colab.usuario_empresa_id]);

    // 6. Determinar filial de operação autorizada
    let filialAlvoId = params.filialId;
    if (!filialAlvoId) {
      const resFilPadrao = await client.query<{ filial_id: string }>(`
        SELECT filial_id FROM usuarios_filiais
        WHERE usuario_id = $1 AND empresa_id = $2 AND status = 'ATIVO'
        ORDER BY e_filial_padrao DESC LIMIT 1;
      `, [colab.usuario_id, colab.empresa_id]);
      filialAlvoId = resFilPadrao.rows[0]?.filial_id;
    }

    if (!filialAlvoId) {
      throw new Error('Colaborador não possui filial ativa autorizada para operação.');
    }

    // Verificar se o usuário está associado à filial selecionada
    const resFilial = await client.query<{ id: string; nome: string }>(`
      SELECT f.id, f.nome 
      FROM filiais f
      JOIN usuarios_filiais uf ON uf.filial_id = f.id
      WHERE uf.usuario_id = $1 AND f.id = $2 AND f.empresa_id = $3 AND uf.status = 'ATIVO' AND f.status = 'ATIVO';
    `, [colab.usuario_id, filialAlvoId, colab.empresa_id]);

    if (resFilial.rows.length === 0) {
      await client.query(`
        INSERT INTO tentativas_acesso_operacional (empresa_id, filial_id, matricula, estacao, sucesso, motivo_falha, ip_origem)
        VALUES ($1, $2, $3, $4, false, 'FILIAL_NAO_AUTORIZADA', $5);
      `, [colab.empresa_id, filialAlvoId, matriculaLimpa, params.estacao, params.ip || null]);
      throw new Error('Colaborador não autorizado para operar nesta filial.');
    }

    const filialNome = resFilial.rows[0]?.nome || 'Filial Operacional';

    // 7. Calcular permissões atômicas efetivas
    const perms = await PermissoesService.calcularPermissoesEfetivas(client, {
      usuarioId: colab.usuario_id,
      empresaId: colab.empresa_id,
      filialId: filialAlvoId,
    });

    if (!perms) {
      throw new Error('Não foi possível calcular as permissões para este colaborador.');
    }

    // 8. Validação de alçada por Estação Operacional
    if (params.estacao === 'CAIXA') {
      const podeCaixa =
        perms.permissoesEfetivas.includes('pdv:acesso') ||
        perms.permissoesEfetivas.includes('pdv:vender');

      if (!podeCaixa) {
        await client.query(`
          INSERT INTO tentativas_acesso_operacional (empresa_id, filial_id, matricula, estacao, sucesso, motivo_falha, ip_origem)
          VALUES ($1, $2, $3, $4, false, 'SEM_PERMISSAO_CAIXA', $5);
        `, [colab.empresa_id, filialAlvoId, matriculaLimpa, params.estacao, params.ip || null]);
        throw new Error(`Acesso negado: O colaborador ${colab.nome} não possui permissão de Operador de Caixa (pdv:acesso).`);
      }
    } else if (params.estacao === 'BALCAO') {
      const podeBalcao =
        perms.permissoesEfetivas.includes('balcao:consultar') ||
        perms.permissoesEfetivas.includes('pre_venda:criar') ||
        perms.permissoesEfetivas.includes('pdv:acesso');

      if (!podeBalcao) {
        await client.query(`
          INSERT INTO tentativas_acesso_operacional (empresa_id, filial_id, matricula, estacao, sucesso, motivo_falha, ip_origem)
          VALUES ($1, $2, $3, $4, false, 'SEM_PERMISSAO_BALCAO', $5);
        `, [colab.empresa_id, filialAlvoId, matriculaLimpa, params.estacao, params.ip || null]);
        throw new Error(`Acesso negado: O colaborador ${colab.nome} não possui permissão de Atendimento no Balcão (balcao:consultar).`);
      }
    }

    // 9. Registrar auditoria de sucesso
    await client.query(`
      INSERT INTO tentativas_acesso_operacional (empresa_id, filial_id, matricula, estacao, sucesso, ip_origem)
      VALUES ($1, $2, $3, $4, true, $5);
    `, [colab.empresa_id, filialAlvoId, matriculaLimpa, params.estacao, params.ip || null]);

    // 10. Emitir token JWT operacional
    const payloadJwt: PayloadAccessToken = {
      sub: colab.usuario_id,
      nome: colab.nome,
      email: colab.email,
      empresaId: colab.empresa_id,
      filialId: filialAlvoId,
      papelEmpresa: perms.papelEmpresa,
      cargoNome: perms.cargoNome,
      nivelAcesso: perms.nivelAcesso,
      permissoes: perms.permissoesEfetivas,
      origemPin: true,
    };

    const accessToken = JwtService.gerarAccessToken(payloadJwt);

    return {
      accessToken,
      estacao: params.estacao,
      usuario: {
        id: colab.usuario_id,
        nome: colab.nome,
        email: colab.email,
        cpf: colab.cpf,
        matricula: colab.matricula || matriculaLimpa,
        cargoNome: perms.cargoNome,
      },
      empresa: {
        id: colab.empresa_id,
        nomeFantasia: colab.empresa_nome,
      },
      filial: {
        id: filialAlvoId,
        nome: filialNome,
      },
      permissoes: perms.permissoesEfetivas,
    };
  }

  /**
   * Renovação segura de Access Token através de Refresh Token.
   */
  static async renovarSessao(client: pg.PoolClient | pg.Pool, refreshToken: string) {
    const refreshTokenHash = CryptoService.gerarHashSha256(refreshToken);

    const resSessao = await client.query<{
      id: string;
      usuario_id: string;
      empresa_id: string | null;
      filial_id: string | null;
      expira_em: Date;
      revogado_em: Date | null;
    }>(`
      SELECT id, usuario_id, empresa_id, filial_id, expira_em, revogado_em
      FROM usuarios_sessoes
      WHERE refresh_token_hash = $1;
    `, [refreshTokenHash]);

    const sessao = resSessao.rows[0];
    if (!sessao) {
      throw new Error('Sessão inválida ou expirada.');
    }

    if (sessao.revogado_em) {
      throw new Error('Sessão revogada.');
    }

    if (new Date(sessao.expira_em) <= new Date()) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    // Buscar usuário
    const resUser = await client.query<{ nome: string; email: string; status: string }>(`
      SELECT nome, email, status FROM usuarios WHERE id = $1;
    `, [sessao.usuario_id]);

    const usuario = resUser.rows[0];
    if (!usuario || usuario.status !== 'ATIVO') {
      throw new Error('Usuário inativo ou bloqueado.');
    }

    const { nome, email } = usuario;

    // Se a sessão já tinha empresa e filial associadas, recarrega permissões
    let perms = null;
    if (sessao.empresa_id && sessao.filial_id) {
      perms = await PermissoesService.calcularPermissoesEfetivas(client, {
        usuarioId: sessao.usuario_id,
        empresaId: sessao.empresa_id,
        filialId: sessao.filial_id,
      });
    }

    const novoAccessToken = JwtService.gerarAccessToken({
      sub: sessao.usuario_id,
      nome,
      email,
      empresaId: sessao.empresa_id || undefined,
      filialId: sessao.filial_id || undefined,
      papelEmpresa: perms?.papelEmpresa,
      cargoNome: perms?.cargoNome,
      nivelAcesso: perms?.nivelAcesso,
      permissoes: perms?.permissoesEfetivas,
      origemPin: false,
    });

    return { accessToken: novoAccessToken };
  }

  /**
   * Encerra e revoga a sessão.
   */
  static async logout(client: pg.PoolClient | pg.Pool, refreshToken: string) {
    const refreshTokenHash = CryptoService.gerarHashSha256(refreshToken);
    await client.query(`
      UPDATE usuarios_sessoes
      SET revogado_em = NOW()
      WHERE refresh_token_hash = $1;
    `, [refreshTokenHash]);
  }

  /**
   * Inicia fluxo de recuperação de senha por e-mail com token temporário.
   */
  static async solicitarRecuperacaoSenha(client: pg.PoolClient | pg.Pool, email: string, ip?: string) {
    const emailLimpo = email.trim().toLowerCase();
    const resUser = await client.query<{ id: string; status: string }>(`
      SELECT id, status FROM usuarios WHERE email = $1;
    `, [emailLimpo]);

    const usuario = resUser.rows[0];
    // Resposta genérica para evitar enumeração de contas
    if (!usuario || usuario.status !== 'ATIVO') {
      return { sucesso: true, mensagem: 'Se o e-mail estiver cadastrado, as instruções serão enviadas.' };
    }

    const token = CryptoService.gerarTokenAleatorio(32);
    const tokenHash = CryptoService.gerarHashSha256(token);
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await client.query(`
      INSERT INTO usuarios_recuperacao_senha (usuario_id, token_hash, expira_em, ip_origem)
      VALUES ($1, $2, $3, $4);
    `, [usuario.id, tokenHash, expiraEm, ip || null]);

    return {
      sucesso: true,
      mensagem: 'Instruções de redefinição de senha geradas com sucesso.',
      tokenRecuperacaoFicticio: token, // Retornado em ambiente de teste/demonstração
    };
  }

  /**
   * Redefine a senha com o token temporário válido.
   */
  static async redefinirSenhaComToken(
    client: pg.PoolClient | pg.Pool,
    params: {
      token: string;
      novaSenha: string;
    },
  ) {
    if (params.novaSenha.length < 8) {
      throw new Error('A nova senha deve ter no mínimo 8 caracteres.');
    }

    const tokenHash = CryptoService.gerarHashSha256(params.token);
    const resToken = await client.query<{ id: string; usuario_id: string; expira_em: Date; utilizado_em: Date | null }>(`
      SELECT id, usuario_id, expira_em, utilizado_em
      FROM usuarios_recuperacao_senha
      WHERE token_hash = $1;
    `, [tokenHash]);

    const record = resToken.rows[0];
    if (!record) {
      throw new Error('Token de recuperação inválido.');
    }

    if (record.utilizado_em) {
      throw new Error('Este token já foi utilizado.');
    }

    if (new Date(record.expira_em) <= new Date()) {
      throw new Error('Este token expirou. Solicite um novo link.');
    }

    // Gerar novo hash Argon2id
    const novoHash = await CryptoService.gerarHashSenha(params.novaSenha);

    // Atualizar senha do usuário
    await client.query(`UPDATE usuarios SET hash_senha = $1, atualizado_em = NOW() WHERE id = $2;`, [novoHash, record.usuario_id]);

    // Marcar token como utilizado
    await client.query(`UPDATE usuarios_recuperacao_senha SET utilizado_em = NOW() WHERE id = $1;`, [record.id]);

    // Revogar todas as sessões anteriores por segurança
    await client.query(`UPDATE usuarios_sessoes SET revogado_em = NOW() WHERE usuario_id = $1 AND revogado_em IS NULL;`, [record.usuario_id]);

    return { sucesso: true, mensagem: 'Senha redefinida com sucesso. Faça login com a nova senha.' };
  }

  /**
   * Helper: Incrementa tentativas falhas no rate limit.
   */
  private static async registrarTentativaFalha(client: pg.PoolClient | pg.Pool, chave: string) {
    await client.query(`
      INSERT INTO tentativas_login_rate_limit (chave_identificador, tentativas, ultima_tentativa)
      VALUES ($1, 1, NOW())
      ON CONFLICT (chave_identificador) DO UPDATE SET
        tentativas = tentativas_login_rate_limit.tentativas + 1,
        ultima_tentativa = NOW(),
        bloqueado_ate = CASE 
          WHEN tentativas_login_rate_limit.tentativas + 1 >= 5 THEN NOW() + INTERVAL '10 minutes'
          ELSE NULL 
        END;
    `, [chave]);
  }

  /**
   * Helper: Carrega lista hierárquica de empresas e filiais do usuário.
   */
  private static async buscarEmpresasEFiliaisUsuario(
    client: pg.PoolClient | pg.Pool,
    usuarioId: string,
  ): Promise<EmpresaVinculadaDTO[]> {
    const resEmpresas = await client.query<{
      empresa_id: string;
      razao_social: string;
      nome_fantasia: string;
      cnpj: string;
      papel_empresa: string;
    }>(`
      SELECT 
        e.id as empresa_id,
        e.razao_social,
        e.nome_fantasia,
        e.cnpj,
        ue.papel_empresa
      FROM usuarios_empresas ue
      JOIN empresas e ON e.id = ue.empresa_id
      WHERE ue.usuario_id = $1 AND ue.status = 'ATIVO' AND e.status = 'ATIVO'
      ORDER BY e.nome_fantasia;
    `, [usuarioId]);

    const lista: EmpresaVinculadaDTO[] = [];

    for (const emp of resEmpresas.rows) {
      const resFiliais = await client.query<{
        id: string;
        codigo_filial: string;
        nome: string;
        e_matriz: boolean;
        cargo_nome: string;
      }>(`
        SELECT 
          f.id,
          f.codigo_filial,
          f.nome,
          f.e_matriz,
          COALESCE(c.nome, 'Acesso Geral') as cargo_nome
        FROM filiais f
        LEFT JOIN usuarios_filiais uf ON uf.filial_id = f.id AND uf.usuario_id = $1 AND uf.status = 'ATIVO'
        LEFT JOIN cargos c ON c.id = uf.cargo_id
        WHERE f.empresa_id = $2 AND f.status = 'ATIVO'
        ORDER BY f.e_matriz DESC, f.nome ASC;
      `, [usuarioId, emp.empresa_id]);

      lista.push({
        id: emp.empresa_id,
        razaoSocial: emp.razao_social,
        nomeFantasia: emp.nome_fantasia,
        cnpj: emp.cnpj,
        papelEmpresa: emp.papel_empresa as 'PROPRIETARIO' | 'ADMINISTRADOR' | 'COLABORADOR',
        filiais: resFiliais.rows.map(f => ({
          id: f.id,
          codigoFilial: f.codigo_filial,
          nome: f.nome,
          eMatriz: f.e_matriz,
          cargoNome: f.cargo_nome,
        })),
      });
    }

    return lista;
  }
}
