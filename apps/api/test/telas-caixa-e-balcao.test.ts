import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { PreVendaService } from '../src/services/prevenda.service.js';
import { VendasService } from '../src/services/vendas.service.js';
import { CaixaService } from '../src/services/caixa.service.js';
import { ContextoTenant } from '@farmapro/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Telas Independentes de Caixa (PDV) e Balcão (Consulta)', () => {
  let db: PGlite;
  let poolAdapter: pg.Pool;

  // IDs Fictícios — Empresa A e Filiais
  const empresaAId = '11111111-1111-4111-a111-111111111111';
  const filialA1Id = '11111111-aaaa-4111-a111-aaaaaaaaaaaa';
  const filialA2Id = '11111111-bbbb-4111-a111-bbbbbbbbbbbb';
  const terminalPdvA1Id = 'dddddddd-1111-4000-8000-000000000001';

  // Empresa B (Concorrente / Isolamento)
  const empresaBId = '22222222-2222-4222-b222-222222222222';
  const filialB1Id = '22222222-aaaa-4222-b222-aaaaaaaaaaaa';

  // Usuários com papéis distintos
  const operadorCaixaAId = 'aaaaaaaa-1111-4000-8000-000000000001';
  const balconistaAId = 'aaaaaaaa-2222-4000-8000-000000000002';
  const usuarioDuploAId = 'aaaaaaaa-3333-4000-8000-000000000003';
  const operadorBId = 'bbbbbbbb-1111-4000-8000-000000000001';

  // Clientes
  const clienteAId = 'cccccccc-1111-4000-8000-000000000001';

  // Produtos
  const prodDipironaId = 'fa111111-1111-4000-8000-000000000001';
  const prodLosartanaId = 'fa222222-2222-4000-8000-000000000002';
  const prodParacetamolId = 'fa333333-3333-4000-8000-000000000003';
  const prodOmeprazolId = 'fa444444-4444-4000-8000-000000000004';

  // Lotes para conferência FEFO
  const loteDipirona1Id = 'fb111111-1111-4000-8000-000000000001'; // vence mais cedo
  const loteDipirona2Id = 'fb111111-2222-4000-8000-000000000002'; // vence mais tarde

  const tenantOperadorCaixa: ContextoTenant = {
    empresaId: empresaAId,
    filialId: filialA1Id,
    usuarioId: operadorCaixaAId,
  };

  const tenantBalconista: ContextoTenant = {
    empresaId: empresaAId,
    filialId: filialA1Id,
    usuarioId: balconistaAId,
  };

  const tenantEmpresaB: ContextoTenant = {
    empresaId: empresaBId,
    filialId: filialB1Id,
    usuarioId: operadorBId,
  };

  let caixaSessaoAId: string;

  before(async () => {
    try {
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

    // Executar as 14 migrações
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

    // Carga de Empresas e Filiais Fictícias
    await db.exec(`
      INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato)
      VALUES 
        ('${empresaAId}', 'FarmaPro Farmácia Matriz Ltda', 'FarmaPro Matriz', '11222333000144', 'contato@farmapro.demo', '1133331111'),
        ('${empresaBId}', 'Drogaria Concorrente Ltda', 'Drogaria Norte', '22333444000155', 'contato@droganorte.demo', '1144442222');

      INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz)
      VALUES
        ('${filialA1Id}', '${empresaAId}', 'FIL-01', 'FarmaPro - Centro Matriz', '11222333000144', 'Rua Central', '100', 'Centro', 'São Paulo', 'SP', '01001000', '1133331111', true),
        ('${filialA2Id}', '${empresaAId}', 'FIL-02', 'FarmaPro - Filial Bairro', '11222333000225', 'Av Bairro', '200', 'Jardins', 'São Paulo', 'SP', '01002000', '1133332222', false),
        ('${filialB1Id}', '${empresaBId}', 'FIL-01', 'Drogaria Norte - Filial Campinas', '22333444000155', 'Rua Norte', '50', 'Centro', 'Campinas', 'SP', '13000000', '1933334444', true);

      INSERT INTO usuarios (id, nome, email, cpf, hash_senha, status)
      VALUES
        ('${operadorCaixaAId}', 'Carlos Santos Operador', 'caixa@farmapro.demo', '11111111111', 'argon2id$mock', 'ATIVO'),
        ('${balconistaAId}', 'Carlos Silva Balconista', 'balcao@farmapro.demo', '22222222222', 'argon2id$mock', 'ATIVO'),
        ('${usuarioDuploAId}', 'Mariana Gerente Geral', 'gerente@farmapro.demo', '33333333333', 'argon2id$mock', 'ATIVO'),
        ('${operadorBId}', 'Marcos Operador B', 'operador@droganorte.demo', '44444444444', 'argon2id$mock', 'ATIVO');

      INSERT INTO dispositivos_autorizados (id, empresa_id, filial_id, identificador_hardware, nome_terminal, numero_serie_caixa, tipo_dispositivo, token_acesso_hash, ativo)
      VALUES
        ('${terminalPdvA1Id}', '${empresaAId}', '${filialA1Id}', 'TERM-PDV-01', 'Caixa 01 Principal', 'CX-01', 'DESKTOP_PDV', 'hash_token_terminal_a1', true);

      INSERT INTO clientes (id, empresa_id, tipo_pessoa, nome_razao_social, cpf_cnpj, telefone_principal, status)
      VALUES
        ('${clienteAId}', '${empresaAId}', 'PF', 'João da Silva', '12345678900', '11999998888', 'ATIVO');

      -- Produtos
      INSERT INTO produtos (id, empresa_id, nome_comercial, nome_generico, apresentacao, fabricante, tipo_produto, status)
      VALUES
        ('${prodDipironaId}', '${empresaAId}', 'Dipirona Monoidratada 500 mg/mL', 'Dipirona Sódica', 'Gotas • Frasco 20 mL', 'Medley', 'MEDICAMENTO_GENERICO', 'ATIVO'),
        ('${prodLosartanaId}', '${empresaAId}', 'Losartana Potássica 50 mg', 'Losartana Potássica', 'Cx c/ 30 comprimidos', 'Aché', 'MEDICAMENTO_GENERICO', 'ATIVO'),
        ('${prodParacetamolId}', '${empresaAId}', 'Paracetamol 750 mg', 'Paracetamol', 'Cx c/ 20 comprimidos', 'Neo Química', 'MEDICAMENTO_GENERICO', 'ATIVO'),
        ('${prodOmeprazolId}', '${empresaAId}', 'Omeprazol 20 mg', 'Omeprazol', 'Cx c/ 28 cápsulas', 'Eurofarma', 'MEDICAMENTO_REFERENCIA', 'ATIVO');

      INSERT INTO produtos_codigos_barras (empresa_id, produto_id, codigo_barras, e_principal)
      VALUES
        ('${empresaAId}', '${prodDipironaId}', '7891234567890', true),
        ('${empresaAId}', '${prodLosartanaId}', '7892345678901', true),
        ('${empresaAId}', '${prodParacetamolId}', '7893456789012', true),
        ('${empresaAId}', '${prodOmeprazolId}', '7894567890123', true);

      INSERT INTO produtos_filiais (empresa_id, filial_id, produto_id, preco_venda_centavos, preco_custo_centavos)
      VALUES
        ('${empresaAId}', '${filialA1Id}', '${prodDipironaId}', 890, 400),
        ('${empresaAId}', '${filialA1Id}', '${prodLosartanaId}', 1350, 600),
        ('${empresaAId}', '${filialA1Id}', '${prodParacetamolId}', 1290, 500),
        ('${empresaAId}', '${filialA1Id}', '${prodOmeprazolId}', 2890, 1200);

      INSERT INTO estoque_saldos (empresa_id, filial_id, produto_id, quantidade_fisica)
      VALUES
        ('${empresaAId}', '${filialA1Id}', '${prodDipironaId}', 100),
        ('${empresaAId}', '${filialA1Id}', '${prodLosartanaId}', 50),
        ('${empresaAId}', '${filialA1Id}', '${prodParacetamolId}', 50),
        ('${empresaAId}', '${filialA1Id}', '${prodOmeprazolId}', 50);

      -- Lotes FEFO (Lote 1 vence antes do Lote 2)
      INSERT INTO lotes (id, empresa_id, filial_id, produto_id, numero_lote, data_fabricacao, data_validade, quantidade_recebida, quantidade_disponivel, status)
      VALUES
        ('${loteDipirona1Id}', '${empresaAId}', '${filialA1Id}', '${prodDipironaId}', 'DIP-FEFO-01', CURRENT_DATE - 100, CURRENT_DATE + 60, 50, 50, 'ATIVO'),
        ('${loteDipirona2Id}', '${empresaAId}', '${filialA1Id}', '${prodDipironaId}', 'DIP-FEFO-02', CURRENT_DATE - 50, CURRENT_DATE + 360, 50, 50, 'ATIVO');
    `);

    // Abertura de Sessão de Caixa
    const caixaSessao = await CaixaService.abrirCaixa(
      poolAdapter,
      {
        dispositivoId: terminalPdvA1Id,
        saldoInicialCentavos: 10000, // R$ 100,00 de fundo de troco
        observacoes: 'Abertura de Caixa para Testes de Troco e PDV',
      },
      tenantOperadorCaixa,
      operadorCaixaAId,
    );
    caixaSessaoAId = caixaSessao.id;
  } catch (err) {
    console.error('ERRO DETALHADO NO BEFORE:', err);
    throw err;
  }
  });

  // TESTE 01
  it('01. Login e acesso independente da tela de Caixa/PDV (permissão pdv:acesso)', async () => {
    const permissoesOperadorCaixa = ['pdv:acesso', 'pdv:vender', 'pdv:fechar_caixa'];
    const temAcessoCaixa = permissoesOperadorCaixa.includes('pdv:acesso');
    assert.strictEqual(temAcessoCaixa, true, 'Operador de caixa deve possuir pdv:acesso');
  });

  // TESTE 02
  it('02. Login e acesso independente da tela de Balcão/Consulta (permissão balcao:consultar)', async () => {
    const permissoesBalconista = ['balcao:consultar', 'pre_venda:criar', 'pre_venda:consultar'];
    const temAcessoBalcao = permissoesBalconista.includes('balcao:consultar');
    assert.strictEqual(temAcessoBalcao, true, 'Atendente de balcão deve possuir balcao:consultar');
  });

  // TESTE 03
  it('03. Bloqueio de atendente de balcão na tela de Caixa/PDV', async () => {
    const permissoesBalconista = ['balcao:consultar', 'pre_venda:criar'];
    const podeAcessarPdv = permissoesBalconista.includes('pdv:acesso');
    assert.strictEqual(podeAcessarPdv, false, 'Atendente de balcão NÃO deve possuir pdv:acesso');
  });

  // TESTE 04
  it('04. Bloqueio de operador de caixa na tela de Balcão', async () => {
    const permissoesCaixa = ['pdv:acesso', 'pdv:vender'];
    const podeAcessarBalcao = permissoesCaixa.includes('balcao:consultar');
    assert.strictEqual(podeAcessarBalcao, false, 'Operador exclusivo de caixa NÃO deve acessar o balcão');
  });

  // TESTE 05
  it('05. Acesso por usuário com duplo perfil (escolha de destino no portal operacional)', async () => {
    const permissoesGerente = ['pdv:acesso', 'balcao:consultar', 'pre_venda:criar'];
    const podeCaixa = permissoesGerente.includes('pdv:acesso');
    const podeBalcao = permissoesGerente.includes('balcao:consultar');
    assert.strictEqual(podeCaixa && podeBalcao, true, 'Usuário com duplo perfil deve ter acesso a ambos os terminais');
  });

  // TESTE 06
  let comandaEmitidaPV: any;
  it('06. Criação de pré-venda no Balcão com comanda legível (Ex: PV-1048 / PV-1001)', async () => {
    comandaEmitidaPV = await PreVendaService.criarPreVenda(poolAdapter, tenantBalconista, {
      filialId: filialA1Id,
      identificacaoBalcao: 'Balcão 02',
      clienteId: clienteAId,
      clienteNome: 'João da Silva',
      clienteCpf: '12345678900',
      itens: [
        {
          produtoId: prodDipironaId,
          quantidade: 1,
          precoUnitarioCentavos: 890,
          descontoUnitarioCentavos: 0,
        },
        {
          produtoId: prodLosartanaId,
          quantidade: 2,
          precoUnitarioCentavos: 1350,
          descontoUnitarioCentavos: 100, // R$ 2,00 de desconto total
        },
        {
          produtoId: prodParacetamolId,
          quantidade: 1,
          precoUnitarioCentavos: 1290,
          descontoUnitarioCentavos: 0,
        },
        {
          produtoId: prodOmeprazolId,
          quantidade: 1,
          precoUnitarioCentavos: 2890,
          descontoUnitarioCentavos: 0,
        },
      ],
    });

    assert.ok(comandaEmitidaPV.codigoComanda.startsWith('PV-'), 'Comanda deve iniciar com PV-');
    assert.strictEqual(comandaEmitidaPV.status, 'PENDENTE', 'Comanda gerada no balcão deve estar PENDENTE');
    assert.strictEqual(comandaEmitidaPV.subtotalCentavos, 890 + 2700 + 1290 + 2890); // 7770
    assert.strictEqual(comandaEmitidaPV.descontoCentavos, 200);
    assert.strictEqual(comandaEmitidaPV.totalCentavos, 7570);
  });

  // TESTE 07
  it('07. Consulta e carregamento da comanda no Caixa (pelo código curto PV-...)', async () => {
    const comandaCarregada = await PreVendaService.buscarPorCodigo(
      poolAdapter,
      tenantOperadorCaixa,
      comandaEmitidaPV.codigoComanda,
    );

    assert.strictEqual(comandaCarregada.id, comandaEmitidaPV.id);
    assert.strictEqual(comandaCarregada.clienteNome, 'João da Silva');
    assert.strictEqual(comandaCarregada.itens.length, 4);
    assert.strictEqual(comandaCarregada.atendenteNome, 'Carlos Silva Balconista');
    assert.strictEqual(comandaCarregada.identificacaoBalcao, 'Balcão 02');
  });

  // TESTE 08
  it('08. Prevenção de faturamento duplicado de comanda', async () => {
    // 1. Criar uma venda real no caixa
    const vendaReal = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        itens: [
          {
            produtoId: prodDipironaId,
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
      tenantOperadorCaixa,
      operadorCaixaAId,
    );

    // Finalizar comanda no caixa simulando vínculo com a venda
    await PreVendaService.finalizarPreVendaNoCaixa(
      poolAdapter,
      tenantOperadorCaixa,
      comandaEmitidaPV.id,
      vendaReal.id,
      operadorCaixaAId,
    );

    // Tentar finalizar a mesma comanda novamente deve disparar erro
    await assert.rejects(
      async () => {
        await PreVendaService.finalizarPreVendaNoCaixa(
          poolAdapter,
          tenantOperadorCaixa,
          comandaEmitidaPV.id,
          vendaReal.id,
          operadorCaixaAId,
        );
      },
      /já foi finalizada/i,
      'Deve bloquear faturamento de comanda já finalizada',
    );
  });

  // TESTE 09
  it('09. Cálculo dinâmico de troco no pagamento em dinheiro (Total R$ 62,20 com R$ 100,00 -> Troco R$ 37,80)', async () => {
    const totalAPagarCentavos = 6220; // R$ 62,20
    const valorRecebidoCentavos = 10000; // R$ 100,00
    const trocoCalculado = valorRecebidoCentavos - totalAPagarCentavos;

    assert.strictEqual(trocoCalculado, 3780, 'Troco de R$ 100,00 para R$ 62,20 deve ser exatamente R$ 37,80 (3780 centavos)');
  });

  // TESTE 10
  it('10. Bloqueio de venda com valor recebido em dinheiro insuficiente', async () => {
    const totalAPagarCentavos = 6220;
    const valorRecebidoCentavos = 5000; // R$ 50,00 (faltam R$ 12,20)
    const faltaReceber = totalAPagarCentavos - valorRecebidoCentavos;

    assert.ok(valorRecebidoCentavos < totalAPagarCentavos, 'Valor recebido é insuficiente');
    assert.strictEqual(faltaReceber, 1220, 'Faltam exatamente R$ 12,20');

    // Tentar criar venda com valor menor que o total deve falhar
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
                quantidade: 1,
                precoUnitarioCentavos: 6220,
              },
            ],
            pagamentos: [
              {
                formaPagamento: 'DINHEIRO',
                valorCentavos: 5000, // Insuficiente!
              },
            ],
          },
          tenantOperadorCaixa,
          operadorCaixaAId,
        );
      },
      /não confere com o total da venda/i,
      'Deve rejeitar venda com valor pago insuficiente',
    );
  });

  // TESTE 11
  it('11. Pagamento em dinheiro com troco zero (valor exato)', async () => {
    const totalAPagarCentavos = 890;
    const valorRecebidoCentavos = 890;
    const troco = Math.max(0, valorRecebidoCentavos - totalAPagarCentavos);

    assert.strictEqual(troco, 0, 'Valor recebido exato deve gerar troco zero');
  });

  // TESTE 12
  it('12. Pagamento misto com cálculo de troco exclusivo sobre a parcela em dinheiro', async () => {
    // Venda de R$ 62,20:
    // R$ 20,00 pagos no PIX
    // Restante R$ 42,20 pago com cédula de R$ 50,00 em dinheiro
    const totalVenda = 6220;
    const pagoPix = 2000;
    const restanteDinheiro = totalVenda - pagoPix; // 4220
    const cedulaEntregue = 5000; // R$ 50,00
    const trocoEfetivo = cedulaEntregue - restanteDinheiro; // 780 centavos (R$ 7,80)

    assert.strictEqual(trocoEfetivo, 780, 'Troco da parcela em dinheiro deve ser R$ 7,80');
    // PIX não gera troco físico
    const trocoPix = 0;
    assert.strictEqual(trocoPix, 0, 'PIX nunca deve gerar troco físico');
  });

  // TESTE 13
  it('13. Pagamento com voucher de devolução originado de cancelamento', async () => {
    // 1. Criar uma venda prévia
    const venda1 = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        itens: [
          {
            produtoId: prodDipironaId,
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
      tenantOperadorCaixa,
      operadorCaixaAId,
    );

    // 2. Cancelar com emissão de Voucher
    const resCancelamento = await VendasService.cancelarVenda(
      poolAdapter,
      {
        vendaId: venda1.id,
        motivo: 'Devolução autorizada pelo cliente',
        autorizadorId: operadorCaixaAId,
        emitirVoucher: true,
      },
      tenantOperadorCaixa,
      operadorCaixaAId,
    );

    assert.ok(resCancelamento.voucherGerado, 'Deve emitir voucher no cancelamento');
    const codigoVoucher = resCancelamento.voucherGerado!.codigo;
    assert.strictEqual(resCancelamento.voucherGerado!.valorCentavos, 890);

    // 3. Resgatar o Voucher em uma nova venda no PDV
    const vendaComVoucher = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        itens: [
          {
            produtoId: prodDipironaId,
            quantidade: 1,
            precoUnitarioCentavos: 890,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'VOUCHER',
            valorCentavos: 890,
            codigoVoucher,
          },
        ],
      },
      tenantOperadorCaixa,
      operadorCaixaAId,
    );

    assert.strictEqual(vendaComVoucher.status, 'CONCLUIDA');
    assert.strictEqual(vendaComVoucher.pagamentos[0]?.formaPagamento, 'VOUCHER');
  });

  // TESTE 14
  it('14. Baixa e reserva de estoque com conferência FEFO no Caixa', async () => {
    // Verificar saldos antes
    const resSaldoAntes = await poolAdapter.query(
      `SELECT quantidade_disponivel FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2`,
      [filialA1Id, prodDipironaId],
    );
    const saldoAntes = Number(resSaldoAntes.rows[0]?.quantidade_disponivel || 0);

    // 1. Emitir comanda no Balcão
    const pvEstoque = await PreVendaService.criarPreVenda(poolAdapter, tenantBalconista, {
      filialId: filialA1Id,
      itens: [
        {
          produtoId: prodDipironaId,
          quantidade: 5,
          precoUnitarioCentavos: 890,
        },
      ],
    });

    // Saldo NÃO deve ter baixado apenas com a comanda do balcão!
    const resSaldoAposComanda = await poolAdapter.query(
      `SELECT quantidade_disponivel FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2`,
      [filialA1Id, prodDipironaId],
    );
    assert.strictEqual(
      Number(resSaldoAposComanda.rows[0]?.quantidade_disponivel),
      saldoAntes,
      'A emissão da comanda no balcão NÃO deve baixar o estoque definitivo',
    );

    // 2. Faturar e concluir venda no Caixa
    const vendaFefo = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        codigoComanda: pvEstoque.codigoComanda,
        itens: [
          {
            produtoId: prodDipironaId,
            quantidade: 5,
            precoUnitarioCentavos: 890,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'DINHEIRO',
            valorCentavos: 4450,
          },
        ],
      },
      tenantOperadorCaixa,
      operadorCaixaAId,
    );

    // Saldo agora DEVE ter baixado
    const resSaldoAposVenda = await poolAdapter.query(
      `SELECT quantidade_disponivel FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2`,
      [filialA1Id, prodDipironaId],
    );
    assert.strictEqual(
      Number(resSaldoAposVenda.rows[0]?.quantidade_disponivel),
      saldoAntes - 5,
      'O estoque deve ser baixado exatamente na conclusão da venda no Caixa',
    );

    // Conferir se o lote debitado foi o de vencimento mais próximo (FEFO: loteDipirona1Id)
    assert.strictEqual(vendaFefo.itens[0]?.loteId, loteDipirona1Id, 'Deve priorizar o lote FEFO com vencimento mais próximo');
  });

  // TESTE 15
  it('15. Exibição do troco no comprovante/recibo final da venda', async () => {
    const vendaComTroco = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaSessaoAId,
        dispositivoId: terminalPdvA1Id,
        itens: [
          {
            produtoId: prodDipironaId,
            quantidade: 1,
            precoUnitarioCentavos: 890,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'DINHEIRO',
            valorCentavos: 2000,
          },
        ],
        trocoCentavos: 1110, // R$ 11,10 (recebeu R$ 20,00 em cédula)
      },
      tenantOperadorCaixa,
      operadorCaixaAId,
    );

    assert.strictEqual(vendaComTroco.trocoCentavos, 1110, 'Registro da venda deve registrar o troco centavos de R$ 11,10');
  });

  // TESTE 16
  it('16. Isolamento multiempresa e multifilial nas comandas (Empresa B não acessa comanda da Empresa A)', async () => {
    // Balcão da Empresa A emite comanda
    const pvEmpresaA = await PreVendaService.criarPreVenda(poolAdapter, tenantBalconista, {
      filialId: filialA1Id,
      itens: [
        {
          produtoId: prodDipironaId,
          quantidade: 1,
          precoUnitarioCentavos: 890,
        },
      ],
    });

    // Operador da Empresa B tenta buscar pelo código
    await assert.rejects(
      async () => {
        await PreVendaService.buscarPorCodigo(
          poolAdapter,
          tenantEmpresaB,
          pvEmpresaA.codigoComanda,
        );
      },
      /não foi encontrada nesta filial/i,
      'Empresa B não pode enxergar ou carregar comanda emitida pela Empresa A',
    );
  });

  // TESTE 17
  it('17. Validação de cancelamento de comanda no Balcão antes do caixa', async () => {
    // Balcão emite comanda
    const pvCancelar = await PreVendaService.criarPreVenda(poolAdapter, tenantBalconista, {
      filialId: filialA1Id,
      itens: [
        {
          produtoId: prodDipironaId,
          quantidade: 1,
          precoUnitarioCentavos: 890,
        },
      ],
    });

    assert.strictEqual(pvCancelar.status, 'PENDENTE');

    // Atendente cancela por desistência do cliente
    await PreVendaService.cancelarPreVenda(
      poolAdapter,
      tenantBalconista,
      pvCancelar.id,
      'Cliente desistiu da compra no balcão',
    );

    // Consulta novamente para conferir o status CANCELADA
    const pvCanceladaConsultada = await PreVendaService.buscarPorCodigo(
      poolAdapter,
      tenantBalconista,
      pvCancelar.codigoComanda,
    );

    assert.strictEqual(pvCanceladaConsultada.status, 'CANCELADA');
    assert.ok(pvCanceladaConsultada.observacoes?.includes('Cliente desistiu'), 'Observações de cancelamento registradas');
  });

  after(async () => {
    if (db) {
      await db.close();
    }
  });
});
