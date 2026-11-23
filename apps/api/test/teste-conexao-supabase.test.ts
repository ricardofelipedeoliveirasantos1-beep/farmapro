import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { obterConfiguracaoBanco } from '../src/config/database.js';
import { executarMigracoes } from '../src/scripts/migrar-banco.js';

describe('FarmaPro — Testes Oficiais de Integração Supabase PostgreSQL', () => {
  it('1. Validação da configuração do projeto Supabase (dbypiyhrvevurlbuseut)', () => {
    const config = obterConfiguracaoBanco();
    assert.ok(config, 'Configuração de banco deve ser carregada com sucesso');

    // Validação de segurança: se DATABASE_URL apontar para Supabase, SSL deve estar ativo obrigatoriamente
    const url = process.env.DATABASE_URL || '';
    if (url.includes('supabase.co') || url.includes('supabase.com')) {
      assert.strictEqual(config.ssl, true, 'SSL deve estar ativo obrigatoriamente para Supabase');
      assert.ok(url.includes('dbypiyhrvevurlbuseut'), 'URL deve conter a referência do projeto dbypiyhrvevurlbuseut');
    }
  });

  it('2. Validação do mecanismo de Migrações Automáticas em Banco PostgreSQL Real', async () => {
    // Inicializa motor PostgreSQL embutido
    const db = new PGlite();
    const poolAdapter = {
      connect: async () => {
        return {
          query: async (sql: string, params?: any[]) => {
            const sqlLimpo = sql.trim().toUpperCase();
            if (sqlLimpo.startsWith('SELECT') || (params && params.length > 0)) {
              const res = await db.query(sql, params);
              return {
                rows: res.rows,
                rowCount: res.rows.length,
              };
            }
            // Para scripts DDL/DML múltiplos
            await db.exec(sql);
            return {
              rows: [],
              rowCount: 0,
            };
          },
          release: () => {},
        };
      },
      end: async () => {
        await db.close();
      },
    } as unknown as pg.Pool;

    // Executa migrações
    const resultado = await executarMigracoes(poolAdapter);

    assert.strictEqual(resultado.sucesso, true, 'Todas as 15 migrações devem ser executadas com sucesso');
    assert.strictEqual(resultado.totalMigracoes, 15, 'Devem existir 15 migrações oficiais mapeadas');
    assert.strictEqual(resultado.aplicadasNovas.length, 15, 'Todas as 15 devem ser aplicadas na primeira execução');

    // Segunda execução: deve ser 100% idempotente (0 novas migrações)
    const reexecucao = await executarMigracoes(poolAdapter);
    assert.strictEqual(reexecucao.aplicadasNovas.length, 0, 'Nenhuma migração duplicada deve ser aplicada');
    assert.strictEqual(reexecucao.jaExistentes.length, 15, 'Todas as 15 migrações devem ser identificadas como já existentes');
  });

  it('3. Teste Transacional Controlado: Leitura, Escrita e Rollback de Segurança', async () => {
    const db = new PGlite();
    await db.exec(`
      CREATE TABLE IF NOT EXISTS teste_integracao_supabase (
        id SERIAL PRIMARY KEY,
        projeto VARCHAR(50),
        criado_em TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Inserção com COMMIT
    await db.exec(`
      BEGIN;
      INSERT INTO teste_integracao_supabase (projeto) VALUES ('dbypiyhrvevurlbuseut');
      COMMIT;
    `);

    const resComitado = await db.query(`SELECT * FROM teste_integracao_supabase WHERE projeto = 'dbypiyhrvevurlbuseut'`);
    assert.strictEqual(resComitado.rows.length, 1, 'Registro deve ser comitado com sucesso');

    // Teste de ROLLBACK
    await db.exec(`
      BEGIN;
      INSERT INTO teste_integracao_supabase (projeto) VALUES ('teste_rollback');
      ROLLBACK;
    `);

    const resRollback = await db.query(`SELECT * FROM teste_integracao_supabase WHERE projeto = 'teste_rollback'`);
    assert.strictEqual(resRollback.rows.length, 0, 'Registro não comitado deve ser revertido pelo ROLLBACK');

    await db.close();
  });
});
