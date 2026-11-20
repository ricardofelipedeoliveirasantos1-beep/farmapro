import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { CaixaService } from '../src/services/caixa.service.js';
import { VendasService } from '../src/services/vendas.service.js';
import { ContextoTenant } from '@farmapro/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Etapa 06: PDV Balcão, Registro de Vendas e Operação de Caixa', () => {
  let db: PGlite;
  let poolAdapter: pg.Pool;

  // IDs Fictícios de Demonstração — Multiempresa
  const empresaAId = '11111111-1111-4111-a111-111111111111';
  const filialA1Id = '11111111-aaaa-4111-a111-aaaaaaaaaaaa';
  const terminalPdvA1Id = 'dddddddd-1111-4000-8000-000000000001';

  const empresaBId = '22222222-2222-4222-b222-222222222222';
  const filialB1Id = '22222222-aaaa-4222-b222-aaaaaaaaaaaa';
  const terminalPdvB1Id = 'dddddddd-2222-4000-8000-000000000002';

  const proprietarioAId = 'aaaaaaaa-1111-4000-8000-000000000001';
  const operador1AId = 'aaaaaaaa-2222-4000-8000-000000000002';
  const operador2AId = 'aaaaaaaa-3333-4000-8000-000000000003';
  const operadorBId = 'bbbbbbbb-1111-4000-8000-000000000001';

  const clienteAId = 'cccccccc-1111-4000-8000-000000000001';

  // Produtos e Lotes
  const prodAmoxId = 'fa111111-1111-4000-8000-000000000001';
  const prodDipironaId = 'fa222222-2222-4000-8000-000000000002';
  const prodLosartanaId = 'fa333333-3333-4000-8000-000000000003';
  const prodEscassoId = 'fa444444-4444-4000-8000-000000000004';

  const loteAmoxValidoId = 'fb111111-1111-4000-8000-000000000001';
  const loteDipironaVencidoId = 'fb222222-2222-4000-8000-000000000002';
  const loteLosartanaBloqueadoId = 'fb333333-3333-4000-8000-000000000003';
  const loteEscassoId = 'fb444444-4444-4000-8000-000000000004';

  const tenantA: ContextoTenant = {
    empresaId: empresaAId,
    filialId: filialA1Id,
    usuarioId: operador1AId,
  };

  const tenantB: ContextoTenant = {
    empresaId: empresaBId,
    filialId: filialB1Id,
    usuarioId: operadorBId,
  };

  let caixaSessaoAId: string;

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

    // 1. Executar as 10 migrações
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
    ];

    for (const arq of arquivosMigracao) {
      const sql = fs.readFileSync(path.join(migrationsDir, arq), 'utf-8');
      await db.exec(sql);
    }

    // 2. Carga de Empresas e Filiais Fictícias
    await db.exec(`
      INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato)
      VALUES 
        ('${empresaAId}', 'Farma Vida Matriz Ltda', 'Farma Vida', '11222333000144', 'contato@farmavida.demo', '1133331111'),
        ('${empresaBId}', 'Drogaria Norte Ltda', 'Drogaria Norte', '22333444000155', 'contato@droganorte.demo', '1144442222');

      INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz)
      VALUES
        ('${filialA1Id}', '${empresaAId}', 'FIL-01', 'Farma Vida - Centro Matriz', '11222333000144', 'Rua Principal', '100', 'Centro', 'São Paulo', 'SP', '01001000', '1133331111', true),
        ('${filialB1Id}', '${empresaBId}', 'FIL-01', 'Drogaria Norte - Filial Campinas', '22333444000155', 'Rua Norte', '50', 'Centro', 'Campinas', 'SP', '13000000', '1933334444', true);

      INSERT INTO usuarios (id, nome, email, cpf, hash_senha, status)
      VALUES
        ('${proprietarioAId}', 'Carlos Proprietário', 'carlos@farmavida.demo', '11111111111', 'argon2_fake_hash', 'ATIVO'),
        ('${operador1AId}', 'Mariana Caixa', 'mariana@farmavida.demo', '22222222222', 'argon2_fake_hash', 'ATIVO'),
        ('${operador2AId}', 'Roberto Balcão', 'roberto@farmavida.demo', '33333333333', 'argon2_fake_hash', 'ATIVO'),
        ('${operadorBId}', 'Juliana Norte', 'juliana@droganorte.demo', '44444444444', 'argon2_fake_hash', 'ATIVO');

      INSERT INTO dispositivos_autorizados (id, empresa_id, filial_id, identificador_hardware, nome_terminal, numero_serie_caixa, tipo_dispositivo, token_acesso_hash, ativo)
      VALUES
        ('${terminalPdvA1Id}', '${empresaAId}', '${filialA1Id}', 'HW-POS-A1', 'Caixa 01 Matriz', 'CX-01', 'DESKTOP_PDV', 'hash_token_terminal_a1', true),
        ('${terminalPdvB1Id}', '${empresaBId}', '${filialB1Id}', 'HW-POS-B1', 'Caixa 01 Norte', 'CX-01', 'DESKTOP_PDV', 'hash_token_terminal_b1', true);

      INSERT INTO clientes (id, empresa_id, tipo_pessoa, nome_razao_social, cpf_cnpj, telefone_principal, status)
      VALUES
        ('${clienteAId}', '${empresaAId}', 'PF', 'Ana Paciente', '55555555555', '11999998888', 'ATIVO');
    `);

    // 3. Cadastrar Produtos, Preços e Lotes
    await db.exec(`
      -- Produto 1: Amoxicilina (Lote Válido)
      INSERT INTO produtos (id, empresa_id, nome_comercial, fabricante, apresentacao, tipo_produto)
      VALUES ('${prodAmoxId}', '${empresaAId}', 'Amoxicilina 500mg', 'Laboratório Nacional', 'Cx 21 comp', 'MEDICAMENTO_GENERICO');

      INSERT INTO produtos_codigos_barras (empresa_id, produto_id, codigo_barras, e_principal)
      VALUES ('${empresaAId}', '${prodAmoxId}', '7891111111111', true);

      INSERT INTO produtos_filiais (empresa_id, filial_id, produto_id, preco_venda_centavos, preco_custo_centavos)
      VALUES ('${empresaAId}', '${filialA1Id}', '${prodAmoxId}', 4490, 2500);

      INSERT INTO estoque_saldos (empresa_id, filial_id, produto_id, quantidade_fisica)
      VALUES ('${empresaAId}', '${filialA1Id}', '${prodAmoxId}', 50);

      INSERT INTO lotes (id, empresa_id, filial_id, produto_id, numero_lote, data_fabricacao, data_validade, quantidade_recebida, quantidade_disponivel, status)
      VALUES ('${loteAmoxValidoId}', '${empresaAId}', '${filialA1Id}', '${prodAmoxId}', 'LOTE-AMX-OK', '2025-01-01', '2027-12-31', 50, 50, 'ATIVO');

      -- Produto 2: Dipirona (Lote Vencido)
      INSERT INTO produtos (id, empresa_id, nome_comercial, fabricante, apresentacao, tipo_produto)
      VALUES ('${prodDipironaId}', '${empresaAId}', 'Dipirona 500mg/ml', 'Laboratório Nacional', 'Frasco 20ml', 'MEDICAMENTO_GENERICO');

      INSERT INTO produtos_codigos_barras (empresa_id, produto_id, codigo_barras, e_principal)
      VALUES ('${empresaAId}', '${prodDipironaId}', '7892222222222', true);

      INSERT INTO produtos_filiais (empresa_id, filial_id, produto_id, preco_venda_centavos, preco_custo_centavos)
      VALUES ('${empresaAId}', '${filialA1Id}', '${prodDipironaId}', 890, 400);

      INSERT INTO estoque_saldos (empresa_id, filial_id, produto_id, quantidade_fisica)
      VALUES ('${empresaAId}', '${filialA1Id}', '${prodDipironaId}', 20);

      INSERT INTO lotes (id, empresa_id, filial_id, produto_id, numero_lote, data_fabricacao, data_validade, quantidade_recebida, quantidade_disponivel, status)
      VALUES ('${loteDipironaVencidoId}', '${empresaAId}', '${filialA1Id}', '${prodDipironaId}', 'LOTE-DIP-VENC', '2023-01-01', '2024-01-01', 20, 20, 'VENCIDO');

      -- Produto 3: Losartana (Lote Bloqueado)
      INSERT INTO produtos (id, empresa_id, nome_comercial, fabricante, apresentacao, tipo_produto)
      VALUES ('${prodLosartanaId}', '${empresaAId}', 'Losartana 50mg', 'Laboratório Cardio', 'Cx 30 comp', 'MEDICAMENTO_GENERICO');

      INSERT INTO produtos_filiais (empresa_id, filial_id, produto_id, preco_venda_centavos, preco_custo_centavos)
      VALUES ('${empresaAId}', '${filialA1Id}', '${prodLosartanaId}', 1350, 700);

      INSERT INTO estoque_saldos (empresa_id, filial_id, produto_id, quantidade_fisica)
      VALUES ('${empresaAId}', '${filialA1Id}', '${prodLosartanaId}', 15);

      INSERT INTO lotes (id, empresa_id, filial_id, produto_id, numero_lote, data_fabricacao, data_validade, quantidade_recebida, quantidade_disponivel, status)
      VALUES ('${loteLosartanaBloqueadoId}', '${empresaAId}', '${filialA1Id}', '${prodLosartanaId}', 'LOTE-LOS-BLOQ', '2025-01-01', '2028-01-01', 15, 15, 'BLOQUEADO');

      -- Produto 4: Estoque Escasso (Apenas 1 unidade)
      INSERT INTO produtos (id, empresa_id, nome_comercial, fabricante, apresentacao, tipo_produto)
      VALUES ('${prodEscassoId}', '${empresaAId}', 'Termômetro Digital Especial', 'TechHealth', 'Unidade', 'PRODUTO_SAUDE_CORRELATO');

      INSERT INTO produtos_filiais (empresa_id, filial_id, produto_id, preco_venda_centavos, preco_custo_centavos)
      VALUES ('${empresaAId}', '${filialA1Id}', '${prodEscassoId}', 5000, 2500);

      INSERT INTO estoque_saldos (empresa_id, filial_id, produto_id, quantidade_fisica)
      VALUES ('${empresaAId}', '${filialA1Id}', '${prodEscassoId}', 1);

      INSERT INTO lotes (id, empresa_id, filial_id, produto_id, numero_lote, data_fabricacao, data_validade, quantidade_recebida, quantidade_disponivel, status)
      VALUES ('${loteEscassoId}', '${empresaAId}', '${filialA1Id}', '${prodEscassoId}', 'LOTE-ESC-01', '2025-01-01', '2029-01-01', 1, 1, 'ATIVO');
    `);
  });

  // ============================================================================
  // CENÁRIO 13 (Abertura de Caixa)
  // ============================================================================
  it('13. Deve abrir sessão de caixa com saldo de abertura e registrar auditoria', async () => {
    const caixa = await CaixaService.abrirCaixa(
      poolAdapter,
      {
        dispositivoId: terminalPdvA1Id,
        saldoInicialCentavos: 10000, // R$ 100,00 de troco inicial
        observacoes: 'Abertura de turno da manhã',
      },
      tenantA,
      operador1AId,
    );

    assert.ok(caixa.id);
    assert.equal(caixa.status, 'ABERTO');
    assert.equal(caixa.saldoInicialCentavos, 10000);
    assert.equal(caixa.operadorAberturaId, operador1AId);

    caixaSessaoAId = caixa.id;

    // Verificar se uma nova tentativa de abrir no mesmo terminal gera erro
    await assert.rejects(
      async () => {
        await CaixaService.abrirCaixa(
          poolAdapter,
          {
            dispositivoId: terminalPdvA1Id,
            saldoInicialCentavos: 5000,
          },
          tenantA,
          operador1AId,
        );
      },
      /Já existe uma sessão de caixa aberta neste terminal/,
    );
  });

  // ============================================================================
  // CENÁRIO 01 (Venda Simples em Dinheiro com Cálculo de Troco)
  // ============================================================================
  it('01. Deve registrar venda simples em dinheiro com cálculo de troco correto', async () => {
    // Amoxicilina custa R$ 44,90 (4490). Cliente entrega R$ 50,00 (5000). Troco = R$ 5,10 (510).
    const venda = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        clienteId: clienteAId,
        itens: [
          {
            produtoId: prodAmoxId,
            loteId: loteAmoxValidoId,
            quantidade: 1,
            precoUnitarioCentavos: 4490,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'DINHEIRO',
            valorCentavos: 5000,
          },
        ],
        trocoCentavos: 510,
      },
      tenantA,
      operador1AId,
    );

    assert.equal(venda.status, 'CONCLUIDA');
    assert.equal(venda.subtotalCentavos, 4490);
    assert.equal(venda.totalCentavos, 4490);
    assert.equal(venda.trocoCentavos, 510);
    assert.equal(venda.pagamentos[0]?.formaPagamento, 'DINHEIRO');
    assert.equal(venda.pagamentos[0]?.valorCentavos, 5000);

    // Verificar baixa de estoque no lote e saldo consolidado
    const resEstoque = await poolAdapter.query(
      `SELECT quantidade_fisica FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2`,
      [filialA1Id, prodAmoxId],
    );
    assert.equal(Number(resEstoque.rows[0].quantidade_fisica), 49); // 50 - 1
  });

  // ============================================================================
  // CENÁRIO 02 (Venda via PIX com Confirmação Válida)
  // ============================================================================
  it('02. Deve registrar venda via PIX com confirmação e metadados válidos', async () => {
    const venda = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        itens: [
          {
            produtoId: prodAmoxId,
            loteId: loteAmoxValidoId,
            quantidade: 1,
            precoUnitarioCentavos: 4490,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'PIX',
            valorCentavos: 4490,
            detalhes: {
              chavePixConfirmada: 'e2e-pix-confirmado-1234567890',
              dataConfirmacao: new Date().toISOString(),
            },
          },
        ],
      },
      tenantA,
      operador1AId,
    );

    assert.equal(venda.status, 'CONCLUIDA');
    assert.equal(venda.totalCentavos, 4490);
    assert.equal(venda.trocoCentavos, 0);
    assert.equal(venda.pagamentos[0]?.formaPagamento, 'PIX');
    assert.equal(venda.pagamentos[0]?.valorCentavos, 4490);
  });

  // ============================================================================
  // CENÁRIO 03 (Venda com Cartão de Crédito e Parcelas)
  // ============================================================================
  it('03. Deve registrar venda no cartão de crédito com metadados de parcelamento', async () => {
    // 2 Amoxicilinas = R$ 89,80 em 2x de R$ 44,90
    const venda = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        itens: [
          {
            produtoId: prodAmoxId,
            loteId: loteAmoxValidoId,
            quantidade: 2,
            precoUnitarioCentavos: 4490,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'CARTAO_CREDITO',
            valorCentavos: 8980,
            parcelas: 2,
            bandeiraCartao: 'MASTERCARD',
            autorizacaoTefNsu: 'NSU-789456123',
          },
        ],
      },
      tenantA,
      operador1AId,
    );

    assert.equal(venda.status, 'CONCLUIDA');
    assert.equal(venda.totalCentavos, 8980);
    assert.equal(venda.pagamentos[0]?.parcelas, 2);
    assert.equal(venda.pagamentos[0]?.bandeiraCartao, 'MASTERCARD');
    assert.equal(venda.pagamentos[0]?.autorizacaoTefNsu, 'NSU-789456123');
  });

  // ============================================================================
  // CENÁRIO 04 (Pagamento Misto: Dinheiro + Cartão + PIX)
  // ============================================================================
  it('04. Deve registrar pagamento misto (Dinheiro + Cartão + PIX) com validação de soma exata', async () => {
    // Total R$ 134,70 (3 Amoxicilinas) = R$ 34,70 em dinheiro + R$ 50,00 no cartão débito + R$ 50,00 no PIX
    const venda = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        itens: [
          {
            produtoId: prodAmoxId,
            loteId: loteAmoxValidoId,
            quantidade: 3,
            precoUnitarioCentavos: 4490,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'DINHEIRO',
            valorCentavos: 3470,
          },
          {
            formaPagamento: 'CARTAO_DEBITO',
            valorCentavos: 5000,
            bandeiraCartao: 'VISA',
          },
          {
            formaPagamento: 'PIX',
            valorCentavos: 5000,
          },
        ],
      },
      tenantA,
      operador1AId,
    );

    assert.equal(venda.status, 'CONCLUIDA');
    assert.equal(venda.totalCentavos, 13470);
    assert.equal(venda.pagamentos.length, 3);
  });

  // ============================================================================
  // CENÁRIO 05 (Venda com Troco e Bloqueio de Troco para Modalidades Não-Dinheiro)
  // ============================================================================
  it('05. Deve bloquear solicitação de troco em formas de pagamento que não sejam dinheiro', async () => {
    await assert.rejects(
      async () => {
        await VendasService.criarVenda(
          poolAdapter,
          {
            caixaSessaoId: caixaSessaoAId,
            dispositivoId: terminalPdvA1Id,
            itens: [
              {
                produtoId: prodAmoxId,
                loteId: loteAmoxValidoId,
                quantidade: 1,
                precoUnitarioCentavos: 4490,
              },
            ],
            pagamentos: [
              {
                formaPagamento: 'PIX',
                valorCentavos: 5000,
              },
            ],
            trocoCentavos: 510, // Troco em PIX não é permitido!
          },
          tenantA,
          operador1AId,
        );
      },
      /Troco só pode ser gerado em operações com pagamento em dinheiro em espécie/,
    );
  });

  // ============================================================================
  // CENÁRIO 06 (Resgate Integral de Voucher com Pagamento Complementar)
  // ============================================================================
  it('06. Deve realizar resgate integral de voucher com pagamento complementar do saldo restante', async () => {
    // 1. Criar um voucher de R$ 30,00 na Empresa A
    const resVoucher = await poolAdapter.query<{ id: string; codigo: string }>(`
      INSERT INTO vouchers (
        empresa_id, filial_id, codigo, valor_centavos, cliente_id,
        venda_origem_id, motivo_cancelamento_origem, status,
        emitido_por_id, autorizado_por_id
      ) VALUES (
        '${empresaAId}', '${filialA1Id}', 'VCH-2026-TEST-0001', 3000, '${clienteAId}',
        (SELECT id FROM vendas LIMIT 1), 'Troca de produto autorizada', 'DISPONIVEL',
        '${operador1AId}', '${proprietarioAId}'
      ) RETURNING id, codigo;
    `);

    const voucher = resVoucher.rows[0];

    // 2. Compra de R$ 44,90 usando o Voucher de R$ 30,00 + R$ 14,90 em PIX
    const venda = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        clienteId: clienteAId,
        itens: [
          {
            produtoId: prodAmoxId,
            loteId: loteAmoxValidoId,
            quantidade: 1,
            precoUnitarioCentavos: 4490,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'VOUCHER',
            voucherId: voucher.id,
            valorCentavos: 3000, // 100% integral
          },
          {
            formaPagamento: 'PIX',
            valorCentavos: 1490, // Complemento
          },
        ],
      },
      tenantA,
      operador1AId,
    );

    assert.equal(venda.status, 'CONCLUIDA');
    assert.equal(venda.totalCentavos, 4490);

    // 3. Verificar se o status do voucher mudou para UTILIZADO
    const resVoucherAtualizado = await poolAdapter.query<{ status: string }>(
      `SELECT status FROM vouchers WHERE id = $1`,
      [voucher.id],
    );
    assert.equal(resVoucherAtualizado.rows[0].status, 'UTILIZADO');

    // 4. Verificar se a trilha de auditoria do voucher registrou 'RESGATE_UTILIZACAO'
    const resHist = await poolAdapter.query<{ operacao: string }>(
      `SELECT operacao FROM vouchers_historico WHERE voucher_id = $1 ORDER BY criado_em DESC LIMIT 1`,
      [voucher.id],
    );
    assert.equal(resHist.rows[0].operacao, 'RESGATE_UTILIZACAO');
  });

  // ============================================================================
  // CENÁRIO 07 (Rejeição de Voucher se Venda < Valor do Voucher)
  // ============================================================================
  it('07. Deve bloquear o resgate se o valor da compra for inferior ao valor do voucher', async () => {
    // Criar voucher de R$ 100,00
    const resVoucher = await poolAdapter.query<{ id: string }>(`
      INSERT INTO vouchers (
        empresa_id, filial_id, codigo, valor_centavos,
        venda_origem_id, motivo_cancelamento_origem, status,
        emitido_por_id, autorizado_por_id
      ) VALUES (
        '${empresaAId}', '${filialA1Id}', 'VCH-2026-VAL-100', 10000,
        (SELECT id FROM vendas OFFSET 1 LIMIT 1), 'Cancelamento anterior', 'DISPONIVEL',
        '${operador1AId}', '${proprietarioAId}'
      ) RETURNING id;
    `);

    const voucherId = resVoucher.rows[0].id;

    // Tentativa de comprar produto de R$ 44,90 com o voucher de R$ 100,00
    await assert.rejects(
      async () => {
        await VendasService.criarVenda(
          poolAdapter,
          {
            caixaSessaoId: caixaSessaoAId,
            dispositivoId: terminalPdvA1Id,
            itens: [
              {
                produtoId: prodAmoxId,
                loteId: loteAmoxValidoId,
                quantidade: 1,
                precoUnitarioCentavos: 4490,
              },
            ],
            pagamentos: [
              {
                formaPagamento: 'VOUCHER',
                voucherId: voucherId,
                valorCentavos: 10000,
              },
            ],
          },
          tenantA,
          operador1AId,
        );
      },
      /O valor total da compra .* é inferior ao valor do voucher .* Não é permitida utilização parcial nem devolução de troco/,
    );
  });

  // ============================================================================
  // CENÁRIO 08 (Bloqueio de Venda por Falta de Estoque)
  // ============================================================================
  it('08. Deve bloquear venda quando a quantidade solicitada for maior que o estoque disponível', async () => {
    await assert.rejects(
      async () => {
        await VendasService.criarVenda(
          poolAdapter,
          {
            caixaSessaoId: caixaSessaoAId,
            dispositivoId: terminalPdvA1Id,
            itens: [
              {
                produtoId: prodEscassoId, // Estoque = 1
                quantidade: 5,           // Solicitado = 5
                precoUnitarioCentavos: 5000,
              },
            ],
            pagamentos: [
              {
                formaPagamento: 'DINHEIRO',
                valorCentavos: 25000,
              },
            ],
          },
          tenantA,
          operador1AId,
        );
      },
      /Estoque insuficiente para o produto/,
    );
  });

  // ============================================================================
  // CENÁRIO 09 (Bloqueio de Venda de Lote Vencido — ANVISA)
  // ============================================================================
  it('09. Deve bloquear venda de produto com lote vencido em conformidade com as regras da ANVISA', async () => {
    await assert.rejects(
      async () => {
        await VendasService.criarVenda(
          poolAdapter,
          {
            caixaSessaoId: caixaSessaoAId,
            dispositivoId: terminalPdvA1Id,
            itens: [
              {
                produtoId: prodDipironaId,
                loteId: loteDipironaVencidoId, // Vencido em 2024
                quantidade: 1,
                precoUnitarioCentavos: 890,
              },
            ],
            pagamentos: [
              {
                formaPagamento: 'DINHEIRO',
                valorCentavos: 890,
              },
            ],
          },
          tenantA,
          operador1AId,
        );
      },
      /Venda bloqueada: O lote ".*" do produto ".*" está VENCIDO/,
    );
  });

  // ============================================================================
  // CENÁRIO 10 (Concorrência Simulada com Bloqueio Pessimista)
  // ============================================================================
  it('10. Deve garantir consistência transacional e bloqueio pessimista em concorrência de estoque escasso', async () => {
    // Termômetro Escasso possui apenas 1 unidade no estoque
    // Venda 1: Vende a única unidade disponível
    const venda1 = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        itens: [
          {
            produtoId: prodEscassoId,
            loteId: loteEscassoId,
            quantidade: 1,
            precoUnitarioCentavos: 5000,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'PIX',
            valorCentavos: 5000,
          },
        ],
      },
      tenantA,
      operador1AId,
    );

    assert.equal(venda1.status, 'CONCLUIDA');

    // Venda 2: Tentativa concorrente/imediata de vender mais 1 unidade do mesmo item agora esgotado
    await assert.rejects(
      async () => {
        await VendasService.criarVenda(
          poolAdapter,
          {
            caixaSessaoId: caixaSessaoAId,
            dispositivoId: terminalPdvA1Id,
            itens: [
              {
                produtoId: prodEscassoId,
                loteId: loteEscassoId,
                quantidade: 1,
                precoUnitarioCentavos: 5000,
              },
            ],
            pagamentos: [
              {
                formaPagamento: 'DINHEIRO',
                valorCentavos: 5000,
              },
            ],
          },
          tenantA,
          operador1AId,
        );
      },
      /Estoque insuficiente/,
    );
  });

  // ============================================================================
  // CENÁRIO 11 (Cancelamento de Venda com Permissão e Estorno de Estoque)
  // ============================================================================
  let vendaParaCancelarId: string;

  it('11. Deve cancelar venda autorizada com devolução de itens ao estoque', async () => {
    // 1. Criar uma venda para ser cancelada
    const venda = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        itens: [
          {
            produtoId: prodAmoxId,
            loteId: loteAmoxValidoId,
            quantidade: 2,
            precoUnitarioCentavos: 4490,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'DINHEIRO',
            valorCentavos: 8980,
          },
        ],
      },
      tenantA,
      operador1AId,
    );

    vendaParaCancelarId = venda.id;

    // Saldo antes do cancelamento
    const resEstoqueAntes = await poolAdapter.query(
      `SELECT quantidade_fisica FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2`,
      [filialA1Id, prodAmoxId],
    );
    const estoqueAntes = Number(resEstoqueAntes.rows[0].quantidade_fisica);

    // 2. Executar cancelamento com emissão de voucher autorizada
    const cancelamento = await VendasService.cancelarVenda(
      poolAdapter,
      {
        vendaId: vendaParaCancelarId,
        motivo: 'Paciente apresentou receita incorreta prescrita pelo médico',
        autorizadorId: proprietarioAId,
        emitirVoucher: true,
      },
      tenantA,
      operador1AId,
    );

    assert.equal(cancelamento.venda.status, 'CANCELADA');
    assert.equal(cancelamento.venda.canceladoPorId, proprietarioAId);
    assert.ok(cancelamento.voucherGerado);
    assert.equal(cancelamento.voucherGerado.valorCentavos, 8980);

    // 3. Verificar se o estoque foi estornado (+2 unidades)
    const resEstoqueDepois = await poolAdapter.query(
      `SELECT quantidade_fisica FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2`,
      [filialA1Id, prodAmoxId],
    );
    const estoqueDepois = Number(resEstoqueDepois.rows[0].quantidade_fisica);
    assert.equal(estoqueDepois, estoqueAntes + 2);

    // 4. Verificar se a movimentação contábil de estorno foi registrada
    const resMov = await poolAdapter.query(
      `SELECT tipo_movimentacao, quantidade FROM estoque_movimentacoes WHERE origem_documento_id = $1 ORDER BY criado_em DESC LIMIT 1`,
      [vendaParaCancelarId],
    );
    assert.equal(resMov.rows[0].tipo_movimentacao, 'ESTORNO_CANCELAMENTO_VENDA');
    assert.equal(Number(resMov.rows[0].quantidade), 2);
  });

  // ============================================================================
  // CENÁRIO 12 (Bloqueio de Emissão Duplicada de Voucher no Mesmo Cancelamento)
  // ============================================================================
  it('12. Deve bloquear tentativa duplicada de cancelamento ou de emissão de voucher para a mesma venda', async () => {
    await assert.rejects(
      async () => {
        await VendasService.cancelarVenda(
          poolAdapter,
          {
            vendaId: vendaParaCancelarId,
            motivo: 'Segunda tentativa indevida de cancelamento',
            autorizadorId: proprietarioAId,
            emitirVoucher: true,
          },
          tenantA,
          operador1AId,
        );
      },
      /Esta venda já se encontra cancelada/,
    );
  });

  // ============================================================================
  // CENÁRIO 14 (Troca de Operador — Handover sem Fechar Terminal)
  // ============================================================================
  it('14. Deve realizar troca de operador (handover) no terminal preservando a sessão aberta', async () => {
    const troca = await CaixaService.trocarOperador(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        novoOperadorId: operador2AId,
        saldoDeclaradoOperadorAnteriorCentavos: 15000,
        justificativaDiferenca: 'Pausa para almoço',
      },
      tenantA,
      proprietarioAId,
    );

    assert.equal(troca.sucesso, true);
    assert.equal(troca.novoOperadorId, operador2AId);

    // Verificar se a sessão continua ABERTA e com o novo operador
    const resSessao = await poolAdapter.query(
      `SELECT status, operador_atual_id FROM caixas_sessoes WHERE id = $1`,
      [caixaSessaoAId],
    );
    assert.equal(resSessao.rows[0].status, 'ABERTO');
    assert.equal(resSessao.rows[0].operador_atual_id, operador2AId);

    // O novo operador realiza uma venda normalmente no mesmo terminal
    const vendaNovoOperador = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        itens: [
          {
            produtoId: prodAmoxId,
            loteId: loteAmoxValidoId,
            quantidade: 1,
            precoUnitarioCentavos: 4490,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'DINHEIRO',
            valorCentavos: 4490,
          },
        ],
      },
      tenantA,
      operador2AId,
    );

    assert.equal(vendaNovoOperador.status, 'CONCLUIDA');
    assert.equal(vendaNovoOperador.operadorId, operador2AId);
  });

  // ============================================================================
  // CENÁRIO 15 (Fechamento com Divergência e Justificativa Obrigatória)
  // ============================================================================
  it('15. Deve exigir justificativa detalhada ao registrar fechamento com divergência de valores', async () => {
    // Obter resumo do caixa para saber o saldo apurado
    const resumo = await CaixaService.obterResumoCaixa(
      poolAdapter,
      empresaAId,
      filialA1Id,
      caixaSessaoAId,
    );

    const saldoEsperado = resumo.saldoGavetaDinheiroEsperadoCentavos;
    const saldoComDiferenca = saldoEsperado - 5000; // Faltam R$ 50,00

    // 1. Tentar fechar com divergência e SEM justificativa -> Deve falhar
    await assert.rejects(
      async () => {
        await CaixaService.fecharCaixa(
          poolAdapter,
          {
            caixaSessaoId: caixaSessaoAId,
            saldoDeclaradoCentavos: saldoComDiferenca,
            justificativaDiferenca: '', // Vazio
          },
          tenantA,
          operador2AId,
        );
      },
      /Divergência de caixa identificada .* A justificativa detalhada é obrigatória/,
    );

    // 2. Fechar com divergência informando justificativa completa -> Deve ter sucesso
    const fechamento = await CaixaService.fecharCaixa(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        saldoDeclaradoCentavos: saldoComDiferenca,
        justificativaDiferenca: 'Diferença decorrente de erro em troco devolvido no início do turno matutino.',
      },
      tenantA,
      operador2AId,
    );

    assert.equal(fechamento.status, 'FECHADO');
    assert.equal(fechamento.saldoFechamentoDeclaradoCentavos, saldoComDiferenca);
    assert.equal(fechamento.diferencaFechamentoCentavos, -5000);
    assert.ok(fechamento.justificativaDiferenca);
  });

  // ============================================================================
  // CENÁRIO 16 (Isolamento Multiempresa — Bloqueio de Acesso Cruzado)
  // ============================================================================
  it('16. Deve bloquear tentativa de acesso cruzado a caixa ou venda de outra empresa', async () => {
    // Operador da Empresa B tenta fechar o caixa da Empresa A
    await assert.rejects(
      async () => {
        await CaixaService.fecharCaixa(
          poolAdapter,
          {
            caixaSessaoId: caixaSessaoAId,
            saldoDeclaradoCentavos: 10000,
          },
          tenantB, // Tenant da Empresa B
          operadorBId,
        );
      },
      /Sessão de caixa não encontrada/,
    );

    // Operador da Empresa B tenta obter detalhes da venda da Empresa A
    const vendaCruzada = await VendasService.obterVendaPorId(
      poolAdapter,
      empresaBId,
      filialB1Id,
      vendaParaCancelarId,
    );
    assert.equal(vendaCruzada, null);
  });
});
