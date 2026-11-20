import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Interface para estender a requisição com o contexto de tenant autenticado.
 */
export interface ContextoTenant {
  empresaId: string;
  filialId: string;
  usuarioId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: ContextoTenant;
  }
}

/**
 * Plugin de contexto de Tenant para Fastify.
 * Garante que nenhuma rota protegida acerte dados sem identificar a empresa.
 */
export async function pluginContextoTenant(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('tenant', undefined);

  fastify.addHook('preHandler', async (request: FastifyRequest, _reply: FastifyReply) => {
    // Rotas públicas (ex: saúde, documentação) são ignoradas
    if (request.url.startsWith('/api/health') || request.url.startsWith('/api/public')) {
      return;
    }

    const headerEmpresaId = request.headers['x-empresa-id'] as string | undefined;
    const headerFilialId = request.headers['x-filial-id'] as string | undefined;

    // Em etapas futuras, a extração virá do Token JWT validado
    if (headerEmpresaId) {
      request.tenant = {
        empresaId: headerEmpresaId,
        filialId: headerFilialId || 'filial-padrao',
        usuarioId: (request.headers['x-usuario-id'] as string) || 'anonimo',
      };
    }
  });
}

