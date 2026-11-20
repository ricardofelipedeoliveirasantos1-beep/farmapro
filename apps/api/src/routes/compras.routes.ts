import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  AlterarStatusPedidoDTO,
  AtualizarFornecedorDTO,
  CadastrarFornecedorDTO,
  ConsolidarSolicitacoesDTO,
  CriarPedidoCompraDTO,
  CriarSolicitacaoCompraDTO,
  DecisaoFornecedorDTO,
  DecisaoSolicitacaoCompraDTO,
  DesativarFornecedorFilialDTO,
  StatusFornecedor,
  StatusPedidoCompra,
  StatusSolicitacaoCompra,
} from '@farmapro/shared';
import { ComprasService } from '../services/compras.service.js';
import {
  exigirTenantAutenticado,
  exigirPermissao,
} from '../middlewares/auth.middleware.js';

export async function rotasCompras(fastify: FastifyInstance): Promise<void> {
  const pool = fastify.db.pool;

  // ============================================================================
  // 1. ROTAS DE FORNECEDORES
  // ============================================================================

  /**
   * GET /api/fornecedores
   * Lista os fornecedores centralizados da empresa.
   */
  fastify.get('/api/fornecedores', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('fornecedores:consultar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const query = request.query as {
      status?: StatusFornecedor;
      busca?: string;
      filialId?: string;
    };

    const fornecedores = await ComprasService.listarFornecedores(pool, tenant, {
      status: query.status,
      busca: query.busca,
      filialId: query.filialId || tenant.filialId,
    });

    return reply.send({
      sucesso: true,
      dados: fornecedores,
    });
  });

  /**
   * GET /api/fornecedores/:id
   * Detalhes de um fornecedor por ID.
   */
  fastify.get('/api/fornecedores/:id', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('fornecedores:consultar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const fornecedor = await ComprasService.obterFornecedorPorId(pool, tenant, id);

    return reply.send({
      sucesso: true,
      dados: fornecedor,
    });
  });

  /**
   * GET /api/fornecedores/:id/historico
   * Histórico de pedidos do fornecedor.
   */
  fastify.get('/api/fornecedores/:id/historico', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('fornecedores:consultar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const pedidos = await ComprasService.listarPedidosCompra(pool, tenant, {
      fornecedorId: id,
    });

    return reply.send({
      sucesso: true,
      dados: pedidos,
    });
  });

  /**
   * POST /api/fornecedores
   * Cadastro de fornecedor (direto ou solicitação).
   */
  fastify.post('/api/fornecedores', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('fornecedores:cadastrar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const body = request.body as CadastrarFornecedorDTO;
    try {
      const fornecedor = await ComprasService.cadastrarFornecedor(pool, tenant, body);
      return reply.status(201).send({
        sucesso: true,
        dados: fornecedor,
      });
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao cadastrar fornecedor.';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_CADASTRO_FORNECEDOR',
        mensagem,
      });
    }
  });

  /**
   * PUT /api/fornecedores/:id
   * Atualização cadastral de fornecedor.
   */
  fastify.put('/api/fornecedores/:id', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('fornecedores:editar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const body = request.body as AtualizarFornecedorDTO;
    try {
      const fornecedor = await ComprasService.atualizarFornecedor(
        pool,
        tenant,
        id,
        body,
      );
      return reply.send({
        sucesso: true,
        dados: fornecedor,
      });
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao atualizar fornecedor.';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_ATUALIZAR_FORNECEDOR',
        mensagem,
      });
    }
  });

  /**
   * POST /api/fornecedores/:id/decisao
   * Decisão de aprovação ou rejeição de fornecedor.
   */
  fastify.post('/api/fornecedores/:id/decisao', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('fornecedores:aprovar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const body = request.body as DecisaoFornecedorDTO;
    try {
      const fornecedor = await ComprasService.decidirAprovacaoFornecedor(
        pool,
        tenant,
        id,
        body,
      );
      return reply.send({
        sucesso: true,
        dados: fornecedor,
      });
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao avaliar fornecedor.';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_DECISAO_FORNECEDOR',
        mensagem,
      });
    }
  });

  /**
   * POST /api/fornecedores/:id/bloquear
   * Bloqueio global de fornecedor.
   */
  fastify.post('/api/fornecedores/:id/bloquear', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('fornecedores:bloquear'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const body = request.body as { motivo: string };
    try {
      const fornecedor = await ComprasService.bloquearFornecedorGlobal(
        pool,
        tenant,
        id,
        body.motivo,
      );
      return reply.send({
        sucesso: true,
        dados: fornecedor,
      });
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao bloquear fornecedor.';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_BLOQUEIO_FORNECEDOR',
        mensagem,
      });
    }
  });

  /**
   * POST /api/fornecedores/:id/desbloquear
   * Desbloqueio global de fornecedor.
   */
  fastify.post('/api/fornecedores/:id/desbloquear', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('fornecedores:bloquear'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const fornecedor = await ComprasService.desbloquearFornecedorGlobal(
      pool,
      tenant,
      id,
    );
    return reply.send({
      sucesso: true,
      dados: fornecedor,
    });
  });

  /**
   * POST /api/fornecedores/desativar-filial
   * Desativação local de fornecedor para uma filial específica.
   */
  fastify.post('/api/fornecedores/desativar-filial', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('fornecedores:editar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const body = request.body as DesativarFornecedorFilialDTO;
    try {
      await ComprasService.desativarFornecedorFilial(pool, tenant, body);
      return reply.send({
        sucesso: true,
        mensagem: 'Fornecedor desativado para a filial informada.',
      });
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao desativar fornecedor localmente.';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_DESATIVAR_FORNECEDOR_FILIAL',
        mensagem,
      });
    }
  });

  /**
   * DELETE /api/fornecedores/:id/filiais/:filialId
   * Reativação local de fornecedor para a filial.
   */
  fastify.delete('/api/fornecedores/:id/filiais/:filialId', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('fornecedores:editar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id, filialId } = request.params as { id: string; filialId: string };
    await ComprasService.reativarFornecedorFilial(
      pool,
      tenant,
      id,
      filialId,
    );
    return reply.send({
      sucesso: true,
      mensagem: 'Fornecedor reativado para a filial.',
    });
  });

  // ============================================================================
  // 2. ROTAS DE SOLICITAÇÕES DE COMPRA POR FILIAL
  // ============================================================================

  /**
   * GET /api/compras/solicitacoes
   * Listagem de solicitações de compra por filial.
   */
  fastify.get('/api/compras/solicitacoes', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('compras:visualizar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const query = request.query as {
      filialId?: string;
      status?: StatusSolicitacaoCompra;
    };

    const solicitacoes = await ComprasService.listarSolicitacoesCompra(pool, tenant, {
      filialId: query.filialId,
      status: query.status,
    });

    return reply.send({
      sucesso: true,
      dados: solicitacoes,
    });
  });

  /**
   * GET /api/compras/solicitacoes/:id
   * Detalhes de solicitação de compra com itens.
   */
  fastify.get('/api/compras/solicitacoes/:id', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('compras:visualizar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    try {
      const solicitacao = await ComprasService.obterSolicitacaoPorId(
        pool,
        tenant,
        id,
      );
      return reply.send({
        sucesso: true,
        dados: solicitacao,
      });
    } catch (err: unknown) {
      return reply.status(404).send({
        sucesso: false,
        erro: 'SOLICITACAO_NAO_ENCONTRADA',
        mensagem: 'Solicitação de compra não encontrada.',
      });
    }
  });

  /**
   * POST /api/compras/solicitacoes
   * Criação de solicitação de compra por filial.
   */
  fastify.post('/api/compras/solicitacoes', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('compras:solicitar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const body = request.body as CriarSolicitacaoCompraDTO;
    try {
      const solicitacao = await ComprasService.criarSolicitacaoCompra(
        pool,
        tenant,
        body,
      );
      return reply.status(201).send({
        sucesso: true,
        dados: solicitacao,
      });
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao criar solicitação de compra.';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_CRIAR_SOLICITACAO',
        mensagem,
      });
    }
  });

  /**
   * POST /api/compras/solicitacoes/:id/decisao
   * Análise centralizada (Aprovação total/parcial, rejeição).
   */
  fastify.post('/api/compras/solicitacoes/:id/decisao', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('compras:aprovar_solicitacao'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const body = request.body as DecisaoSolicitacaoCompraDTO;
    try {
      const solicitacao = await ComprasService.decidirSolicitacaoCompra(
        pool,
        tenant,
        id,
        body,
      );
      return reply.send({
        sucesso: true,
        dados: solicitacao,
      });
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao decidir solicitação.';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_DECISAO_SOLICITACAO',
        mensagem,
      });
    }
  });

  // ============================================================================
  // 3. ROTAS DE PEDIDOS DE COMPRA
  // ============================================================================

  /**
   * GET /api/compras/pedidos
   * Listagem de pedidos de compra centralizados.
   */
  fastify.get('/api/compras/pedidos', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('compras:visualizar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const query = request.query as {
      fornecedorId?: string;
      status?: StatusPedidoCompra;
      filialId?: string;
    };

    const pedidos = await ComprasService.listarPedidosCompra(pool, tenant, {
      fornecedorId: query.fornecedorId,
      status: query.status,
      filialId: query.filialId,
    });

    return reply.send({
      sucesso: true,
      dados: pedidos,
    });
  });

  /**
   * GET /api/compras/pedidos/:id
   * Detalhes de pedido de compra com itens e histórico.
   */
  fastify.get('/api/compras/pedidos/:id', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('compras:visualizar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    try {
      const pedido = await ComprasService.obterPedidoCompraPorId(pool, tenant, id);
      return reply.send({
        sucesso: true,
        dados: pedido,
      });
    } catch (err: unknown) {
      return reply.status(404).send({
        sucesso: false,
        erro: 'PEDIDO_NAO_ENCONTRADO',
        mensagem: 'Pedido de compra não encontrado.',
      });
    }
  });

  /**
   * POST /api/compras/pedidos
   * Criação direta de pedido de compra centralizado.
   */
  fastify.post('/api/compras/pedidos', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('compras:criar_pedido'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const body = request.body as CriarPedidoCompraDTO;
    try {
      const pedido = await ComprasService.criarPedidoCompra(pool, tenant, body);
      return reply.status(201).send({
        sucesso: true,
        dados: pedido,
      });
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao criar pedido de compra.';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_CRIAR_PEDIDO',
        mensagem,
      });
    }
  });

  /**
   * POST /api/compras/pedidos/consolidar
   * Consolidação de múltiplas solicitações aprovadas em um pedido de compra.
   */
  fastify.post('/api/compras/pedidos/consolidar', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('compras:criar_pedido'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const body = request.body as ConsolidarSolicitacoesDTO;
    try {
      const pedido = await ComprasService.consolidarSolicitacoesEmPedido(
        pool,
        tenant,
        body,
      );
      return reply.status(201).send({
        sucesso: true,
        dados: pedido,
      });
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao consolidar solicitações.';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_CONSOLIDAR_SOLICITACOES',
        mensagem,
      });
    }
  });

  /**
   * PATCH /api/compras/pedidos/:id/status
   * Transição de status do pedido de compra com auditoria.
   */
  fastify.patch('/api/compras/pedidos/:id/status', {
    preHandler: [
      exigirTenantAutenticado,
      async (request, reply) => {
        const body = request.body as AlterarStatusPedidoDTO;
        if (body.novoStatus === 'CANCELADO') {
          return exigirPermissao('compras:cancelar_pedido')(request, reply);
        }
        return exigirPermissao('compras:aprovar_pedido')(request, reply);
      },
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const body = request.body as AlterarStatusPedidoDTO;
    try {
      const pedido = await ComprasService.alterarStatusPedido(
        pool,
        tenant,
        id,
        body,
      );
      return reply.send({
        sucesso: true,
        dados: pedido,
      });
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao alterar status do pedido.';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_ALTERAR_STATUS_PEDIDO',
        mensagem,
      });
    }
  });
}
