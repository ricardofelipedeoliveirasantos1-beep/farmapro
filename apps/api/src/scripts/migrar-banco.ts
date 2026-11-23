import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { obterConfiguracaoBanco } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function executarMigracoes(poolOverride?: pg.Pool): Promise<{
  sucesso: boolean;
  banco: string;
  totalMigracoes: number;
  aplicadasNovas: string[];
  jaExistentes: string[];
  erro?: string;
}> {
  const config = obterConfiguracaoBanco();
  const pool = poolOverride || new pg.Pool({
    connectionString: config.connectionString,
    host: config.connectionString ? undefined : config.host,
    port: config.connectionString ? undefined : config.port,
    database: config.connectionString ? undefined : config.database,
    user: config.connectionString ? undefined : config.user,
    password: config.connectionString ? undefined : config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    min: 1,
    max: 5,
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  const aplicadasNovas: string[] = [];
  const jaExistentes: string[] = [];

  try {
    // 1. Identificar versão do banco de dados
    const infoRes = await client.query(`
      SELECT 
        version() AS versao_pg,
        current_database() AS banco,
        current_user AS usuario
    `);
    const info = infoRes.rows[0];
    console.log(`[FARMPRO MIGRAÇÕES] Conectado ao banco: ${info.banco} como ${info.usuario}`);
    console.log(`[FARMPRO MIGRAÇÕES] Versão: ${info.versao_pg.split(',')[0]}`);

    // 2. Criar tabela de controle de migrações
    await client.query(`
      CREATE TABLE IF NOT EXISTS _farmapro_migrations (
        versao VARCHAR(255) PRIMARY KEY,
        aplicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Localizar arquivos de migração
    const migrationsDir = path.resolve(__dirname, '../../../../database/migrations');
    const arquivos = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // 4. Buscar migrações já executadas
    const resMigradas = await client.query<{ versao: string }>(
      `SELECT versao FROM _farmapro_migrations ORDER BY versao ASC;`
    );
    const executadas = new Set(resMigradas.rows.map(r => r.versao));

    // 5. Aplicar migrações pendentes em ordem
    for (const arq of arquivos) {
      if (executadas.has(arq)) {
        jaExistentes.push(arq);
        continue;
      }

      console.log(`[FARMPRO MIGRAÇÕES] Aplicando: ${arq}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, arq), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO _farmapro_migrations (versao) VALUES ($1);`,
          [arq]
        );
        await client.query('COMMIT');
        aplicadasNovas.push(arq);
        console.log(`[FARMPRO MIGRAÇÕES] ✔ ${arq} aplicada com sucesso.`);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`[FARMPRO MIGRAÇÕES] ✖ Falha ao aplicar ${arq}: ${err.message}`);
        throw new Error(`Falha na migração ${arq}: ${err.message}`);
      }
    }

    // 6. Carga de Dados Iniciais Mínimos se banco estiver vazio (Bootstrap seguro)
    const checkEmpresas = await client.query<{ count: string }>(
      `SELECT count(*)::text as count FROM empresas;`
    );

    if (Number(checkEmpresas.rows[0]?.count || 0) === 0) {
      console.log('[FARMPRO MIGRAÇÕES] Inicializando dados essenciais multi-tenant (Empresa, Filial, Usuário Matriz)...');
      await client.query('BEGIN');
      try {
        const empresaId = '11111111-1111-4111-a111-111111111111';
        const filialId = '11111111-aaaa-4111-a111-aaaaaaaaaaaa';
        const usuarioId = 'aaaaaaaa-2222-4000-8000-000000000002';
        const cargoId = 'bbbbbbbb-1111-4000-8000-000000000001';

        await client.query(`
          INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato)
          VALUES ('${empresaId}', 'FarmaPro Farmácia Matriz Ltda', 'FarmaPro Matriz', '11222333000144', 'contato@farmapro.demo', '1133331111')
          ON CONFLICT (id) DO NOTHING;

          INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz)
          VALUES ('${filialId}', '${empresaId}', 'FIL-01', 'FarmaPro - Centro Matriz', '11222333000144', 'Rua Central', '100', 'Centro', 'São Paulo', 'SP', '01001000', '1133331111', true)
          ON CONFLICT (id) DO NOTHING;

          INSERT INTO cargos (id, empresa_id, nome, nivel_acesso, descricao)
          VALUES ('${cargoId}', '${empresaId}', 'Atendente de Balcão e Caixa', 'ATENDENTE', 'Acesso operacional completo ao balcão e PDV')
          ON CONFLICT (id) DO NOTHING;

          INSERT INTO usuarios (id, nome, email, cpf, hash_senha, status)
          VALUES ('${usuarioId}', 'Roberto Carlos Balconista', 'roberto@farmapro.demo', '22222222222', 'argon2id$mock', 'ATIVO')
          ON CONFLICT (id) DO NOTHING;

          INSERT INTO usuarios_empresas (empresa_id, usuario_id, papel_empresa, matricula, senha_operacional_hash, status)
          VALUES ('${empresaId}', '${usuarioId}', 'ADMINISTRADOR', '01', '$argon2id$v=19$m=65536,t=3,p=4$mock$mock', 'ATIVO')
          ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

          INSERT INTO usuarios_filiais (empresa_id, filial_id, usuario_id, cargo_id, e_filial_padrao)
          VALUES ('${empresaId}', '${filialId}', '${usuarioId}', '${cargoId}', true)
          ON CONFLICT (usuario_id, filial_id) DO NOTHING;
        `);

        await client.query('COMMIT');
        console.log('[FARMPRO MIGRAÇÕES] ✔ Dados essenciais de bootstrap carregados com sucesso.');
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.warn(`[FARMPRO MIGRAÇÕES] Aviso no bootstrap: ${err.message}`);
      }
    }

    return {
      sucesso: true,
      banco: String(info.banco),
      totalMigracoes: arquivos.length,
      aplicadasNovas,
      jaExistentes,
    };
  } finally {
    client.release();
    if (!poolOverride) {
      await pool.end();
    }
  }
}

// Execução direta via CLI: npx tsx apps/api/src/scripts/migrar-banco.ts
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  executarMigracoes()
    .then((res) => {
      console.log('\n[FARMPRO MIGRAÇÕES] Relatório de Execução:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n[FARMPRO MIGRAÇÕES] ERRO FATAL:', err);
      process.exit(1);
    });
}
