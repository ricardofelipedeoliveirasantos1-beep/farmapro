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
  validarEmissaoVoucher,
  contabilizarImpactoCaixaVoucher,
  criarHistoricoEstornoVendaComVoucher,
  Cliente,
  Voucher,
  Lote,
  Cargo,
  Permissao,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Suíte de Testes da Etapa 03 (Revisão Complementar)', () => {
  // ==========================================================================
  // PARTE 1: TESTES UNITÁRIOS DE DOMÍNIO
  // ==========================================================================
  describe('1. Testes Unitários: Consistência Monetária e Documentos', () => {
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

  describe('2. Testes Unitários: Cliente sem Crédito Próprio e Permissões sem Estoquista', () => {
    it('deve instanciar cliente sem limites de crédito, saldo devedor ou carteira', () => {
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
      assert.equal((clienteMock as Record<string, unknown>)['limiteCrediarioCentavos'], undefined);
      assert.equal((clienteMock as Record<string, unknown>)['saldoDevedorCentavos'], undefined);
      assert.equal((clienteMock as Record<string, unknown>)['saldoCreditoCentavos'], undefined);
    });

    it('deve permitir atribuir permissões de estoque a qualquer cargo (sem cargo Estoquista)', () => {
      const permissoesEstoque: Permissao[] = [
        'estoque:visualizar',
        'estoque:entrada_mercadoria',
        'estoque:ajustar',
        'estoque:inventario',
        'estoque:gerenciar_lotes',
      ];

      const cargoGerente: Cargo = {
        id: 'cargo-ger-01',
        empresaId: 'emp-001',
        nome: 'Gerente Operacional',
        nivelAcesso: 'GERENTE',
        permissoes: permissoesEstoque,
        status: 'ATIVO',
      };

      assert.ok(cargoGerente.permissoes.includes('estoque:entrada_mercadoria'));
      assert.ok(cargoGerente.permissoes.includes('estoque:inventario'));
      assert.notEqual(cargoGerente.nome, 'Estoquista');
    });
  });

  describe('3. Testes Unitários: Lotes, FEFO e Idempotência Offline', () => {
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
    ];

    it('deve ordenar lotes priorizando estritamente o vencimento mais próximo (FEFO)', () => {
      const ordenados = ordenarLotesPorFEFO(lotesMock);
      assert.equal(ordenados[0]?.id, 'lote-1');
    });

    it('deve segregar produtos vencidos e bloqueados', () => {
      const dataHoje = new Date('2026-06-01');
      const resultado = classificarLotesValidade(lotesMock, dataHoje, 90);
      assert.equal(resultado.vencidos.length, 1);
      assert.ok(!resultado.vendaveis.some(l => l.numeroLote === 'LOTE-PROXIMO'));
    });

    it('deve gerar chave determinística única de idempotência para o mesmo evento de venda', () => {
      const params = {
        empresaId: '11111111-1111-4111-a111-111111111111',
        filialId: '11111111-aaaa-4111-a111-111111111101',
        dispositivoId: 'term-caixa-01',
        numeroSequencial: '000042',
        idOfflineUuid: '99999999-9999-4999-a999-999999999999',
      };
      assert.equal(gerarChaveIdempotencia(params), gerarChaveIdempotencia(params));
    });
  });

  // ==========================================================================
  // PARTE 2: TESTES DE INTEGRAÇÃO LÓGICA E CENÁRIOS DE SEGURANÇA
  // ==========================================================================
  describe('4. Cenários de Integração: Vouchers, Isolamento e Integridade Financeira', () => {
    const empresaA = '11111111-1111-4111-a111-111111111111';
    const empresaB = '22222222-2222-4222-b222-222222222222';

    const voucherBase: Voucher = {
      id: 'vch-100',
      empresaId: empresaA,
      filialId: 'filial-a1',
      codigo: 'VCH-2026-TEST-100',
      valorCentavos: 10000, // R$ 100,00
      vendaOrigemId: 'venda-cancelada-01',
      motivoCancelamentoOrigem: 'Cancelamento autorizado pelo farmacêutico com emissão de voucher',
      status: 'DISPONIVEL',
      emitidoEm: '2026-05-01T10:00:00Z', // Emitido há mais de 180 dias
      emitidoPorId: 'user-op-01',
      autorizadoPorId: 'user-gerente-01',
      criadoEm: '2026-05-01T10:00:00Z',
      atualizadoEm: '2026-05-01T10:00:00Z',
    };

    // Cenário 1: Duas empresas tentando consultar o mesmo voucher
    it('Cenário 1: Duas empresas tentando consultar o mesmo voucher (bloqueio multi-tenant)', () => {
      // Validação de isolamento do tenant
      assert.equal(validarIsolamentoTenant(voucherBase.empresaId, empresaA), true);
      assert.equal(validarIsolamentoTenant(voucherBase.empresaId, empresaB), false);

      // Consulta da Empresa A (proprietária legítima)
      const resA = validarResgateVoucher(voucherBase, 10000, empresaA);
      assert.equal(resA.valido, true, 'Empresa A pode consultar e resgatar');

      // Tentativa de consulta da Empresa B (concorrente)
      const resB = validarResgateVoucher(voucherBase, 10000, empresaB);
      assert.equal(resB.valido, false);
      assert.equal(resB.codigoErro, 'EMPRESA_DIVERGENTE');
    });

    // Cenário 2: Dois caixas tentando resgatar simultaneamente o mesmo voucher
    it('Cenário 2: Concorrência simultânea de resgate (simulação de transação atômica / lock)', () => {
      // Simulação de estado compartilhado transacional
      let voucherBanco = { ...voucherBase };

      const tentarResgateTransacional = (operadorId: string, valorCompra: number) => {
        // Validação inicial
        const validacao = validarResgateVoucher(voucherBanco, valorCompra, empresaA);
        if (!validacao.valido) {
          return { sucesso: false, erro: validacao.mensagem };
        }
        // Transição de estado atômica (CAS - Compare-And-Swap)
        if (voucherBanco.status === 'DISPONIVEL') {
          voucherBanco = {
            ...voucherBanco,
            status: 'UTILIZADO',
            utilizadoPorId: operadorId,
            utilizadoEm: new Date().toISOString(),
          };
          return { sucesso: true, valorAbatido: validacao.valorAbatidoCentavos };
        }
        return { sucesso: false, erro: 'Voucher já utilizado por outra transação concorrente' };
      };

      // Caixa 1 executa primeiro
      const resultadoCaixa1 = tentarResgateTransacional('operador-caixa-1', 12000);
      assert.equal(resultadoCaixa1.sucesso, true, 'Caixa 1 obtém sucesso no resgate');

      // Caixa 2 tenta resgatar simultaneamente o mesmo voucher
      const resultadoCaixa2 = tentarResgateTransacional('operador-caixa-2', 12000);
      assert.equal(resultadoCaixa2.sucesso, false, 'Caixa 2 deve ser bloqueado');
      assert.match(resultadoCaixa2.erro || '', /não disponível|já utilizado/i);
    });

    // Cenário 3: Tentativa de emitir dois vouchers para o mesmo cancelamento
    it('Cenário 3: Tentativa de emitir dois vouchers para o mesmo evento de cancelamento (bloqueio de duplicidade)', () => {
      const vouchersJaEmitidos = [{ vendaOrigemId: 'venda-cancelada-01', status: 'DISPONIVEL' as const }];

      const tentativa1 = validarEmissaoVoucher({
        vendaOrigemId: 'venda-cancelada-01',
        vouchersExistentes: vouchersJaEmitidos,
      });

      assert.equal(tentativa1.autorizada, false);
      assert.match(tentativa1.motivo || '', /Já existe um voucher emitido/);

      // Emissão para outra venda distinta deve ser autorizada
      const tentativaVendaDistinta = validarEmissaoVoucher({
        vendaOrigemId: 'venda-cancelada-02',
        vouchersExistentes: vouchersJaEmitidos,
      });
      assert.equal(tentativaVendaDistinta.autorizada, true);
    });

    // Cenário 4: Preservação de registros históricos (ON DELETE RESTRICT no schema)
    it('Cenário 4: Preservação dos registros históricos contra exclusão em cascata (verificação DDL)', () => {
      const diretorioMigracoes = path.resolve(__dirname, '../../../database/migrations');
      const script005 = fs.readFileSync(path.join(diretorioMigracoes, '005_tabelas_caixas_e_vendas.sql'), 'utf-8');
      const script006 = fs.readFileSync(path.join(diretorioMigracoes, '006_tabelas_estoque_e_movimentacoes.sql'), 'utf-8');
      const script007 = fs.readFileSync(path.join(diretorioMigracoes, '007_tabelas_auditoria_e_offline.sql'), 'utf-8');

      // Vouchers e Vendas devem usar ON DELETE RESTRICT para empresas e filiais
      assert.ok(
        script005.includes('empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT'),
        'Vendas e vouchers devem proteger empresa_id com ON DELETE RESTRICT',
      );
      assert.ok(
        script005.includes('CONSTRAINT uq_voucher_venda_origem UNIQUE (venda_origem_id)'),
        'Vouchers devem garantir unicidade de emissão por venda_origem_id',
      );
      assert.ok(
        script006.includes('empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT'),
        'Movimentações de estoque devem proteger empresa_id com ON DELETE RESTRICT',
      );
      assert.ok(
        script007.includes('empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT'),
        'Logs de auditoria devem proteger empresa_id com ON DELETE RESTRICT',
      );
    });

    // Cenário 5: Cancelamento de venda que utilizou voucher
    it('Cenário 5: Cancelamento de venda que utilizou voucher (rastreabilidade sem duplicação de crédito)', () => {
      const hist = criarHistoricoEstornoVendaComVoucher({
        empresaId: empresaA,
        filialId: 'filial-a1',
        voucherId: voucherBase.id,
        vendaId: 'venda-resgate-02',
        operadorId: 'user-gerente-01',
        justificativa: 'Cliente devolveu os itens da nova compra antes da emissão da NFC-e',
      });

      assert.equal(hist.operacao, 'ESTORNO_VENDA_RESGATE');
      assert.equal(hist.statusAnterior, 'UTILIZADO');
      assert.equal(hist.statusNovo, 'CANCELADO');
      assert.ok(hist.justificativa?.includes('Cliente devolveu'));
    });

    // Cenário 6: Integridade do pagamento complementar
    it('Cenário 6: Integridade do pagamento complementar e impacto no caixa', () => {
      // Compra de R$ 130,00 (13000 centavos) com voucher de R$ 100,00 (10000 centavos)
      const resgate = validarResgateVoucher(voucherBase, 13000, empresaA);
      assert.equal(resgate.valido, true);
      assert.equal(resgate.valorAbatidoCentavos, 10000);
      assert.equal(resgate.valorComplementarCentavos, 3000);

      // Verificação da soma exata (10000 + 3000 = 13000)
      assert.equal(resgate.valorAbatidoCentavos + resgate.valorComplementarCentavos, 13000);

      // Verificação contábil do caixa: Voucher tem impacto ZERO no dinheiro físico da gaveta
      const impactoCaixa = contabilizarImpactoCaixaVoucher(resgate.valorAbatidoCentavos);
      assert.equal(impactoCaixa.impactoDinheiroGavetaCentavos, 0, 'Voucher não é dinheiro físico');
      assert.equal(impactoCaixa.baixaObrigacoesVoucherCentavos, 10000, 'Liquidação contábil da obrigação');
    });

    // Cenário 7: Bloqueio de expiração automática sem prazo aprovado
    it('Cenário 7: Bloqueio de expiração automática (voucher emitido no passado permanece DISPONÍVEL)', () => {
      // voucherBase foi emitido em 2026-05-01 (mais de 180 dias atrás)
      const res = validarResgateVoucher(voucherBase, 10000, empresaA);
      assert.equal(
        res.valido,
        true,
        'Não há expiração automática arbitrária; voucher permanece disponível até política comercial formal',
      );
    });
  });
});
