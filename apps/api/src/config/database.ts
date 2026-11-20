import dotenv from 'dotenv';
import path from 'node:path';

// Carregar .env se presente
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface ConfiguracaoBanco {
  connectionString?: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl: boolean;
  minPool: number;
  maxPool: number;
  timeoutMs: number;
}

export function obterConfiguracaoBanco(): ConfiguracaoBanco {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'farmapro_dev',
    user: process.env.DB_USER || 'farmapro_app',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' || isProd,
    minPool: Number(process.env.DB_POOL_MIN) || 2,
    maxPool: Number(process.env.DB_POOL_MAX) || 20,
    timeoutMs: Number(process.env.DB_TIMEOUT_MS) || 5000,
  };
}
