import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { ComprasService, validarCnpj } from '../src/services/compras.service.js';
import { ContextoTenant } from '@farmapro/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Etapa 08: Fornecedores, Solicitações e Pedidos de Compra', () => {
  let db: PGlite;
  let poolAdapter: pg.Pool;

  // IDs Fictícios de Demonstração — Multiempresa
  const empresaAId = '11111111-1111-4111-a111-111111111111';
  const filialA1Id = '11111111-aaaa-4111-a111-aaaaaaaaaaaa';
  const filialA2Id = '11111111-bbbb-4111-a111-bbbbbbbbbbbb';

  const empresaBId = '22222222-2222-4222-b222-222222222222';
  const filialB1Id = '22222222-aaaa-4222-b222-aaaaaaaaaaaa';

  const usuarioDiretorAId = 'aaaaaaaa-1111-4000-8000-000000000001';
  const usuarioGerenteAId = 'aaaaaaaa-2222-4000-8000-000000000002';
  const usuarioFarmaceuticoAId = 'aaaaaaaa-3333-4000-8000-000000000003';
  const usuarioGerenteBId = 'bbbbbbbb-1111-4000-8000-000000000001';

  const prodDipironaId = 'fa111111-1111-4000-8000-000000000001';
  const prodAmoxicilinaId = 'fa222222-2222-4000-8000-000000000002';
  const prodOmeprazolId = 'fa333333-3333-4000-8000-000000000003';
  const prodEmpresaBId = 'fa444444-4444-4000-8000-000000000004';

  const tenantA: ContextoTenant = {
    empresaId: empresaAId,
    filialId: filialA1Id,
    usuarioId: usuarioDiretorAId,
  };

  const tenantB: ContextoTenant = {
    empresaId: empresaBId,
    filialId: filialB1Id,
    usuarioId: usuarioGerenteBId,
  };

  // CNPJs válidos de teste gerados conforme algoritmo oficial
  const cnpjDistribuidoraMedicamentos = '11222333000181'; // CNPJ matematicamente válido
  const cnpjLaboratorioNacional = '44555666000181'; // CNPJ matematicamente válido
  const cnpjDrogasBrasil = '77888999000181'; // CNPJ matematicamente válido
  const cnpjEmpresaB = '99888777000100'; // CNPJ matematicamente válido

  let fornecedorA1Id: string;
  let fornecedorA2Id: string;
  let fornecedorPendenteId: string;
  let solicitacaoA1Id: string;
  let solicitacaoA2Id: string;
  let pedidoCriadoId: string;

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

    // 1. Executar as 12 migrações estruturais
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
    ];

    for (const arq of arquivosMigracao) {
      const sql = fs.readFileSync(path.join(migrationsDir, arq), 'utf-8');
      await db.exec(sql);
    }

    // 2. Carga inicial de dados fictícios para teste
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
        ('${usuarioDiretorAId}', 'Carlos Diretor A', 'diretor@farma-a.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '11111111111', 'ATIVO'),
        ('${usuarioGerenteAId}', 'Mariana Gerente A', 'gerente@farma-a.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '22222222222', 'ATIVO'),
        ('${usuarioFarmaceuticoAId}', 'Lucas Farmacêutico A', 'farmacia@farma-a.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '33333333333', 'ATIVO'),
        ('${usuarioGerenteBId}', 'Pedro Gerente B', 'gerente@farma-b.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '44444444444', 'ATIVO')
      ON CONFLICT DO NOTHING;

      -- Produtos
      INSERT INTO produtos (id, empresa_id, nome_comercial, nome_generico, fabricante, apresentacao, unidade_medida, tipo_produto, fracionavel, status)
      VALUES 
        ('${prodDipironaId}', '${empresaAId}', 'Dipirona 500mg', 'Dipirona', 'Medley', '20 Comprimidos', 'CX', 'MEDICAMENTO_MIP', false, 'ATIVO'),
        ('${prodAmoxicilinaId}', '${empresaAId}', 'Amoxicilina 500mg', 'Amoxicilina', 'EMS', '21 Cápsulas', 'CX', 'MEDICAMENTO_GENERICO', false, 'ATIVO'),
        ('${prodOmeprazolId}', '${empresaAId}', 'Omeprazol 20mg', 'Omeprazol', 'Eurofarma', '28 Cápsulas', 'CX', 'MEDICAMENTO_GENERICO', false, 'ATIVO'),
        ('${prodEmpresaBId}', '${empresaBId}', 'Produto Exclusivo B', 'Produto B', 'Lab B', '1 Frasco', 'UN', 'MEDICAMENTO_GENERICO', false, 'ATIVO')
      ON CONFLICT DO NOTHING;

      -- Produtos Filiais e Estoque Inicial
      INSERT INTO produtos_filiais (empresa_id, filial_id, produto_id, preco_custo_centavos, preco_venda_centavos, estoque_minimo, estoque_maximo)
      VALUES 
        ('${empresaAId}', '${filialA1Id}', '${prodDipironaId}', 400, 1000, 20, 200),
        ('${empresaAId}', '${filialA1Id}', '${prodAmoxicilinaId}', 1200, 2500, 10, 100),
        ('${empresaAId}', '${filialA2Id}', '${prodDipironaId}', 400, 1000, 15, 150),
        ('${empresaAId}', '${filialA2Id}', '${prodOmeprazolId}', 600, 1500, 10, 80),
        ('${empresaBId}', '${filialB1Id}', '${prodEmpresaBId}', 500, 1200, 10, 100)
      ON CONFLICT DO NOTHING;

      INSERT INTO estoque_saldos (empresa_id, filial_id, produto_id, quantidade_fisica, quantidade_reservada)
      VALUES 
        ('${empresaAId}', '${filialA1Id}', '${prodDipironaId}', 50, 0),
        ('${empresaAId}', '${filialA1Id}', '${prodAmoxicilinaId}', 30, 0),
        ('${empresaAId}', '${filialA2Id}', '${prodDipironaId}', 40, 0),
        ('${empresaAId}', '${filialA2Id}', '${prodOmeprazolId}', 25, 0),
        ('${empresaBId}', '${filialB1Id}', '${prodEmpresaBId}', 80, 0)
      ON CONFLICT DO NOTHING;
    `);
  });

  // ============================================================================
  // CENÁRIO 01: CADASTRO DE FORNECEDOR
  // ============================================================================
  it('01. Cadastro de fornecedor: cadastra fornecedor ativo com validação de campos e condições comerciais', async () => {
    const fornecedor = await ComprasService.cadastrarFornecedor(poolAdapter, tenantA, {
      razaoSocial: 'Distribuidora Farmacêutica Central Ltda',
      nomeFantasia: 'FarmaCentral Distribuição',
      cnpj: cnpjDistribuidoraMedicamentos,
      inscricaoEstadual: '123.456.789.110',
      email: 'comercial@farmacentral.com.br',
      telefone: '1133334444',
      contatoPrincipalNome: 'Roberto Vendas',
      contatoPrincipalCargo: 'Gerente Comercial',
      contatoPrincipalTelefone: '11988887777',
      contatoPrincipalEmail: 'roberto@farmacentral.com.br',
      logradouro: 'Avenida Industrial',
      numero: '1500',
      bairro: 'Polo Farmacêutico',
      cidade: 'Barueri',
      uf: 'SP',
      cep: '06400000',
      condicoesComerciais: 'FOB, pagamento 28/56 dias, pedido mínimo R$ 1.000,00',
      prazoEntregaDias: 3,
      dadosBancarios: {
        banco: 'Banco do Brasil (001)',
        agencia: '1234-5',
        conta: '98765-4',
        chavePix: cnpjDistribuidoraMedicamentos,
        tipoChavePix: 'CNPJ',
      },
      observacoes: 'Fornecedor homologado para antibióticos e analgésicos.',
    });

    assert.ok(fornecedor.id);
    assert.equal(fornecedor.empresaId, empresaAId);
    assert.equal(fornecedor.cnpj, cnpjDistribuidoraMedicamentos);
    assert.equal(fornecedor.status, 'ATIVO');
    assert.equal(fornecedor.prazoEntregaDias, 3);
    assert.equal(fornecedor.contatoPrincipal?.nome, 'Roberto Vendas');
    assert.equal(fornecedor.dadosBancarios?.banco, 'Banco do Brasil (001)');

    fornecedorA1Id = fornecedor.id;
  });

  // ============================================================================
  // CENÁRIO 02: VALIDAÇÃO DE CNPJ
  // ============================================================================
  it('02. Validação de CNPJ: aceita CNPJ válido com 14 dígitos e rejeita CNPJs matematicamente inválidos ou falsos', async () => {
    // 1. Testa utilitário diretamente
    assert.equal(validarCnpj('11222333000181'), true);
    assert.equal(validarCnpj('11.222.333/0001-81'), true);
    assert.equal(validarCnpj('11111111111111'), false); // Dígitos repetidos
    assert.equal(validarCnpj('11222333000199'), false); // Dígito verificador incorreto
    assert.equal(validarCnpj('12345'), false); // Tamanho inválido

    // 2. Testa serviço rejeitando CNPJ inválido
    await assert.rejects(
      async () => {
        await ComprasService.cadastrarFornecedor(poolAdapter, tenantA, {
          razaoSocial: 'Fornecedor CNPJ Falso',
          nomeFantasia: 'Falso',
          cnpj: '11222333000199', // Inválido
        });
      },
      {
        message: /é inválido segundo as regras da Receita Federal/,
      },
    );
  });

  // ============================================================================
  // CENÁRIO 03: BLOQUEIO DE FORNECEDOR DUPLICADO
  // ============================================================================
  it('03. Bloqueio de fornecedor duplicado: impede cadastro de dois fornecedores com o mesmo CNPJ na mesma empresa', async () => {
    await assert.rejects(
      async () => {
        await ComprasService.cadastrarFornecedor(poolAdapter, tenantA, {
          razaoSocial: 'Tentativa Duplicada',
          nomeFantasia: 'Duplicado',
          cnpj: cnpjDistribuidoraMedicamentos, // Já cadastrado na Empresa A
        });
      },
      {
        message: /Já existe um fornecedor cadastrado com o CNPJ/,
      },
    );
  });

  // ============================================================================
  // CENÁRIO 04: SOLICITAÇÃO DE NOVO FORNECEDOR
  // ============================================================================
  it('04. Solicitação de novo fornecedor: cria fornecedor com status PENDENTE_APROVACAO aguardando análise', async () => {
    const fornecedorPendente = await ComprasService.cadastrarFornecedor(poolAdapter, tenantA, {
      razaoSocial: 'Laboratório Nacional de Medicamentos SA',
      nomeFantasia: 'LabNacional',
      cnpj: cnpjLaboratorioNacional,
      solicitarAprovacao: true,
      prazoEntregaDias: 7,
      condicoesComerciais: 'Pedido mínimo R$ 2.500,00',
    });

    assert.ok(fornecedorPendente.id);
    assert.equal(fornecedorPendente.status, 'PENDENTE_APROVACAO');
    assert.equal(fornecedorPendente.solicitadoPorId, usuarioDiretorAId);
    assert.equal(fornecedorPendente.dataAprovacao, undefined);

    fornecedorPendenteId = fornecedorPendente.id;
  });

  // ============================================================================
  // CENÁRIO 05: APROVAÇÃO E REJEIÇÃO DE FORNECEDOR
  // ============================================================================
  it('05. Aprovação e rejeição de fornecedor: responsável central aprova ou rejeita com justificativa obrigatória', async () => {
    // 1. Aprovação com sucesso
    const fornecedorAprovado = await ComprasService.decidirAprovacaoFornecedor(
      poolAdapter,
      tenantA,
      fornecedorPendenteId,
      { aprovado: true },
    );

    assert.equal(fornecedorAprovado.status, 'ATIVO');
    assert.ok(fornecedorAprovado.dataAprovacao);
    assert.equal(fornecedorAprovado.aprovadoPorId, usuarioDiretorAId);

    // 2. Cadastra outro para testar rejeição
    const fornecedorParaRejeitar = await ComprasService.cadastrarFornecedor(poolAdapter, tenantA, {
      razaoSocial: 'Fornecedor Questionável Ltda',
      nomeFantasia: 'Questionável',
      cnpj: cnpjDrogasBrasil,
      solicitarAprovacao: true,
    });

    // Rejeição sem justificativa deve falhar
    await assert.rejects(
      async () => {
        await ComprasService.decidirAprovacaoFornecedor(
          poolAdapter,
          tenantA,
          fornecedorParaRejeitar.id,
          { aprovado: false, motivo: 'Não' }, // Curto
        );
      },
      {
        message: /justificativa com no mínimo 5 caracteres/,
      },
    );

    // Rejeição formal com justificativa
    const rejeitado = await ComprasService.decidirAprovacaoFornecedor(
      poolAdapter,
      tenantA,
      fornecedorParaRejeitar.id,
      { aprovado: false, motivo: 'Documentação sanitária vencida e pendência na ANVISA.' },
    );

    assert.equal(rejeitado.status, 'INATIVO');
    assert.equal(rejeitado.motivoRejeicao, 'Documentação sanitária vencida e pendência na ANVISA.');

    fornecedorA2Id = fornecedorPendenteId; // Guardamos o aprovado para uso em pedidos
  });

  // ============================================================================
  // CENÁRIO 06: SOLICITAÇÃO DE COMPRA POR FILIAL
  // ============================================================================
  it('06. Solicitação de compra por filial: filial registra solicitação com produtos, justificativa e prioridade', async () => {
    const tenantFilialA1: ContextoTenant = {
      empresaId: empresaAId,
      filialId: filialA1Id,
      usuarioId: usuarioFarmaceuticoAId,
    };

    const sol = await ComprasService.criarSolicitacaoCompra(poolAdapter, tenantFilialA1, {
      filialId: filialA1Id,
      justificativaGeral: 'Reposição quinzenal de analgésicos e antibióticos para a Filial Centro.',
      prioridade: 'ALTA',
      itens: [
        {
          produtoId: prodDipironaId,
          quantidadeSolicitada: 100,
          justificativaItem: 'Estoque abaixo da média de giro semanal',
        },
        {
          produtoId: prodAmoxicilinaId,
          quantidadeSolicitada: 50,
          justificativaItem: 'Aumento expressivo da demanda sazonal',
        },
      ],
    });

    assert.ok(sol.id);
    assert.equal(sol.filialId, filialA1Id);
    assert.equal(sol.status, 'PENDENTE_APROVACAO');
    assert.equal(sol.prioridade, 'ALTA');
    assert.equal(sol.itens.length, 2);
    assert.equal(sol.itens[0]?.quantidadeSolicitada, 100);
    assert.equal(sol.itens[1]?.quantidadeSolicitada, 50);

    solicitacaoA1Id = sol.id;
  });

  // ============================================================================
  // CENÁRIO 07: APROVAÇÃO PARCIAL DE SOLICITAÇÃO DE COMPRA
  // ============================================================================
  it('07. Aprovação parcial de solicitação de compra: responsável ajusta quantidades de itens e aprova parcialmente', async () => {
    const sol = await ComprasService.obterSolicitacaoPorId(poolAdapter, tenantA, solicitacaoA1Id);
    const item1 = sol.itens[0]!;
    const item2 = sol.itens[1]!;

    const solAprovadaParcial = await ComprasService.decidirSolicitacaoCompra(
      poolAdapter,
      tenantA,
      solicitacaoA1Id,
      {
        acao: 'APROVAR_PARCIAL',
        justificativa: 'Aprovado corte de 30% em Amoxicilina devido ao orçamento mensal disponível.',
        itensAprovados: [
          { itemId: item1.id, quantidadeAprovada: 100 }, // Integral
          { itemId: item2.id, quantidadeAprovada: 35 },  // Parcial (pediu 50)
        ],
      },
    );

    assert.equal(solAprovadaParcial.status, 'APROVADA_PARCIAL');
    assert.equal(solAprovadaParcial.itens[0]?.quantidadeAprovada, 100);
    assert.equal(solAprovadaParcial.itens[1]?.quantidadeAprovada, 35);
    assert.equal(solAprovadaParcial.aprovadoPorId, usuarioDiretorAId);
  });

  // ============================================================================
  // CENÁRIO 08: CONSOLIDAÇÃO DE SOLICITAÇÕES DE DIFERENTES FILIAIS
  // ============================================================================
  it('08. Consolidação de solicitações: agrupa solicitações aprovadas de diferentes filiais em um único pedido de compra', async () => {
    // 1. Cria solicitação para a Filial A2
    const tenantFilialA2: ContextoTenant = {
      empresaId: empresaAId,
      filialId: filialA2Id,
      usuarioId: usuarioGerenteAId,
    };

    const sol2 = await ComprasService.criarSolicitacaoCompra(poolAdapter, tenantFilialA2, {
      filialId: filialA2Id,
      justificativaGeral: 'Abastecimento da Filial Bairro para itens de curva A.',
      prioridade: 'MEDIA',
      itens: [
        {
          produtoId: prodDipironaId,
          quantidadeSolicitada: 80,
        },
      ],
    });

    solicitacaoA2Id = sol2.id;

    // Aprova integralmente a solicitação da Filial A2
    await ComprasService.decidirSolicitacaoCompra(poolAdapter, tenantA, solicitacaoA2Id, {
      acao: 'APROVAR_TOTAL',
      justificativa: 'Aprovado integralmente conforme consumo histórico.',
    });

    // 2. Consolidação de Solicitacao 1 (Filial A1) e Solicitacao 2 (Filial A2)
    const sol1Atual = await ComprasService.obterSolicitacaoPorId(poolAdapter, tenantA, solicitacaoA1Id);
    const sol2Atual = await ComprasService.obterSolicitacaoPorId(poolAdapter, tenantA, solicitacaoA2Id);

    const pedidoConsolidado = await ComprasService.consolidarSolicitacoesEmPedido(
      poolAdapter,
      tenantA,
      {
        fornecedorId: fornecedorA1Id,
        solicitacaoIds: [solicitacaoA1Id, solicitacaoA2Id],
        condicoesPagamento: '30/60 dias',
        prazoEntregaPrevisto: '2026-12-05',
        valorFreteCentavos: 15000, // R$ 150,00 de frete rateado
        observacoes: 'Pedido consolidado Filial Centro + Filial Bairro',
        itensComPreco: [
          {
            solicitacaoItemId: sol1Atual.itens[0]!.id,
            valorUnitarioCentavos: 380, // Dipirona R$ 3,80
            descontoCentavos: 1000,
          },
          {
            solicitacaoItemId: sol1Atual.itens[1]!.id,
            valorUnitarioCentavos: 1150, // Amoxicilina R$ 11,50
            descontoCentavos: 0,
          },
          {
            solicitacaoItemId: sol2Atual.itens[0]!.id,
            valorUnitarioCentavos: 380, // Dipirona R$ 3,80
            descontoCentavos: 0,
          },
        ],
      },
    );

    assert.ok(pedidoConsolidado.id);
    assert.equal(pedidoConsolidado.destinadoMultiplasFiliais, true);
    assert.equal(pedidoConsolidado.itens.length, 3);
    assert.equal(pedidoConsolidado.status, 'PENDENTE_APROVACAO');

    // Valida se as duas solicitações mudaram o status para CONSOLIDADA
    const sol1Conferida = await ComprasService.obterSolicitacaoPorId(poolAdapter, tenantA, solicitacaoA1Id);
    const sol2Conferida = await ComprasService.obterSolicitacaoPorId(poolAdapter, tenantA, solicitacaoA2Id);
    assert.equal(sol1Conferida.status, 'CONSOLIDADA');
    assert.equal(sol2Conferida.status, 'CONSOLIDADA');
    assert.equal(sol1Conferida.pedidoCompraConsolidadoId, pedidoConsolidado.id);
  });

  // ============================================================================
  // CENÁRIO 09: CRIAÇÃO DE PEDIDO DE COMPRA
  // ============================================================================
  it('09. Criação de pedido de compra: calcula subtotal, desconto, frete e total em centavos com número único de pedido', async () => {
    // Dipirona: 200 un x R$ 3,50 (350 centavos) = R$ 700,00 (70.000 centavos)
    // Desconto: R$ 50,00 (5.000 centavos)
    // Frete: R$ 80,00 (8.000 centavos)
    // Total esperado: 70.000 - 5.000 + 8.000 = 73.000 centavos (R$ 730,00)
    const pedido = await ComprasService.criarPedidoCompra(poolAdapter, tenantA, {
      fornecedorId: fornecedorA2Id,
      filialDestinoPrincipalId: filialA1Id,
      condicoesPagamento: '28 dias boleto bancário',
      prazoEntregaPrevisto: '2026-12-10',
      valorFreteCentavos: 8000,
      observacoes: 'Entrega pela manhã na doca central.',
      enviarParaAprovacao: true,
      itens: [
        {
          produtoId: prodDipironaId,
          filialDestinoId: filialA1Id,
          quantidadePedida: 200,
          valorUnitarioCentavos: 350,
          descontoCentavos: 5000,
        },
      ],
    });

    assert.ok(pedido.id);
    assert.match(pedido.numeroPedido, /^PC-\d{4}-\d{4}$/);
    assert.equal(pedido.valorSubtotalCentavos, 70000);
    assert.equal(pedido.valorDescontoCentavos, 5000);
    assert.equal(pedido.valorFreteCentavos, 8000);
    assert.equal(pedido.valorTotalCentavos, 73000);
    assert.equal(pedido.status, 'PENDENTE_APROVACAO');
    assert.equal(pedido.destinadoMultiplasFiliais, false);

    pedidoCriadoId = pedido.id;
  });

  // ============================================================================
  // CENÁRIO 10: PEDIDO DESTINADO A VÁRIAS FILIAIS
  // ============================================================================
  it('10. Pedido destinado a várias filiais: registra itens distribuídos para destinos distintos na mesma ordem', async () => {
    const pedidoMultiFiliais = await ComprasService.criarPedidoCompra(poolAdapter, tenantA, {
      fornecedorId: fornecedorA1Id,
      itens: [
        {
          produtoId: prodDipironaId,
          filialDestinoId: filialA1Id,
          quantidadePedida: 150,
          valorUnitarioCentavos: 360,
        },
        {
          produtoId: prodDipironaId,
          filialDestinoId: filialA2Id,
          quantidadePedida: 100,
          valorUnitarioCentavos: 360,
        },
      ],
    });

    assert.equal(pedidoMultiFiliais.destinadoMultiplasFiliais, true);
    assert.equal(pedidoMultiFiliais.itens.length, 2);

    const destinos = pedidoMultiFiliais.itens.map(i => i.filialDestinoId);
    assert.ok(destinos.includes(filialA1Id));
    assert.ok(destinos.includes(filialA2Id));
  });

  // ============================================================================
  // CENÁRIO 11: BLOQUEIO DE FORNECEDOR GLOBAL
  // ============================================================================
  it('11. Bloqueio de fornecedor global: fornecedor com status BLOQUEADO não pode receber novos pedidos', async () => {
    // 1. Bloqueia o fornecedor A2
    await ComprasService.bloquearFornecedorGlobal(
      poolAdapter,
      tenantA,
      fornecedorA2Id,
      'Bloqueio preventivo por notificação da vigilância sanitária estadual.',
    );

    const fBloqueado = await ComprasService.obterFornecedorPorId(poolAdapter, tenantA, fornecedorA2Id);
    assert.equal(fBloqueado.status, 'BLOQUEADO');

    // 2. Tentar criar novo pedido para o fornecedor bloqueado deve falhar
    await assert.rejects(
      async () => {
        await ComprasService.criarPedidoCompra(poolAdapter, tenantA, {
          fornecedorId: fornecedorA2Id,
          itens: [
            {
              produtoId: prodDipironaId,
              filialDestinoId: filialA1Id,
              quantidadePedida: 50,
              valorUnitarioCentavos: 400,
            },
          ],
        });
      },
      {
        message: /está globalmente bloqueado para novas compras/,
      },
    );

    // 3. Garante que pedido anteriormente existente não foi cancelado automaticamente
    const pedidoAnterior = await ComprasService.obterPedidoCompraPorId(poolAdapter, tenantA, pedidoCriadoId);
    assert.notEqual(pedidoAnterior.status, 'CANCELADO');

    // Desbloqueia para testes seguintes
    await ComprasService.desbloquearFornecedorGlobal(poolAdapter, tenantA, fornecedorA2Id);
  });

  // ============================================================================
  // CENÁRIO 12: DESATIVAÇÃO LOCAL SEM AFETAR OUTRAS FILIAIS
  // ============================================================================
  it('12. Desativação local sem afetar outras filiais: fornecedor desativado na Filial 1 é bloqueado para ela, mas pode vender para Filial 2', async () => {
    // Desativa Fornecedor A1 especificamente para a Filial A1
    await ComprasService.desativarFornecedorFilial(poolAdapter, tenantA, {
      fornecedorId: fornecedorA1Id,
      filialId: filialA1Id,
      motivo: 'Problemas de logística e atrasos de entrega específicos nesta rota de centro.',
    });

    // 1. Tentar criar pedido destinado à Filial A1 deve falhar
    await assert.rejects(
      async () => {
        await ComprasService.criarPedidoCompra(poolAdapter, tenantA, {
          fornecedorId: fornecedorA1Id,
          itens: [
            {
              produtoId: prodDipironaId,
              filialDestinoId: filialA1Id,
              quantidadePedida: 100,
              valorUnitarioCentavos: 360,
            },
          ],
        });
      },
      {
        message: /desativado para a filial de destino informada/,
      },
    );

    // 2. Criar pedido destinado à Filial A2 deve ter sucesso!
    const pedidoFilialA2 = await ComprasService.criarPedidoCompra(poolAdapter, tenantA, {
      fornecedorId: fornecedorA1Id,
      itens: [
        {
          produtoId: prodDipironaId,
          filialDestinoId: filialA2Id,
          quantidadePedida: 80,
          valorUnitarioCentavos: 360,
        },
      ],
    });

    assert.ok(pedidoFilialA2.id);
    assert.equal(pedidoFilialA2.itens[0]?.filialDestinoId, filialA2Id);

    // Reativa a Filial A1
    await ComprasService.reativarFornecedorFilial(poolAdapter, tenantA, fornecedorA1Id, filialA1Id);
  });

  // ============================================================================
  // CENÁRIO 13: TENTATIVA DE ACESSO ENTRE EMPRESAS (RLS)
  // ============================================================================
  it('13. Tentativa de acesso entre empresas: Empresa B é impedida de visualizar ou emitir pedidos para fornecedores da Empresa A (RLS)', async () => {
    // 1. Empresa B tenta consultar fornecedor da Empresa A
    await assert.rejects(
      async () => {
        await ComprasService.obterFornecedorPorId(poolAdapter, tenantB, fornecedorA1Id);
      },
      {
        message: /Fornecedor não encontrado/,
      },
    );

    // 2. Empresa B tenta emitir pedido usando fornecedor da Empresa A
    await assert.rejects(
      async () => {
        await ComprasService.criarPedidoCompra(poolAdapter, tenantB, {
          fornecedorId: fornecedorA1Id,
          itens: [
            {
              produtoId: prodEmpresaBId,
              filialDestinoId: filialB1Id,
              quantidadePedida: 10,
              valorUnitarioCentavos: 500,
            },
          ],
        });
      },
      {
        message: /Fornecedor não encontrado nesta empresa/,
      },
    );

    // 3. Empresa B cadastra seu próprio fornecedor isoladamente
    const fornecedorB = await ComprasService.cadastrarFornecedor(poolAdapter, tenantB, {
      razaoSocial: 'Distribuidora Regional de Campinas Ltda',
      nomeFantasia: 'Regional Campinas',
      cnpj: cnpjEmpresaB,
    });

    assert.equal(fornecedorB.empresaId, empresaBId);

    // Empresa A não deve ver o fornecedor da Empresa B na listagem
    const listaEmpresaA = await ComprasService.listarFornecedores(poolAdapter, tenantA);
    const encontrouB = listaEmpresaA.some(f => f.id === fornecedorB.id);
    assert.equal(encontrouB, false);
  });

  // ============================================================================
  // CENÁRIO 14: CONTROLE DE PERMISSÕES
  // ============================================================================
  it('14. Controle de permissões: valida fluxo de estados de aprovação e cancelamento com justificativa obrigatória', async () => {
    // 1. Aprova pedido criado
    const aprovado = await ComprasService.alterarStatusPedido(
      poolAdapter,
      tenantA,
      pedidoCriadoId,
      {
        novoStatus: 'APROVADO',
        motivo: 'Orçamento conferido e autorizado pelo diretor.',
      },
    );
    assert.equal(aprovado.status, 'APROVADO');
    assert.equal(aprovado.aprovadoPorId, usuarioDiretorAId);

    // 2. Envia ao fornecedor
    const enviado = await ComprasService.alterarStatusPedido(
      poolAdapter,
      tenantA,
      pedidoCriadoId,
      { novoStatus: 'ENVIADO_FORNECEDOR' },
    );
    assert.equal(enviado.status, 'ENVIADO_FORNECEDOR');
    assert.ok(enviado.dataEnvio);

    // 3. Regra de Negócio: Não permite passar direto de ENVIADO para CONCLUIDO sem recebimento
    await assert.rejects(
      async () => {
        await ComprasService.alterarStatusPedido(
          poolAdapter,
          tenantA,
          pedidoCriadoId,
          { novoStatus: 'CONCLUIDO' },
        );
      },
      {
        message: /não pode ser concluído diretamente sem confirmação e recebimento/,
      },
    );

    // 4. Fornecedor confirma o pedido
    const confirmado = await ComprasService.alterarStatusPedido(
      poolAdapter,
      tenantA,
      pedidoCriadoId,
      { novoStatus: 'CONFIRMADO_FORNECEDOR' },
    );
    assert.equal(confirmado.status, 'CONFIRMADO_FORNECEDOR');
    assert.ok(confirmado.dataConfirmacao);

    // 5. Cancelamento exige justificativa detalhada (mínimo 5 caracteres)
    await assert.rejects(
      async () => {
        await ComprasService.alterarStatusPedido(
          poolAdapter,
          tenantA,
          pedidoCriadoId,
          { novoStatus: 'CANCELADO', motivo: 'Não' },
        );
      },
      {
        message: /justificativa com no mínimo 5 caracteres/,
      },
    );

    const cancelado = await ComprasService.alterarStatusPedido(
      poolAdapter,
      tenantA,
      pedidoCriadoId,
      {
        novoStatus: 'CANCELADO',
        motivo: 'Cancelado formalmente devido a greve na transportadora do fornecedor.',
      },
    );
    assert.equal(cancelado.status, 'CANCELADO');
    assert.equal(cancelado.canceladoPorId, usuarioDiretorAId);
  });

  // ============================================================================
  // CENÁRIO 15: INTEGRIDADE DOS VALORES E HISTÓRICO
  // ============================================================================
  it('15. Integridade dos valores e histórico: valores monetários rigorosamente em centavos e auditoria completa em pedidos_compra_historico', async () => {
    const pedido = await ComprasService.obterPedidoCompraPorId(poolAdapter, tenantA, pedidoCriadoId);

    // Todos os valores devem ser inteiros puros
    assert.equal(Number.isInteger(pedido.valorSubtotalCentavos), true);
    assert.equal(Number.isInteger(pedido.valorDescontoCentavos), true);
    assert.equal(Number.isInteger(pedido.valorFreteCentavos), true);
    assert.equal(Number.isInteger(pedido.valorTotalCentavos), true);

    // Histórico de auditoria deve conter cada transição registrada
    assert.ok(pedido.historico);
    assert.ok(pedido.historico.length >= 4);

    const statuses = pedido.historico.map(h => h.statusNovo);
    assert.ok(statuses.includes('PENDENTE_APROVACAO'));
    assert.ok(statuses.includes('APROVADO'));
    assert.ok(statuses.includes('ENVIADO_FORNECEDOR'));
    assert.ok(statuses.includes('CONFIRMADO_FORNECEDOR'));
    assert.ok(statuses.includes('CANCELADO'));

    for (const h of pedido.historico) {
      assert.ok(h.usuarioId);
      assert.ok(h.dataRegistro);
    }
  });

  // ============================================================================
  // CENÁRIO 16: GARANTIA DE QUE PEDIDOS NÃO ALTERAM ESTOQUE
  // ============================================================================
  it('16. Garantia de que pedidos não alteram estoque: criação, aprovação, envio e confirmação do pedido não modificam estoque físico ou saldos', async () => {
    // 1. Consulta saldo de Dipirona na Filial A1 antes do pedido de teste
    const resSaldoAntes = await db.query<{ quantidade_fisica: number; quantidade_disponivel: number }>(
      `SELECT quantidade_fisica, quantidade_disponivel
       FROM estoque_saldos
       WHERE empresa_id = $1 AND filial_id = $2 AND produto_id = $3`,
      [empresaAId, filialA1Id, prodDipironaId],
    );

    const saldoAntesFisico = resSaldoAntes.rows[0]?.quantidade_fisica;
    const saldoAntesDisp = resSaldoAntes.rows[0]?.quantidade_disponivel;

    // 2. Cria, aprova e envia um pedido de 500 unidades
    const novoPedido = await ComprasService.criarPedidoCompra(poolAdapter, tenantA, {
      fornecedorId: fornecedorA1Id,
      enviarParaAprovacao: true,
      itens: [
        {
          produtoId: prodDipironaId,
          filialDestinoId: filialA1Id,
          quantidadePedida: 500,
          valorUnitarioCentavos: 350,
        },
      ],
    });

    await ComprasService.alterarStatusPedido(poolAdapter, tenantA, novoPedido.id, {
      novoStatus: 'APROVADO',
      motivo: 'Aprovação para teste de não-impacto no estoque.',
    });

    await ComprasService.alterarStatusPedido(poolAdapter, tenantA, novoPedido.id, {
      novoStatus: 'ENVIADO_FORNECEDOR',
    });

    await ComprasService.alterarStatusPedido(poolAdapter, tenantA, novoPedido.id, {
      novoStatus: 'CONFIRMADO_FORNECEDOR',
    });

    // 3. Consulta saldo pós-operações
    const resSaldoDepois = await db.query<{ quantidade_fisica: number; quantidade_disponivel: number }>(
      `SELECT quantidade_fisica, quantidade_disponivel
       FROM estoque_saldos
       WHERE empresa_id = $1 AND filial_id = $2 AND produto_id = $3`,
      [empresaAId, filialA1Id, prodDipironaId],
    );

    const saldoDepoisFisico = resSaldoDepois.rows[0]?.quantidade_fisica;
    const saldoDepoisDisp = resSaldoDepois.rows[0]?.quantidade_disponivel;

    // Garantia estrita de que NENHUMA unidade foi adicionada ao estoque físico antes do recebimento formal
    assert.equal(saldoDepoisFisico, saldoAntesFisico);
    assert.equal(saldoDepoisDisp, saldoAntesDisp);

    // Também garante que nenhuma movimentação física foi gravada no livro-razão
    const resMov = await db.query(
      `SELECT id FROM estoque_movimentacoes WHERE produto_id = $1 AND filial_id = $2`,
      [prodDipironaId, filialA1Id],
    );
    assert.equal(resMov.rows.length, 0);
  });
});
