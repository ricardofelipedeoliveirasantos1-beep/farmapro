import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { PreVendaService } from '../src/services/prevenda.service.js';
import { ContextoTenant, CriarPreVendaDTO } from '@farmapro/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Auditoria Rigorosa de Persistência Real de Pré-Vendas no PostgreSQL', () => {
  let db: PGlite;
  let poolAdapter: pg.Pool;

  const empresaId = '11111111-1111-4111-a111-111111111111';
  const filialId = '11111111-aaaa-4111-a111-aaaaaaaaaaaa';
  const balconistaId = 'aaaaaaaa-2222-4000-8000-000000000002';
  const clienteId = 'cccccccc-1111-4000-8000-000000000001';

  const prodDipironaId = 'fa111111-1111-4000-8000-000000000001';
  const prodLosartanaId = 'fa222222-2222-4000-8000-000000000002';
  const prodParacetamolId = 'fa333333-3333-4000-8000-000000000003';
  const prodOmeprazolId = 'fa444444-4444-4000-8000-000000000004';

  const tenant: ContextoTenant = {
    empresaId,
    filialId,
    usuarioId: balconistaId,
  };

  let preVendaOriginalId: string;
  let codigoComandaOriginal: string;

  before(async () => {
    db = new PGlite();

    poolAdapter = {
      query: async (sql: string, params?: unknown[]) => {
        const res = await db.query(sql, params as unknown[] | undefined);
        return {
          rows: res.rows,
          rowCount: res.rows.length,
          command: '',
          oid: 0,
          fields: [],
        } as unknown as pg.QueryResult;
      },
    } as unknown as pg.Pool;

    // Executar as 14 migrações do PostgreSQL
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
      '010_tabelas_caixas_movimentacoes.sql',
      '011_tabelas_inventarios_e_ajustes.sql',
      '012_tabelas_fornecedores_e_pedidos_compra.sql',
      '013_tabelas_recebimento_e_nfe.sql',
      '014_tabelas_pre_venda_balcao.sql',
    ];

    for (const arq of arquivosMigracao) {
      const sql = fs.readFileSync(path.join(migrationsDir, arq), 'utf-8');
      await db.exec(sql);
    }

    // Seed dados essenciais
    await db.exec(`
      INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato)
      VALUES ('${empresaId}', 'FarmaPro Farmácia Matriz Ltda', 'FarmaPro Matriz', '11222333000144', 'contato@farmapro.demo', '1133331111');

      INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz)
      VALUES ('${filialId}', '${empresaId}', 'FIL-01', 'FarmaPro - Centro Matriz', '11222333000144', 'Rua Central', '100', 'Centro', 'São Paulo', 'SP', '01001000', '1133331111', true);

      INSERT INTO usuarios (id, nome, email, cpf, hash_senha, status)
      VALUES ('${balconistaId}', 'Roberto Carlos Balconista', 'roberto@farmapro.demo', '22222222222', 'argon2id$mock', 'ATIVO');

      INSERT INTO clientes (id, empresa_id, tipo_pessoa, nome_razao_social, cpf_cnpj, telefone_principal, status)
      VALUES ('${clienteId}', '${empresaId}', 'PF', 'Roberto Carlos da Silva', '12345678909', '11988887777', 'ATIVO');

      INSERT INTO produtos (id, empresa_id, nome_comercial, nome_generico, apresentacao, fabricante, tipo_produto, status)
      VALUES
        ('${prodDipironaId}', '${empresaId}', 'Dipirona 500mg/mL', 'Dipirona Sódica', 'Gotas • Frasco 20 mL', 'Medley', 'MEDICAMENTO_GENERICO', 'ATIVO'),
        ('${prodLosartanaId}', '${empresaId}', 'Losartana Potássica 50mg', 'Losartana', 'Cx c/ 30 comp', 'Aché', 'MEDICAMENTO_GENERICO', 'ATIVO'),
        ('${prodParacetamolId}', '${empresaId}', 'Paracetamol 750mg', 'Paracetamol', 'Cx c/ 20 comp', 'EMS', 'MEDICAMENTO_GENERICO', 'ATIVO'),
        ('${prodOmeprazolId}', '${empresaId}', 'Omeprazol 20mg', 'Omeprazol', 'Cx c/ 28 caps', 'Eurofarma', 'MEDICAMENTO_GENERICO', 'ATIVO');

      INSERT INTO produtos_codigos_barras (empresa_id, produto_id, codigo_barras, e_principal)
      VALUES
        ('${empresaId}', '${prodDipironaId}', '7891111111111', true),
        ('${empresaId}', '${prodLosartanaId}', '7892222222222', true),
        ('${empresaId}', '${prodParacetamolId}', '7893333333333', true),
        ('${empresaId}', '${prodOmeprazolId}', '7894444444444', true);

      INSERT INTO produtos_filiais (empresa_id, filial_id, produto_id, preco_venda_centavos, preco_custo_centavos)
      VALUES
        ('${empresaId}', '${filialId}', '${prodDipironaId}', 1000, 400),
        ('${empresaId}', '${filialId}', '${prodLosartanaId}', 2000, 800),
        ('${empresaId}', '${filialId}', '${prodParacetamolId}', 1500, 600),
        ('${empresaId}', '${filialId}', '${prodOmeprazolId}', 3000, 1200);

      INSERT INTO estoque_saldos (empresa_id, filial_id, produto_id, quantidade_fisica)
      VALUES
        ('${empresaId}', '${filialId}', '${prodDipironaId}', 100),
        ('${empresaId}', '${filialId}', '${prodLosartanaId}', 100),
        ('${empresaId}', '${filialId}', '${prodParacetamolId}', 100),
        ('${empresaId}', '${filialId}', '${prodOmeprazolId}', 100);
    `);
  });

  after(async () => {
    if (db) {
      await db.close();
    }
  });

  it('1. Criação da comanda inicial PV-000157 no PostgreSQL', async () => {
    const dtoCriacao: CriarPreVendaDTO = {
      filialId,
      identificacaoBalcao: 'Balcão 01',
      clienteId,
      clienteNome: 'Roberto Carlos da Silva',
      clienteCpf: '12345678909',
      itens: [
        {
          produtoId: prodDipironaId,
          quantidade: 2,
          precoUnitarioCentavos: 1000,
          descontoUnitarioCentavos: 100, // Preço com desconto: 900
        },
        {
          produtoId: prodLosartanaId,
          quantidade: 1,
          precoUnitarioCentavos: 2000,
          descontoUnitarioCentavos: 0,
        },
        {
          produtoId: prodParacetamolId,
          quantidade: 1,
          precoUnitarioCentavos: 1500,
          descontoUnitarioCentavos: 0,
        },
      ],
    };

    const preVenda = await PreVendaService.criarPreVenda(poolAdapter, tenant, dtoCriacao);
    preVendaOriginalId = preVenda.id;
    codigoComandaOriginal = preVenda.codigoComanda;

    assert.ok(preVenda.id, 'Pré-venda deve ter UUID gerado pelo PostgreSQL');
    assert.match(codigoComandaOriginal, /^PV-\d+$/, 'Código da comanda deve seguir formato PV-XXXX');
    assert.strictEqual(preVenda.itens.length, 3, 'Deve conter 3 itens criados inicialmente');

    // Validação direta via SQL puro
    const resSql = await db.query(
      `SELECT id, codigo_comanda, cliente_nome, total_centavos, status FROM pre_vendas WHERE id = $1`,
      [preVendaOriginalId]
    );
    assert.strictEqual(resSql.rows.length, 1);
    const row = resSql.rows[0] as any;
    assert.strictEqual(row.codigo_comanda, codigoComandaOriginal);
    assert.strictEqual(row.cliente_nome, 'Roberto Carlos da Silva');
    assert.strictEqual(Number(row.total_centavos), 5300); // (2*900) + 2000 + 1500 = 5300
    assert.strictEqual(row.status, 'PENDENTE');
  });

  it('2. Execução da Edição Real: Alterar QTD de Dipirona, Excluir Losartana, Adicionar Omeprazol', async () => {
    // DTO de Atualização:
    // - Dipirona: quantidade alterada de 2 para 5 (alteração de quantidade)
    // - Paracetamol: mantido (quantidade 1)
    // - Losartana: REMOVIDA (excluída da lista de itens)
    // - Omeprazol: ADICIONADO (novo medicamento adicionado)
    const dtoAtualizacao: CriarPreVendaDTO = {
      filialId,
      identificacaoBalcao: 'Balcão 01',
      clienteId,
      clienteNome: 'Roberto Carlos da Silva',
      clienteCpf: '12345678909',
      observacoes: 'Atualizado em atendimento de balcão',
      itens: [
        {
          produtoId: prodDipironaId,
          quantidade: 5, // QTD ALTERADA DE 2 PARA 5
          precoUnitarioCentavos: 1000,
          descontoUnitarioCentavos: 100, // Total item: (1000 - 100) * 5 = 4500
        },
        {
          produtoId: prodParacetamolId,
          quantidade: 1, // MANTIDO
          precoUnitarioCentavos: 1500,
          descontoUnitarioCentavos: 0, // Total item: 1500
        },
        {
          produtoId: prodOmeprazolId, // ADICIONADO
          quantidade: 2,
          precoUnitarioCentavos: 3000,
          descontoUnitarioCentavos: 200, // Total item: (3000 - 200) * 2 = 5600
        },
      ],
    };

    // Subtotal esperado: (1000 * 5) + (1500 * 1) + (3000 * 2) = 5000 + 1500 + 6000 = 12500 centavos (R$ 125,00)
    // Desconto esperado: (100 * 5) + 0 + (200 * 2) = 500 + 400 = 900 centavos (R$ 9,00)
    // Total esperado: 12500 - 900 = 11600 centavos (R$ 116,00)

    const resultado = await PreVendaService.atualizarPreVenda(
      poolAdapter,
      tenant,
      preVendaOriginalId,
      dtoAtualizacao
    );

    // 1. Identificador original inalterado
    assert.strictEqual(resultado.id, preVendaOriginalId, 'UUID deve ser estritamente o mesmo');
    assert.strictEqual(resultado.codigoComanda, codigoComandaOriginal, 'Código da comanda não pode mudar');
    assert.strictEqual(resultado.itens.length, 3, 'Deve conter exatamente 3 itens');
    assert.strictEqual(resultado.subtotalCentavos, 12500, 'Subtotal deve ser 12500 centavos');
    assert.strictEqual(resultado.descontoCentavos, 900, 'Desconto deve ser 900 centavos');
    assert.strictEqual(resultado.totalCentavos, 11600, 'Total deve ser 11600 centavos');
  });

  it('3. Consulta Direta ao PostgreSQL (Raw SQL) para comprovar persistência física', async () => {
    // A. Consultar pre_vendas
    const resPreVenda = await db.query(
      `SELECT 
        id, codigo_comanda, cliente_id, cliente_nome, cliente_cpf,
        subtotal_centavos, desconto_centavos, total_centavos,
        status, observacoes, criado_em, atualizado_em
       FROM pre_vendas 
       WHERE id = $1`,
      [preVendaOriginalId]
    );

    assert.strictEqual(resPreVenda.rows.length, 1, 'Registro pai de pre_vendas deve existir');
    const pv = resPreVenda.rows[0] as any;

    assert.strictEqual(pv.id, preVendaOriginalId);
    assert.strictEqual(pv.codigo_comanda, codigoComandaOriginal);
    assert.strictEqual(pv.cliente_nome, 'Roberto Carlos da Silva');
    assert.strictEqual(pv.cliente_cpf, '12345678909');
    assert.strictEqual(Number(pv.subtotal_centavos), 12500);
    assert.strictEqual(Number(pv.desconto_centavos), 900);
    assert.strictEqual(Number(pv.total_centavos), 11600);
    assert.strictEqual(pv.status, 'PENDENTE');
    assert.ok(pv.atualizado_em !== null, 'Data de atualização atualizado_em deve estar preenchida');

    // B. Consultar pre_venda_itens
    const resItens = await db.query(
      `SELECT 
        produto_id, numero_item, nome_produto, quantidade,
        preco_unitario_centavos, desconto_unitario_centavos, total_item_centavos
       FROM pre_venda_itens 
       WHERE pre_venda_id = $1 
       ORDER BY numero_item ASC`,
      [preVendaOriginalId]
    );

    assert.strictEqual(resItens.rows.length, 3, 'Devem existir exatamente 3 registros físicos em pre_venda_itens');

    const itens = resItens.rows as any[];

    // Item 1: Dipirona (Qtd alterada para 5)
    assert.strictEqual(itens[0].produto_id, prodDipironaId);
    assert.strictEqual(Number(itens[0].quantidade), 5);
    assert.strictEqual(Number(itens[0].preco_unitario_centavos), 1000);
    assert.strictEqual(Number(itens[0].desconto_unitario_centavos), 100);
    assert.strictEqual(Number(itens[0].total_item_centavos), 4500);

    // Item 2: Paracetamol (Mantido com Qtd 1)
    assert.strictEqual(itens[1].produto_id, prodParacetamolId);
    assert.strictEqual(Number(itens[1].quantidade), 1);
    assert.strictEqual(Number(itens[1].preco_unitario_centavos), 1500);
    assert.strictEqual(Number(itens[1].desconto_unitario_centavos), 0);
    assert.strictEqual(Number(itens[1].total_item_centavos), 1500);

    // Item 3: Omeprazol (Adicionado com Qtd 2)
    assert.strictEqual(itens[2].produto_id, prodOmeprazolId);
    assert.strictEqual(Number(itens[2].quantidade), 2);
    assert.strictEqual(Number(itens[2].preco_unitario_centavos), 3000);
    assert.strictEqual(Number(itens[2].desconto_unitario_centavos), 200);
    assert.strictEqual(Number(itens[2].total_item_centavos), 5600);

    // C. Verificar que Losartana NÃO existe mais em pre_venda_itens
    const resLosartana = await db.query(
      `SELECT id FROM pre_venda_itens WHERE pre_venda_id = $1 AND produto_id = $2`,
      [preVendaOriginalId, prodLosartanaId]
    );
    assert.strictEqual(resLosartana.rows.length, 0, 'Medicamento excluído (Losartana) não deve existir na tabela');
  });

  it('4. Validação da Atomicidade Transacional: Falha em item intermediário reverte tudo (ROLLBACK)', async () => {
    // Snapshot dos totais antes da tentativa inválida
    const antes = await db.query(
      `SELECT subtotal_centavos, total_centavos FROM pre_vendas WHERE id = $1`,
      [preVendaOriginalId]
    );
    const subtotalAntes = (antes.rows[0] as any).subtotal_centavos;

    const dtoInvalido: CriarPreVendaDTO = {
      filialId,
      itens: [
        {
          produtoId: prodDipironaId,
          quantidade: 1,
          precoUnitarioCentavos: 1000,
        },
        {
          produtoId: '00000000-0000-0000-0000-000000000000', // PRODUTO INEXISTENTE!
          quantidade: 1,
          precoUnitarioCentavos: 1000,
        },
      ],
    };

    let erroOcorreu = false;
    try {
      await PreVendaService.atualizarPreVenda(
        poolAdapter,
        tenant,
        preVendaOriginalId,
        dtoInvalido
      );
    } catch (err: any) {
      erroOcorreu = true;
      assert.match(err.message, /não encontrado/);
    }

    assert.strictEqual(erroOcorreu, true, 'Deve lançar erro para produto inexistente');

    // Comprovação: Os dados no PostgreSQL continuam exatamente os da edição anterior (12500 centavos)
    const depois = await db.query(
      `SELECT subtotal_centavos, total_centavos FROM pre_vendas WHERE id = $1`,
      [preVendaOriginalId]
    );
    const subtotalDepois = (depois.rows[0] as any).subtotal_centavos;
    assert.strictEqual(subtotalDepois, subtotalAntes, 'ROLLBACK garantiu que nenhum dado foi corrompido');
  });

  it('5. Validação com o identificador exato PV-000157: Atualização preserva o número original', async () => {
    const pvId157 = '77777777-7777-4777-a777-777777777157';

    // Inserção da comanda PV-000157 no PostgreSQL
    await db.exec(`
      INSERT INTO pre_vendas (
        id, empresa_id, filial_id, codigo_comanda, atendente_id,
        identificacao_balcao, cliente_id, cliente_nome, cliente_cpf,
        subtotal_centavos, desconto_centavos, total_centavos, status,
        validade_minutos, criado_em
      ) VALUES (
        '${pvId157}', '${empresaId}', '${filialId}', 'PV-000157', '${balconistaId}',
        'Balcão 01', '${clienteId}', 'Roberto Carlos', '12345678909',
        5000, 0, 5000, 'PENDENTE',
        120, NOW() - INTERVAL '1 hour'
      );

      INSERT INTO pre_venda_itens (
        id, empresa_id, filial_id, pre_venda_id, produto_id, numero_item,
        codigo_barras, nome_produto, quantidade, preco_unitario_centavos,
        desconto_unitario_centavos, total_item_centavos, exige_receita, classificacao_receita
      ) VALUES (
        '88888888-8888-4888-a888-888888888001', '${empresaId}', '${filialId}', '${pvId157}', '${prodDipironaId}', 1,
        '7891111111111', 'Dipirona 500mg/mL', 5, 1000, 0, 5000, false, 'ISENTO'
      );
    `);

    // Atualização com alteração de quantidade e novo medicamento
    const dtoEdicao157: CriarPreVendaDTO = {
      filialId,
      identificacaoBalcao: 'Balcão 01',
      clienteId,
      clienteNome: 'Roberto Carlos',
      clienteCpf: '12345678909',
      itens: [
        {
          produtoId: prodDipironaId,
          quantidade: 8, // Alterado de 5 para 8
          precoUnitarioCentavos: 1000,
          descontoUnitarioCentavos: 50, // 950 * 8 = 7600
        },
        {
          produtoId: prodOmeprazolId, // Medicamento novo adicionado
          quantidade: 1,
          precoUnitarioCentavos: 3000,
          descontoUnitarioCentavos: 0, // 3000
        },
      ],
    };

    const atualizado = await PreVendaService.atualizarPreVenda(
      poolAdapter,
      tenant,
      pvId157,
      dtoEdicao157
    );

    // Validações imediatas do retorno
    assert.strictEqual(atualizado.id, pvId157);
    assert.strictEqual(atualizado.codigoComanda, 'PV-000157', 'O código PV-000157 deve permanecer rigorosamente inalterado');
    assert.strictEqual(atualizado.itens.length, 2);
    assert.strictEqual(atualizado.totalCentavos, 10600); // 7600 + 3000 = 10600

    // Validação direta no PostgreSQL via Raw SQL
    const resSql = await db.query(
      `SELECT codigo_comanda, subtotal_centavos, total_centavos FROM pre_vendas WHERE id = $1`,
      [pvId157]
    );
    assert.strictEqual(resSql.rows[0].codigo_comanda, 'PV-000157');
    assert.strictEqual(Number(resSql.rows[0].total_centavos), 10600);
  });
});
