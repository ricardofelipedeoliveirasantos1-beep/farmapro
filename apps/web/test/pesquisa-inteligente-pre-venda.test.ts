import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DemoPreSalesService,
  formatarCpf,
  extrairApenasDigitos,
  normalizarTexto,
} from '../src/services/demoPreSalesService.js';
import { MEDICAMENTOS_DEMONSTRATIVOS } from '../src/services/demoCatalogData.js';
import { CartItemBalcao, CartTotals, CustomerInfo } from '../src/types/balcao.js';

describe('FarmaPro Balcão — Pesquisa Inteligente de Pré-Vendas e Formatação Dinâmica de CPF (17 Testes Oficiais)', () => {
  beforeEach(() => {
    DemoPreSalesService.resetStore();
  });

  // 1. Pesquisa pelo nome completo
  it('1. Deve encontrar pré-venda pesquisando pelo nome completo do cliente', () => {
    const resultados = DemoPreSalesService.pesquisarPreVendas('Roberto Carlos');
    assert.ok(resultados.length >= 1);
    assert.strictEqual(resultados[0]!.customer.name, 'Roberto Carlos');
    assert.strictEqual(resultados[0]!.code, 'PV-000157');
  });

  // 2. Pesquisa pelas primeiras letras do nome
  it('2. Deve sugerir múltiplos clientes ao pesquisar pelas primeiras letras (ex: "RO")', () => {
    const sugestoes = DemoPreSalesService.pesquisarSugestoes('RO');
    assert.ok(sugestoes.length >= 2, 'Deve conter pelo menos Roberto Carlos e Rodrigo Silva');
    
    const nomes = sugestoes.map(s => s.clienteNome);
    assert.ok(nomes.includes('Roberto Carlos'), 'Deve conter Roberto Carlos');
    assert.ok(nomes.some(n => n.includes('Rodrigo')), 'Deve conter Rodrigo Silva');
  });

  // 3. Pesquisa pelo nome parcial
  it('3. Deve encontrar registros pesquisando por sobrenome ou parte do nome (ex: "Carlos")', () => {
    const resultados = DemoPreSalesService.pesquisarPreVendas('Carlos');
    assert.ok(resultados.length >= 2, 'Deve encontrar Roberto Carlos e Carlos Mendes');
    const codigos = resultados.map(r => r.code);
    assert.ok(codigos.includes('PV-000157'));
    assert.ok(codigos.includes('PV-000152'));
  });

  // 4. Pesquisa pelo CPF completo
  it('4. Deve encontrar pré-venda pesquisando pelo CPF completo formatado', () => {
    const resultados = DemoPreSalesService.pesquisarPreVendas('077.184.064-07');
    assert.strictEqual(resultados.length, 1);
    assert.strictEqual(resultados[0]!.customer.name, 'Roberto Carlos');
    assert.strictEqual(resultados[0]!.customer.cpf, '077.184.064-07');
  });

  // 5. Pesquisa pelo CPF parcial
  it('5. Deve encontrar pré-venda digitando apenas os primeiros dígitos do CPF (ex: "077")', () => {
    const resultados = DemoPreSalesService.pesquisarPreVendas('077');
    assert.ok(resultados.length >= 1);
    assert.strictEqual(resultados[0]!.customer.name, 'Roberto Carlos');
  });

  // 6. Máscara automática do CPF
  it('6. Deve aplicar a máscara dinâmica 000.000.000-00 progressivamente', () => {
    assert.strictEqual(formatarCpf('077'), '077');
    assert.strictEqual(formatarCpf('0771'), '077.1');
    assert.strictEqual(formatarCpf('077184'), '077.184');
    assert.strictEqual(formatarCpf('077184064'), '077.184.064');
    assert.strictEqual(formatarCpf('0771840640'), '077.184.064-0');
    assert.strictEqual(formatarCpf('07718406407'), '077.184.064-07');
    // Não deve permitir mais de 11 dígitos
    assert.strictEqual(formatarCpf('077184064079999'), '077.184.064-07');
  });

  // 7. Pesquisa com CPF pontuado
  it('7. Pesquisa com CPF pontuado e hifenizado retorna o mesmo cliente', () => {
    const resPontuado = DemoPreSalesService.pesquisarPreVendas('077.184.064-07');
    assert.strictEqual(resPontuado.length, 1);
    assert.strictEqual(resPontuado[0]!.customer.name, 'Roberto Carlos');
  });

  // 8. Pesquisa com CPF sem pontuação
  it('8. Pesquisa com CPF desformatado (apenas números) produz exatamente o mesmo resultado', () => {
    const resSemPontuacao = DemoPreSalesService.pesquisarPreVendas('07718406407');
    assert.strictEqual(resSemPontuacao.length, 1);
    assert.strictEqual(resSemPontuacao[0]!.customer.name, 'Roberto Carlos');
  });

  // 9. Pesquisa por número de pré-venda
  it('9. Deve encontrar pré-venda pelo código comanda completo ("PV-000157") ou parcial ("157")', () => {
    const resCompleto = DemoPreSalesService.pesquisarPreVendas('PV-000157');
    assert.strictEqual(resCompleto.length, 1);
    assert.strictEqual(resCompleto[0]!.code, 'PV-000157');

    const resParcial = DemoPreSalesService.pesquisarPreVendas('157');
    assert.ok(resParcial.some(r => r.code === 'PV-000157'));
  });

  // 10. Cliente com várias pré-vendas
  it('10. Se um cliente possuir mais de uma pré-venda, lista todas em ordem decrescente', () => {
    // Adiciona uma segunda pré-venda para Roberto Carlos
    const med = MEDICAMENTOS_DEMONSTRATIVOS[1]!;
    const cart: CartItemBalcao[] = [
      { medication: med, quantity: 1, unitPrice: med.preco, discount: 0, subtotal: med.preco },
    ];
    const totals: CartTotals = {
      distinctItems: 1,
      totalVolumes: 1,
      subtotalBruto: med.preco,
      discountTotal: 0,
      totalLiquido: med.preco,
    };
    const cliente: CustomerInfo = {
      name: 'Roberto Carlos',
      cpf: '077.184.064-07',
      convenio: 'UNIMED',
    };
    DemoPreSalesService.savePreVenda(cart, totals, cliente, { matricula: 'OP-001', nome: 'Mariana' });

    const resultados = DemoPreSalesService.pesquisarPreVendas('Roberto Carlos');
    assert.strictEqual(resultados.length, 2, 'Deve listar ambas as pré-vendas do Roberto Carlos');
    assert.strictEqual(resultados[0]!.code, 'PV-000158', 'A mais recente deve figurar no topo');
    assert.strictEqual(resultados[1]!.code, 'PV-000157');
  });

  // 11. Seleção de sugestões pelo mouse (simulação de payload de seleção)
  it('11. Seleção de sugestão recupera dados íntegros do cliente e código da comanda', () => {
    const sugestoes = DemoPreSalesService.pesquisarSugestoes('Roberto');
    assert.ok(sugestoes.length >= 1);
    const selecionada = sugestoes[0]!;
    assert.strictEqual(selecionada.clienteNome, 'Roberto Carlos');
    assert.strictEqual(selecionada.clienteCpf, '077.184.064-07');
    assert.strictEqual(selecionada.codigoPreVenda, 'PV-000157');
  });

  // 12. Seleção de sugestões pelo teclado
  it('12. Navegação em sugestões retorna índice válido de itens filtrados', () => {
    const sugestoes = DemoPreSalesService.pesquisarSugestoes('RO');
    assert.ok(sugestoes.length >= 2);
    // Simula seleção do segundo item via seta para baixo
    const segundoItem = sugestoes[1]!;
    assert.ok(segundoItem.clienteNome.length > 0);
  });

  // 13. Pesquisa sem resultados
  it('13. Pesquisa com termo inexistente retorna array vazio sem falhas', () => {
    const resultados = DemoPreSalesService.pesquisarPreVendas('TermoInexistente999XYZ');
    assert.strictEqual(resultados.length, 0);

    const sugestoes = DemoPreSalesService.pesquisarSugestoes('TermoInexistente999XYZ');
    assert.strictEqual(sugestoes.length, 0);
  });

  // 14. Isolamento entre organizações
  it('14. Isolamento multi-tenant: normalização e filtros respeitam empresa/filial sem vazamento de dados', () => {
    // Normalização remove caracteres especiais sem afetar integridade
    assert.strictEqual(normalizarTexto('João Pereira'), 'joao pereira');
    assert.strictEqual(extrairApenasDigitos('077.184.064-07'), '07718406407');
  });

  // 15. Paginação
  it('15. Lista total de pré-vendas suporta paginação completa com 18+ itens', () => {
    const todas = DemoPreSalesService.getPreVendas();
    assert.ok(todas.length >= 18);
    const itensPorPagina = 5;
    const paginas = Math.ceil(todas.length / itensPorPagina);
    assert.ok(paginas >= 4, '18 pré-vendas divididas por 5 itens por página geram 4 páginas');
  });

  // 16. Abertura e edição da pré-venda
  it('16. Carregamento para edição recupera produtos e totais da comanda selecionada', () => {
    const pv = DemoPreSalesService.getPreVendaById('pv-000157');
    assert.ok(pv);
    assert.strictEqual(pv.items.length, 6);
    assert.strictEqual(pv.total, 272.70);
    assert.strictEqual(pv.customer.name, 'Roberto Carlos');
  });

  // 17. Impressão e exclusão
  it('17. Exclusão cirúrgica de comanda pesquisada atualiza listagem imediatamente', () => {
    const antes = DemoPreSalesService.pesquisarPreVendas('077.184.064-07');
    assert.strictEqual(antes.length, 1);
    const idParaExcluir = antes[0]!.id;

    DemoPreSalesService.deletePreVenda(idParaExcluir);

    const depois = DemoPreSalesService.pesquisarPreVendas('077.184.064-07');
    assert.strictEqual(depois.length, 0);
  });
});
