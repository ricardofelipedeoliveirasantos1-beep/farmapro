import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CriarPreVendaDTO } from '@farmapro/shared';
import { PreVendaService } from '../services/prevenda.service.js';
import {
  exigirTenantAutenticado,
  exigirPermissao,
} from '../middlewares/auth.middleware.js';

export async function rotasPreVenda(fastify: FastifyInstance): Promise<void> {
  const pool = fastify.db.pool;

  /**
   * GET /api/pre-vendas/produtos
   * Consulta de medicamentos e produtos para a tela de Balcão.
   */
  fastify.get(
    '/api/pre-vendas/produtos',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('balcao:consultar'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const query = request.query as { q?: string };
      const termo = query.q || '';

      if (!termo || termo.trim().length < 2) {
        return reply.status(200).send({
          sucesso: true,
          produtos: [],
        });
      }

      try {
        const produtos = await PreVendaService.consultarProdutosBalcao(
          pool,
          tenant,
          termo
        );

        return reply.status(200).send({
          sucesso: true,
          produtos,
        });
      } catch (err: any) {
        request.log.error(err, 'Erro ao consultar produtos no balcão');
        return reply.status(400).send({
          sucesso: false,
          mensagem: err.message || 'Erro ao consultar produtos no balcão',
        });
      }
    }
  );

  /**
   * POST /api/pre-vendas
   * Gera uma comanda / pré-venda no balcão de atendimento.
   */
  fastify.post(
    '/api/pre-vendas',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('pre_venda:criar'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const body = request.body as CriarPreVendaDTO;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`SET LOCAL app.current_empresa_id = '${tenant.empresaId}'`);

        const preVenda = await PreVendaService.criarPreVenda(client, tenant, body);

        await client.query('COMMIT');

        return reply.status(201).send({
          sucesso: true,
          preVenda,
          mensagem: `Comanda ${preVenda.codigoComanda} gerada com sucesso!`,
        });
      } catch (err: any) {
        await client.query('ROLLBACK');
        request.log.error(err, 'Erro ao gerar comanda de pré-venda');
        return reply.status(400).send({
          sucesso: false,
          mensagem: err.message || 'Erro ao gerar pré-venda',
        });
      } finally {
        client.release();
      }
    }
  );

  /**
   * PUT /api/pre-vendas/:id
   * Atualiza comanda / pré-venda no balcão mantendo rigorosamente o código original.
   */
  fastify.put(
    '/api/pre-vendas/:id',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('pre_venda:criar'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const params = request.params as { id: string };
      const body = request.body as CriarPreVendaDTO;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`SET LOCAL app.current_empresa_id = '${tenant.empresaId}'`);

        const preVenda = await PreVendaService.atualizarPreVenda(
          client,
          tenant,
          params.id,
          body
        );

        await client.query('COMMIT');

        return reply.status(200).send({
          sucesso: true,
          preVenda,
          mensagem: `Comanda ${preVenda.codigoComanda} atualizada com sucesso!`,
        });
      } catch (err: any) {
        await client.query('ROLLBACK');
        request.log.error(err, `Erro ao atualizar comanda de pré-venda ${params.id}`);
        return reply.status(400).send({
          sucesso: false,
          mensagem: err.message || 'Erro ao atualizar pré-venda',
        });
      } finally {
        client.release();
      }
    }
  );

  /**
   * GET /api/pre-vendas/comanda/:codigo
   * Busca e valida comanda para o Caixa/PDV ou Balcão.
   */
  fastify.get(
    '/api/pre-vendas/comanda/:codigo',
    {
      preHandler: [
        exigirTenantAutenticado,
        async (request: FastifyRequest, reply: FastifyReply) => {
          // Permite operador de caixa ('pdv:acesso') ou balconista ('pre_venda:consultar')
          const permissions = (request as any).usuario?.permissoes || [];
          const podeAcessar =
            permissions.includes('pdv:acesso') ||
            permissions.includes('pre_venda:consultar') ||
            permissions.includes('balcao:consultar');

          if (!podeAcessar) {
            return reply.status(403).send({
              sucesso: false,
              mensagem: 'Acesso negado: permissão necessária para consultar comandas.',
            });
          }
        },
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const params = request.params as { codigo: string };

      try {
        const preVenda = await PreVendaService.buscarPorCodigo(
          pool,
          tenant,
          params.codigo
        );

        return reply.status(200).send({
          sucesso: true,
          preVenda,
        });
      } catch (err: any) {
        request.log.error(err, `Erro ao buscar comanda ${params.codigo}`);
        return reply.status(404).send({
          sucesso: false,
          mensagem: err.message || 'Comanda não encontrada',
        });
      }
    }
  );

  /**
   * GET /api/pre-vendas/pendentes
   * Lista comandas com status PENDENTE para a filial.
   */
  fastify.get(
    '/api/pre-vendas/pendentes',
    {
      preHandler: [
        exigirTenantAutenticado,
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;

      try {
        const preVendas = await PreVendaService.listarPendentes(pool, tenant);

        return reply.status(200).send({
          sucesso: true,
          preVendas,
        });
      } catch (err: any) {
        request.log.error(err, 'Erro ao listar pré-vendas pendentes');
        return reply.status(400).send({
          sucesso: false,
          mensagem: err.message || 'Erro ao listar comandas',
        });
      }
    }
  );

  /**
   * GET /api/pre-vendas/pesquisar
   * Pesquisa inteligente de pré-vendas por nome, CPF (normalizado) ou código.
   */
  fastify.get(
    '/api/pre-vendas/pesquisar',
    {
      preHandler: [
        exigirTenantAutenticado,
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const query = request.query as { q?: string };
      const termo = query.q || '';

      try {
        const preVendas = await PreVendaService.pesquisarPreVendas(pool, tenant, termo);

        return reply.status(200).send({
          sucesso: true,
          preVendas,
        });
      } catch (err: any) {
        request.log.error(err, 'Erro ao pesquisar pré-vendas');
        return reply.status(400).send({
          sucesso: false,
          mensagem: err.message || 'Erro ao pesquisar pré-vendas',
        });
      }
    }
  );

  /**
   * POST /api/pre-vendas/:id/cancelar
   * Cancela uma pré-venda.
   */
  fastify.post(
    '/api/pre-vendas/:id/cancelar',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('pre_venda:cancelar'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const params = request.params as { id: string };
      const body = request.body as { motivo?: string };

      try {
        await PreVendaService.cancelarPreVenda(
          pool,
          tenant,
          params.id,
          body.motivo || 'Cancelado pelo usuário'
        );

        return reply.status(200).send({
          sucesso: true,
          mensagem: 'Pré-venda cancelada com sucesso.',
        });
      } catch (err: any) {
        request.log.error(err, `Erro ao cancelar pré-venda ${params.id}`);
        return reply.status(400).send({
          sucesso: false,
          mensagem: err.message || 'Erro ao cancelar pré-venda',
        });
      }
    }
  );

  /**
   * DELETE /api/pre-vendas/:id
   * Exclusão de comanda pendente no balcão.
   */
  fastify.delete(
    '/api/pre-vendas/:id',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('pre_venda:criar'),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const params = request.params as { id: string };

      try {
        await PreVendaService.excluirPreVenda(
          pool,
          tenant,
          params.id
        );

        return reply.status(200).send({
          sucesso: true,
          mensagem: 'Pré-venda excluída com sucesso.',
        });
      } catch (err: any) {
        request.log.error(err, `Erro ao excluir pré-venda ${params.id}`);
        return reply.status(400).send({
          sucesso: false,
          mensagem: err.message || 'Erro ao excluir pré-venda',
        });
      }
    }
  );
}
