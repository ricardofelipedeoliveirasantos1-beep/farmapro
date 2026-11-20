import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { RecebimentoService } from '../services/recebimento.service.js';
import {
  ImportarNfeXmlDTO,
  IniciarConferenciaDTO,
  RegistrarConferenciaFisicaDTO,
  AprovarDivergenciaDTO,
  ConfirmarRecebimentoDTO,
} from '@farmapro/shared';
import {
  exigirTenantAutenticado,
  exigirPermissao,
} from '../middlewares/auth.middleware.js';

export const rotasRecebimento: FastifyPluginAsync = async (app: FastifyInstance) => {
  const recebimentoService = new RecebimentoService(app.db.pool);

  // 1. IMPORTAR ARQUIVO XML DE NF-E
  app.post<{ Body: ImportarNfeXmlDTO }>(
    '/recebimento/nfe/importar-xml',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('recebimento:importar_xml'),
      ],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      try {
        const nfe = await recebimentoService.importarXmlNfe(tenant, request.body);
        return reply.status(201).send({
          sucesso: true,
          mensagem: 'XML de NF-e importado com sucesso. Estoque físico permanece inalterado até a conferência.',
          dados: nfe,
        });
      } catch (err: unknown) {
        const mensagem = err instanceof Error ? err.message : 'Erro ao importar XML de NF-e';
        return reply.status(400).send({ sucesso: false, erro: mensagem });
      }
    }
  );

  // 2. LISTAR NF-ES IMPORTADAS
  app.get<{ Querystring: { status?: string; filialId?: string } }>(
    '/recebimento/nfe',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('recebimento:consultar'),
      ],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const nfes = await recebimentoService.listarNfes(tenant, request.query);
      return reply.send({ sucesso: true, dados: nfes });
    }
  );

  // 3. OBTER DETALHES DE UMA NF-E
  app.get<{ Params: { id: string } }>(
    '/recebimento/nfe/:id',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('recebimento:consultar'),
      ],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const nfe = await recebimentoService.obterNfePorId(tenant, request.params.id);
      if (!nfe) {
        return reply.status(404).send({ sucesso: false, erro: 'NF-e não encontrada' });
      }
      return reply.send({ sucesso: true, dados: nfe });
    }
  );

  // 4. VINCULAR MANUALMENTE PRODUTO A ITEM DE NF-E
  app.post<{ Params: { id: string }; Body: { produtoId: string } }>(
    '/recebimento/nfe/itens/:id/associar-produto',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('recebimento:conferir'),
      ],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      try {
        await recebimentoService.associarProdutoItemNfe(tenant, request.params.id, request.body.produtoId);
        return reply.send({ sucesso: true, mensagem: 'Produto associado com sucesso ao item da NF-e' });
      } catch (err: unknown) {
        const mensagem = err instanceof Error ? err.message : 'Erro ao vincular produto';
        return reply.status(400).send({ sucesso: false, erro: mensagem });
      }
    }
  );

  // 5. INICIAR CONFERÊNCIA FÍSICA
  app.post<{ Body: IniciarConferenciaDTO }>(
    '/recebimento/conferencia/iniciar',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('recebimento:conferir'),
      ],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      try {
        const conferencia = await recebimentoService.iniciarConferencia(tenant, request.body);
        return reply.status(201).send({
          sucesso: true,
          mensagem: 'Sessão de conferência física iniciada com sucesso.',
          dados: conferencia,
        });
      } catch (err: unknown) {
        const mensagem = err instanceof Error ? err.message : 'Erro ao iniciar conferência';
        return reply.status(400).send({ sucesso: false, erro: mensagem });
      }
    }
  );

  // 6. REGISTRAR CONTAGEM FÍSICA E DIVERGÊNCIAS
  app.post<{ Body: RegistrarConferenciaFisicaDTO }>(
    '/recebimento/conferencia/registrar-fisica',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('recebimento:conferir'),
      ],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      try {
        const conf = await recebimentoService.registrarConferenciaFisica(tenant, request.body);
        return reply.send({
          sucesso: true,
          mensagem: conf.temDivergencia
            ? 'Conferência física registrada com divergências encaminhadas para aprovação.'
            : 'Conferência física concluída sem divergências e aprovada para entrada.',
          dados: conf,
        });
      } catch (err: unknown) {
        const mensagem = err instanceof Error ? err.message : 'Erro ao registrar conferência física';
        return reply.status(400).send({ sucesso: false, erro: mensagem });
      }
    }
  );

  // 7. APROVAR OU REJEITAR DIVERGÊNCIAS (SEGREGAÇÃO DE FUNÇÕES)
  app.post<{ Body: AprovarDivergenciaDTO }>(
    '/recebimento/conferencia/aprovar-divergencia',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('recebimento:aprovar_divergencia'),
      ],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      try {
        const conf = await recebimentoService.aprovarDivergencia(tenant, request.body);
        return reply.send({
          sucesso: true,
          mensagem: request.body.aprovado
            ? 'Divergência aprovada pelo responsável central.'
            : 'Divergência rejeitada. Recebimento não autorizado.',
          dados: conf,
        });
      } catch (err: unknown) {
        const mensagem = err instanceof Error ? err.message : 'Erro na decisão da divergência';
        return reply.status(400).send({ sucesso: false, erro: mensagem });
      }
    }
  );

  // 8. CONFIRMAR RECEBIMENTO E ENTRADA DEFINITIVA NO ESTOQUE
  app.post<{ Body: ConfirmarRecebimentoDTO }>(
    '/recebimento/conferencia/confirmar-entrada',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('recebimento:confirmar'),
      ],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      try {
        const concluido = await recebimentoService.confirmarRecebimentoEEntradaEstoque(tenant, request.body);
        return reply.send({
          sucesso: true,
          mensagem: 'Mercadorias conferidas e liberadas para estoque com sucesso!',
          dados: concluido,
        });
      } catch (err: unknown) {
        const mensagem = err instanceof Error ? err.message : 'Erro ao confirmar entrada de mercadorias no estoque';
        return reply.status(400).send({ sucesso: false, erro: mensagem });
      }
    }
  );

  // 9. LISTAR CONFERÊNCIAS / RECEBIMENTOS
  app.get<{ Querystring: { status?: string; filialId?: string } }>(
    '/recebimento/conferencias',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('recebimento:consultar'),
      ],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const lista = await recebimentoService.listarRecebimentos(tenant, request.query);
      return reply.send({ sucesso: true, dados: lista });
    }
  );

  // 10. OBTER DETALHES DE UMA CONFERÊNCIA
  app.get<{ Params: { id: string } }>(
    '/recebimento/conferencias/:id',
    {
      preHandler: [
        exigirTenantAutenticado,
        exigirPermissao('recebimento:consultar'),
      ],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const conf = await recebimentoService.obterRecebimentoPorId(tenant, request.params.id);
      if (!conf) {
        return reply.status(404).send({ sucesso: false, erro: 'Recebimento de mercadorias não encontrado' });
      }
      return reply.send({ sucesso: true, dados: conf });
    }
  );
};
