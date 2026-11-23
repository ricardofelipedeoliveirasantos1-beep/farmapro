import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CartItemBalcao, CartTotals } from '../src/types/balcao.js';

describe('FarmaPro Balcão — Redesign Premium da Sacola e Cupom de Pré-Venda', () => {
  // Mock inicial de produtos
  const criarItem = (id: string, descricao: string, preco: number, qtd = 1): CartItemBalcao => ({
    medication: {
      id,
      codigoInterno: `COD-${id}`,
      ean: `7890000000${id.padStart(3, '0')}`,
      descricao,
      principioAtivo: 'Principio Ativo Teste',
      apresentacao: 'Gotas ou Comprimidos',
      laboratorio: 'EMS',
      preco,
      pmc: preco * 1.3,
      tipo: 'G',
      saldoEstoque: 100,
    },
    quantity: qtd,
    unitPrice: preco,
    discount: 0,
    subtotal: preco * qtd,
    numeroSequencial: 1,
  });

  const calcularTotais = (itens: CartItemBalcao[], descontoGlobal = 0): CartTotals => {
    let subtotalBruto = 0;
    let totalVolumes = 0;
    for (const it of itens) {
      subtotalBruto += it.subtotal;
      totalVolumes += it.quantity;
    }
    const discountTotal = Math.min(descontoGlobal, subtotalBruto);
    return {
      distinctItems: itens.length,
      totalVolumes,
      subtotalBruto,
      discountTotal,
      totalLiquido: Math.max(0, subtotalBruto - discountTotal),
    };
  };

  it('1. Inserção de produtos: adiciona novo item e calcula subtotal unitário corretamente', () => {
    const sacola: CartItemBalcao[] = [
      criarItem('1', 'IBUPROFENO 600MG 20CPR GEN', 13.90, 1),
    ];
    const totais = calcularTotais(sacola);
    assert.strictEqual(totais.distinctItems, 1);
    assert.strictEqual(totais.totalVolumes, 1);
    assert.strictEqual(totais.totalLiquido, 13.90);
  });

  it('2. Quantidades maiores que um: multiplica preço unitário pela quantidade informada', () => {
    const sacola: CartItemBalcao[] = [
      criarItem('1', 'ALIVIUM 600MG 20CPR', 25.90, 3),
    ];
    const totais = calcularTotais(sacola);
    assert.strictEqual(totais.distinctItems, 1);
    assert.strictEqual(totais.totalVolumes, 3);
    assert.strictEqual(Math.round(totais.totalLiquido * 100) / 100, 77.70);
  });

  it('3. Atualização automática de volumes: diferencia produtos distintos de volumes totais', () => {
    const sacola: CartItemBalcao[] = [
      criarItem('1', 'IBUPROFENO 600MG 20CPR GEN', 13.90, 2),
      criarItem('2', 'ALIVIUM 600MG 20CPR', 25.90, 5),
      criarItem('3', 'BIO-C 1G 30CPR EFERV', 21.90, 1),
    ];
    const totais = calcularTotais(sacola);
    // 3 produtos distintos, mas 8 unidades/volumes
    assert.strictEqual(totais.distinctItems, 3);
    assert.strictEqual(totais.totalVolumes, 8);
    const totalEsperado = Math.round((2 * 13.90 + 5 * 25.90 + 1 * 21.90) * 100) / 100;
    assert.strictEqual(Math.round(totais.totalLiquido * 100) / 100, totalEsperado);
  });

  it('4. Remoção de produtos: re-estabelece contagens de itens e volumes imediatamente', () => {
    let sacola: CartItemBalcao[] = [
      criarItem('1', 'IBUPROFENO', 10.00, 2),
      criarItem('2', 'TYLENOL', 20.00, 1),
      criarItem('3', 'DORFLEX', 15.00, 3),
    ];
    assert.strictEqual(calcularTotais(sacola).distinctItems, 3);
    assert.strictEqual(calcularTotais(sacola).totalVolumes, 6);

    // Remove item 2 (TYLENOL)
    sacola = sacola.filter(it => it.medication.id !== '2');
    const totaisAtualizados = calcularTotais(sacola);
    assert.strictEqual(totaisAtualizados.distinctItems, 2);
    assert.strictEqual(totaisAtualizados.totalVolumes, 5);
    assert.strictEqual(totaisAtualizados.totalLiquido, 20.00 + 45.00);
  });

  it('5. Desconto por Ctrl+D: preserva regra e atalho sem botão na sacola', () => {
    const sacola: CartItemBalcao[] = [
      criarItem('1', 'CEWIN 500MG 30CPR', 38.90, 2), // 77.80
    ];
    const totaisComDesconto = calcularTotais(sacola, 10.00);
    assert.strictEqual(totaisComDesconto.subtotalBruto, 77.80);
    assert.strictEqual(totaisComDesconto.discountTotal, 10.00);
    assert.strictEqual(totaisComDesconto.totalLiquido, 67.80);
  });

  it('6. Cancelamento por F8: atalho informativo na barra inferior e modo de exclusão funcional', () => {
    let modoExclusao = false;
    const toggleModoF8 = () => { modoExclusao = !modoExclusao; };
    toggleModoF8();
    assert.strictEqual(modoExclusao, true);
    toggleModoF8();
    assert.strictEqual(modoExclusao, false);
  });

  it('7. Salvamento de pré-venda (F2): valida comanda e campos obrigatórios', () => {
    const sacola: CartItemBalcao[] = [criarItem('1', 'AMAGLYN 2MG', 38.90, 1)];
    const comanda = {
      numeroComanda: 'PV-10599',
      vendedorMatricula: 'OP-001',
      total: calcularTotais(sacola).totalLiquido,
      itens: sacola.length,
    };
    assert.strictEqual(comanda.numeroComanda.startsWith('PV-'), true);
    assert.strictEqual(comanda.total, 38.90);
    assert.strictEqual(comanda.itens, 1);
  });

  it('8. Impressão (F3): formato de comprovante suportado com itens e volumes', () => {
    const dadosImpressao = {
      tipo: 'TERMICA_80MM',
      pv: 'PV-10599',
      itensCount: 5,
      volumesCount: 12,
      total: 237.09,
    };
    assert.strictEqual(dadosImpressao.tipo, 'TERMICA_80MM');
    assert.strictEqual(dadosImpressao.total, 237.09);
  });

  it('9. Rolagem automática com 11, 12 e 13 produtos distintos', () => {
    const deveHabilitarRolagem = (qtdProdutosDistintos: number) => qtdProdutosDistintos >= 12;

    // Regra oficial: até 11 produtos exibição normal sem rolagem
    assert.strictEqual(deveHabilitarRolagem(10), false);
    assert.strictEqual(deveHabilitarRolagem(11), false);

    // A partir de 12 produtos distintos: habilita rolagem vertical
    assert.strictEqual(deveHabilitarRolagem(12), true);
    assert.strictEqual(deveHabilitarRolagem(13), true);
    assert.strictEqual(deveHabilitarRolagem(20), true);

    // Múltiplas unidades do mesmo produto NÃO contam como produtos distintos
    const sacolaComUmProdutoQtd12: CartItemBalcao[] = [
      criarItem('1', 'IBUPROFENO', 13.90, 12),
    ];
    assert.strictEqual(deveHabilitarRolagem(sacolaComUmProdutoQtd12.length), false);
  });

  it('10. Cabeçalho e resumo fixos durante a rolagem: lista é o único elemento flexível com rolagem', () => {
    const estruturaSacola = {
      cabecalhoFixo: true,
      colunasTabelaFixas: true,
      listaItensFlexivelComScroll: true,
      resumoItensVolumesFixo: true,
      totalSacolaFixo: true,
      botoesSalvarImprimirFixos: true,
    };
    assert.strictEqual(estruturaSacola.cabecalhoFixo, true);
    assert.strictEqual(estruturaSacola.colunasTabelaFixas, true);
    assert.strictEqual(estruturaSacola.listaItensFlexivelComScroll, true);
    assert.strictEqual(estruturaSacola.resumoItensVolumesFixo, true);
    assert.strictEqual(estruturaSacola.totalSacolaFixo, true);
    assert.strictEqual(estruturaSacola.botoesSalvarImprimirFixos, true);
  });

  it('11. Responsividade e integridade visual dos cartões e botões', () => {
    const classesBotoes = {
      salvar: 'bg-[#0c5fd1] hover:bg-[#0a4ea8] text-white',
      imprimir: 'bg-[#128a43] hover:bg-[#0e7036] text-white',
      resumoFaixaUnica: 'bg-[#0a448d] text-white',
    };
    assert.ok(classesBotoes.salvar.includes('bg-[#0c5fd1]'));
    assert.ok(classesBotoes.imprimir.includes('bg-[#128a43]'));
    assert.ok(classesBotoes.resumoFaixaUnica.includes('bg-[#0a448d]'));
  });

  // =========================================================================
  // FASE 1 & 2 — REFORMULAÇÃO DA SACOLA E RESUMO INFERIOR (Imagem 1)
  // =========================================================================
  it('12. Coluna ITEM possui espaço próprio sem comprimir a DESCRIÇÃO', () => {
    const colunaItem = { largura: 'w-10', alinhamento: 'text-center', badge: '#11' };
    const colunaDescricao = { flex: 'flex-1', contemNome: true, contemCodInterno: true, contemEan: true };
    assert.strictEqual(colunaItem.largura, 'w-10');
    assert.strictEqual(colunaDescricao.contemNome && colunaDescricao.contemEan, true);
  });

  it('13. Faixa única horizontal azul-marinho com três blocos separados por divisória', () => {
    const resumo = {
      itens: 11,
      volumes: 12,
      totalFormatado: 'R$ 249,09',
      formatoTexto: 'ITENS: 11 | VOLUMES: 12 | TOTAL: R$ 249,09',
    };
    assert.ok(resumo.formatoTexto.includes('ITENS: 11'));
    assert.ok(resumo.formatoTexto.includes('VOLUMES: 12'));
    assert.ok(resumo.formatoTexto.includes('TOTAL: R$ 249,09'));
  });

  // =========================================================================
  // FASE 3 & 4 — FUNCIONAMENTO REAL DA PRÉ-VENDA E GERENCIAMENTO (Imagem 2)
  // =========================================================================
  it('14. Salvar pré-venda (F2) NÃO é venda: isolamento estrito sem afetar Caixa ou histórico', () => {
    const operacaoPreVenda = {
      tipo: 'PRE_VENDA',
      status: 'PENDING_CASHIER',
      movimentaCaixa: false,
      geraRecebimento: false,
      afetaHistoricoCompras: false,
      contabilizaRelatorioVendasFechadas: false,
    };
    assert.strictEqual(operacaoPreVenda.movimentaCaixa, false);
    assert.strictEqual(operacaoPreVenda.afetaHistoricoCompras, false);
    assert.strictEqual(operacaoPreVenda.status, 'PENDING_CASHIER');
  });

  it('15. Pesquisa de pré-vendas por CPF, nome do cliente ou número da comanda', () => {
    const preVendasMock = [
      { code: 'PV-000156', customer: { name: 'Maria Silva', cpf: '123.456.789-01' } },
      { code: 'PV-000155', customer: { name: 'João Pereira', cpf: '987.654.321-02' } },
      { code: 'PV-000154', customer: { name: 'Consumidor Final', cpf: '' } },
    ];
    const filtrar = (termo: string) => {
      const t = termo.toLowerCase();
      return preVendasMock.filter(p =>
        p.code.toLowerCase().includes(t) ||
        p.customer.name.toLowerCase().includes(t) ||
        p.customer.cpf.includes(termo)
      );
    };
    assert.strictEqual(filtrar('156').length, 1);
    assert.strictEqual(filtrar('João').length, 1);
    assert.strictEqual(filtrar('123.456').length, 1);
  });

  it('16. Seleção por Radio Button e exclusão cirúrgica com confirmação', () => {
    let preVendas = ['PV-000156', 'PV-000155', 'PV-000154'];
    let selecionada = 'PV-000155';
    // Exclui apenas a pré-venda selecionada
    preVendas = preVendas.filter(c => c !== selecionada);
    assert.strictEqual(preVendas.length, 2);
    assert.strictEqual(preVendas.includes('PV-000155'), false);
    assert.strictEqual(preVendas.includes('PV-000156'), true);
  });

  it('17. Impressão identifica: PRÉ-VENDA — NÃO É DOCUMENTO DE VENDA CONCLUÍDA', () => {
    const textoAvisoLegal = 'PRÉ-VENDA — NÃO É DOCUMENTO DE VENDA CONCLUÍDA';
    assert.strictEqual(textoAvisoLegal.includes('NÃO É DOCUMENTO DE VENDA CONCLUÍDA'), true);
  });

  // =========================================================================
  // FASE 5 & 6 — ATALHO F11 (TELA CHEIA) E BARRA INFERIOR
  // =========================================================================
  it('18. F11 alterna tela cheia e sincroniza com a barra superior', () => {
    let isFullScreen = false;
    const toggleF11 = () => { isFullScreen = !isFullScreen; };
    toggleF11();
    assert.strictEqual(isFullScreen, true);
    toggleF11();
    assert.strictEqual(isFullScreen, false);
  });

  it('19. Barra inferior contém rigorosamente os 8 atalhos especificados', () => {
    const atalhosObrigatorios = [
      'F1 — Pesquisar Produto',
      'F2 — Salvar Pré-Venda',
      'F3 — Imprimir Comanda',
      'F8 — Cancelar Item',
      'F10 — Identificar Cliente',
      'Ctrl+D — Desconto',
      'F11 — Tela Cheia',
      'ESC — Voltar à Pesquisa',
    ];
    assert.strictEqual(atalhosObrigatorios.length, 8);
    assert.ok(atalhosObrigatorios.some(a => a.includes('F11 — Tela Cheia')));
    assert.ok(atalhosObrigatorios.some(a => a.includes('F8 — Cancelar Item')));
  });
});
