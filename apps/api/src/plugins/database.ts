import { FastifyInstance } from 'fastify';
import { obterPool, fecharPool, verificarSaudeBanco, executarTransacaoTenant } from '../db/pool.js';
import pg from 'pg';

declare module 'fastify' {
  interface FastifyInstance {
    db: {
      pool: pg.Pool;
      verificarSaude: typeof verificarSaudeBanco;
      executarTransacaoTenant: typeof executarTransacaoTenant;
    };
  }
}

/**
 * Plugin Fastify para injeção e gerenciamento do ciclo de vida do PostgreSQL.
 */
export async function pluginDatabase(fastify: FastifyInstance): Promise<void> {
  const pool = obterPool();

  fastify.decorate('db', {
    pool,
    verificarSaude: verificarSaudeBanco,
    executarTransacaoTenant,
  });

  // Encerramento gracioso das conexões ativas ao parar o servidor
  fastify.addHook('onClose', async () => {
    fastify.log.info('Encerrando pool de conexões do PostgreSQL...');
    await fecharPool();
  });
}
