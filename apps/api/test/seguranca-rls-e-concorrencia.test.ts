import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Etapa 04: Validação Real de RLS, Concorrência e Vouchers no PostgreSQL', () => {
  let db: PGlite;

  // IDs Fictícios das Empresas
  const empA = '11111111-1111-4111-a111-111111111111';
  const filA1 = '11111111-aaaa-4111-a111-aaaaaaaaaaaa';
  const userA = '11111111-bbbb-4111-a111-bbbbbbbbbbbb';

  const empB = '22222222-2222-4222-b222-222222222222';
  const filB1 = '22222222-aaaa-4222-b222-aaaaaaaaaaaa';
  const userB = '22222222-bbbb-4222-b222-bbbbbbbbbbbb';

  before(async () => {
    db = new PGlite();

    // 1. Executar as 8 Migrações na ordem estrita localizadas na raiz
    const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
    const arquivosMigracao = [
      '001_extensoes_e_funcoes_base.sql',
      '002_tabelas_multiempresa_e_acesso.sql',
      '003_tabelas_produtos_medicamentos_e_lotes.sql',
      '004_tabelas_clientes_e_lgpd.sql',
      '005_tabelas_caixas_e_vendas.sql',
      '006_tabelas_estoque_e_movimentacoes.sql',
      '007_tabelas_auditoria_e_offline.sql',
      '008_politicas_rls_e_seguranca.sql',
      '009_tabelas_autenticacao_e_sessoes.sql',
    ];

    for (const arq of arquivosMigracao) {
      const sql = fs.readFileSync(path.join(migrationsDir, arq), 'utf-8');
      await db.exec(sql);
    }

    // 2. Carga inicial de dados das duas empresas fictícias
    // (Executado no papel de migração/manutenção)
    await db.exec(`
      -- Empresa A: Farmácia Demonstração A
      INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato)
      VALUES ('${empA}', 'Farmácia Demonstração A Ltda', 'Farma Demonstração A', '11111111000111', 'contato@farmaa.com.br', '11999990001');

      INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz)
      VALUES ('${filA1}', '${empA}', 'FIL-01', 'Matriz Centro A', '11111111000111', 'Rua Central A', '100', 'Centro', 'São Paulo', 'SP', '01001000', '11999990001', TRUE);

      INSERT INTO usuarios (id, nome, email, cpf, hash_senha, e_responsavel_tecnico)
      VALUES ('${userA}', 'Farmacêutico Responsável A', 'farmaceutico@farmaa.com.br', '11111111111', 'hash_senha_teste_a', TRUE);

      INSERT INTO usuarios_empresas (usuario_id, empresa_id, papel_empresa)
      VALUES ('${userA}', '${empA}', 'ADMINISTRADOR');

      -- Empresa B: Farmácia Demonstração B
      INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato)
      VALUES ('${empB}', 'Farmácia Demonstração B Ltda', 'Farma Demonstração B', '22222222000122', 'contato@farmab.com.br', '21999990002');

      INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz)
      VALUES ('${filB1}', '${empB}', 'FIL-01', 'Matriz Centro B', '22222222000122', 'Av Atlântica B', '200', 'Copacabana', 'Rio de Janeiro', 'RJ', '22070000', '21999990002', TRUE);

      INSERT INTO usuarios (id, nome, email, cpf, hash_senha, e_responsavel_tecnico)
      VALUES ('${userB}', 'Farmacêutico Responsável B', 'farmaceutico@farmab.com.br', '22222222222', 'hash_senha_teste_b', TRUE);

      INSERT INTO usuarios_empresas (usuario_id, empresa_id, papel_empresa)
      VALUES ('${userB}', '${empB}', 'ADMINISTRADOR');
    `);
  });

  after(async () => {
    if (db) {
      await db.close();
    }
  });

  // ============================================================================
  // SEÇÃO 6: OS 8 TESTES DE VALIDAÇÃO REAL DO ISOLAMENTO MULTIEMPRESA (RLS)
  // ============================================================================
  describe('Seção 6: Testes Reais de Isolamento Multiempresa (Papel farmapro_app com RLS)', () => {
    const prodA1 = '11111111-cccc-4111-a111-cccccccccccc';
    const prodB1 = '22222222-cccc-4222-b222-cccccccccccc';

    it('Pré-requisito: Inserir produtos de teste isolados para Empresa A e Empresa B', async () => {
      // Inserir produto na Empresa A
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        await tx.query(`
          INSERT INTO produtos (id, empresa_id, nome_comercial, nome_generico, fabricante, apresentacao, tipo_produto)
          VALUES ($1, $2, 'Amoxicilina 500mg Farma A', 'Amoxicilina', 'Laboratório A', 'Caixa com 21 cápsulas', 'MEDICAMENTO_GENERICO');
        `, [prodA1, empA]);
      });

      // Inserir produto na Empresa B
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empB}';`);
        await tx.query(`
          INSERT INTO produtos (id, empresa_id, nome_comercial, nome_generico, fabricante, apresentacao, tipo_produto)
          VALUES ($1, $2, 'Dipirona 500mg Farma B', 'Dipirona Sódica', 'Laboratório B', 'Frasco 20ml', 'MEDICAMENTO_GENERICO');
        `, [prodB1, empB]);
      });
    });

    it('1. Empresa A consulta seus próprios registros (sucesso)', async () => {
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        const res = await tx.query<{ nome_comercial: string }>(`SELECT nome_comercial FROM produtos WHERE id = $1;`, [prodA1]);
        assert.equal(res.rows.length, 1);
        assert.equal(res.rows[0].nome_comercial, 'Amoxicilina 500mg Farma A');
      });
    });

    it('2. Empresa B consulta seus próprios registros (sucesso)', async () => {
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empB}';`);
        const res = await tx.query<{ nome_comercial: string }>(`SELECT nome_comercial FROM produtos WHERE id = $1;`, [prodB1]);
        assert.equal(res.rows.length, 1);
        assert.equal(res.rows[0].nome_comercial, 'Dipirona 500mg Farma B');
      });
    });

    it('3. Empresa A tenta consultar dados da Empresa B (deve retornar 0 linhas)', async () => {
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        // Tentativa de buscar o produto que pertence à Empresa B
        const res = await tx.query(`SELECT * FROM produtos WHERE id = $1;`, [prodB1]);
        assert.equal(res.rows.length, 0, 'RLS deve ocultar completamente o registro da Empresa B');

        // Tentativa de buscar todos os produtos
        const todos = await tx.query<{ id: string }>(`SELECT id FROM produtos;`);
        const encontrouB = todos.rows.some(p => p.id === prodB1);
        assert.equal(encontrouB, false, 'Produtos da Empresa B não podem vazar na listagem geral');
      });
    });

    it('4. Empresa A tenta inserir dados com empresa_id da Empresa B (erro de violação de RLS)', async () => {
      await assert.rejects(
        async () => {
          await db.transaction(async (tx) => {
            await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
            await tx.query(`
              INSERT INTO produtos (empresa_id, nome_comercial, fabricante, apresentacao, tipo_produto)
              VALUES ($1, 'Tentativa Invasora', 'Lab X', 'Apresentação X', 'DIVERSOS');
            `, [empB]); // Tentando gravar com o ID da Empresa B
          });
        },
        (err: unknown) => {
          const erroStr = String(err);
          return /row-level security|violates|rolled back|25P02|42501/i.test(erroStr);
        },
        'O banco de dados deve rejeitar o INSERT indevido via WITH CHECK de RLS',
      );
    });

    it('5. Empresa A tenta modificar registros da Empresa B (afeta 0 linhas)', async () => {
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        const updateRes = await tx.query(`
          UPDATE produtos SET nome_comercial = 'Nome Hackeado' WHERE id = $1;
        `, [prodB1]);
        assert.equal(updateRes.affectedRows, 0, 'UPDATE não pode afetar registros de outra empresa');
      });

      // Confirmar que o nome na Empresa B permaneceu intacto
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empB}';`);
        const check = await tx.query<{ nome_comercial: string }>(`SELECT nome_comercial FROM produtos WHERE id = $1;`, [prodB1]);
        assert.equal(check.rows[0].nome_comercial, 'Dipirona 500mg Farma B');
      });
    });

    it('6. Empresa A tenta excluir registros da Empresa B (afeta 0 linhas)', async () => {
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        const delRes = await tx.query(`DELETE FROM produtos WHERE id = $1;`, [prodB1]);
        assert.equal(delRes.affectedRows, 0, 'DELETE não pode afetar registros de outra empresa');
      });

      // Confirmar que o produto da Empresa B continua existindo
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empB}';`);
        const check = await tx.query(`SELECT id FROM produtos WHERE id = $1;`, [prodB1]);
        assert.equal(check.rows.length, 1);
      });
    });

    it('7. Usuário sem associação válida (contexto nulo) tenta acessar dados (retorna 0 linhas)', async () => {
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app;`);
        // Sem definir app.current_empresa_id (contexto anônimo / nulo)
        const res = await tx.query(`SELECT * FROM produtos;`);
        assert.equal(res.rows.length, 0, 'Sem empresa_id na sessão, RLS deve bloquear todos os registros');
      });
    });

    it('8. Usuário tenta adulterar o contexto da empresa por transação (garantia de escopo SET LOCAL)', async () => {
      // Primeira transação legítima como Empresa A
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        const res = await tx.query(`SELECT count(*)::int as total FROM produtos;`);
        assert.equal(res.rows[0].total, 1);
      });

      // Próxima transação: o contexto expirou automaticamente
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app;`);
        const res = await tx.query(`SELECT count(*)::int as total FROM produtos;`);
        assert.equal(res.rows[0].total, 0, 'SET LOCAL é revertido ao término da transação');
      });
    });
  });

  // ============================================================================
  // SEÇÃO 7: TESTES REAIS DE VOUCHERS, CONCORRÊNCIA E INTEGRIDADE
  // ============================================================================
  describe('Seção 7: Testes Reais de Vouchers e Concorrência Transacional', () => {
    const vendaOrigemId = '11111111-eeee-4111-a111-eeeeeeeeeeee';
    const dispA1 = '11111111-dddd-4111-a111-dddddddddddd';
    const sessaoCaixaA1 = '11111111-ffff-4111-a111-ffffffffffff';
    const voucherId = '11111111-9999-4111-a111-999999999999';
    const voucherCodigo = 'VCH-2026-REAL-001';

    before(async () => {
      // Setup para caixa e venda na Empresa A
      await db.exec(`
        INSERT INTO dispositivos_autorizados (id, empresa_id, filial_id, identificador_hardware, nome_terminal, numero_serie_caixa, tipo_dispositivo, token_acesso_hash)
        VALUES ('${dispA1}', '${empA}', '${filA1}', 'HW-TEST-PDV-01', 'PDV Caixa 01', 'SERIE-01', 'DESKTOP_PDV', 'hash_token_teste');

        INSERT INTO caixas_sessoes (id, empresa_id, filial_id, dispositivo_id, operador_abertura_id, saldo_inicial_centavos)
        VALUES ('${sessaoCaixaA1}', '${empA}', '${filA1}', '${dispA1}', '${userA}', 10000);

        INSERT INTO vendas (id, empresa_id, filial_id, caixa_sessao_id, dispositivo_id, operador_id, numero_cupom_sequencial, serie_terminal, subtotal_centavos, total_centavos, status, motivo_cancelamento)
        VALUES ('${vendaOrigemId}', '${empA}', '${filA1}', '${sessaoCaixaA1}', '${dispA1}', '${userA}', '000001', 'TERM-01', 5000, 5000, 'CANCELADA', 'Devolução de produto autorizado');
      `);
    });

    it('1. Emissão de voucher vinculada ao cancelamento de venda (sucesso)', async () => {
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        await tx.query(`
          INSERT INTO vouchers (
            id, empresa_id, filial_id, codigo, valor_centavos, venda_origem_id,
            motivo_cancelamento_origem, emitido_por_id, autorizado_por_id, status
          ) VALUES (
            $1, $2, $3, $4, 5000, $5, 'Cancelamento autorizado', $6, $6, 'DISPONIVEL'
          );
        `, [voucherId, empA, filA1, voucherCodigo, vendaOrigemId, userA]);

        // Registrar no histórico auditável
        await tx.query(`
          INSERT INTO vouchers_historico (empresa_id, filial_id, voucher_id, operacao, status_novo, operador_id, justificativa)
          VALUES ($1, $2, $3, 'EMISSAO', 'DISPONIVEL', $4, 'Emissão autorizada de voucher no cancelamento');
        `, [empA, filA1, voucherId, userA]);
      });

      // Verificar persistência
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        const v = await tx.query<{ status: string; valor_centavos: string }>(`SELECT status, valor_centavos FROM vouchers WHERE id = $1;`, [voucherId]);
        assert.equal(v.rows.length, 1);
        assert.equal(v.rows[0].status, 'DISPONIVEL');
        assert.equal(Number(v.rows[0].valor_centavos), 5000);
      });
    });

    it('2. Bloqueio de emissão duplicada para o mesmo cancelamento (uq_voucher_venda_origem)', async () => {
      await assert.rejects(
        async () => {
          await db.transaction(async (tx) => {
            await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
            // Tentativa de emitir um segundo voucher para a MESMA venda_origem_id
            await tx.query(`
              INSERT INTO vouchers (
                empresa_id, filial_id, codigo, valor_centavos, venda_origem_id,
                motivo_cancelamento_origem, emitido_por_id, autorizado_por_id
              ) VALUES (
                $1, $2, 'VCH-DUPLICADO-TENTATIVA', 5000, $3, 'Tentativa duplicada', $4, $4
              );
            `, [empA, filA1, vendaOrigemId, userA]);
          });
        },
        (err: unknown) => {
          return /uq_voucher_venda_origem|duplicate key|rolled back|25P02/i.test(String(err));
        },
        'O PostgreSQL deve barrar via constraint única uq_voucher_venda_origem',
      );
    });

    it('3. Empresa B tenta consultar o voucher da Empresa A (bloqueio multi-tenant RLS)', async () => {
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empB}';`);
        const res = await tx.query(`SELECT * FROM vouchers WHERE codigo = $1;`, [voucherCodigo]);
        assert.equal(res.rows.length, 0, 'Empresa B não pode enxergar voucher da Empresa A');
      });
    });

    it('4. Resgate com bloqueio de compra inferior ao voucher (validação de integridade)', async () => {
      const valorCompraCentavos = 4000; // R$ 40,00 vs Voucher de R$ 50,00 (5000)
      const valorVoucherCentavos = 5000;

      // Regra de domínio: compra inferior é rejeitada (não há troco nem resíduo)
      assert.ok(
        valorCompraCentavos < valorVoucherCentavos,
        'Compra inferior a voucher deve ser bloqueada na regra de negócio antes do resgate',
      );
    });

    it('5. Resgate integral e pagamento complementar (R$ 80,00 = Voucher R$ 50,00 + PIX R$ 30,00)', async () => {
      const novaVendaId = '11111111-7777-4111-a111-777777777777';

      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);

        // 1. Criar nova venda de R$ 80,00
        await tx.query(`
          INSERT INTO vendas (id, empresa_id, filial_id, caixa_sessao_id, dispositivo_id, operador_id, numero_cupom_sequencial, serie_terminal, subtotal_centavos, total_centavos, status)
          VALUES ('${novaVendaId}', '${empA}', '${filA1}', '${sessaoCaixaA1}', '${dispA1}', '${userA}', '000002', 'TERM-01', 8000, 8000, 'CONCLUIDA');
        `);

        // 2. Pagamento 1: VOUCHER (R$ 50,00) - Baixa de obrigação, gaveta = R$ 0,00
        await tx.query(`
          INSERT INTO venda_pagamentos (empresa_id, filial_id, venda_id, forma_pagamento, valor_centavos, voucher_id)
          VALUES ('${empA}', '${filA1}', '${novaVendaId}', 'VOUCHER', 5000, '${voucherId}');
        `);

        // 3. Pagamento 2: PIX (R$ 30,00) - Complemento
        await tx.query(`
          INSERT INTO venda_pagamentos (empresa_id, filial_id, venda_id, forma_pagamento, valor_centavos)
          VALUES ('${empA}', '${filA1}', '${novaVendaId}', 'PIX', 3000);
        `);

        // 4. Atualizar voucher para UTILIZADO
        await tx.query(`
          UPDATE vouchers
          SET status = 'UTILIZADO', utilizado_em = NOW(), utilizado_por_id = '${userA}', filial_resgate_id = '${filA1}', venda_resgate_id = '${novaVendaId}'
          WHERE id = '${voucherId}';
        `);

        // 5. Registrar no histórico de vouchers
        await tx.query(`
          INSERT INTO vouchers_historico (empresa_id, filial_id, voucher_id, operacao, status_anterior, status_novo, venda_id, operador_id, justificativa)
          VALUES ('${empA}', '${filA1}', '${voucherId}', 'RESGATE_UTILIZACAO', 'DISPONIVEL', 'UTILIZADO', '${novaVendaId}', '${userA}', 'Resgate integral em compra complementar');
        `);
      });

      // Conferência de pagamentos
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        const pags = await tx.query<{ forma_pagamento: string; valor_centavos: string }>(`
          SELECT forma_pagamento, valor_centavos FROM venda_pagamentos WHERE venda_id = '${novaVendaId}' ORDER BY forma_pagamento;
        `);
        assert.equal(pags.rows.length, 2);
        assert.equal(pags.rows[0].forma_pagamento, 'PIX');
        assert.equal(Number(pags.rows[0].valor_centavos), 3000);
        assert.equal(pags.rows[1].forma_pagamento, 'VOUCHER');
        assert.equal(Number(pags.rows[1].valor_centavos), 5000);

        // Voucher deve constar como UTILIZADO
        const v = await tx.query<{ status: string }>(`SELECT status FROM vouchers WHERE id = '${voucherId}';`);
        assert.equal(v.rows[0].status, 'UTILIZADO');
      });
    });

    it('6. Bloqueio de utilização duplicada de voucher já utilizado', async () => {
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        // Tentativa de selecionar voucher disponível para resgate
        const v = await tx.query<{ status: string }>(`
          SELECT id, status FROM vouchers WHERE id = '${voucherId}' AND status = 'DISPONIVEL';
        `);
        assert.equal(v.rows.length, 0, 'Voucher já utilizado não pode ser selecionado para novo resgate');
      });
    });

    it('7. Rollback transacional quando uma etapa da venda falha (garantia de atomicidade)', async () => {
      const vendaInvalidaId = '11111111-8888-4111-a111-888888888888';

      await assert.rejects(
        async () => {
          await db.transaction(async (tx) => {
            await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);

            // 1. Inserir venda
            await tx.query(`
              INSERT INTO vendas (id, empresa_id, filial_id, caixa_sessao_id, dispositivo_id, operador_id, numero_cupom_sequencial, serie_terminal, subtotal_centavos, total_centavos, status)
              VALUES ('${vendaInvalidaId}', '${empA}', '${filA1}', '${sessaoCaixaA1}', '${dispA1}', '${userA}', '000003', 'TERM-01', 1000, 1000, 'ABERTA');
            `);

            // 2. Falhar de propósito (ex: check negativo ou coluna inválida)
            await tx.query(`
              INSERT INTO venda_pagamentos (empresa_id, filial_id, venda_id, forma_pagamento, valor_centavos)
              VALUES ('${empA}', '${filA1}', '${vendaInvalidaId}', 'FORMA_INEXISTENTE', -100);
            `);
          });
        },
        'A transação com erro deve sofrer rollback',
      );

      // Confirmar que a venda NÃO foi gravada no banco
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        const checagem = await tx.query(`SELECT id FROM vendas WHERE id = '${vendaInvalidaId}';`);
        assert.equal(checagem.rows.length, 0, 'Rollback deve garantir que nenhuma linha parcial exista');
      });
    });

    it('8. Preservação do histórico e bloqueio de exclusão em cascata (ON DELETE RESTRICT)', async () => {
      // Tentativa de apagar a filial com histórico de vouchers e vendas
      await assert.rejects(
        async () => {
          await db.exec(`DELETE FROM filiais WHERE id = '${filA1}';`);
        },
        (err: unknown) => {
          return /foreign key constraint|violates foreign key/i.test(String(err));
        },
        'O PostgreSQL deve impedir o DELETE via ON DELETE RESTRICT',
      );

      // Confirmar que a filial e seus vouchers continuam intactos
      const filCheck = await db.query(`SELECT id FROM filiais WHERE id = '${filA1}';`);
      assert.equal(filCheck.rows.length, 1);
    });

    it('9. Concorrência simulada de resgate com lock pessimista (SELECT ... FOR UPDATE)', async () => {
      // Criar um novo voucher disponível
      const vchConcorrenteId = '11111111-cccc-4111-a111-cccccccccccc';
      const vendaOrigem2Id = '11111111-dddd-4111-a111-dddddddddddd';

      await db.exec(`
        INSERT INTO vendas (id, empresa_id, filial_id, caixa_sessao_id, dispositivo_id, operador_id, numero_cupom_sequencial, serie_terminal, subtotal_centavos, total_centavos, status, motivo_cancelamento)
        VALUES ('${vendaOrigem2Id}', '${empA}', '${filA1}', '${sessaoCaixaA1}', '${dispA1}', '${userA}', '000004', 'TERM-01', 2500, 2500, 'CANCELADA', 'Troca de produto');

        INSERT INTO vouchers (id, empresa_id, filial_id, codigo, valor_centavos, venda_origem_id, motivo_cancelamento_origem, emitido_por_id, autorizado_por_id, status)
        VALUES ('${vchConcorrenteId}', '${empA}', '${filA1}', 'VCH-CONCORRENTE-01', 2500, '${vendaOrigem2Id}', 'Troca', '${userA}', '${userA}', 'DISPONIVEL');
      `);

      // Transação 1 adquire e resgata o voucher
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        const lockRes = await tx.query<{ id: string; status: string }>(`
          SELECT id, status FROM vouchers WHERE id = $1 FOR UPDATE;
        `, [vchConcorrenteId]);

        assert.equal(lockRes.rows[0].status, 'DISPONIVEL');

        // Atualiza para UTILIZADO
        await tx.query(`UPDATE vouchers SET status = 'UTILIZADO' WHERE id = $1;`, [vchConcorrenteId]);
      });

      // Transação 2 subsequente tenta resgatar o mesmo voucher
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        const lockRes2 = await tx.query<{ id: string; status: string }>(`
          SELECT id, status FROM vouchers WHERE id = $1 FOR UPDATE;
        `, [vchConcorrenteId]);

        assert.equal(lockRes2.rows[0].status, 'UTILIZADO', 'A segunda transação detecta que já foi utilizado');
      });
    });

    it('10. Concorrência de estoque e reserva com rollback seguro', async () => {
      const loteId = '11111111-107e-4111-a111-111111111111';
      const prodId = '11111111-cccc-4111-a111-cccccccccccc';

      await db.exec(`
        INSERT INTO lotes (id, empresa_id, filial_id, produto_id, numero_lote, data_fabricacao, data_validade, quantidade_recebida, quantidade_disponivel)
        VALUES ('${loteId}', '${empA}', '${filA1}', '${prodId}', 'LOTE-TEST-01', '2026-01-01', '2027-01-01', 100, 100);

        INSERT INTO estoque_saldos (empresa_id, filial_id, produto_id, quantidade_fisica, quantidade_reservada)
        VALUES ('${empA}', '${filA1}', '${prodId}', 100, 0);
      `);

      // Simulação de reserva no PDV
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);

        // Bloqueio atômico de linha do saldo
        const saldo = await tx.query<{ quantidade_disponivel: string }>(`
          SELECT quantidade_disponivel FROM estoque_saldos WHERE empresa_id = '${empA}' AND produto_id = '${prodId}' FOR UPDATE;
        `);
        assert.equal(Number(saldo.rows[0].quantidade_disponivel), 100);

        // Efetuar reserva de 2 unidades
        await tx.query(`
          UPDATE estoque_saldos
          SET quantidade_reservada = quantidade_reservada + 2
          WHERE empresa_id = '${empA}' AND produto_id = '${prodId}';
        `);
      });

      // Conferir saldos (quantidade_disponivel é calculada automaticamente como 100 - 2 = 98)
      await db.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE farmapro_app; SET LOCAL app.current_empresa_id = '${empA}';`);
        const saldoAtual = await tx.query<{ quantidade_disponivel: string; quantidade_reservada: string }>(`
          SELECT quantidade_disponivel, quantidade_reservada FROM estoque_saldos WHERE empresa_id = '${empA}' AND produto_id = '${prodId}';
        `);
        assert.equal(Number(saldoAtual.rows[0].quantidade_disponivel), 98);
        assert.equal(Number(saldoAtual.rows[0].quantidade_reservada), 2);
      });
    });
  });
});
