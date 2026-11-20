import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  AjusteEstoqueDTO,
  AlterarStatusLoteDTO,
  CadastrarLoteDTO,
  EntradaMercadoriaDTO,
  SaidaMercadoriaDTO,
} from '@farmapro/shared';
import { EstoqueService } from '../services/estoque.service.js';
import {
  exigirTenantAutenticado,
  exigirPermissao,
} from '../middlewares/auth.middleware.js';

export async function rotasEstoque(fastify: FastifyInstance): Promise<void> {
  const pool = fastify.db.pool;

  /**
   * GET /api/estoque/painel
   * Indicadores consolidados do estoque da filial.
   */
  fastify.get('/api/estoque/painel', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:visualizar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    if (!tenant.filialId) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'FILIAL_OBRIGATORIA',
        mensagem: 'Uma filial deve estar selecionada para consultar o painel de estoque.',
      });
    }

    const resumo = await EstoqueService.obterResumoPainel(
      pool,
      tenant.empresaId,
      tenant.filialId,
    );

    return reply.send({
      sucesso: true,
      dados: resumo,
    });
  });

  /**
   * GET /api/estoque/produtos
   * Lista os produtos com saldo e status na filial.
   */
  fastify.get('/api/estoque/produtos', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:visualizar'),
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

    const query = request.query as {
      termoBusca?: string;
      categoriaId?: string;
      limite?: string;
    };

    const produtos = await EstoqueService.listarProdutosEstoque(
      pool,
      tenant.empresaId,
      tenant.filialId,
      {
        termoBusca: query.termoBusca,
        categoriaId: query.categoriaId,
        limite: query.limite ? Number(query.limite) : 100,
      },
    );

    return reply.send({
      sucesso: true,
      dados: produtos,
    });
  });

  /**
   * GET /api/estoque/lotes
   * Lista lotes e validades de produtos na filial.
   */
  fastify.get('/api/estoque/lotes', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:visualizar'),
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

    const { produtoId } = request.query as { produtoId?: string };

    const lotes = await EstoqueService.listarLotesProduto(
      pool,
      tenant.empresaId,
      tenant.filialId,
      produtoId,
    );

    return reply.send({
      sucesso: true,
      dados: lotes,
    });
  });

  /**
   * POST /api/estoque/entrada
   * Registro de entrada manual autorizada de mercadoria com lote.
   */
  fastify.post('/api/estoque/entrada', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:entrada_mercadoria'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const usuarioId = request.usuario?.sub || tenant.usuarioId || 'usuario-sistema';
    const body = request.body as EntradaMercadoriaDTO;

    try {
      const resultado = await EstoqueService.registrarEntradaMercadoria(
        pool,
        body,
        tenant,
        usuarioId,
      );

      return reply.status(201).send({
        sucesso: true,
        dados: resultado,
        mensagem: 'Entrada de mercadoria registrada com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar entrada';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_ENTRADA_ESTOQUE',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/estoque/saida
   * Registro de saída manual autorizada / perda / avaria.
   */
  fastify.post('/api/estoque/saida', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:movimentar'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const usuarioId = request.usuario?.sub || tenant.usuarioId || 'usuario-sistema';
    const body = request.body as SaidaMercadoriaDTO;

    try {
      const resultado = await EstoqueService.registrarSaidaMercadoria(
        pool,
        body,
        tenant,
        usuarioId,
      );

      return reply.send({
        sucesso: true,
        dados: resultado,
        mensagem: 'Saída de mercadoria registrada com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar saída';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_SAIDA_ESTOQUE',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/estoque/ajuste
   * Ajuste de estoque com justificativa obrigatória.
   */
  fastify.post('/api/estoque/ajuste', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:ajuste_manual'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const usuarioId = request.usuario?.sub || tenant.usuarioId || 'usuario-sistema';
    const body = request.body as AjusteEstoqueDTO;

    try {
      const resultado = await EstoqueService.ajustarEstoque(
        pool,
        body,
        tenant,
        usuarioId,
      );

      return reply.send({
        sucesso: true,
        dados: resultado,
        mensagem: 'Ajuste de estoque concluído com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao ajustar estoque';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_AJUSTE_ESTOQUE',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/estoque/produtos/:produtoId/status
   * Bloqueio ou desbloqueio de produto.
   */
  fastify.post('/api/estoque/produtos/:produtoId/status', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:bloquear_produto'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const usuarioId = request.usuario?.sub || tenant.usuarioId || 'usuario-sistema';
    const { produtoId } = request.params as { produtoId: string };
    const { novoStatus, motivo } = request.body as {
      novoStatus: 'ATIVO' | 'BLOQUEADO' | 'INATIVO';
      motivo: string;
    };

    try {
      const resultado = await EstoqueService.alterarStatusProduto(
        pool,
        {
          produtoId,
          novoStatus,
          motivo,
          filialId: tenant.filialId,
        },
        tenant,
        usuarioId,
      );

      return reply.send({
        sucesso: true,
        dados: resultado,
        mensagem: `Status do produto alterado para ${novoStatus}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar status';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_STATUS_PRODUTO',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/estoque/lotes
   * Cadastro de lote.
   */
  fastify.post('/api/estoque/lotes', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:gerenciar_lotes'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const usuarioId = request.usuario?.sub || tenant.usuarioId || 'usuario-sistema';
    const body = request.body as CadastrarLoteDTO;

    try {
      const resultado = await EstoqueService.cadastrarLote(
        pool,
        body,
        tenant,
        usuarioId,
      );

      return reply.status(201).send({
        sucesso: true,
        dados: resultado,
        mensagem: 'Lote cadastrado com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar lote';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_CADASTRO_LOTE',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/estoque/lotes/:loteId/status
   * Alteração de situação de lote (bloqueio sanitário, quarentena, etc.).
   */
  fastify.post('/api/estoque/lotes/:loteId/status', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:gerenciar_lotes'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const usuarioId = request.usuario?.sub || tenant.usuarioId || 'usuario-sistema';
    const { loteId } = request.params as { loteId: string };
    const { novoStatus, motivo } = request.body as AlterarStatusLoteDTO;

    try {
      const resultado = await EstoqueService.alterarStatusLote(
        pool,
        {
          loteId,
          novoStatus,
          motivo,
        },
        tenant,
        usuarioId,
      );

      return reply.send({
        sucesso: true,
        dados: resultado,
        mensagem: `Situação do lote alterada para ${novoStatus}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar situação do lote';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_STATUS_LOTE',
        mensagem: msg,
      });
    }
  });

  /**
   * GET /api/estoque/inventarios
   * Lista os inventários da filial.
   */
  fastify.get('/api/estoque/inventarios', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:inventario'),
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

    const { status } = request.query as { status?: string };

    const inventarios = await EstoqueService.listarInventarios(
      pool,
      tenant.empresaId,
      tenant.filialId,
      status,
    );

    return reply.send({
      sucesso: true,
      dados: inventarios,
    });
  });

  /**
   * POST /api/estoque/inventarios
   * Abertura de novo inventário por filial.
   */
  fastify.post('/api/estoque/inventarios', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:inventario'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const usuarioId = request.usuario?.sub || tenant.usuarioId || 'usuario-sistema';
    const body = request.body as {
      filialId?: string;
      descricao: string;
      tipoInventario: 'GERAL' | 'CATEGORIA' | 'ROTATIVO' | 'ESPECIFICO';
      categoriaId?: string;
      produtosIds?: string[];
    };

    try {
      const filialId = body.filialId || tenant.filialId;
      if (!filialId) {
        return reply.status(400).send({
          sucesso: false,
          erro: 'FILIAL_OBRIGATORIA',
          mensagem: 'A filial é obrigatória.',
        });
      }

      const inv = await EstoqueService.criarInventario(
        pool,
        {
          filialId,
          descricao: body.descricao,
          tipoInventario: body.tipoInventario,
          categoriaId: body.categoriaId,
          produtosIds: body.produtosIds,
        },
        tenant,
        usuarioId,
      );

      return reply.status(201).send({
        sucesso: true,
        dados: inv,
        mensagem: 'Inventário aberto com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar inventário';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_CRIACAO_INVENTARIO',
        mensagem: msg,
      });
    }
  });

  /**
   * GET /api/estoque/inventarios/:inventarioId
   * Detalhes e itens do inventário.
   */
  fastify.get('/api/estoque/inventarios/:inventarioId', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:inventario'),
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

    const { inventarioId } = request.params as { inventarioId: string };

    const inv = await EstoqueService.obterDetalhesInventario(
      pool,
      tenant.empresaId,
      tenant.filialId,
      inventarioId,
    );

    if (!inv) {
      return reply.status(404).send({
        sucesso: false,
        erro: 'INVENTARIO_NAO_ENCONTRADO',
        mensagem: 'Inventário não encontrado.',
      });
    }

    return reply.send({
      sucesso: true,
      dados: inv,
    });
  });

  /**
   * POST /api/estoque/inventarios/:inventarioId/contagem
   * Registro da contagem física. Não altera estoque.
   */
  fastify.post('/api/estoque/inventarios/:inventarioId/contagem', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:inventario'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const usuarioId = request.usuario?.sub || tenant.usuarioId || 'usuario-sistema';
    const { inventarioId } = request.params as { inventarioId: string };
    const { contagens } = request.body as {
      contagens: Array<{ itemId: string; quantidadeContada: number; justificativa?: string }>;
    };

    try {
      const resultado = await EstoqueService.registrarContagemInventario(
        pool,
        {
          inventarioId,
          contagens,
        },
        tenant,
        usuarioId,
      );

      return reply.send({
        sucesso: true,
        dados: resultado,
        mensagem: 'Contagem registrada com sucesso. Aguardando aprovação para aplicar divergências.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar contagem';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_CONTAGEM_INVENTARIO',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/estoque/inventarios/:inventarioId/aprovar
   * Aprovação formal de divergências com aplicação no saldo e geração de Livro-Razão.
   */
  fastify.post('/api/estoque/inventarios/:inventarioId/aprovar', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:aprovar_divergencia'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const autorizadorId = request.usuario?.sub || tenant.usuarioId || 'usuario-sistema';
    const { inventarioId } = request.params as { inventarioId: string };
    const { justificativaGeral } = request.body as { justificativaGeral: string };

    try {
      const resultado = await EstoqueService.aprovarInventario(
        pool,
        {
          inventarioId,
          justificativaGeral,
        },
        tenant,
        autorizadorId,
      );

      return reply.send({
        sucesso: true,
        dados: resultado,
        mensagem: 'Inventário aprovado e divergências aplicadas ao estoque com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao aprovar inventário';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_APROVACAO_INVENTARIO',
        mensagem: msg,
      });
    }
  });

  /**
   * GET /api/estoque/movimentacoes
   * Consulta o Livro-Razão imutável de movimentações.
   */
  fastify.get('/api/estoque/movimentacoes', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('estoque:visualizar'),
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

    const query = request.query as {
      produtoId?: string;
      tipoMovimentacao?: string;
      dataInicio?: string;
      dataFim?: string;
      limite?: string;
    };

    const movs = await EstoqueService.listarMovimentacoes(
      pool,
      tenant.empresaId,
      tenant.filialId,
      {
        produtoId: query.produtoId,
        tipoMovimentacao: query.tipoMovimentacao,
        dataInicio: query.dataInicio,
        dataFim: query.dataFim,
        limite: query.limite ? Number(query.limite) : 100,
      },
    );

    return reply.send({
      sucesso: true,
      dados: movs,
    });
  });
}
