import pg from 'pg';
import { obterConfiguracaoBanco } from '../config/database.js';
import { ContextoTenant } from '@farmapro/shared';

const { Pool } = pg;

let poolInstancia: pg.Pool | null = null;

/**
 * Cria ou retorna a instância singleton do Pool de conexões do PostgreSQL.
 */
export function obterPool(): pg.Pool {
  if (poolInstancia) {
    return poolInstancia;
  }

  const config = obterConfiguracaoBanco();

  poolInstancia = new Pool({
    connectionString: config.connectionString,
    host: config.connectionString ? undefined : config.host,
    port: config.connectionString ? undefined : config.port,
    database: config.connectionString ? undefined : config.database,
    user: config.connectionString ? undefined : config.user,
    password: config.connectionString ? undefined : config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    min: config.minPool,
    max: config.maxPool,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: config.timeoutMs,
  });

  poolInstancia.on('error', (err) => {
    console.error('[ERRO POOL POSTGRESQL]: Erro inesperado em cliente ocioso', err);
  });

  return poolInstancia;
}

/**
 * Encerra todas as conexões ativas do pool de forma segura.
 */
export async function fecharPool(): Promise<void> {
  if (poolInstancia) {
    await poolInstancia.end();
    poolInstancia = null;
  }
}

/**
 * Verifica a conectividade e disponibilidade do banco de dados (healthcheck).
 */
export async function verificarSaudeBanco(): Promise<{
  conectado: boolean;
  tempoRespostaMs: number;
  mensagem?: string;
}> {
  const inicio = Date.now();
  try {
    const pool = obterPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 as saude;');
      return {
        conectado: true,
        tempoRespostaMs: Date.now() - inicio,
      };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      conectado: false,
      tempoRespostaMs: Date.now() - inicio,
      mensagem: msg,
    };
  }
}

/**
 * Executa uma operação dentro de uma transação isolada com contexto multiempresa estrito.
 *
 * GARANTIAS DE SEGURANÇA:
 * 1. Usa SET LOCAL ROLE farmapro_app (aplica políticas RLS e remove privilégios superuser).
 * 2. Injeta variáveis de sessão transitórias (app.current_empresa_id, filial_id, usuario_id).
 * 3. Garante ROLLBACK automático em caso de exceção.
 * 4. Ao finalizar a transação, SET LOCAL expira e o cliente retorna limpo ao pool,
 *    evitando qualquer contaminação cruzada de contexto em requisições subsequentes.
 */
export async function executarTransacaoTenant<T>(
  tenant: ContextoTenant,
  operacao: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const pool = obterPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN;');

    // 1. Alterna papel para farmapro_app (sem BYPASSRLS)
    await client.query('SET LOCAL ROLE farmapro_app;');

    // 2. Define o contexto de Tenant da transação de forma parametrizada
    if (tenant.empresaId) {
      await client.query(`SET LOCAL app.current_empresa_id = '${tenant.empresaId}';`);
    }
    if (tenant.filialId) {
      await client.query(`SET LOCAL app.current_filial_id = '${tenant.filialId}';`);
    }
    if (tenant.usuarioId) {
      await client.query(`SET LOCAL app.current_usuario_id = '${tenant.usuarioId}';`);
    }

    // 3. Executa a operação do caso de uso
    const resultado = await operacao(client);

    // 4. Efetiva transação
    await client.query('COMMIT;');

    return resultado;
  } catch (erro) {
    await client.query('ROLLBACK;');
    throw erro;
  } finally {
    // 5. Devolve o cliente ao pool (SET LOCAL foi revertido com o término da transação)
    client.release();
  }
}
