import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CaixaService } from '../services/caixa.service.js';
import {
  exigirTenantAutenticado,
  exigirPermissao,
} from '../middlewares/auth.middleware.js';
import {
  AbrirCaixaDTO,
  FecharCaixaDTO,
  MovimentacaoCaixaDTO,
  TrocarOperadorCaixaDTO,
} from '@farmapro/shared';

export async function rotasCaixa(fastify: FastifyInstance): Promise<void> {
  const pool = fastify.db.pool;

  /**
   * POST /api/caixa/abrir
   * Abre uma sessão de caixa para o terminal/dispositivo na filial.
   */
  fastify.post('/api/caixa/abrir', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('pdv:acesso'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const usuarioId = request.usuario!.sub;
    const body = request.body as AbrirCaixaDTO;

    if (body.saldoInicialCentavos === undefined || body.saldoInicialCentavos < 0) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INVALIDOS',
        mensagem: 'O saldo inicial de abertura é obrigatório e deve ser zero ou positivo.',
      });
    }

    if (!body.dispositivoId) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INVALIDOS',
        mensagem: 'O identificador do dispositivo/terminal é obrigatório para abrir o caixa.',
      });
    }

    try {
      const sessao = await CaixaService.abrirCaixa(pool, body, tenant, usuarioId);
      return reply.status(201).send({
        sucesso: true,
        dados: sessao,
        mensagem: 'Caixa aberto com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao abrir caixa';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_ABERTURA_CAIXA',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/caixa/movimentacao
   * Registra suprimento ou sangria de dinheiro na gaveta física.
   */
  fastify.post('/api/caixa/movimentacao', {
    preHandler: [
      exigirTenantAutenticado,
      async (req, rep) => {
        const body = req.body as MovimentacaoCaixaDTO;
        const permissao = body?.tipoMovimentacao === 'SUPRIMENTO' ? 'pdv:suprimento' : 'pdv:sangria';
        await exigirPermissao(permissao)(req, rep);
      },
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const usuarioId = request.usuario!.sub;
    const body = request.body as MovimentacaoCaixaDTO;

    if (!body.caixaSessaoId || !body.tipoMovimentacao || !body.valorCentavos || body.valorCentavos <= 0) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INVALIDOS',
        mensagem: 'Sessão de caixa, tipo e valor em centavos são obrigatórios.',
      });
    }

    try {
      const mov = await CaixaService.registrarMovimentacao(pool, body, tenant, usuarioId);
      return reply.status(201).send({
        sucesso: true,
        dados: mov,
        mensagem: `${body.tipoMovimentacao === 'SUPRIMENTO' ? 'Suprimento' : 'Sangria'} de caixa realizada com sucesso.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na movimentação de caixa';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_MOVIMENTACAO_CAIXA',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/caixa/trocar-operador
   * Troca o operador do caixa sem encerrar a sessão do terminal.
   */
  fastify.post('/api/caixa/trocar-operador', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('pdv:acesso'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const autorizadorId = request.usuario!.sub;
    const body = request.body as TrocarOperadorCaixaDTO;

    if (!body.caixaSessaoId || !body.novoOperadorId) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INVALIDOS',
        mensagem: 'Sessão de caixa e novo operador são obrigatórios.',
      });
    }

    try {
      const resultado = await CaixaService.trocarOperador(pool, body, tenant, autorizadorId);
      return reply.send({
        sucesso: true,
        dados: resultado,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na troca de operador';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_TROCA_OPERADOR',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/caixa/fechar
   * Encerra a sessão com conciliação cega e verificação de diferenças.
   */
  fastify.post('/api/caixa/fechar', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('pdv:fechar_caixa'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const usuarioId = request.usuario!.sub;
    const body = request.body as FecharCaixaDTO;

    if (!body.caixaSessaoId || body.saldoDeclaradoCentavos === undefined) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INVALIDOS',
        mensagem: 'Sessão de caixa e saldo declarado em centavos são obrigatórios.',
      });
    }

    try {
      const sessaoFechada = await CaixaService.fecharCaixa(pool, body, tenant, usuarioId);
      return reply.send({
        sucesso: true,
        dados: sessaoFechada,
        mensagem: 'Caixa encerrado com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao fechar caixa';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_FECHAMENTO_CAIXA',
        mensagem: msg,
      });
    }
  });

  /**
   * GET /api/caixa/ativo
   * Retorna a sessão aberta do terminal atual.
   */
  fastify.get('/api/caixa/ativo', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('pdv:acesso'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    if (!tenant.filialId) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'FILIAL_OBRIGATORIA',
        mensagem: 'Uma filial deve estar selecionada.',
      });
    }

    const { dispositivoId } = request.query as { dispositivoId?: string };

    const caixaAtivo = await CaixaService.obterCaixaAtivo(
      pool,
      tenant.empresaId,
      tenant.filialId,
      dispositivoId,
    );

    return reply.send({
      sucesso: true,
      dados: caixaAtivo,
    });
  });

  /**
   * GET /api/caixa/:caixaSessaoId/resumo
   * Retorna métricas consolidadas e apuração da gaveta física de dinheiro.
   */
  fastify.get('/api/caixa/:caixaSessaoId/resumo', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('pdv:acesso'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    if (!tenant.filialId) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'FILIAL_OBRIGATORIA',
        mensagem: 'Uma filial deve estar selecionada.',
      });
    }

    const { caixaSessaoId } = request.params as { caixaSessaoId: string };

    try {
      const resumo = await CaixaService.obterResumoCaixa(
        pool,
        tenant.empresaId,
        tenant.filialId,
        caixaSessaoId,
      );

      return reply.send({
        sucesso: true,
        dados: resumo,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao obter resumo do caixa';
      return reply.status(404).send({
        sucesso: false,
        erro: 'CAIXA_NAO_ENCONTRADO',
        mensagem: msg,
      });
    }
  });

  /**
   * GET /api/caixa/:caixaSessaoId/movimentacoes
   * Lista movimentações de suprimento e sangria.
   */
  fastify.get('/api/caixa/:caixaSessaoId/movimentacoes', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('pdv:acesso'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    if (!tenant.filialId) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'FILIAL_OBRIGATORIA',
        mensagem: 'Uma filial deve estar selecionada.',
      });
    }

    const { caixaSessaoId } = request.params as { caixaSessaoId: string };

    const movs = await CaixaService.listarMovimentacoes(
      pool,
      tenant.empresaId,
      tenant.filialId,
      caixaSessaoId,
    );

    return reply.send({
      sucesso: true,
      dados: movs,
    });
  });
}
