import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { VendasService } from '../services/vendas.service.js';
import {
  exigirTenantAutenticado,
  exigirPermissao,
} from '../middlewares/auth.middleware.js';
import { CancelarVendaDTO, CriarVendaDTO } from '@farmapro/shared';

export async function rotasVendas(fastify: FastifyInstance): Promise<void> {
  const pool = fastify.db.pool;

  /**
   * GET /api/vendas/produtos/pesquisa
   * Pesquisa rápida de medicamentos e produtos para balcão PDV.
   */
  fastify.get('/api/vendas/produtos/pesquisa', {
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
        mensagem: 'Uma filial deve estar selecionada para consultar produtos no PDV.',
      });
    }

    const { q } = request.query as { q?: string };

    if (!q || q.trim().length === 0) {
      return reply.send({
        sucesso: true,
        dados: [],
      });
    }

    const produtos = await VendasService.pesquisarProdutos(pool, {
      empresaId: tenant.empresaId,
      filialId: tenant.filialId,
      termoBusca: q,
    });

    return reply.send({
      sucesso: true,
      dados: produtos,
    });
  });

  /**
   * POST /api/vendas
   * Registra e finaliza uma venda no PDV.
   */
  fastify.post('/api/vendas', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('pdv:vender'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const operadorId = request.usuario!.sub;
    const body = request.body as CriarVendaDTO;

    if (!body.itens || body.itens.length === 0) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INVALIDOS',
        mensagem: 'A venda deve possuir ao menos um item selecionado.',
      });
    }

    if (!body.pagamentos || body.pagamentos.length === 0) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INVALIDOS',
        mensagem: 'Informe ao menos uma modalidade de pagamento.',
      });
    }

    try {
      const venda = await VendasService.criarVenda(pool, body, tenant, operadorId);
      return reply.status(201).send({
        sucesso: true,
        dados: venda,
        mensagem: 'Venda finalizada com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar venda';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_CRIACAO_VENDA',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/vendas/cancelar
   * Cancela uma venda com estorno de estoque, integridade financeira e opção de voucher.
   */
  fastify.post('/api/vendas/cancelar', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('pdv:cancelar_venda'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const operadorId = request.usuario!.sub;
    const body = request.body as CancelarVendaDTO;

    if (!body.vendaId || !body.motivo) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INVALIDOS',
        mensagem: 'Identificador da venda e motivo do cancelamento são obrigatórios.',
      });
    }

    // Se solicitada a emissão de voucher, exige a permissão 'vouchers:emitir'
    if (body.emitirVoucher) {
      const permissoesUsuario = request.usuario?.permissoes || [];
      const eProprietario = request.usuario?.papelEmpresa === 'PROPRIETARIO';
      if (!eProprietario && !permissoesUsuario.includes('vouchers:emitir')) {
        return reply.status(403).send({
          sucesso: false,
          erro: 'PERMISSAO_NEGADA',
          mensagem: 'Usuário não possui a permissão requerida "vouchers:emitir" para gerar vouchers no cancelamento.',
        });
      }
    }

    try {
      const resultado = await VendasService.cancelarVenda(pool, body, tenant, operadorId);
      return reply.send({
        sucesso: true,
        dados: resultado.venda,
        voucherGerado: resultado.voucherGerado,
        mensagem: resultado.voucherGerado
          ? `Venda cancelada com sucesso. Voucher emitido: ${resultado.voucherGerado.codigo}`
          : 'Venda cancelada com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cancelar venda';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_CANCELAMENTO_VENDA',
        mensagem: msg,
      });
    }
  });

  /**
   * GET /api/vendas/:vendaId
   * Obtém detalhes de uma venda.
   */
  fastify.get('/api/vendas/:vendaId', {
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

    const { vendaId } = request.params as { vendaId: string };

    const venda = await VendasService.obterVendaPorId(pool, tenant.empresaId, tenant.filialId, vendaId);
    if (!venda) {
      return reply.status(404).send({
        sucesso: false,
        erro: 'VENDA_NAO_ENCONTRADA',
        mensagem: 'Venda não encontrada.',
      });
    }

    return reply.send({
      sucesso: true,
      dados: venda,
    });
  });

  /**
   * GET /api/vendas
   * Lista histórico de vendas da filial.
   */
  fastify.get('/api/vendas', {
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

    const query = request.query as {
      status?: string;
      dataInicio?: string;
      dataFim?: string;
      limite?: string;
    };

    const vendas = await VendasService.listarVendas(pool, tenant.empresaId, tenant.filialId, {
      status: query.status,
      dataInicio: query.dataInicio,
      dataFim: query.dataFim,
      limite: query.limite ? Number(query.limite) : 50,
    });

    return reply.send({
      sucesso: true,
      dados: vendas,
    });
  });
}
