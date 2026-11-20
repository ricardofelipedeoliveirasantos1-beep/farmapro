import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { autenticarRequisicao } from '../middlewares/auth.middleware.js';

export async function rotasAutenticacao(fastify: FastifyInstance): Promise<void> {
  const pool = fastify.db.pool;

  /**
   * POST /api/auth/login
   * Login por e-mail e senha com Argon2id e Rate Limiting.
   */
  fastify.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, senha } = request.body as { email?: string; senha?: string };

    if (!email || !senha) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INCOMPLETOS',
        mensagem: 'E-mail e senha são obrigatórios.',
      });
    }

    try {
      const resultado = await AuthService.login(pool, {
        email,
        senha,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.send({
        sucesso: true,
        dados: resultado,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação';
      return reply.status(401).send({
        sucesso: false,
        erro: 'FALHA_LOGIN',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/auth/selecionar-contexto
   * Seleciona e valida a empresa e filial autorizadas a partir do token de acesso do usuário.
   */
  fastify.post('/api/auth/selecionar-contexto', {
    preHandler: [autenticarRequisicao],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const usuarioId = request.usuario!.sub;
    const { empresaId, filialId } = request.body as { empresaId?: string; filialId?: string };

    if (!empresaId || !filialId) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'PARAMETROS_INVALIDOS',
        mensagem: 'É necessário informar empresaId e filialId.',
      });
    }

    try {
      const contexto = await AuthService.selecionarContextoEmpresaFilial(pool, {
        usuarioId,
        empresaId,
        filialId,
      });

      return reply.send({
        sucesso: true,
        dados: contexto,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao selecionar filial';
      return reply.status(403).send({
        sucesso: false,
        erro: 'ASSOCIACAO_INVALIDA',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/auth/login-pin
   * Autenticação rápida por PIN de 6 dígitos em terminal previamente autorizado.
   */
  fastify.post('/api/auth/login-pin', async (request: FastifyRequest, reply: FastifyReply) => {
    const { pin, usuarioId, identificadorHardware } = request.body as {
      pin?: string;
      usuarioId?: string;
      identificadorHardware?: string;
    };

    if (!pin || !usuarioId || !identificadorHardware) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INCOMPLETOS',
        mensagem: 'PIN, usuarioId e identificadorHardware são obrigatórios.',
      });
    }

    try {
      const resultado = await AuthService.loginPin(pool, {
        pin,
        usuarioId,
        identificadorHardware,
      });

      return reply.send({
        sucesso: true,
        dados: resultado,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PIN incorreto ou bloqueado';
      return reply.status(401).send({
        sucesso: false,
        erro: 'FALHA_PIN',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/auth/refresh
   * Renovação segura da sessão através de Refresh Token.
   */
  fastify.post('/api/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken?: string };

    if (!refreshToken) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'REFRESH_TOKEN_AUSENTE',
        mensagem: 'O refresh token é obrigatório.',
      });
    }

    try {
      const resultado = await AuthService.renovarSessao(pool, refreshToken);
      return reply.send({ sucesso: true, dados: resultado });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sessão expirada';
      return reply.status(401).send({
        sucesso: false,
        erro: 'SESSAO_EXPIRADA',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Revogação da sessão e refresh token.
   */
  fastify.post('/api/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken?: string };

    if (refreshToken) {
      await AuthService.logout(pool, refreshToken);
    }

    return reply.send({ sucesso: true, mensagem: 'Sessão encerrada com sucesso.' });
  });

  /**
   * POST /api/auth/esqueci-senha
   */
  fastify.post('/api/auth/esqueci-senha', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as { email?: string };

    if (!email) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'EMAIL_OBRIGATORIO',
        mensagem: 'Informe o e-mail de acesso cadastrado.',
      });
    }

    const resultado = await AuthService.solicitarRecuperacaoSenha(pool, email, request.ip);
    return reply.send(resultado);
  });

  /**
   * POST /api/auth/redefinir-senha
   */
  fastify.post('/api/auth/redefinir-senha', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, novaSenha } = request.body as { token?: string; novaSenha?: string };

    if (!token || !novaSenha) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INCOMPLETOS',
        mensagem: 'Token de recuperação e nova senha são obrigatórios.',
      });
    }

    try {
      const resultado = await AuthService.redefinirSenhaComToken(pool, { token, novaSenha });
      return reply.send(resultado);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao redefinir senha';
      return reply.status(400).send({
        sucesso: false,
        erro: 'REDEFINICAO_FALHOU',
        mensagem: msg,
      });
    }
  });

  /**
   * GET /api/auth/me
   * Retorna os dados do usuário autenticado no token atual.
   */
  fastify.get('/api/auth/me', {
    preHandler: [autenticarRequisicao],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      sucesso: true,
      usuario: request.usuario,
      tenant: request.tenant || null,
    });
  });
}
