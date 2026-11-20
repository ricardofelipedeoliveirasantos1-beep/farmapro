import Fastify from 'fastify';
import cors from '@fastify/cors';
import { pluginContextoTenant } from './plugins/tenant.js';

const porta = Number(process.env.PORT) || 3333;
const host = process.env.API_HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

async function iniciarServidor() {
  try {
    // Configuração de CORS para permitir acesso do frontend Web
    await fastify.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    // Registro do middleware/plugin de contexto Multi-tenant
    await fastify.register(pluginContextoTenant);

    // Rota de Verificação de Saúde (Health Check)
    fastify.get('/api/health', async () => {
      return {
        status: 'OK',
        sistema: 'FarmaPro API',
        versao: '0.1.0-fundacao',
        etapa: '02 — Estrutura e Fundação',
        dataHora: new Date().toISOString(),
        multiempresa: 'Habilitado (Isolamento RLS)',
      };
    });

    await fastify.listen({ port: porta, host });
    fastify.log.info(`Servidor FarmaPro API ativo em http://${host}:${porta}`);
  } catch (erro) {
    fastify.log.error(erro);
    process.exit(1);
  }
}

// Inicialização somente em execução direta
if (process.env.NODE_ENV !== 'test') {
  iniciarServidor();
}

export { fastify };

