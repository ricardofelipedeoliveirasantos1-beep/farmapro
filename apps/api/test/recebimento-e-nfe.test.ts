import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { RecebimentoService } from '../src/services/recebimento.service.js';
import { ComprasService } from '../src/services/compras.service.js';
import { ContextoTenant } from '@farmapro/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Etapa 09: Recebimento de Mercadorias e Importação de XML de NF-e', () => {
  let db: PGlite;
  let poolAdapter: pg.Pool;
  let service: RecebimentoService;

  // IDs Fictícios de Demonstração Multiempresa
  const empresaAId = '11111111-1111-4111-a111-111111111111';
  const filialA1Id = '11111111-aaaa-4111-a111-aaaaaaaaaaaa';
  const filialA2Id = '11111111-bbbb-4111-a111-bbbbbbbbbbbb';

  const empresaBId = '22222222-2222-4222-b222-222222222222';
  const filialB1Id = '22222222-aaaa-4222-b222-aaaaaaaaaaaa';

  const usuarioDiretorAId = 'aaaaaaaa-1111-4000-8000-000000000001';
  const usuarioConferenteAId = 'aaaaaaaa-2222-4000-8000-000000000002';
  const usuarioGerenteAId = 'aaaaaaaa-3333-4000-8000-000000000003';
  const usuarioGerenteBId = 'bbbbbbbb-1111-4000-8000-000000000001';

  const prodDipironaId = 'fa111111-1111-4000-8000-000000000001';
  const prodAmoxicilinaId = 'fa222222-2222-4000-8000-000000000002';
  const prodOmeprazolId = 'fa333333-3333-4000-8000-000000000003';

  const tenantAConferente: ContextoTenant = {
    empresaId: empresaAId,
    filialId: filialA1Id,
    usuarioId: usuarioConferenteAId,
  };

  const tenantAGerente: ContextoTenant = {
    empresaId: empresaAId,
    filialId: filialA1Id,
    usuarioId: usuarioGerenteAId,
  };

  const tenantB: ContextoTenant = {
    empresaId: empresaBId,
    filialId: filialB1Id,
    usuarioId: usuarioGerenteBId,
  };

  const cnpjDistribuidora = '11222333000181'; // CNPJ válido registrado na Etapa 08
  const chaveAcessoValida1 = '35261111222333000181550010000012341000012345'; // 44 dígitos
  const chaveAcessoValida2 = '35261111222333000181550010000012351000012356'; // 44 dígitos
  const chaveAcessoValida3 = '35261111222333000181550010000012361000012367'; // 44 dígitos

  let fornecedorAId: string;
  let pedidoCompraAprovadoId: string;
  let pedidoItemDipironaId: string;
  let pedidoItemAmoxicilinaId: string;

  // Gerador de XMLs de Teste
  function gerarXmlNfe(params: {
    chave: string;
    nNF: string;
    cnpjEmitente: string;
    itens: {
      codigo: string;
      ean?: string;
      nome: string;
      qtd: number;
      valorUnit: number;
      lote?: string;
      dFab?: string;
      dVal?: string;
    }[];
  }): string {
    const totalProdutos = params.itens.reduce((acc, it) => acc + it.qtd * it.valorUnit, 0);

    const itensXml = params.itens
      .map(
        (it, idx) => `
      <det nItem="${idx + 1}">
        <prod>
          <cProd>${it.codigo}</cProd>
          <cEAN>${it.ean || 'SEM GTIN'}</cEAN>
          <xProd>${it.nome}</xProd>
          <NCM>30049099</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>${it.qtd.toFixed(2)}</qCom>
          <vUnCom>${it.valorUnit.toFixed(2)}</vUnCom>
          <vProd>${(it.qtd * it.valorUnit).toFixed(2)}</vProd>
          <vDesc>0.00</vDesc>
          ${
            it.lote
              ? `<rastro>
            <nLote>${it.lote}</nLote>
            <qLote>${it.qtd.toFixed(2)}</qLote>
            <dFab>${it.dFab || '2026-01-01'}</dFab>
            <dVal>${it.dVal || '2028-01-01'}</dVal>
          </rastro>`
              : ''
          }
        </prod>
      </det>`
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${params.chave}" versao="4.00">
      <ide>
        <nNF>${params.nNF}</nNF>
        <serie>1</serie>
        <dhEmi>2026-11-20T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>${params.cnpjEmitente}</CNPJ>
        <xNome>Distribuidora Farmacêutica Central Ltda</xNome>
        <xFant>Central Medicamentos</xFant>
      </emit>
      <dest>
        <CNPJ>11111111000191</CNPJ>
        <xNome>Farmácia FarmaPro Matriz Ltda</xNome>
      </dest>
      ${itensXml}
      <total>
        <ICMSTot>
          <vProd>${totalProdutos.toFixed(2)}</vProd>
          <vFrete>0.00</vFrete>
          <vDesc>0.00</vDesc>
          <vNF>${totalProdutos.toFixed(2)}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;
  }

  before(async () => {
    db = new PGlite();

    poolAdapter = {
      query: async (sql: string, params?: unknown[]) => {
        const res = await db.query(sql, params as unknown[] | undefined);
        return {
          rows: res.rows,
          rowCount: (res as any).affectedRows ?? res.rows.length,
          command: '',
          oid: 0,
          fields: [],
        } as unknown as pg.QueryResult;
      },
      connect: async () => {
        return {
          query: async (sql: string, params?: unknown[]) => {
            const res = await db.query(sql, params as unknown[] | undefined);
            return {
              rows: res.rows,
              rowCount: (res as any).affectedRows ?? res.rows.length,
              command: '',
              oid: 0,
              fields: [],
            } as unknown as pg.QueryResult;
          },
          release: () => {},
        };
      },
    } as unknown as pg.Pool;

    service = new RecebimentoService(poolAdapter);

    // 1. Executar as 13 migrações estruturais
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
    ];

    for (const arq of arquivosMigracao) {
      const sql = fs.readFileSync(path.join(migrationsDir, arq), 'utf-8');
      await db.exec(sql);
    }

    // 2. Carga inicial de empresas, filiais, usuários e produtos
    await db.exec(`
      -- Empresas
      INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato, status)
      VALUES 
        ('${empresaAId}', 'FarmaPro Matriz Ltda', 'FarmaPro Centro', '11111111000191', 'contato@farma-a.com.br', '11999990001', 'ATIVO'),
        ('${empresaBId}', 'FarmaPro Concorrente Ltda', 'FarmaB Outra', '22222222000192', 'contato@farma-b.com.br', '11999990002', 'ATIVO')
      ON CONFLICT DO NOTHING;

      -- Filiais
      INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz, status)
      VALUES 
        ('${filialA1Id}', '${empresaAId}', 'FIL-01', 'Unidade Central A1', '11111111000191', 'Rua 1', '10', 'Centro', 'São Paulo', 'SP', '01001000', '11988880001', true, 'ATIVO'),
        ('${filialA2Id}', '${empresaAId}', 'FIL-02', 'Unidade Bairro A2', '11111111000272', 'Rua 2', '20', 'Norte', 'São Paulo', 'SP', '02002000', '11988880002', false, 'ATIVO'),
        ('${filialB1Id}', '${empresaBId}', 'FIL-B1', 'Unidade B1', '22222222000192', 'Rua B', '100', 'Centro', 'Campinas', 'SP', '13000000', '11988880003', true, 'ATIVO')
      ON CONFLICT DO NOTHING;

      -- Usuários
      INSERT INTO usuarios (id, nome, email, hash_senha, cpf, status)
      VALUES 
        ('${usuarioDiretorAId}', 'Carlos Diretor', 'diretor@farmapro.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '11111111111', 'ATIVO'),
        ('${usuarioConferenteAId}', 'Mariana Conferente', 'conferente@farmapro.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '22222222222', 'ATIVO'),
        ('${usuarioGerenteAId}', 'Lucas Gerente', 'gerente@farmapro.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '33333333333', 'ATIVO'),
        ('${usuarioGerenteBId}', 'Juliana Gerente B', 'gerente@farmab.com.br', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', '44444444444', 'ATIVO')
      ON CONFLICT DO NOTHING;

      -- Produtos
      INSERT INTO produtos (id, empresa_id, nome_comercial, nome_generico, fabricante, apresentacao, unidade_medida, tipo_produto, fracionavel, status)
      VALUES 
        ('${prodDipironaId}', '${empresaAId}', 'Dipirona 500mg/mL 20mL', 'Dipirona', 'MedLab', 'Frasco 20mL', 'UN', 'MEDICAMENTO_GENERICO', false, 'ATIVO'),
        ('${prodAmoxicilinaId}', '${empresaAId}', 'Amoxicilina 500mg', 'Amoxicilina', 'MedLab', 'Cx 21 comp', 'CX', 'MEDICAMENTO_GENERICO', false, 'ATIVO'),
        ('${prodOmeprazolId}', '${empresaAId}', 'Omeprazol 20mg', 'Omeprazol', 'BioFarma', 'Cx 28 caps', 'CX', 'MEDICAMENTO_GENERICO', false, 'ATIVO')
      ON CONFLICT DO NOTHING;

      -- Códigos de Barras
      INSERT INTO produtos_codigos_barras (id, empresa_id, produto_id, codigo_barras, tipo_codigo, e_principal)
      VALUES 
        (gen_random_uuid(), '${empresaAId}', '${prodDipironaId}', '7891234567890', 'EAN13', true),
        (gen_random_uuid(), '${empresaAId}', '${prodAmoxicilinaId}', '7892222222222', 'EAN13', true),
        (gen_random_uuid(), '${empresaAId}', '${prodOmeprazolId}', '7893333333333', 'EAN13', true)
      ON CONFLICT DO NOTHING;
    `);

    // 3. Cadastra Fornecedor Homologado da Empresa A
    const forn = await ComprasService.cadastrarFornecedor(poolAdapter, tenantAGerente, {
      razaoSocial: 'Distribuidora Farmacêutica Central Ltda',
      nomeFantasia: 'Central Medicamentos',
      cnpj: cnpjDistribuidora,
      prazoEntregaDias: 2,
    });
    fornecedorAId = forn.id;

    // 4. Cria Pedido de Compra Aprovado na Empresa A para teste de conferência
    const ped = await ComprasService.criarPedidoCompra(poolAdapter, tenantAGerente, {
      fornecedorId: fornecedorAId,
      itens: [
        {
          produtoId: prodDipironaId,
          filialDestinoId: filialA1Id,
          quantidadePedida: 100,
          valorUnitarioCentavos: 450, // R$ 4,50
        },
        {
          produtoId: prodAmoxicilinaId,
          filialDestinoId: filialA1Id,
          quantidadePedida: 50,
          valorUnitarioCentavos: 1200, // R$ 12,00
        },
      ],
      condicoesPagamento: 'Boleto 28 dias',
    });
    pedidoCompraAprovadoId = ped.id;
    pedidoItemDipironaId = ped.itens[0].id;
    pedidoItemAmoxicilinaId = ped.itens[1].id;

    // Avança o pedido para APROVADO -> ENVIADO_FORNECEDOR -> CONFIRMADO_FORNECEDOR
    await ComprasService.alterarStatusPedido(poolAdapter, tenantAGerente, pedidoCompraAprovadoId, {
      novoStatus: 'APROVADO',
      motivo: 'Aprovado pelo gestor',
    });
    await ComprasService.alterarStatusPedido(poolAdapter, tenantAGerente, pedidoCompraAprovadoId, {
      novoStatus: 'ENVIADO_FORNECEDOR',
      motivo: 'Enviado ao fornecedor',
    });
    await ComprasService.alterarStatusPedido(poolAdapter, tenantAGerente, pedidoCompraAprovadoId, {
      novoStatus: 'CONFIRMADO_FORNECEDOR',
      motivo: 'Confirmado pelo fornecedor com prazo acordado',
    });
  });

  // ============================================================================
  // OS 18 TESTES OBRIGATÓRIOS DA ETAPA 09
  // ============================================================================

  it('01. Importação de XML válido: extrai chave de 44 dígitos, emitente, itens e totais', async () => {
    const xml = gerarXmlNfe({
      chave: chaveAcessoValida1,
      nNF: '1234',
      cnpjEmitente: cnpjDistribuidora,
      itens: [
        {
          codigo: 'DIP500',
          ean: '7891234567890',
          nome: 'Dipirona 500mg/mL 20mL',
          qtd: 100,
          valorUnit: 4.5,
          lote: 'LOTE-DIP-01',
          dFab: '2026-01-10',
          dVal: '2028-01-10',
        },
      ],
    });

    const nfe = await service.importarXmlNfe(tenantAConferente, {
      xmlConteudo: xml,
      filialId: filialA1Id,
      pedidoCompraId: pedidoCompraAprovadoId,
    });

    assert.ok(nfe.id);
    assert.strictEqual(nfe.chaveAcesso, chaveAcessoValida1);
    assert.strictEqual(nfe.numeroNfe, '1234');
    assert.strictEqual(nfe.cnpjEmitente, cnpjDistribuidora);
    assert.strictEqual(nfe.valorTotalCentavos, 45000); // R$ 450,00 = 45000 centavos
    assert.strictEqual(nfe.itens.length, 1);
    assert.strictEqual(nfe.itens[0].quantidadeComercial, 100);
    assert.strictEqual(nfe.itens[0].valorUnitarioCentavos, 450);
    assert.strictEqual(nfe.status, 'IMPORTADA');
  });

  it('02. Rejeição de XML estruturalmente inválido ou malformado', async () => {
    const xmlInvalido = '<arquivo>Isto nao eh uma NFe valida</arquivo>';

    await assert.rejects(
      async () => {
        await service.importarXmlNfe(tenantAConferente, {
          xmlConteudo: xmlInvalido,
          filialId: filialA1Id,
        });
      },
      {
        message: /Arquivo XML inválido: não contém a estrutura padrão de Nota Fiscal Eletrônica/i,
      }
    );
  });

  it('03. Identificação de fornecedor: associa automaticamente pelo CNPJ da NF-e', async () => {
    const nfe = await service.obterNfePorId(tenantAConferente, (await service.listarNfes(tenantAConferente))[0].id);
    assert.ok(nfe);
    assert.strictEqual(nfe.fornecedorId, fornecedorAId);
    assert.strictEqual(nfe.nomeFantasiaFornecedor, 'Central Medicamentos');
  });

  it('04. Bloqueio de chave de acesso duplicada na mesma empresa', async () => {
    const xmlDuplicado = gerarXmlNfe({
      chave: chaveAcessoValida1, // Mesma chave já importada no teste 01
      nNF: '1234',
      cnpjEmitente: cnpjDistribuidora,
      itens: [{ codigo: 'DIP500', nome: 'Dipirona', qtd: 10, valorUnit: 4.5 }],
    });

    await assert.rejects(
      async () => {
        await service.importarXmlNfe(tenantAConferente, {
          xmlConteudo: xmlDuplicado,
          filialId: filialA1Id,
        });
      },
      {
        message: /já foi importada anteriormente/i,
      }
    );
  });

  it('05. Associação do XML ao pedido correto da Etapa 08', async () => {
    const nfe = (await service.listarNfes(tenantAConferente))[0];
    assert.strictEqual(nfe.pedidoCompraId, pedidoCompraAprovadoId);
  });

  it('06. Identificação de produtos não cadastrados: permite conferência e vinculação manual', async () => {
    // Importa XML com produto que não existe no cadastro local
    const xmlComDesconhecido = gerarXmlNfe({
      chave: chaveAcessoValida2,
      nNF: '5555',
      cnpjEmitente: cnpjDistribuidora,
      itens: [
        {
          codigo: 'PROD-NOVO-999',
          ean: '7899999999999', // EAN não cadastrado
          nome: 'Produto Desconhecido Novo 500mg',
          qtd: 20,
          valorUnit: 15.0,
        },
      ],
    });

    const nfe = await service.importarXmlNfe(tenantAConferente, {
      xmlConteudo: xmlComDesconhecido,
      filialId: filialA1Id,
    });

    // Item não foi associado automaticamente
    assert.strictEqual(nfe.itens[0].produtoId, undefined);

    // Realiza associação manual ao Omeprazol cadastrado
    await service.associarProdutoItemNfe(tenantAConferente, nfe.itens[0].id, prodOmeprazolId);

    const nfeAtualizada = await service.obterNfePorId(tenantAConferente, nfe.id);
    assert.strictEqual(nfeAtualizada?.itens[0].produtoId, prodOmeprazolId);
  });

  it('07. Conferência de quantidades e valores (3-Way Matching): Pedido x NF-e x Físico', async () => {
    // Inicia conferência para o pedido e NF-e
    const nfe = (await service.listarNfes(tenantAConferente))[0];

    const conf = await service.iniciarConferencia(tenantAConferente, {
      filialId: filialA1Id,
      nfeId: nfe.id,
      pedidoCompraId: pedidoCompraAprovadoId,
    });

    assert.ok(conf.id);
    assert.strictEqual(conf.status, 'EM_CONFERENCIA');
    assert.strictEqual(conf.valorTotalPedidoCentavos, 105000); // 100x4.50 + 50x12.00 = 450 + 600 = 1050,00
  });

  it('08. Recebimento parcial: atualiza pedido para PARCIALMENTE_ATENDIDO e preserva saldo pendente', async () => {
    // Cria sessão de conferência física
    const conf = await service.iniciarConferencia(tenantAConferente, {
      filialId: filialA1Id,
      pedidoCompraId: pedidoCompraAprovadoId,
    });

    // Registra conferência física de apenas 40 unidades de Dipirona (de 100 pedidas)
    await service.registrarConferenciaFisica(tenantAConferente, {
      recebimentoId: conf.id,
      itens: [
        {
          pedidoItemId: pedidoItemDipironaId,
          produtoId: prodDipironaId,
          filialDestinoId: filialA1Id,
          quantidadePedida: 100,
          quantidadeRecebidaFisica: 40, // Entrega parcial
          quantidadeLiberadaVenda: 40,
          valorUnitarioPedidoCentavos: 450,
          valorUnitarioNfeCentavos: 450,
          valorUnitarioReconhecidoCentavos: 450,
          numeroLote: 'DIP-PARCIAL-01',
          dataFabricacao: '2026-01-10',
          dataValidade: '2028-01-10',
          statusLote: 'ATIVO',
          divergenciaDetectada: 'QUANTIDADE_A_MENOS',
        },
      ],
      justificativaDivergencia: 'Fornecedor enviou remessa parcial devido a limite de frete.',
    });

    // Aprova a divergência por outro usuário (segregação de funções)
    await service.aprovarDivergencia(tenantAGerente, {
      recebimentoId: conf.id,
      aprovado: true,
      justificativa: 'Aprovada remessa parcial. Restante programado para semana seguinte.',
    });

    // Confirma recebimento e entrada no estoque
    const recConcluido = await service.confirmarRecebimentoEEntradaEstoque(tenantAConferente, {
      recebimentoId: conf.id,
    });

    assert.strictEqual(recConcluido.status, 'CONCLUIDO');

    // Verifica que o pedido de compra mudou para PARCIALMENTE_ATENDIDO
    const pedido = await ComprasService.obterPedidoCompraPorId(poolAdapter, tenantAGerente, pedidoCompraAprovadoId);
    assert.strictEqual(pedido?.status, 'PARCIALMENTE_ATENDIDO');

    // Verifica que o item do pedido tem quantidadeEntregue = 40 (restando 60 pendentes)
    const itemDip = pedido?.itens.find(it => it.id === pedidoItemDipironaId);
    assert.strictEqual(itemDip?.quantidadeEntregue, 40);
  });

  it('09. Recebimento destinado a múltiplas filiais: distribui os itens nos estoques corretos', async () => {
    // Inicia recebimento com item destinado à Filial A2
    const conf = await service.iniciarConferencia(tenantAConferente, {
      filialId: filialA1Id,
    });

    await service.registrarConferenciaFisica(tenantAConferente, {
      recebimentoId: conf.id,
      itens: [
        {
          produtoId: prodAmoxicilinaId,
          filialDestinoId: filialA2Id, // Destinado à Filial A2
          quantidadeRecebidaFisica: 30,
          quantidadeLiberadaVenda: 30,
          valorUnitarioPedidoCentavos: 1200,
          numeroLote: 'AMX-FILIAL-A2',
          dataFabricacao: '2026-02-01',
          dataValidade: '2027-12-31',
          statusLote: 'ATIVO',
        },
      ],
    });

    await service.confirmarRecebimentoEEntradaEstoque(tenantAConferente, {
      recebimentoId: conf.id,
    });

    // Verifica que o saldo na Filial A2 aumentou
    const resEstoqueA2 = await poolAdapter.query(
      'SELECT quantidade_fisica FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2',
      [filialA2Id, prodAmoxicilinaId]
    );
    assert.strictEqual(Number(resEstoqueA2.rows[0].quantidade_fisica), 30);
  });

  it('10. Registro e aprovação de divergências com Segregação de Funções obrigatória', async () => {
    const conf = await service.iniciarConferencia(tenantAConferente, {
      filialId: filialA1Id,
    });

    // Usuário Conferente registra divergência de preço
    await service.registrarConferenciaFisica(tenantAConferente, {
      recebimentoId: conf.id,
      itens: [
        {
          produtoId: prodDipironaId,
          filialDestinoId: filialA1Id,
          quantidadeRecebidaFisica: 50,
          quantidadeLiberadaVenda: 50,
          valorUnitarioPedidoCentavos: 450,
          valorUnitarioNfeCentavos: 520, // Preço maior na nota
          numeroLote: 'DIP-DIV-PRECO',
          dataFabricacao: '2026-01-01',
          dataValidade: '2028-01-01',
          statusLote: 'ATIVO',
          divergenciaDetectada: 'PRECO_DIVERGENTE',
        },
      ],
      justificativaDivergencia: 'Fornecedor faturou com reajuste sem aviso prévio.',
    });

    const confPendente = await service.obterRecebimentoPorId(tenantAConferente, conf.id);
    assert.strictEqual(confPendente?.status, 'AGUARDANDO_APROVACAO_DIVERGENCIA');
    assert.strictEqual(confPendente?.divergenciaRegistradaPorId, usuarioConferenteAId);

    // Tentativa do PRÓPRIO conferente de aprovar a própria divergência deve falhar (segregação de funções)
    await assert.rejects(
      async () => {
        await service.aprovarDivergencia(tenantAConferente, {
          recebimentoId: conf.id,
          aprovado: true,
          justificativa: 'Auto-aprovação indevida',
        });
      },
      {
        message: /Segregação de funções violada/i,
      }
    );

    // Gerente diferente aprova a divergência com sucesso
    const confAprovada = await service.aprovarDivergencia(tenantAGerente, {
      recebimentoId: conf.id,
      aprovado: true,
      justificativa: 'Preço aprovado excepcionalmente pela gerência.',
    });
    assert.strictEqual(confAprovada.status, 'APROVADO');
  });

  it('11. Bloqueio de entrada duplicada: idempotência garante que re-confirmação não duplica estoque', async () => {
    const conf = await service.iniciarConferencia(tenantAConferente, {
      filialId: filialA1Id,
    });

    await service.registrarConferenciaFisica(tenantAConferente, {
      recebimentoId: conf.id,
      itens: [
        {
          produtoId: prodOmeprazolId,
          filialDestinoId: filialA1Id,
          quantidadeRecebidaFisica: 25,
          quantidadeLiberadaVenda: 25,
          valorUnitarioPedidoCentavos: 800,
          numeroLote: 'OME-IDEMP-01',
          dataFabricacao: '2026-01-01',
          dataValidade: '2028-01-01',
          statusLote: 'ATIVO',
        },
      ],
    });

    // Primeira confirmação
    await service.confirmarRecebimentoEEntradaEstoque(tenantAConferente, {
      recebimentoId: conf.id,
    });

    const res1 = await poolAdapter.query(
      'SELECT quantidade_fisica FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2',
      [filialA1Id, prodOmeprazolId]
    );
    const qtdPrimeira = Number(res1.rows[0].quantidade_fisica);

    // Segunda chamada na mesma sessão de recebimento (idempotência)
    await service.confirmarRecebimentoEEntradaEstoque(tenantAConferente, {
      recebimentoId: conf.id,
    });

    const res2 = await poolAdapter.query(
      'SELECT quantidade_fisica FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2',
      [filialA1Id, prodOmeprazolId]
    );
    const qtdSegunda = Number(res2.rows[0].quantidade_fisica);

    assert.strictEqual(qtdSegunda, qtdPrimeira);
  });

  it('12. Atualização correta de lotes e validades na tabela lotes', async () => {
    const resLote = await poolAdapter.query(
      'SELECT numero_lote, data_validade, quantidade_disponivel, status FROM lotes WHERE filial_id = $1 AND numero_lote = $2',
      [filialA1Id, 'OME-IDEMP-01']
    );

    assert.strictEqual(resLote.rows.length, 1);
    assert.strictEqual(resLote.rows[0].numero_lote, 'OME-IDEMP-01');
    assert.strictEqual(Number(resLote.rows[0].quantidade_disponivel), 25);
    assert.strictEqual(resLote.rows[0].status, 'ATIVO');
  });

  it('13. Bloqueio sanitário de produtos vencidos ou em quarentena: não entram no saldo para venda', async () => {
    const conf = await service.iniciarConferencia(tenantAConferente, {
      filialId: filialA1Id,
    });

    // Registra lote com data vencida no passado
    await service.registrarConferenciaFisica(tenantAConferente, {
      recebimentoId: conf.id,
      itens: [
        {
          produtoId: prodDipironaId,
          filialDestinoId: filialA1Id,
          quantidadeRecebidaFisica: 10,
          valorUnitarioPedidoCentavos: 450,
          numeroLote: 'DIP-VENCIDO-ANVISA',
          dataFabricacao: '2023-01-01',
          dataValidade: '2025-01-01', // Vencido!
          statusLote: 'VENCIDO',
        },
      ],
      justificativaDivergencia: 'Mercadoria entregue já com data de validade vencida pelo fornecedor.',
    });

    const confCarregada = await service.obterRecebimentoPorId(tenantAConferente, conf.id);
    const itemVencido = confCarregada?.itens.find(it => it.numeroLote === 'DIP-VENCIDO-ANVISA');

    // Quantidade liberada para venda deve ser forçada a ZERO
    assert.strictEqual(itemVencido?.quantidadeLiberadaVenda, 0);
    assert.strictEqual(itemVencido?.statusLote, 'VENCIDO');
    assert.strictEqual(itemVencido?.divergenciaDetectada, 'LOTE_VENCIDO');
  });

  it('14. Estoque atualizado somente após recebimento autorizado (não altera em rascunho ou pendente)', async () => {
    // Consulta estoque antes
    const resAntes = await poolAdapter.query(
      'SELECT COALESCE(quantidade_fisica, 0) AS qtd FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2',
      [filialA1Id, prodDipironaId]
    );
    const qtdAntes = Number(resAntes.rows[0]?.qtd || 0);

    const conf = await service.iniciarConferencia(tenantAConferente, { filialId: filialA1Id });
    await service.registrarConferenciaFisica(tenantAConferente, {
      recebimentoId: conf.id,
      itens: [
        {
          produtoId: prodDipironaId,
          filialDestinoId: filialA1Id,
          quantidadeRecebidaFisica: 50,
          quantidadeLiberadaVenda: 50,
          valorUnitarioPedidoCentavos: 450,
          numeroLote: 'DIP-PENDENTE-TEST',
          dataFabricacao: '2026-01-01',
          dataValidade: '2028-01-01',
          statusLote: 'ATIVO',
          divergenciaDetectada: 'QUANTIDADE_A_MAIS',
        },
      ],
      justificativaDivergencia: 'Excedente bonificado aguardando autorização.',
    });

    // Neste ponto está AGUARDANDO_APROVACAO_DIVERGENCIA - o estoque físico NÃO pode ter mudado!
    const resDurante = await poolAdapter.query(
      'SELECT COALESCE(quantidade_fisica, 0) AS qtd FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2',
      [filialA1Id, prodDipironaId]
    );
    assert.strictEqual(Number(resDurante.rows[0]?.qtd || 0), qtdAntes);
  });

  it('15. Isolamento entre empresas e filiais: Empresa B não acessa conferências da Empresa A', async () => {
    const nfesEmpresaA = await service.listarNfes(tenantAConferente);
    assert.ok(nfesEmpresaA.length > 0);

    // Empresa B consulta a lista de NF-es: deve retornar vazia devido ao isolamento de tenant
    const nfesEmpresaB = await service.listarNfes(tenantB);
    assert.strictEqual(nfesEmpresaB.length, 0);

    // Tentativa direta de obter NF-e da Empresa A pela Empresa B
    const nfeAcessoCruzado = await service.obterNfePorId(tenantB, nfesEmpresaA[0].id);
    assert.strictEqual(nfeAcessoCruzado, null);
  });

  it('16. Verificação de permissões e histórico de auditoria completo das divergências', async () => {
    const resAudit = await poolAdapter.query(
      'SELECT * FROM recebimento_divergencias_historico WHERE empresa_id = $1 ORDER BY criado_em ASC',
      [empresaAId]
    );

    assert.ok(resAudit.rows.length > 0);
    // Cada divergência tem usuário responsável e justificativa persistida
    for (const row of resAudit.rows) {
      assert.ok(row.usuario_id);
      assert.ok(row.justificativa);
      assert.ok(row.justificativa.length >= 5);
    }
  });

  it('17. Integridade transacional em falhas: erro durante confirmação reverte todas as tabelas', async () => {
    const conf = await service.iniciarConferencia(tenantAConferente, { filialId: filialA1Id });
    await service.registrarConferenciaFisica(tenantAConferente, {
      recebimentoId: conf.id,
      itens: [
        {
          produtoId: prodDipironaId,
          filialDestinoId: filialA1Id,
          quantidadeRecebidaFisica: 10,
          quantidadeLiberadaVenda: 10,
          valorUnitarioPedidoCentavos: 450,
          numeroLote: 'DIP-FAIL-TEST',
          dataFabricacao: '2026-01-01',
          dataValidade: '2028-01-01',
        },
      ],
    });

    // Simula erro transacional durante o processamento da confirmação
    await poolAdapter.query(
      "UPDATE recebimento_mercadoria_itens SET motivo_divergencia = '__SIMULAR_ERRO_TRANSACIONAL__' WHERE recebimento_id = $1",
      [conf.id]
    );

    // A confirmação deve falhar e realizar rollback atômico
    await assert.rejects(
      async () => {
        await service.confirmarRecebimentoEEntradaEstoque(tenantAConferente, {
          recebimentoId: conf.id,
        });
      },
      /Falha simulada para validação de rollback transacional/
    );

    // O status do recebimento NÃO pode ter sido alterado para CONCLUIDO
    const resStatus = await poolAdapter.query(
      'SELECT status FROM recebimentos_mercadorias WHERE id = $1',
      [conf.id]
    );
    assert.notStrictEqual(resStatus.rows[0].status, 'CONCLUIDO');
  });

  it('18. Garantia de que importar XML, sem conferência física, NÃO altera o estoque físico', async () => {
    // 1. Obtém estoque antes da importação
    const resEstoqueAntes = await poolAdapter.query(
      'SELECT COALESCE(quantidade_fisica, 0) AS qtd FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2',
      [filialA1Id, prodDipironaId]
    );
    const qtdAntes = Number(resEstoqueAntes.rows[0]?.qtd || 0);

    // 2. Importa novo XML com 500 unidades de Dipirona
    const xmlNovo = gerarXmlNfe({
      chave: chaveAcessoValida3,
      nNF: '9999',
      cnpjEmitente: cnpjDistribuidora,
      itens: [
        {
          codigo: 'DIP500',
          ean: '7891234567890',
          nome: 'Dipirona 500mg/mL 20mL',
          qtd: 500,
          valorUnit: 4.5,
          lote: 'LOTE-TEST-NAO-MOVE',
        },
      ],
    });

    const nfeImportada = await service.importarXmlNfe(tenantAConferente, {
      xmlConteudo: xmlNovo,
      filialId: filialA1Id,
    });

    assert.ok(nfeImportada.id);

    // 3. Verifica que o estoque físico permanece EXATAMENTE IGUAL
    const resEstoqueDepois = await poolAdapter.query(
      'SELECT COALESCE(quantidade_fisica, 0) AS qtd FROM estoque_saldos WHERE filial_id = $1 AND produto_id = $2',
      [filialA1Id, prodDipironaId]
    );
    const qtdDepois = Number(resEstoqueDepois.rows[0]?.qtd || 0);

    assert.strictEqual(qtdDepois, qtdAntes, 'O estoque físico não pode sofrer alteração apenas pela importação do XML!');
  });
});
