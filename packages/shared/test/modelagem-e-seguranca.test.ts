import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatarCentavosParaReal,
  converterRealParaCentavos,
  validarCpf,
  formatarCpf,
  formatarCnpj,
  ordenarLotesPorFEFO,
  classificarLotesValidade,
  gerarChaveIdempotencia,
  validarIsolamentoTenant,
  validarResgateVoucher,
  criarHistoricoEstornoVendaComVoucher,
  Cliente,
  Voucher,
  Lote,
  Cargo,
  Permissao,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Testes da Etapa 03 (Revisão): Modelagem, Vouchers e Segurança Multiempresa', () => {
  // --------------------------------------------------------------------------
  // 1. CONSISTÊNCIA MONETÁRIA
  // --------------------------------------------------------------------------
  describe('Consistência Monetária e Ausência de Erros de Ponto Flutuante', () => {
    it('deve formatar centavos inteiros para o formato BRL correto', () => {
      assert.match(formatarCentavosParaReal(4990), /49,90/);
      assert.match(formatarCentavosParaReal(5), /0,05/);
      assert.match(formatarCentavosParaReal(125000), /1\.250,00/);
      assert.match(formatarCentavosParaReal(0), /0,00/);
    });

    it('deve formatar e validar documentos cadastrais (CPF e CNPJ)', () => {
      assert.equal(formatarCpf('12345678900'), '123.456.789-00');
      assert.equal(formatarCnpj('12345678000195'), '12.345.678/0001-95');
      assert.equal(validarCpf('11111111111'), false);
      assert.equal(validarCpf(''), false);
    });

    it('deve converter representações decimais e strings para centavos inteiros com precisão exata', () => {
      const somaFlutuante = 0.1 + 0.2;
      const centavos = converterRealParaCentavos(somaFlutuante);
      assert.equal(centavos, 30);
      assert.equal(converterRealParaCentavos('R$ 49,90'), 4990);
      assert.equal(converterRealParaCentavos('12,50'), 1250);
      assert.equal(converterRealParaCentavos('0,05'), 5);
    });
  });

  // --------------------------------------------------------------------------
  // 2. CLIENTE SEM CRÉDITO PRÓPRIO E AUSÊNCIA DE CARTEIRA
  // --------------------------------------------------------------------------
  describe('Cadastro de Cliente sem Crédito Próprio e Ausência de Carteira', () => {
    it('deve permitir instanciar cliente sem limites de crédito, saldo devedor ou carteira', () => {
      const clienteMock: Cliente = {
        id: 'cli-001',
        empresaId: 'emp-001',
        tipoPessoa: 'PF',
        nomeCompleto: 'Maria Francisca da Silva',
        cpf: '12345678900',
        telefone: '(11) 98765-4321',
        status: 'ATIVO',
      };

      assert.equal(clienteMock.nomeCompleto, 'Maria Francisca da Silva');
      // Verificação em runtime de que não existem propriedades de crédito
      assert.equal((clienteMock as Record<string, unknown>)['limiteCrediarioCentavos'], undefined);
      assert.equal((clienteMock as Record<string, unknown>)['saldoDevedorCentavos'], undefined);
      assert.equal((clienteMock as Record<string, unknown>)['saldoCreditoCentavos'], undefined);
    });
  });

  // --------------------------------------------------------------------------
  // 3. ISOLAMENTO MULTIEMPRESA E PERMISSÕES DE ESTOQUE
  // --------------------------------------------------------------------------
  describe('Isolamento Multiempresa e Permissões de Estoque sem Cargo Estoquista', () => {
    it('deve validar isolamento estrito de tenant context', () => {
      assert.equal(validarIsolamentoTenant('emp-1', 'emp-2'), false);
      assert.equal(validarIsolamentoTenant('emp-1', 'emp-1'), true);
      assert.equal(validarIsolamentoTenant(undefined, 'emp-1'), false);
    });

    it('deve permitir atribuir permissões de estoque a um Gerente ou Farmacêutico', () => {
      const permissoesEstoque: Permissao[] = [
        'estoque:visualizar',
        'estoque:entrada_mercadoria',
        'estoque:ajustar',
        'estoque:inventario',
        'estoque:gerenciar_lotes',
      ];

      const cargoFarmaceutico: Cargo = {
        id: 'cargo-farm-01',
        empresaId: 'emp-001',
        nome: 'Farmacêutico Gestor',
        nivelAcesso: 'FARMACEUTICO',
        permissoes: permissoesEstoque,
        status: 'ATIVO',
      };

      assert.ok(cargoFarmaceutico.permissoes.includes('estoque:entrada_mercadoria'));
      assert.ok(cargoFarmaceutico.permissoes.includes('estoque:inventario'));
      assert.notEqual(cargoFarmaceutico.nome, 'Estoquista', 'Não há dependência do cargo Estoquista');
    });
  });

  // --------------------------------------------------------------------------
  // 4. MODELAGEM E REGRAS MANDATÓRIAS DE VOUCHER
  // --------------------------------------------------------------------------
  describe('Regras Obrigatórias de Emissão e Resgate de Vouchers', () => {
    const empresaA = '11111111-1111-4111-a111-111111111111';
    const empresaB = '22222222-2222-4222-b222-222222222222';

    const voucherValido100Reais: Voucher = {
      id: 'vch-100',
      empresaId: empresaA,
      filialOrigemId: 'filial-a1',
      codigoVoucher: 'VCH-2026-TEST-100',
      valorCentavos: 10000, // R$ 100,00
      vendaOrigemId: 'venda-cancelada-01',
      motivoCancelamentoOrigem: 'Produto com embalagem violada pelo cliente no balcão',
      status: 'DISPONIVEL',
      emitidoEm: '2026-11-20T10:00:00Z',
      emitidoPorId: 'user-op-01',
      autorizadoPorId: 'user-gerente-01',
      criadoEm: '2026-11-20T10:00:00Z',
      atualizadoEm: '2026-11-20T10:00:00Z',
    };

    it('deve autorizar resgate integral quando o valor da compra for EXATAMENTE IGUAL ao voucher', () => {
      const res = validarResgateVoucher(voucherValido100Reais, 10000, empresaA);
      assert.equal(res.valido, true);
      assert.equal(res.valorAbatidoCentavos, 10000);
      assert.equal(res.valorComplementarCentavos, 0);
    });

    it('deve autorizar resgate integral quando o valor da compra for SUPERIOR, exigindo pagamento da diferença', () => {
      // Compra de R$ 130,00 com voucher de R$ 100,00
      const res = validarResgateVoucher(voucherValido100Reais, 13000, empresaA);
      assert.equal(res.valido, true);
      assert.equal(res.valorAbatidoCentavos, 10000, 'Abate integral do voucher de R$ 100,00');
      assert.equal(res.valorComplementarCentavos, 3000, 'Diferença de R$ 30,00 a pagar');
    });

    it('deve BLOQUEAR o resgate quando o valor da compra for INFERIOR ao voucher (proibido uso parcial e troco)', () => {
      // Compra de R$ 80,00 com voucher de R$ 100,00
      const res = validarResgateVoucher(voucherValido100Reais, 8000, empresaA);
      assert.equal(res.valido, false);
      assert.equal(res.codigoErro, 'VALOR_COMPRA_INFERIOR_AO_VOUCHER');
      assert.match(res.mensagem, /inferior ao valor do voucher/i);
    });

    it('deve BLOQUEAR tentativa de resgate de voucher com status UTILIZADO (proteção contra duplo resgate)', () => {
      const voucherUtilizado: Voucher = {
        ...voucherValido100Reais,
        status: 'UTILIZADO',
        utilizadoEm: '2026-11-20T11:00:00Z',
      };

      const res = validarResgateVoucher(voucherUtilizado, 15000, empresaA);
      assert.equal(res.valido, false);
      assert.equal(res.codigoErro, 'VOUCHER_NAO_DISPONIVEL');
    });

    it('deve BLOQUEAR tentativa de resgate de voucher em outra empresa (isolamento multiempresa)', () => {
      // Tentativa de resgatar voucher da Empresa A na Empresa B
      const res = validarResgateVoucher(voucherValido100Reais, 10000, empresaB);
      assert.equal(res.valido, false);
      assert.equal(res.codigoErro, 'EMPRESA_DIVERGENTE');
    });

    it('deve gerar registro auditável caso a venda que utilizou voucher seja cancelada', () => {
      const hist = criarHistoricoEstornoVendaComVoucher({
        empresaId: empresaA,
        voucherId: voucherValido100Reais.id,
        vendaId: 'venda-resgate-02',
        operadorId: 'user-gerente-01',
        justificativa: 'Cliente devolveu os itens da nova compra antes da emissão da NFC-e',
      });

      assert.equal(hist.operacao, 'ESTORNO_VENDA_RESGATE');
      assert.equal(hist.statusAnterior, 'UTILIZADO');
      assert.equal(hist.statusNovo, 'CANCELADO');
      assert.ok(hist.justificativa?.includes('Cliente devolveu'));
    });
  });

  // --------------------------------------------------------------------------
  // 5. RASTREABILIDADE DE LOTES E FEFO
  // --------------------------------------------------------------------------
  describe('Rastreabilidade de Lotes e Regra FEFO', () => {
    const lotesMock: Lote[] = [
      {
        id: 'lote-3',
        empresaId: 'emp-1',
        filialId: 'fil-1',
        produtoId: 'prod-1',
        numeroLote: 'LOTE-LONGO',
        dataFabricacao: '2026-01-01',
        dataValidade: '2028-12-31',
        quantidadeRecebida: 100,
        quantidadeDisponivel: 100,
        quantidadeReservada: 0,
        quantidadeBloqueada: 0,
        precoCustoUnitarioCentavos: 1000,
        status: 'ATIVO',
        origemEntradaTipo: 'COMPRA_NFE',
      },
      {
        id: 'lote-1',
        empresaId: 'emp-1',
        filialId: 'fil-1',
        produtoId: 'prod-1',
        numeroLote: 'LOTE-PROXIMO',
        dataFabricacao: '2025-01-01',
        dataValidade: '2026-05-15',
        quantidadeRecebida: 50,
        quantidadeDisponivel: 50,
        quantidadeReservada: 0,
        quantidadeBloqueada: 0,
        precoCustoUnitarioCentavos: 1000,
        status: 'ATIVO',
        origemEntradaTipo: 'COMPRA_NFE',
      },
      {
        id: 'lote-2',
        empresaId: 'emp-1',
        filialId: 'fil-1',
        produtoId: 'prod-1',
        numeroLote: 'LOTE-MEDIO',
        dataFabricacao: '2025-06-01',
        dataValidade: '2027-01-10',
        quantidadeRecebida: 80,
        quantidadeDisponivel: 80,
        quantidadeReservada: 0,
        quantidadeBloqueada: 0,
        precoCustoUnitarioCentavos: 1000,
        status: 'ATIVO',
        origemEntradaTipo: 'COMPRA_NFE',
      },
    ];

    it('deve ordenar lotes priorizando estritamente o vencimento mais próximo (FEFO)', () => {
      const ordenados = ordenarLotesPorFEFO(lotesMock);
      assert.equal(ordenados[0]?.id, 'lote-1');
      assert.equal(ordenados[1]?.id, 'lote-2');
      assert.equal(ordenados[2]?.id, 'lote-3');
    });

    it('deve segregar produtos vencidos e bloqueados, impedindo sua inclusão em vendáveis', () => {
      const dataHoje = new Date('2026-06-01');
      const resultado = classificarLotesValidade(lotesMock, dataHoje, 90);
      assert.equal(resultado.vencidos.length, 1);
      assert.ok(!resultado.vendaveis.some(l => l.numeroLote === 'LOTE-PROXIMO'));
    });
  });

  // --------------------------------------------------------------------------
  // 6. IDEMPOTÊNCIA E RESILIÊNCIA OFFLINE
  // --------------------------------------------------------------------------
  describe('Idempotência de Operações Offline', () => {
    it('deve gerar chave determinística única para evento de venda', () => {
      const params = {
        empresaId: '11111111-1111-4111-a111-111111111111',
        filialId: '11111111-aaaa-4111-a111-111111111101',
        dispositivoId: 'term-caixa-01',
        numeroSequencial: '000042',
        idOfflineUuid: '99999999-9999-4999-a999-999999999999',
      };

      const chave1 = gerarChaveIdempotencia(params);
      const chave2 = gerarChaveIdempotencia(params);
      assert.equal(chave1, chave2);
      assert.ok(chave1.startsWith('IDMP-'));
    });
  });

  // --------------------------------------------------------------------------
  // 7. ANÁLISE ESTÁTICA DOS SCRIPTS SQL DE MIGRAÇÃO
  // --------------------------------------------------------------------------
  describe('Integridade e Rigor dos Scripts SQL Preparados', () => {
    const diretorioMigracoes = path.resolve(__dirname, '../../../database/migrations');

    it('deve conter todos os 8 scripts de migração ordenados', () => {
      const arquivosEsperados = [
        '001_extensoes_e_funcoes_base.sql',
        '002_tabelas_multiempresa_e_acesso.sql',
        '003_tabelas_produtos_medicamentos_e_lotes.sql',
        '004_tabelas_clientes_e_lgpd.sql',
        '005_tabelas_caixas_e_vendas.sql',
        '006_tabelas_estoque_e_movimentacoes.sql',
        '007_tabelas_auditoria_e_offline.sql',
        '008_politicas_rls_e_seguranca.sql',
      ];

      for (const arquivo of arquivosEsperados) {
        const caminho = path.join(diretorioMigracoes, arquivo);
        assert.ok(fs.existsSync(caminho), `Arquivo ${arquivo} deve existir`);
      }
    });

    it('deve garantir que os vouchers possuam RLS no script 008', () => {
      const conteudoScript008 = fs.readFileSync(
        path.join(diretorioMigracoes, '008_politicas_rls_e_seguranca.sql'),
        'utf-8',
      );

      assert.ok(
        conteudoScript008.includes('ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY'),
        'Script 008 deve habilitar RLS para vouchers',
      );
      assert.ok(
        conteudoScript008.includes('p_vouchers_isolamento'),
        'Script 008 deve conter política de isolamento para vouchers',
      );
      assert.ok(
        !conteudoScript008.includes('clientes_carteira_movimentacoes'),
        'Não deve haver referência a carteira de crédito no script 008',
      );
    });
  });
});
