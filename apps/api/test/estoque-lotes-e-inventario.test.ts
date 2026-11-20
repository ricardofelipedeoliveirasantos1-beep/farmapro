import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { EstoqueService } from '../src/services/estoque.service.js';
import { VendasService } from '../src/services/vendas.service.js';
import { CaixaService } from '../src/services/caixa.service.js';
import { ContextoTenant } from '@farmapro/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Etapa 07: Gestão de Estoque, Lotes, Validade, FEFO e Inventário', () => {
  let db: PGlite;
  let poolAdapter: pg.Pool;

  // IDs Fictícios de Demonstração — Multiempresa
  const empresaAId = '11111111-1111-4111-a111-111111111111';
  const filialA1Id = '11111111-aaaa-4111-a111-aaaaaaaaaaaa';
  const filialA2Id = '11111111-bbbb-4111-a111-bbbbbbbbbbbb';
  const terminalA1Id = 'dddddddd-1111-4000-8000-000000000001';

  const empresaBId = '22222222-2222-4222-b222-222222222222';
  const filialB1Id = '22222222-aaaa-4222-b222-aaaaaaaaaaaa';

  const usuarioGerenteAId = 'aaaaaaaa-1111-4000-8000-000000000001';
  const usuarioFarmaceuticoAId = 'aaaaaaaa-2222-4000-8000-000000000002';
  const usuarioAtendenteAId = 'aaaaaaaa-3333-4000-8000-000000000003';
  const usuarioGerenteBId = 'bbbbbbbb-1111-4000-8000-000000000001';

  const prodParacetamolId = 'fa111111-1111-4000-8000-000000000001';
  const prodIbuprofenoId = 'fa222222-2222-4000-8000-000000000002';
  const prodOmeprazolId = 'fa333333-3333-4000-8000-000000000003';
  const prodDipironaBId = 'fa444444-4444-4000-8000-000000000004'; // Produto da Empresa B

  const tenantA: ContextoTenant = {
    empresaId: empresaAId,
    filialId: filialA1Id,
    usuarioId: usuarioGerenteAId,
  };

  const tenantB: ContextoTenant = {
    empresaId: empresaBId,
    filialId: filialB1Id,
    usuarioId: usuarioGerenteBId,
  };

  let caixaAbertoId: string;

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

    // 1. Executar as 11 migrações
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
    ];

    for (const arq of arquivosMigracao) {
      const sql = fs.readFileSync(path.join(migrationsDir, arq), 'utf-8');
      await db.exec(sql);
    }

    // 2. Carga inicial de dados fictícios
    await db.exec(`
      -- Empresas
      INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato)
      VALUES 
        ('${empresaAId}', 'Farma Teste Matriz A Ltda', 'Farmácia FarmaPro A', '11111111000111', 'contato@farma-a.com.br', '11999990001'),
        ('${empresaBId}', 'Farma Teste B Ltda', 'Drogaria B', '22222222000122', 'contato@farma-b.com.br', '11999990002')
      ON CONFLICT DO NOTHING;

      -- Filiais
      INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz)
      VALUES 
        ('${filialA1Id}', '${empresaAId}', 'FIL-01', 'Farma A Filial Centro', '11111111000111', 'Rua A', '100', 'Centro', 'São Paulo', 'SP', '01001000', '11988880001', true),
        ('${filialA2Id}', '${empresaAId}', 'FIL-02', 'Farma A Filial Bairro', '11111111000299', 'Av B', '200', 'Jardins', 'São Paulo', 'SP', '01002000', '11988880002', false),
        ('${filialB1Id}', '${empresaBId}', 'FIL-B1', 'Drogaria B Matriz', '22222222000122', 'Rua B', '500', 'Centro', 'Campinas', 'SP', '13000000', '11988880003', true)
      ON CONFLICT DO NOTHING;

      -- Usuários
      INSERT INTO usuarios (id, nome, email, hash_senha, cpf, status)
      VALUES 
        ('${usuarioGerenteAId}', 'Carlos Gerente A', 'gerente@farma-a.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '11111111111', 'ATIVO'),
        ('${usuarioFarmaceuticoAId}', 'Ana Farmaceutica A', 'farmacia@farma-a.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '22222222222', 'ATIVO'),
        ('${usuarioAtendenteAId}', 'Bruno Atendente A', 'atendente@farma-a.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '33333333333', 'ATIVO'),
        ('${usuarioGerenteBId}', 'Marcos Gerente B', 'gerente@farma-b.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '44444444444', 'ATIVO')
      ON CONFLICT DO NOTHING;

      -- Terminais
      INSERT INTO dispositivos_autorizados (id, empresa_id, filial_id, identificador_hardware, nome_terminal, numero_serie_caixa, tipo_dispositivo, ativo, token_acesso_hash)
      VALUES 
        ('${terminalA1Id}', '${empresaAId}', '${filialA1Id}', 'HW-POS-A1', 'Terminal PDV 01', 'CX-001', 'DESKTOP_PDV', true, 'hash-token-terminal-01')
      ON CONFLICT DO NOTHING;

      -- Produtos
      INSERT INTO produtos (id, empresa_id, nome_comercial, nome_generico, fabricante, apresentacao, unidade_medida, tipo_produto, fracionavel, status)
      VALUES 
        ('${prodParacetamolId}', '${empresaAId}', 'Paracetamol 750mg', 'Paracetamol', 'EMS', '20 Comprimidos', 'CX', 'MEDICAMENTO_MIP', false, 'ATIVO'),
        ('${prodIbuprofenoId}', '${empresaAId}', 'Ibuprofeno 600mg', 'Ibuprofeno', 'Medley', '30 Cápsulas', 'CX', 'MEDICAMENTO_GENERICO', false, 'ATIVO'),
        ('${prodOmeprazolId}', '${empresaAId}', 'Omeprazol 20mg', 'Omeprazol', 'Eurofarma', '28 Cápsulas', 'CX', 'MEDICAMENTO_GENERICO', false, 'ATIVO'),
        ('${prodDipironaBId}', '${empresaBId}', 'Dipirona 500mg', 'Dipirona Sódica', 'Neo Química', '10 Comprimidos', 'BL', 'MEDICAMENTO_MIP', false, 'ATIVO')
      ON CONFLICT DO NOTHING;

      -- Produtos Filiais
      INSERT INTO produtos_filiais (empresa_id, filial_id, produto_id, preco_custo_centavos, preco_venda_centavos, estoque_minimo, estoque_maximo)
      VALUES 
        ('${empresaAId}', '${filialA1Id}', '${prodParacetamolId}', 500, 1500, 10, 100),
        ('${empresaAId}', '${filialA1Id}', '${prodIbuprofenoId}', 800, 2400, 15, 120),
        ('${empresaAId}', '${filialA1Id}', '${prodOmeprazolId}', 600, 1800, 5, 50),
        ('${empresaBId}', '${filialB1Id}', '${prodDipironaBId}', 400, 1000, 10, 80)
      ON CONFLICT DO NOTHING;
    `);

    // Abertura de sessão de caixa para testes de venda
    const sessaoCaixa = await CaixaService.abrirCaixa(
      poolAdapter,
      {
        filialId: filialA1Id,
        dispositivoId: terminalA1Id,
        saldoInicialCentavos: 10000, // R$ 100,00
      },
      tenantA,
      usuarioGerenteAId,
    );
    caixaAbertoId = sessaoCaixa.id;
  });

  // ============================================================================
  // 17 CENÁRIOS OBRIGATÓRIOS DA ETAPA 07
  // ============================================================================

  it('01. Entrada de mercadoria: registra lote com quantidade e atualiza estoque consolidado', async () => {
    const res = await EstoqueService.registrarEntradaMercadoria(
      poolAdapter,
      {
        filialId: filialA1Id,
        produtoId: prodParacetamolId,
        numeroLote: 'LOTE-PARA-2026-01',
        dataFabricacao: '2026-01-10',
        dataValidade: '2027-12-31',
        quantidade: 50,
        custoUnitarioCentavos: 500,
        motivo: 'Entrada inicial de estoque fornecedor',
      },
      tenantA,
      usuarioGerenteAId,
    );

    assert.equal(res.sucesso, true);
    assert.ok(res.loteId);
    assert.ok(res.movimentoId);

    // Verificar se o saldo físico no estoque_saldos foi atualizado para 50
    const resSaldo = await poolAdapter.query(
      `SELECT quantidade_fisica, quantidade_disponivel FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2`,
      [filialA1Id, prodParacetamolId],
    );
    assert.equal(Number(resSaldo.rows[0]?.quantidade_fisica), 50);
    assert.equal(Number(resSaldo.rows[0]?.quantidade_disponivel), 50);
  });

  it('02. Saída de mercadoria: realiza saída autorizada com baixa física e do lote', async () => {
    const resSaida = await EstoqueService.registrarSaidaMercadoria(
      poolAdapter,
      {
        filialId: filialA1Id,
        produtoId: prodParacetamolId,
        quantidade: 5,
        motivo: 'Retirada para uso interno ou controle de qualidade',
        tipoSaida: 'SAIDA_AVULSA',
      },
      tenantA,
      usuarioGerenteAId,
    );

    assert.equal(resSaida.sucesso, true);

    const resSaldo = await poolAdapter.query(
      `SELECT quantidade_fisica, quantidade_disponivel FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2`,
      [filialA1Id, prodParacetamolId],
    );
    // 50 - 5 = 45
    assert.equal(Number(resSaldo.rows[0]?.quantidade_fisica), 45);
    assert.equal(Number(resSaldo.rows[0]?.quantidade_disponivel), 45);
  });

  it('03. Ajuste autorizado: aplica acréscimo com justificativa obrigatória e audita movimentação', async () => {
    const resAjuste = await EstoqueService.ajustarEstoque(
      poolAdapter,
      {
        filialId: filialA1Id,
        produtoId: prodParacetamolId,
        quantidadeAjuste: 10,
        justificativa: 'Conferência manual identificou 10 caixas sobressalentes no armário B',
      },
      tenantA,
      usuarioGerenteAId,
    );

    assert.equal(resAjuste.sucesso, true);
    assert.equal(resAjuste.novoSaldo, 55); // 45 + 10 = 55
  });

  it('04. Bloqueio de ajuste sem justificativa: rejeita ajuste com justificativa curta ou ausente', async () => {
    await assert.rejects(
      async () => {
        await EstoqueService.ajustarEstoque(
          poolAdapter,
          {
            filialId: filialA1Id,
            produtoId: prodParacetamolId,
            quantidadeAjuste: 5,
            justificativa: '', // Justificativa vazia
          },
          tenantA,
          usuarioGerenteAId,
        );
      },
      {
        message: /justificativa detalhada/i,
      },
    );
  });

  it('05. Consulta de estoque por filial: retorna saldos específicos e isolamento de filial', async () => {
    const lista = await EstoqueService.listarProdutosEstoque(
      poolAdapter,
      empresaAId,
      filialA1Id,
      { termoBusca: 'Paracetamol' },
    );

    assert.equal(lista.length, 1);
    const item = lista[0]!;
    assert.equal(item.produtoId, prodParacetamolId);
    assert.equal(item.quantidadeFisica, 55);
    assert.equal(item.alertaEstoque, 'NORMAL'); // 55 > estoque_minimo (10)
  });

  it('06. Isolamento entre empresas: Empresa B não pode visualizar ou movimentar o estoque da Empresa A', async () => {
    // Empresa B tentando listar produtos com filial da Empresa A
    const listaB = await EstoqueService.listarProdutosEstoque(
      poolAdapter,
      empresaBId,
      filialB1Id,
    );

    // Empresa B deve enxergar apenas o produto da Empresa B (Dipirona)
    assert.ok(listaB.every(p => p.empresaId === empresaBId));
    assert.ok(!listaB.some(p => p.produtoId === prodParacetamolId));

    // Empresa B tentando dar saída em produto da Empresa A
    await assert.rejects(
      async () => {
        await EstoqueService.registrarSaidaMercadoria(
          poolAdapter,
          {
            filialId: filialB1Id,
            produtoId: prodParacetamolId,
            quantidade: 1,
            motivo: 'Tentativa indevida de saída cruzada entre tenants',
            tipoSaida: 'SAIDA_AVULSA',
          },
          tenantB,
          usuarioGerenteBId,
        );
      },
      {
        message: /não possui registro de saldo/i,
      },
    );
  });

  it('07. Controle de lotes: cadastra novos lotes e gerencia datas de validade', async () => {
    const resLote = await EstoqueService.cadastrarLote(
      poolAdapter,
      {
        filialId: filialA1Id,
        produtoId: prodIbuprofenoId,
        numeroLote: 'LOTE-IBU-2027-01',
        dataFabricacao: '2026-02-01',
        dataValidade: '2027-06-30',
        quantidade: 40,
        custoUnitarioCentavos: 800,
      },
      tenantA,
      usuarioFarmaceuticoAId,
    );

    assert.equal(resLote.sucesso, true);
    assert.ok(resLote.loteId);

    const lotes = await EstoqueService.listarLotesProduto(
      poolAdapter,
      empresaAId,
      filialA1Id,
      prodIbuprofenoId,
    );

    assert.equal(lotes.length, 1);
    assert.equal(lotes[0]?.numeroLote, 'LOTE-IBU-2027-01');
    assert.equal(lotes[0]?.quantidadeDisponivel, 40);
  });

  it('08. Priorização FEFO: seleciona estritamente o lote com vencimento mais próximo', async () => {
    // Cadastrar 3 lotes com validades distintas para Omeprazol
    // Lote 1: Validade 2026-12-10 (Mais próximo)
    await EstoqueService.cadastrarLote(
      poolAdapter,
      {
        filialId: filialA1Id,
        produtoId: prodOmeprazolId,
        numeroLote: 'LOTE-OME-DEZ-2026',
        dataValidade: '2026-12-10',
        quantidade: 10,
        custoUnitarioCentavos: 600,
      },
      tenantA,
      usuarioFarmaceuticoAId,
    );

    // Lote 2: Validade 2027-01-20
    await EstoqueService.cadastrarLote(
      poolAdapter,
      {
        filialId: filialA1Id,
        produtoId: prodOmeprazolId,
        numeroLote: 'LOTE-OME-JAN-2027',
        dataValidade: '2027-01-20',
        quantidade: 20,
        custoUnitarioCentavos: 600,
      },
      tenantA,
      usuarioFarmaceuticoAId,
    );

    // Lote 3: Validade 2027-03-15
    await EstoqueService.cadastrarLote(
      poolAdapter,
      {
        filialId: filialA1Id,
        produtoId: prodOmeprazolId,
        numeroLote: 'LOTE-OME-MAR-2027',
        dataValidade: '2027-03-15',
        quantidade: 30,
        custoUnitarioCentavos: 600,
      },
      tenantA,
      usuarioFarmaceuticoAId,
    );

    // Alocar 15 unidades via FEFO
    const alocacoes = await EstoqueService.selecionarLotesFEFO(
      poolAdapter,
      empresaAId,
      filialA1Id,
      prodOmeprazolId,
      15,
    );

    assert.equal(alocacoes.length, 2);
    // Primeiro lote deve ser o DEZ-2026 (10 unidades completas)
    assert.equal(alocacoes[0]?.numeroLote, 'LOTE-OME-DEZ-2026');
    assert.equal(alocacoes[0]?.quantidadeAlocada, 10);
    // Segundo lote deve ser o JAN-2027 (5 unidades restantes)
    assert.equal(alocacoes[1]?.numeroLote, 'LOTE-OME-JAN-2027');
    assert.equal(alocacoes[1]?.quantidadeAlocada, 5);
  });

  it('09. Bloqueio de lote vencido: lotes com validade expirada são ignorados pelo FEFO e não podem ser vendidos', async () => {
    // Inserir lote vencido diretamente para teste
    const loteVencidoId = 'fb999999-1111-4000-8000-000000000001';
    await poolAdapter.query(
      `INSERT INTO lotes (
        id, empresa_id, filial_id, produto_id, numero_lote, data_fabricacao, data_validade,
        quantidade_recebida, quantidade_disponivel, status, custo_unitario_centavos
      ) VALUES ($1, $2, $3, $4, 'LOTE-VENCIDO-ANVISA', '2023-01-01', '2024-01-01', 50, 50, 'VENCIDO', 500)`,
      [loteVencidoId, empresaAId, filialA1Id, prodParacetamolId],
    );

    // Tentar alocar FEFO em quantidade que exigiria o lote vencido caso este fosse considerado
    const alocacoes = await EstoqueService.selecionarLotesFEFO(
      poolAdapter,
      empresaAId,
      filialA1Id,
      prodParacetamolId,
      30,
    );

    // O lote vencido JAMAIS deve ser retornado
    assert.ok(alocacoes.every(a => a.loteId !== loteVencidoId));
  });

  it('10. Bloqueio de lote em quarentena: lotes em quarentena ou bloqueados não são alocados', async () => {
    const loteQuarentenaId = 'fb888888-1111-4000-8000-000000000001';
    await poolAdapter.query(
      `INSERT INTO lotes (
        id, empresa_id, filial_id, produto_id, numero_lote, data_fabricacao, data_validade,
        quantidade_recebida, quantidade_disponivel, status, custo_unitario_centavos, motivo_bloqueio
      ) VALUES ($1, $2, $3, $4, 'LOTE-QUARENTENA-01', '2026-01-01', '2028-01-01', 30, 30, 'QUARENTENA', 800, 'Aguardando laudo de controle de qualidade')`,
      [loteQuarentenaId, empresaAId, filialA1Id, prodIbuprofenoId],
    );

    const alocacoes = await EstoqueService.selecionarLotesFEFO(
      poolAdapter,
      empresaAId,
      filialA1Id,
      prodIbuprofenoId,
      30,
    );

    // Deve alocar apenas do lote ativo LOTE-IBU-2027-01
    assert.ok(alocacoes.every(a => a.loteId !== loteQuarentenaId));
  });

  it('11. Inventário sem aprovação: contagem física registrada NÃO altera diretamente o estoque', async () => {
    // 1. Criar inventário
    const inv = await EstoqueService.criarInventario(
      poolAdapter,
      {
        filialId: filialA1Id,
        descricao: 'Inventário Geral Mensal Farmácia Centro',
        tipoInventario: 'GERAL',
      },
      tenantA,
      usuarioFarmaceuticoAId,
    );

    assert.ok(inv.id);
    assert.equal(inv.status, 'EM_ANDAMENTO');

    // Buscar o item do Paracetamol no inventário
    const resItens = await poolAdapter.query<{ id: string; quantidade_sistema: string }>(
      `SELECT id, quantidade_sistema FROM inventario_itens WHERE inventario_id = $1 AND produto_id = $2`,
      [inv.id, prodParacetamolId],
    );
    assert.ok(resItens.rows.length > 0);
    const itemInv = resItens.rows[0]!;

    // 2. Registrar contagem física com divergência (contou 50 em vez do sistema que tinha 45 no lote)
    const resContagem = await EstoqueService.registrarContagemInventario(
      poolAdapter,
      {
        inventarioId: inv.id,
        contagens: [
          {
            itemId: itemInv.id,
            quantidadeContada: 50,
            justificativa: 'Encontradas 5 caixas adicionais na prateleira superior',
          },
        ],
      },
      tenantA,
      usuarioAtendenteAId,
    );

    assert.equal(resContagem.sucesso, true);
    assert.equal(resContagem.divergenciasEncontradas, 1);

    // 3. VERIFICAÇÃO CRÍTICA: O saldo no estoque_saldos AINDA DEVE SER 55 (NÃO PODE ALTERAR ANTES DA APROVAÇÃO)
    const resSaldo = await poolAdapter.query(
      `SELECT quantidade_fisica FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2`,
      [filialA1Id, prodParacetamolId],
    );
    assert.equal(Number(resSaldo.rows[0]?.quantidade_fisica), 55);
  });

  it('12. Aprovação de divergência: aplica o ajuste formal no estoque e consolida inventário', async () => {
    // Obter o inventário em status AGUARDANDO_APROVACAO
    const resInv = await poolAdapter.query<{ id: string }>(
      `SELECT id FROM inventarios WHERE filial_id = $1 AND status = 'AGUARDANDO_APROVACAO' LIMIT 1`,
      [filialA1Id],
    );
    const invId = resInv.rows[0]!.id;

    // Aprovação formal pelo gerente
    const resAprovacao = await EstoqueService.aprovarInventario(
      poolAdapter,
      {
        inventarioId: invId,
        justificativaGeral: 'Divergência auditada e confirmada fisicamente pelo farmacêutico responsável',
      },
      tenantA,
      usuarioGerenteAId,
    );

    assert.equal(resAprovacao.sucesso, true);
    assert.ok(resAprovacao.itensAjustados >= 1);

    // Agora o saldo DEVE ter sido atualizado para 60!
    const resSaldo = await poolAdapter.query(
      `SELECT quantidade_fisica FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2`,
      [filialA1Id, prodParacetamolId],
    );
    assert.equal(Number(resSaldo.rows[0]?.quantidade_fisica), 60);

    // O inventário deve estar com status CONCLUIDO_APROVADO
    const resStatusInv = await poolAdapter.query(
      `SELECT status FROM inventarios WHERE id = $1`,
      [invId],
    );
    assert.equal(resStatusInv.rows[0]?.status, 'CONCLUIDO_APROVADO');
  });

  it('13. Histórico de movimentações: extrato do Livro-Razão registra entradas, saídas e ajustes com integridade', async () => {
    const movs = await EstoqueService.listarMovimentacoes(
      poolAdapter,
      empresaAId,
      filialA1Id,
      { produtoId: prodParacetamolId },
    );

    assert.ok(movs.length >= 3);
    // Cada movimento possui campos obrigatórios
    for (const mov of movs) {
      assert.ok(mov.id);
      assert.ok(mov.tipoMovimentacao);
      assert.ok(mov.usuarioId);
      assert.ok(mov.dataHoraMovimento);
      assert.notEqual(mov.saldoAnterior, undefined);
      assert.notEqual(mov.saldoPosterior, undefined);
    }

    const tipos = movs.map(m => m.tipoMovimentacao);
    assert.ok(tipos.includes('ENTRADA_AVULSA'));
    assert.ok(tipos.includes('SAIDA_AVULSA'));
    assert.ok(tipos.includes('AJUSTE_POSITIVO_INVENTARIO') || tipos.includes('AJUSTE_MANUAL_POSITIVO'));
  });

  it('14. Venda com baixa do lote correto via FEFO: venda no PDV consome do lote com validade mais próxima', async () => {
    // Realizar venda de 2 unidades de Omeprazol via VendasService
    // Relembrando: temos LOTE-OME-DEZ-2026 (vencimento 10/12/2026) e LOTE-OME-JAN-2027 (20/01/2027)
    const venda = await VendasService.criarVenda(
      poolAdapter,
      {
        caixaSessaoId: caixaAbertoId,
        itens: [
          {
            produtoId: prodOmeprazolId,
            quantidade: 2,
            precoUnitarioCentavos: 1800,
          },
        ],
        pagamentos: [
          {
            formaPagamento: 'DINHEIRO',
            valorCentavos: 3600,
            valorRecebidoCentavos: 3600,
          },
        ],
      },
      tenantA,
      usuarioAtendenteAId,
    );

    assert.equal(venda.status, 'CONCLUIDA');

    // Verificar se o item da venda pegou o lote com vencimento mais próximo (DEZ-2026)
    const resItemVenda = await poolAdapter.query<{ lote_id: string }>(
      `SELECT lote_id FROM venda_itens WHERE venda_id = $1`,
      [venda.id],
    );

    const loteUtilizadoId = resItemVenda.rows[0]?.lote_id;
    assert.ok(loteUtilizadoId);

    const resLote = await poolAdapter.query<{ numero_lote: string }>(
      `SELECT numero_lote FROM lotes WHERE id = $1`,
      [loteUtilizadoId],
    );
    assert.equal(resLote.rows[0]?.numero_lote, 'LOTE-OME-DEZ-2026');
  });

  it('15. Cancelamento de venda com rastreabilidade de lote: devolve ao lote exato que originou a saída', async () => {
    // Buscar a venda anterior de Omeprazol
    const resVenda = await poolAdapter.query<{ id: string }>(
      `SELECT id FROM vendas WHERE filial_id = $1 AND status = 'CONCLUIDA' ORDER BY criado_em DESC LIMIT 1`,
      [filialA1Id],
    );
    const vendaId = resVenda.rows[0]!.id;

    // Verificar saldo do lote antes do cancelamento
    const resLoteAntes = await poolAdapter.query<{ quantidade_disponivel: string }>(
      `SELECT quantidade_disponivel FROM lotes WHERE numero_lote = 'LOTE-OME-DEZ-2026'`,
    );
    const qtdAntes = Number(resLoteAntes.rows[0]?.quantidade_disponivel);

    // Cancelar a venda
    const cancelamento = await VendasService.cancelarVenda(
      poolAdapter,
      {
        vendaId,
        motivo: 'Cliente desistiu da compra antes de sair da farmácia',
        gerarVoucher: false,
      },
      tenantA,
      usuarioGerenteAId,
    );

    assert.equal(cancelamento.venda.status, 'CANCELADA');

    // Verificar se a quantidade foi devolvida ao lote exato
    const resLoteDepois = await poolAdapter.query<{ quantidade_disponivel: string }>(
      `SELECT quantidade_disponivel FROM lotes WHERE numero_lote = 'LOTE-OME-DEZ-2026'`,
    );
    const qtdDepois = Number(resLoteDepois.rows[0]?.quantidade_disponivel);
    assert.equal(qtdDepois, qtdAntes + 2);

    // Verificar se o Livro-Razão registrou ESTORNO_CANCELAMENTO_VENDA
    const resMov = await poolAdapter.query(
      `SELECT tipo_movimentacao FROM estoque_movimentacoes WHERE origem_documento_id = $1 AND tipo_movimentacao = 'ESTORNO_CANCELAMENTO_VENDA'`,
      [vendaId],
    );
    assert.equal(resMov.rows.length, 1);
  });

  it('16. Concorrência de movimentações simultâneas: locks pessimistas evitam concorrência suja', async () => {
    // Inserir saldo inicial de 10 unidades
    const prodConcorrenteId = 'fa555555-5555-4000-8000-000000000005';
    await poolAdapter.query(
      `INSERT INTO produtos (id, empresa_id, nome_comercial, fabricante, apresentacao, unidade_medida, tipo_produto, status)
       VALUES ($1, $2, 'Complexo B', 'Neo Química', '100 Drágeas', 'FR', 'SUPLEMENTO_ALIMENTAR', 'ATIVO')`,
      [prodConcorrenteId, empresaAId],
    );
    await poolAdapter.query(
      `INSERT INTO produtos_filiais (empresa_id, filial_id, produto_id, preco_custo_centavos, preco_venda_centavos, estoque_minimo, estoque_maximo)
       VALUES ($1, $2, $3, 300, 1000, 5, 50)`,
      [empresaAId, filialA1Id, prodConcorrenteId],
    );

    await EstoqueService.registrarEntradaMercadoria(
      poolAdapter,
      {
        filialId: filialA1Id,
        produtoId: prodConcorrenteId,
        numeroLote: 'LOTE-CONC-01',
        dataValidade: '2028-01-01',
        quantidade: 10,
        custoUnitarioCentavos: 300,
      },
      tenantA,
      usuarioGerenteAId,
    );

    // Duas saídas simultâneas de 6 unidades quando só existem 10
    // Uma deve passar (saldo fica 4) e a outra deve falhar com estoque insuficiente
    const promessas = [
      EstoqueService.registrarSaidaMercadoria(
        poolAdapter,
        {
          filialId: filialA1Id,
          produtoId: prodConcorrenteId,
          quantidade: 6,
          motivo: 'Saída simultânea 1',
          tipoSaida: 'SAIDA_AVULSA',
        },
        tenantA,
        usuarioGerenteAId,
      ),
      EstoqueService.registrarSaidaMercadoria(
        poolAdapter,
        {
          filialId: filialA1Id,
          produtoId: prodConcorrenteId,
          quantidade: 6,
          motivo: 'Saída simultânea 2',
          tipoSaida: 'SAIDA_AVULSA',
        },
        tenantA,
        usuarioFarmaceuticoAId,
      ),
    ];

    const resultados = await Promise.allSettled(promessas);
    const sucessos = resultados.filter(r => r.status === 'fulfilled');
    const falhas = resultados.filter(r => r.status === 'rejected');

    assert.equal(sucessos.length, 1);
    assert.equal(falhas.length, 1);

    // Saldo final deve ser exatamente 4
    const resSaldo = await poolAdapter.query(
      `SELECT quantidade_fisica FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2`,
      [filialA1Id, prodConcorrenteId],
    );
    assert.equal(Number(resSaldo.rows[0]?.quantidade_fisica), 4);
  });

  it('17. Bloqueio de estoque negativo: qualquer tentativa de saída ou ajuste que resulte em saldo menor que zero é rejeitada', async () => {
    // Tentativa de saída de 100 unidades quando só existem 4
    const prodConcorrenteId = 'fa555555-5555-4000-8000-000000000005';
    await assert.rejects(
      async () => {
        await EstoqueService.registrarSaidaMercadoria(
          poolAdapter,
          {
            filialId: filialA1Id,
            produtoId: prodConcorrenteId,
            quantidade: 100,
            motivo: 'Tentativa forçada de saldo negativo',
            tipoSaida: 'SAIDA_AVULSA',
          },
          tenantA,
          usuarioGerenteAId,
        );
      },
      {
        message: /não permite estoque negativo/i,
      },
    );

    // Tentativa de ajuste negativo de -50 unidades
    await assert.rejects(
      async () => {
        await EstoqueService.ajustarEstoque(
          poolAdapter,
          {
            filialId: filialA1Id,
            produtoId: prodConcorrenteId,
            quantidadeAjuste: -50,
            justificativa: 'Tentativa de ajuste negativo abusivo',
          },
          tenantA,
          usuarioGerenteAId,
        );
      },
      {
        message: /proíbe estoque negativo/i,
      },
    );
  });
});
