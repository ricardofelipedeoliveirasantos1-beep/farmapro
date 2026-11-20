import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { JwtService, PayloadAccessToken } from '../services/jwt.service.js';
import { ContextoTenant } from '@farmapro/shared';

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: ContextoTenant;
    usuario?: PayloadAccessToken;
  }
}

/**
 * Plugin de contexto de Tenant para Fastify.
 * Garante que a identidade e o tenant sejam derivados exclusivamente do Token JWT validado.
 * NUNCA confia em cabeçalhos arbitrários (ex: x-empresa-id) enviados livremente pelo frontend.
 */
export async function pluginContextoTenant(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('tenant', undefined);
  fastify.decorateRequest('usuario', undefined);

  fastify.addHook('preHandler', async (request: FastifyRequest, _reply: FastifyReply) => {
    // Rotas públicas ou de autenticação preliminar não requerem tenant estabelecido
    if (request.url.startsWith('/api/health') || request.url.startsWith('/api/auth/')) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const payload = JwtService.verificarAccessToken(token);

      if (payload) {
        request.usuario = payload;
        if (payload.empresaId && payload.filialId) {
          request.tenant = {
            empresaId: payload.empresaId,
            filialId: payload.filialId,
            usuarioId: payload.sub,
          };
        }
      }
    }
  });
}
