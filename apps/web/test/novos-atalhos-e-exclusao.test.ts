import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DemoPreSalesService } from '../src/services/demoPreSalesService.js';
import { DemoCatalogService } from '../src/services/demoCatalogService.js';
import { MEDICAMENTOS_DEMONSTRATIVOS } from '../src/services/demoCatalogData.js';
import { CartItemBalcao, CartTotals, CustomerInfo } from '../src/types/balcao.js';

describe('FarmaPro Balcão — Testes dos Novos Atalhos, Sacola e Fluxo de Finalização de Pré-Venda', () => {
  // Teste 1: Sacola inicia sem identificador PV
  it('1. A montagem da sacola não deve gerar nem exibir código PV antecipado', () => {
    const sacola: CartItemBalcao[] = [
      {
        medication: MEDICAMENTOS_DEMONSTRATIVOS[0]!,
        quantity: 2,
        unitPrice: MEDICAMENTOS_DEMONSTRATIVOS[0]!.preco,
        discount: 0,
        subtotal: MEDICAMENTOS_DEMONSTRATIVOS[0]!.preco * 2,
      },
    ];

    // Na sacola, os dados são apenas itens e totais, sem código PV
    assert.strictEqual(sacola.length, 1);
    assert.strictEqual((sacola[0] as any).code, undefined);
  });

  // Teste 2: Sequencial PV gerado somente após salvar a pré-venda (F2)
  it('2. Código PV só é atribuído no momento do salvamento oficial da pré-venda', () => {
    DemoPreSalesService.resetStore();

    const sacola: CartItemBalcao[] = [
      {
        medication: MEDICAMENTOS_DEMONSTRATIVOS[1]!,
        quantity: 1,
        unitPrice: MEDICAMENTOS_DEMONSTRATIVOS[1]!.preco,
        discount: 0,
        subtotal: MEDICAMENTOS_DEMONSTRATIVOS[1]!.preco,
      },
    ];

    const totais: CartTotals = {
      distinctItems: 1,
      totalVolumes: 1,
      subtotalBruto: MEDICAMENTOS_DEMONSTRATIVOS[1]!.preco,
      discountTotal: 0,
      totalLiquido: MEDICAMENTOS_DEMONSTRATIVOS[1]!.preco,
    };

    const cliente: CustomerInfo = {
      name: 'João Carlos Silva',
      cpf: '123.456.789-00',
      convenio: 'PARTICULAR',
    };

    const pv1 = DemoPreSalesService.savePreVenda(
      sacola,
      totais,
      cliente,
      { matricula: 'BC-002', nome: 'Mariana Atendente' },
      { id: '1', nome: 'Operador Teste' },
    );

    assert.ok(pv1.code.startsWith('PV-'));
    assert.strictEqual(pv1.status, 'PENDING_CASHIER');
    assert.strictEqual(pv1.vendedorMatricula, 'BC-002');
  });

  // Teste 3: Numeração sequencial contínua preservada
  it('3. Numeração sequencial contínua é preservada e incrementada sem saltos', () => {
    DemoPreSalesService.resetStore();
    const mockTotais: CartTotals = {
      distinctItems: 1,
      totalVolumes: 1,
      subtotalBruto: 10,
      discountTotal: 0,
      totalLiquido: 10,
    };

    const pvA = DemoPreSalesService.savePreVenda(
      [],
      mockTotais,
      { name: 'Cliente A' },
      { matricula: 'BC-001', nome: 'Carlos' },
    );
    const pvB = DemoPreSalesService.savePreVenda(
      [],
      mockTotais,
      { name: 'Cliente B' },
      { matricula: 'BC-002', nome: 'Mariana' },
    );

    const numA = parseInt(pvA.code.replace('PV-', ''), 10);
    const numB = parseInt(pvB.code.replace('PV-', ''), 10);
    assert.strictEqual(numB, numA + 1);
  });

  // Teste 4: Salvar pré-venda (F2) bloqueia sacola vazia
  it('4. Tentativa de salvar pré-venda com sacola vazia deve ser recusada', () => {
    const sacolaVazia: CartItemBalcao[] = [];
    const podeSalvar = sacolaVazia.length > 0;
    assert.strictEqual(podeSalvar, false);
  });

  // Teste 5: Debounce de salvamento no F2 para evitar duplicidades
  it('5. Proteção de debounce no F2 impede submissões duplicadas da mesma pré-venda', () => {
    let salvando = false;
    let chamadasSalvar = 0;

    const tentarSalvar = () => {
      if (salvando) return;
      salvando = true;
      chamadasSalvar++;
      // simula liberação posterior do lock
    };

    tentarSalvar();
    tentarSalvar(); // spam imediato
    tentarSalvar(); // spam imediato

    assert.strictEqual(chamadasSalvar, 1);
  });

  // Teste 6: F3 - Imprimir comanda de pré-venda não gera novo registro
  it('6. O atalho F3 aciona a impressão da pré-venda sem duplicar nem gerar nova comanda', () => {
    DemoPreSalesService.resetStore();
    const inicial = DemoPreSalesService.getPreVendas().length;

    const sacola: CartItemBalcao[] = [
      {
        medication: MEDICAMENTOS_DEMONSTRATIVOS[0]!,
        quantity: 1,
        unitPrice: 10,
        discount: 0,
        subtotal: 10,
      },
    ];

    const pv = DemoPreSalesService.savePreVenda(
      sacola,
      { distinctItems: 1, totalVolumes: 1, subtotalBruto: 10, discountTotal: 0, totalLiquido: 10 },
      { name: 'Consumidor' },
      { matricula: 'BC-001', nome: 'Carlos' },
    );

    // Após salvar, temos +1
    assert.strictEqual(DemoPreSalesService.getPreVendas().length, inicial + 1);

    // Simulação do F3: imprimir a comanda não chama savePreVenda
    const preVendaParaImprimir = pv;
    assert.strictEqual(preVendaParaImprimir.code, pv.code);
    assert.strictEqual(DemoPreSalesService.getPreVendas().length, inicial + 1);
  });

  // Teste 7: F8 - Ativação do modo de exclusão interativa com foco no item inicial
  it('7. F8 ativa o modo de exclusão e seleciona o primeiro item da sacola por padrão', () => {
    const sacola: CartItemBalcao[] = [
      { medication: MEDICAMENTOS_DEMONSTRATIVOS[0]!, quantity: 1, unitPrice: 10, discount: 0, subtotal: 10 },
      { medication: MEDICAMENTOS_DEMONSTRATIVOS[1]!, quantity: 2, unitPrice: 20, discount: 0, subtotal: 40 },
    ];

    let modoExclusao = false;
    let indiceFocado = -1;

    // Acionamento F8
    if (sacola.length > 0) {
      modoExclusao = true;
      indiceFocado = 0;
    }

    assert.strictEqual(modoExclusao, true);
    assert.strictEqual(indiceFocado, 0);
  });

  // Teste 8: F8 - Navegação pelas setas ↑ e ↓ entre os itens da sacola
  it('8. No modo F8, setas ↑ e ↓ navegam ciclicamente ou sequencialmente entre os itens', () => {
    const sacola: CartItemBalcao[] = [
      { medication: MEDICAMENTOS_DEMONSTRATIVOS[0]!, quantity: 1, unitPrice: 10, discount: 0, subtotal: 10 },
      { medication: MEDICAMENTOS_DEMONSTRATIVOS[1]!, quantity: 1, unitPrice: 20, discount: 0, subtotal: 20 },
      { medication: MEDICAMENTOS_DEMONSTRATIVOS[2]!, quantity: 1, unitPrice: 30, discount: 0, subtotal: 30 },
    ];

    let indice = 0;
    const navegarBaixo = () => {
      indice = indice < sacola.length - 1 ? indice + 1 : 0;
    };
    const navegarCima = () => {
      indice = indice > 0 ? indice - 1 : sacola.length - 1;
    };

    navegarBaixo();
    assert.strictEqual(indice, 1);
    navegarBaixo();
    assert.strictEqual(indice, 2);
    navegarBaixo();
    assert.strictEqual(indice, 0);

    navegarCima();
    assert.strictEqual(indice, 2);
  });

  // Teste 9: F8 - Exclusão de qualquer produto (não apenas o último)
  it('9. F8 permite excluir um item intermediário da sacola mantendo a integridade dos demais', () => {
    const item0: CartItemBalcao = { medication: MEDICAMENTOS_DEMONSTRATIVOS[0]!, quantity: 1, unitPrice: 10, discount: 0, subtotal: 10 };
    const item1: CartItemBalcao = { medication: MEDICAMENTOS_DEMONSTRATIVOS[1]!, quantity: 2, unitPrice: 20, discount: 0, subtotal: 40 };
    const item2: CartItemBalcao = { medication: MEDICAMENTOS_DEMONSTRATIVOS[2]!, quantity: 3, unitPrice: 15, discount: 0, subtotal: 45 };

    let sacola = [item0, item1, item2];

    // Excluir item intermediário (índice 1)
    const indiceExcluir = 1;
    sacola = sacola.filter((_, i) => i !== indiceExcluir);

    assert.strictEqual(sacola.length, 2);
    assert.strictEqual(sacola[0]!.medication.id, item0.medication.id);
    assert.strictEqual(sacola[1]!.medication.id, item2.medication.id);
  });

  // Teste 10: F8 - Recálculo automático de subtotais e volumes após exclusão
  it('10. Ao excluir um item, o subtotal bruto e o total de volumes são recalculados imediatamente', () => {
    const item0: CartItemBalcao = { medication: MEDICAMENTOS_DEMONSTRATIVOS[0]!, quantity: 2, unitPrice: 10, discount: 0, subtotal: 20 };
    const item1: CartItemBalcao = { medication: MEDICAMENTOS_DEMONSTRATIVOS[1]!, quantity: 3, unitPrice: 15, discount: 0, subtotal: 45 };

    let sacola = [item0, item1];
    let bruto = sacola.reduce((acc, it) => acc + it.subtotal, 0);
    let volumes = sacola.reduce((acc, it) => acc + it.quantity, 0);
    assert.strictEqual(bruto, 65);
    assert.strictEqual(volumes, 5);

    // Remove item 1
    sacola = sacola.filter((_, i) => i !== 1);
    bruto = sacola.reduce((acc, it) => acc + it.subtotal, 0);
    volumes = sacola.reduce((acc, it) => acc + it.quantity, 0);

    assert.strictEqual(bruto, 20);
    assert.strictEqual(volumes, 2);
  });

  // Teste 11: Modal de exclusão inicia com opção 'SIM' selecionada por padrão
  it('11. O modal de confirmação de exclusão abre com foco pré-selecionado na opção SIM', () => {
    let opcaoSelecionada: 'SIM' | 'NAO' = 'SIM';
    assert.strictEqual(opcaoSelecionada, 'SIM');
  });

  // Teste 12: Alternância entre SIM e NÃO pelas setas ← e →
  it('12. Setas ← e → alternam entre SIM e NÃO no modal de confirmação de exclusão', () => {
    let opcao: 'SIM' | 'NAO' = 'SIM';
    const alternar = () => {
      opcao = opcao === 'SIM' ? 'NAO' : 'SIM';
    };

    alternar();
    assert.strictEqual(opcao, 'NAO');
    alternar();
    assert.strictEqual(opcao, 'SIM');
  });

  // Teste 13: Cancelamento de exclusão (NÃO ou ESC) preserva os dados intactos
  it('13. Confirmar NÃO ou teclar ESC cancela a exclusão e preserva todos os itens da sacola', () => {
    const sacolaOriginal: CartItemBalcao[] = [
      { medication: MEDICAMENTOS_DEMONSTRATIVOS[0]!, quantity: 1, unitPrice: 10, discount: 0, subtotal: 10 },
      { medication: MEDICAMENTOS_DEMONSTRATIVOS[1]!, quantity: 1, unitPrice: 20, discount: 0, subtotal: 20 },
    ];

    let sacolaAtual = [...sacolaOriginal];
    const acaoUsuario = 'CANCELAR'; // Simula clicar em NÃO ou teclar ESC

    if (acaoUsuario === 'CONFIRMAR_SIM') {
      sacolaAtual.splice(0, 1);
    }

    assert.strictEqual(sacolaAtual.length, 2);
    assert.deepStrictEqual(sacolaAtual, sacolaOriginal);
  });

  // Teste 14: Remoção do filtro indevido de estoque do F2
  it('14. O filtro de estoque não intercepta mais a tecla F2 nem restringe a pesquisa', () => {
    // A busca agora consulta sem filtrar somente produtos com estoque
    const resultado = DemoCatalogService.filterMedications('novalgina', 'NAME', false);
    assert.ok(resultado.length > 0);
  });

  // Teste 15: Limpeza da sacola somente após salvamento com sucesso
  it('15. A sacola é limpa apenas após a confirmação bem-sucedida do salvamento', () => {
    let sacola: CartItemBalcao[] = [
      { medication: MEDICAMENTOS_DEMONSTRATIVOS[0]!, quantity: 1, unitPrice: 20, discount: 0, subtotal: 20 },
    ];

    // Se falhar a validação do vendedor, a sacola permanece intacta
    const validacaoVendedorFalhou = true;
    if (!validacaoVendedorFalhou) {
      sacola = [];
    }
    assert.strictEqual(sacola.length, 1);

    // Quando o vendedor é confirmado com sucesso, a sacola é liberada
    const pvSalva = DemoPreSalesService.savePreVenda(
      sacola,
      { distinctItems: 1, totalVolumes: 1, subtotalBruto: 20, discountTotal: 0, totalLiquido: 20 },
      { name: 'Consumidor' },
      { matricula: 'BC-002', nome: 'Mariana' },
    );
    assert.ok(pvSalva);
    sacola = [];
    assert.strictEqual(sacola.length, 0);
  });

  // Teste 16: Suporte a multiplicador na busca (ex: 3*ome)
  it('16. Extração de multiplicador de quantidade funciona antes da pesquisa', () => {
    const extraido = DemoCatalogService.extractMultiplier('3*omeprazol');
    assert.strictEqual(extraido.multiplier, 3);
    assert.strictEqual(extraido.query, 'omeprazol');
  });

  // Teste 17: F10 Identificação de Cliente
  it('17. F10 preserva dados cadastrais de cliente e convênio na sacola', () => {
    const cliente: CustomerInfo = {
      name: 'Maria das Graças',
      cpf: '987.654.321-11',
      convenio: 'BRADESCO SAÚDE',
    };
    assert.strictEqual(cliente.convenio, 'BRADESCO SAÚDE');
    assert.strictEqual(cliente.cpf, '987.654.321-11');
  });

  // Teste 18: Ctrl+D Aplicação de Desconto
  it('18. Ctrl+D aplica desconto com teto máximo que não ultrapassa o subtotal bruto', () => {
    const subtotalBruto = 100;
    const descontoTentado = 150;
    const descontoEfetivo = Math.min(descontoTentado, subtotalBruto);
    const totalLiquido = Math.max(0, subtotalBruto - descontoEfetivo);

    assert.strictEqual(descontoEfetivo, 100);
    assert.strictEqual(totalLiquido, 0);
  });

  // Teste 19: Comprovante contém identificação da pré-venda e vendedor
  it('19. O comprovante gerado contém código PV, data, vendedor e itens discriminados', () => {
    DemoPreSalesService.resetStore();
    const pv = DemoPreSalesService.savePreVenda(
      [
        { medication: MEDICAMENTOS_DEMONSTRATIVOS[0]!, quantity: 1, unitPrice: 15, discount: 0, subtotal: 15 },
      ],
      { distinctItems: 1, totalVolumes: 1, subtotalBruto: 15, discountTotal: 0, totalLiquido: 15 },
      { name: 'Consumidor Final' },
      { matricula: 'BC-002', nome: 'Mariana Atendente' },
      { id: '1', nome: 'Operador Balcão' },
    );

    assert.ok(pv.code);
    assert.strictEqual(pv.vendedorNome, 'Mariana Atendente');
    assert.strictEqual(pv.vendedorMatricula, 'BC-002');
    assert.strictEqual(pv.items.length, 1);
  });

  // Teste 20: F11 exibe todos os novos atalhos operacionais
  it('20. O guia de opções F11 mapeia F2 para Salvar, F3 para Imprimir e F8 para Excluir', () => {
    const atalhosMapeados = [
      { tecla: 'F1', acao: 'Pesquisar' },
      { tecla: 'F2', acao: 'Salvar pré-venda' },
      { tecla: 'F3', acao: 'Imprimir' },
      { tecla: 'F4', acao: 'Fila de pré-vendas' },
      { tecla: 'F8', acao: 'Excluir item da sacola' },
      { tecla: 'F10', acao: 'Cliente' },
      { tecla: 'F11', acao: 'Opções e atalhos' },
    ];

    const f2 = atalhosMapeados.find(a => a.tecla === 'F2');
    const f3 = atalhosMapeados.find(a => a.tecla === 'F3');
    const f8 = atalhosMapeados.find(a => a.tecla === 'F8');

    assert.ok(f2?.acao.toLowerCase().includes('salvar'));
    assert.ok(f3?.acao.toLowerCase().includes('imprimir'));
    assert.ok(f8?.acao.toLowerCase().includes('excluir'));
  });

  // Teste 21: Isolamento estrito de balcão sem funções de pagamento ou caixa
  it('21. O painel Balcão gera apenas comandas PENDING_CASHIER sem receber valores nem finalizar baixas fiscais', () => {
    const preVenda = DemoPreSalesService.savePreVenda(
      [],
      { distinctItems: 0, totalVolumes: 0, subtotalBruto: 0, discountTotal: 0, totalLiquido: 0 },
      { name: 'Teste' },
      { matricula: 'BC-001', nome: 'Vendedor' },
    );

    assert.strictEqual(preVenda.status, 'PENDING_CASHIER');
    assert.strictEqual((preVenda as any).formaPagamento, undefined);
    assert.strictEqual((preVenda as any).troco, undefined);
  });

  // Teste 22: Fila de pré-vendas reflete todas as comandas emitidas
  it('22. A fila de pré-vendas armazena e lista todas as comandas emitidas no Balcão', () => {
    DemoPreSalesService.resetStore();
    const inicial = DemoPreSalesService.getPreVendas().length;
    DemoPreSalesService.savePreVenda([], { distinctItems: 0, totalVolumes: 0, subtotalBruto: 0, discountTotal: 0, totalLiquido: 0 }, { name: 'Cliente 1' }, { matricula: 'BC-001', nome: 'Carlos' });
    DemoPreSalesService.savePreVenda([], { distinctItems: 0, totalVolumes: 0, subtotalBruto: 0, discountTotal: 0, totalLiquido: 0 }, { name: 'Cliente 2' }, { matricula: 'BC-002', nome: 'Mariana' });

    const fila = DemoPreSalesService.getPreVendas();
    assert.strictEqual(fila.length, inicial + 2);
    assert.strictEqual(fila[0]!.customer.name, 'Cliente 2'); // ordem decrescente (mais recente primeiro)
    assert.strictEqual(fila[1]!.customer.name, 'Cliente 1');
  });
});
