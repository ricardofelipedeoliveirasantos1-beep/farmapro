import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FuncionariosService, CriarFuncionarioInput } from '../services/funcionarios.service.js';
import {
  exigirTenantAutenticado,
  exigirPermissao,
  bloquearOrigemPinParaOperacaoSensivel,
} from '../middlewares/auth.middleware.js';

export async function rotasFuncionarios(fastify: FastifyInstance): Promise<void> {
  const pool = fastify.db.pool;

  /**
   * GET /api/funcionarios
   * Lista colaboradores da empresa ativa.
   */
  fastify.get('/api/funcionarios', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('usuarios:gerenciar'),
      bloquearOrigemPinParaOperacaoSensivel,
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const empresaId = request.tenant!.empresaId;
    const funcionarios = await FuncionariosService.listarFuncionarios(pool, empresaId);

    return reply.send({
      sucesso: true,
      dados: funcionarios,
    });
  });

  /**
   * POST /api/funcionarios
   * Cadastra novo colaborador vinculado à empresa e suas filiais.
   */
  fastify.post('/api/funcionarios', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('usuarios:gerenciar'),
      bloquearOrigemPinParaOperacaoSensivel,
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const empresaId = request.tenant!.empresaId;
    const autorId = request.usuario!.sub;
    const body = request.body as CriarFuncionarioInput;

    if (!body.nome || !body.email || !body.cpf || !body.senhaInicial || !body.filiais || body.filiais.length === 0) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INVALIDOS',
        mensagem: 'Nome, e-mail, CPF, senha inicial e ao menos uma filial/cargo são obrigatórios.',
      });
    }

    try {
      const novo = await FuncionariosService.cadastrarFuncionario(pool, empresaId, body, autorId);
      return reply.status(201).send({
        sucesso: true,
        dados: novo,
        mensagem: 'Funcionário cadastrado com sucesso.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar funcionário';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_CADASTRO',
        mensagem: msg,
      });
    }
  });

  /**
   * PATCH /api/funcionarios/:id/status
   * Bloqueia, ativa ou inativa um colaborador na empresa.
   */
  fastify.patch('/api/funcionarios/:id/status', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('usuarios:gerenciar'),
      bloquearOrigemPinParaOperacaoSensivel,
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const empresaId = request.tenant!.empresaId;
    const { id } = request.params as { id: string };
    const { status } = request.body as { status?: 'ATIVO' | 'BLOQUEADO' | 'INATIVO' };

    if (!status || !['ATIVO', 'BLOQUEADO', 'INATIVO'].includes(status)) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'STATUS_INVALIDO',
        mensagem: 'Status deve ser ATIVO, BLOQUEADO ou INATIVO.',
      });
    }

    try {
      await FuncionariosService.alterarStatusFuncionario(pool, empresaId, id, status);
      return reply.send({
        sucesso: true,
        mensagem: `Status do funcionário alterado para ${status}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar status';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_STATUS',
        mensagem: msg,
      });
    }
  });

  /**
   * POST /api/funcionarios/:id/pin
   * Configura PIN de 6 dígitos para determinado terminal de PDV.
   */
  fastify.post('/api/funcionarios/:id/pin', {
    preHandler: [
      exigirTenantAutenticado,
      exigirPermissao('usuarios:gerenciar'),
      bloquearOrigemPinParaOperacaoSensivel,
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const empresaId = request.tenant!.empresaId;
    const filialId = request.tenant!.filialId || '';
    const { id: usuarioId } = request.params as { id: string };
    const { pin, dispositivoId } = request.body as { pin?: string; dispositivoId?: string };

    if (!pin || !dispositivoId) {
      return reply.status(400).send({
        sucesso: false,
        erro: 'DADOS_INCOMPLETOS',
        mensagem: 'PIN e dispositivoId são obrigatórios.',
      });
    }

    try {
      const res = await FuncionariosService.configurarPinDispositivo(pool, {
        empresaId,
        filialId,
        usuarioId,
        dispositivoId,
        pinNovo: pin,
      });
      return reply.send(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao configurar PIN';
      return reply.status(400).send({
        sucesso: false,
        erro: 'ERRO_PIN',
        mensagem: msg,
      });
    }
  });

  /**
   * GET /api/funcionarios/:id/permissoes-efetivas
   * Visualização prévia das permissões efetivas do funcionário na filial ativa.
   */
  fastify.get('/api/funcionarios/:id/permissoes-efetivas', {
    preHandler: [
      exigirTenantAutenticado,
      bloquearOrigemPinParaOperacaoSensivel,
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const empresaId = request.tenant!.empresaId;
    const filialId = request.tenant!.filialId || '';
    const { id: usuarioId } = request.params as { id: string };

    const perms = await FuncionariosService.obterPermissoesEfetivasPreview(pool, {
      usuarioId,
      empresaId,
      filialId,
    });

    if (!perms) {
      return reply.status(404).send({
        sucesso: false,
        erro: 'VINCULO_NAO_ENCONTRADO',
        mensagem: 'Colaborador não possui vínculo ativo com a filial selecionada.',
      });
    }

    return reply.send({
      sucesso: true,
      dados: perms,
    });
  });
}
