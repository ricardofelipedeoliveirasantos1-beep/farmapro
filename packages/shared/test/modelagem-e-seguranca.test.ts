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
  Lote,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Testes da Etapa 03: Modelagem, Dados e Segurança Multiempresa', () => {
  // --------------------------------------------------------------------------
  // 1. CONSISTÊNCIA MONETÁRIA (Centavos Inteiros)
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
      assert.equal(validarCpf('11111111111'), false); // Dígitos repetidos
      assert.equal(validarCpf(''), false);
    });

    it('deve converter representações decimais e strings para centavos inteiros com precisão exata', () => {
      // Clássico problema IEEE 754: 0.1 + 0.2 = 0.30000000000000004
      const somaFlutuante = 0.1 + 0.2;
      const centavos = converterRealParaCentavos(somaFlutuante);
      assert.equal(centavos, 30); // 30 centavos exatos

      assert.equal(converterRealParaCentavos('R$ 49,90'), 4990);
      assert.equal(converterRealParaCentavos('12,50'), 1250);
      assert.equal(converterRealParaCentavos('0,05'), 5);
    });
  });

  // --------------------------------------------------------------------------
  // 2. ISOLAMENTO MULTIEMPRESA & TENANT CONTEXT
  // --------------------------------------------------------------------------
  describe('Isolamento Multiempresa e Validação de Contexto', () => {
    const empresaA = '11111111-1111-4111-a111-111111111111';
    const empresaB = '22222222-2222-4222-b222-222222222222';

    it('deve rejeitar acesso quando o solicitante pertencer a uma empresa diferente do recurso alvo', () => {
      const autorizado = validarIsolamentoTenant(empresaA, empresaB);
      assert.equal(autorizado, false, 'Empresa A NÃO pode acessar dados da Empresa B');
    });

    it('deve autorizar acesso quando o solicitante pertencer à mesma empresa do recurso', () => {
      const autorizado = validarIsolamentoTenant(empresaA, empresaA);
      assert.equal(autorizado, true, 'Empresa A pode acessar seus próprios recursos');
    });

    it('deve rejeitar contextos nulos ou indefinidos', () => {
      assert.equal(validarIsolamentoTenant(undefined, empresaA), false);
      assert.equal(validarIsolamentoTenant(empresaA, null), false);
      assert.equal(validarIsolamentoTenant('', ''), false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. RASTREABILIDADE DE LOTES, FEFO E CONTROLE DE VALIDADE
  // --------------------------------------------------------------------------
  describe('Rastreabilidade de Lotes e Regra FEFO (First Expired, First Out)', () => {
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
      assert.equal(ordenados[0]?.id, 'lote-1', 'Lote com validade em 2026 deve ser o primeiro');
      assert.equal(ordenados[1]?.id, 'lote-2', 'Lote com validade em 2027 deve ser o segundo');
      assert.equal(ordenados[2]?.id, 'lote-3', 'Lote com validade em 2028 deve ser o último');
    });

    it('deve segregar produtos vencidos e bloqueados, impedindo sua inclusão em vendáveis', () => {
      const dataHoje = new Date('2026-06-01'); // Após o vencimento do lote-1

      const resultado = classificarLotesValidade(lotesMock, dataHoje, 90);
      assert.equal(resultado.vencidos.length, 1, 'Lote-1 deve ser identificado como vencido');
      assert.equal(resultado.vencidos[0]?.numeroLote, 'LOTE-PROXIMO');
      assert.ok(!resultado.vendaveis.some(l => l.numeroLote === 'LOTE-PROXIMO'), 'Vencido NÃO pode ser vendável');
    });
  });

  // --------------------------------------------------------------------------
  // 4. IDEMPOTÊNCIA E RESILIÊNCIA OFFLINE
  // --------------------------------------------------------------------------
  describe('Idempotência de Operações Offline', () => {
    it('deve gerar exatamente a mesma chave de idempotência para o mesmo evento de venda', () => {
      const params = {
        empresaId: '11111111-1111-4111-a111-111111111111',
        filialId: '11111111-aaaa-4111-a111-111111111101',
        dispositivoId: 'term-caixa-01',
        numeroSequencial: '000042',
        idOfflineUuid: '99999999-9999-4999-a999-999999999999',
      };

      const chave1 = gerarChaveIdempotencia(params);
      const chave2 = gerarChaveIdempotencia(params);
      assert.equal(chave1, chave2, 'Chaves devem ser determinísticas');
      assert.ok(chave1.startsWith('IDMP-'));
    });

    it('deve gerar chaves distintas para vendas ou terminais diferentes', () => {
      const base = {
        empresaId: '11111111-1111-4111-a111-111111111111',
        filialId: '11111111-aaaa-4111-a111-111111111101',
        dispositivoId: 'term-caixa-01',
        numeroSequencial: '000042',
        idOfflineUuid: '99999999-9999-4999-a999-999999999999',
      };

      const chave1 = gerarChaveIdempotencia(base);
      const chave2 = gerarChaveIdempotencia({
        ...base,
        numeroSequencial: '000043',
        idOfflineUuid: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      });

      assert.notEqual(chave1, chave2);
    });
  });

  // --------------------------------------------------------------------------
  // 5. ANÁLISE ESTÁTICA DOS SCRIPTS SQL DE MIGRAÇÃO
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

    it('deve garantir que o script 008 aplique ENABLE ROW LEVEL SECURITY e FORCE ROW LEVEL SECURITY', () => {
      const conteudoScript008 = fs.readFileSync(
        path.join(diretorioMigracoes, '008_politicas_rls_e_seguranca.sql'),
        'utf-8',
      );

      assert.ok(
        conteudoScript008.includes('ENABLE ROW LEVEL SECURITY'),
        'Script 008 deve habilitar RLS',
      );
      assert.ok(
        conteudoScript008.includes('FORCE ROW LEVEL SECURITY'),
        'Script 008 deve forçar RLS contra bypass acidental',
      );
      assert.ok(
        conteudoScript008.includes('current_empresa_id()'),
        'Políticas RLS devem usar a função de sessão current_empresa_id()',
      );
    });
  });
});
