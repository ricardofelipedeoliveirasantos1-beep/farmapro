import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtService, PayloadAccessToken } from '../services/jwt.service.js';
import { ContextoTenant } from '@farmapro/shared';

declare module 'fastify' {
  interface FastifyRequest {
    usuario?: PayloadAccessToken;
    tenant?: ContextoTenant;
  }
}

/**
 * Middleware para validar o Access Token JWT assinado.
 * NUNCA utiliza cabeçalhos temporários: a identidade e o tenant derivam estritamente do JWT.
 */
export async function autenticarRequisicao(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      sucesso: false,
      erro: 'AUTORIZACAO_NECESSARIA',
      mensagem: 'Token de autenticação Bearer ausente.',
    });
  }

  const token = authHeader.substring(7).trim();
  const payload = JwtService.verificarAccessToken(token);

  if (!payload) {
    return reply.status(401).send({
      sucesso: false,
      erro: 'TOKEN_INVALIDO',
      mensagem: 'Token de acesso inválido ou expirado. Faça login novamente.',
    });
  }

  request.usuario = payload;

  // Se o token já possui empresa/filial validada, estabelece o ContextoTenant
  if (payload.empresaId) {
    request.tenant = {
      empresaId: payload.empresaId,
      filialId: payload.filialId,
      usuarioId: payload.sub,
    };
  }
}

/**
 * Middleware para garantir que a requisição opere sob um Tenant validado.
 */
export async function exigirTenantAutenticado(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await autenticarRequisicao(request, reply);
  if (reply.sent) return;

  if (!request.tenant?.empresaId) {
    return reply.status(403).send({
      sucesso: false,
      erro: 'TENANT_NAO_SELECIONADO',
      mensagem: 'Selecione uma empresa e filial autorizadas antes de acessar este recurso.',
    });
  }
}

/**
 * Middleware de autorização por permissão atômica.
 */
export function exigirPermissao(permissaoNecessaria: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await exigirTenantAutenticado(request, reply);
    if (reply.sent) return;

    const perms = request.usuario?.permissoes || [];
    const eProprietario = request.usuario?.papelEmpresa === 'PROPRIETARIO';

    if (!eProprietario && !perms.includes(permissaoNecessaria)) {
      return reply.status(403).send({
        sucesso: false,
        erro: 'ACESSO_NEGADO',
        mensagem: `Permissão insuficiente: requer [${permissaoNecessaria}].`,
      });
    }
  };
}

/**
 * Bloqueia operações sensíveis se a sessão tiver sido originada por PIN rápido em PDV.
 * O PIN é estritamente para agilidade operacional no caixa e não substitui autenticação completa.
 */
export async function bloquearOrigemPinParaOperacaoSensivel(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.usuario?.origemPin) {
    return reply.status(403).send({
      sucesso: false,
      erro: 'OPERACAO_SENSIVEL_BLOQUEADA',
      mensagem: 'Operação administrativa restrita. É obrigatório login completo com senha mestre.',
    });
  }
}
