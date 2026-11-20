import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CargosService, CriarCargoInput } from '../services/cargos.service.js';
import {
  exigirTenantAutenticado,
  exigirPermissao,
  bloquearOrigemPinParaOperacaoSensivel,
} from '../middlewares/auth.middleware.js';

export async function rotasCargos(fastify: FastifyInstance): Promise<void> {
  const pool = fastify.db.pool;

  /**
   * GET /api/cargos/permissoes-catalogo
   * Catálogo de todas as permissões atômicas disponíveis.
   */
  fastify.get('/api/cargos/permissoes-catalogo', {
    preHandler: [exigirTenantAutenticado],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const catalogo = await CargosService.listarCatalogoPermissoes(pool);
    return reply.send({
      sucesso: true,
      dados: catalogo,
    });
  });

  /**
   * GET /api/cargos
   * Lista todos os cargos da empresa ativa.
   */
  fastify.get('/api/cargos', {
    preHandler: [exigirTenantAutenticado],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const empresaId = request.tenant!.empresaId;
    const cargos = await CargosService.listarCargos(pool, empresaId);

    return reply.send({
      sucesso: true,
      dados: cargos,
    });
  });

  /**
   * POST /api/cargos
   * Cadastra novo cargo funcional na empresa.
   */
  fastify.post('/api/cargos', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('cargos:gerenciar'),
      bloquearOrigemPinParaOperacaoSensivel,
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const empresaId = request.tenant!.empresaId;
    const body = request.body as CriarCargoInput;

    if (!body.nome || !body.nivelAcesso) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INCOMPLETOS',
        mensagem: 'Nome do cargo e nível de acesso são obrigatórios.',
      });
    }

    try {
      const novoCargo = await CargosService.criarCargo(pool, empresaId, body);
      return reply.status(201).send({
        sucesso: true,
        dados: novoCargo,
        mensagem: 'Cargo cadastrado com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar cargo';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_CRIACAO_CARGO',
        mensagem: msg,
      });
    }
  });

  /**
   * PUT /api/cargos/:id
   * Atualiza nome, descrição e matriz de permissões do cargo.
   */
  fastify.put('/api/cargos/:id', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('cargos:gerenciar'),
      bloquearOrigemPinParaOperacaoSensivel,
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const empresaId = request.tenant!.empresaId;
    const { id: cargoId } = request.params as { id: string };
    const body = request.body as Partial<CriarCargoInput>;

    try {
      await CargosService.atualizarCargo(pool, empresaId, cargoId, body);
      return reply.send({
        sucesso: true,
        mensagem: 'Cargo e permissões atualizados com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar cargo';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_ATUALIZACAO_CARGO',
        mensagem: msg,
      });
    }
  });
}
