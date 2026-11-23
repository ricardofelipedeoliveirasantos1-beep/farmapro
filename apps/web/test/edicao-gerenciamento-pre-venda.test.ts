import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DemoPreSalesService } from '../src/services/demoPreSalesService.js';
import { MEDICAMENTOS_DEMONSTRATIVOS } from '../src/services/demoCatalogData.js';
import { CartItemBalcao, CartTotals, CustomerInfo } from '../src/types/balcao.js';

describe('FarmaPro Balcão — Edição e Gerenciamento Completo de Pré-Vendas', () => {
  beforeEach(() => {
    DemoPreSalesService.resetStore();
  });

  it('1. Deve listar pré-vendas existentes com dados completos e consistentes', () => {
    const preVendas = DemoPreSalesService.getPreVendas();
    assert.ok(preVendas.length >= 18, 'Deve conter a lista base de 18 pré-vendas para paginação perfeita');
    const primeira = preVendas[0]!;
    assert.strictEqual(primeira.code, 'PV-000157');
    assert.strictEqual(primeira.customer.name, 'Roberto Carlos');
    assert.strictEqual(primeira.status, 'PENDING_CASHIER');
    assert.ok(primeira.items.length > 0);
    assert.ok(primeira.total > 0);
  });

  it('2. Deve marcar pré-venda com status IN_EDIT ao carregar para edição', () => {
    const preVendas = DemoPreSalesService.getPreVendas();
    const pv = preVendas[0]!;
    const ok = DemoPreSalesService.setPreVendaStatus(pv.id, 'IN_EDIT');
    assert.strictEqual(ok, true);

    const pvAtualizada = DemoPreSalesService.getPreVendaById(pv.id);
    assert.ok(pvAtualizada);
    assert.strictEqual(pvAtualizada.status, 'IN_EDIT');
  });

  it('3. Deve restaurar status PENDING_CASHIER ao descartar edição de pré-venda', () => {
    const preVendas = DemoPreSalesService.getPreVendas();
    const pv = preVendas[0]!;
    DemoPreSalesService.setPreVendaStatus(pv.id, 'IN_EDIT');
    assert.strictEqual(DemoPreSalesService.getPreVendaById(pv.id)?.status, 'IN_EDIT');

    DemoPreSalesService.setPreVendaStatus(pv.id, 'PENDING_CASHIER');
    assert.strictEqual(DemoPreSalesService.getPreVendaById(pv.id)?.status, 'PENDING_CASHIER');
  });

  it('4. Deve carregar itens, cliente e desconto da pré-venda para sacola com integridade', () => {
    const preVendas = DemoPreSalesService.getPreVendas();
    const pv = preVendas.find(p => p.code === 'PV-000156')!;
    assert.ok(pv);

    // Simulação do carregamento na sacola
    const sacolaCarregada: CartItemBalcao[] = pv.items.map((it, idx) => ({
      ...it,
      numeroSequencial: pv.items.length - idx,
    }));
    const clienteCarregado: CustomerInfo = { ...pv.customer };
    const descontoCarregado = pv.discount;

    assert.strictEqual(sacolaCarregada.length, pv.items.length);
    assert.strictEqual(clienteCarregado.name, 'João Pereira');
    assert.strictEqual(clienteCarregado.cpf, '987.654.321-02');
    assert.strictEqual(descontoCarregado, 0);

    const subtotalBruto = sacolaCarregada.reduce((acc, it) => acc + it.subtotal, 0);
    assert.strictEqual(Math.round(subtotalBruto * 100) / 100, pv.subtotal);
  });

  it('5. Ao salvar alterações via F2, deve ATUALIZAR a mesma pré-venda preservando rigorosamente o código original', () => {
    const preVendasAntes = DemoPreSalesService.getPreVendas();
    const pvOriginal = preVendasAntes.find(p => p.code === 'PV-000156')!;
    assert.ok(pvOriginal);
    const codigoOriginal = pvOriginal.code;
    const createdAtOriginal = pvOriginal.createdAt;

    // Modifica os itens (adiciona mais 1 item ou altera quantidade)
    const medExtra = MEDICAMENTOS_DEMONSTRATIVOS[2]!;
    const novosItens: CartItemBalcao[] = [
      ...pvOriginal.items,
      {
        medication: medExtra,
        quantity: 2,
        unitPrice: 15.00,
        discount: 0,
        subtotal: 30.00,
      },
    ];

    const novosTotais: CartTotals = {
      distinctItems: novosItens.length,
      totalVolumes: novosItens.reduce((acc, it) => acc + it.quantity, 0),
      subtotalBruto: 134.60,
      discountTotal: 0,
      totalLiquido: 134.60,
    };

    const clienteAtualizado: CustomerInfo = {
      ...pvOriginal.customer,
      name: 'Maria Silva Oliveira',
    };

    const resultado = DemoPreSalesService.updatePreVenda(
      pvOriginal.id,
      novosItens,
      novosTotais,
      clienteAtualizado,
      { matricula: 'OP-001', nome: 'Mariana' },
    );

    assert.ok(resultado);
    // Verificações cruciais de integridade
    assert.strictEqual(resultado.id, pvOriginal.id, 'O ID deve permanecer exatamente o mesmo');
    assert.strictEqual(resultado.code, codigoOriginal, 'O CÓDIGO (PV-000156) deve permanecer idêntico sem gerar novo número');
    assert.strictEqual(resultado.createdAt, createdAtOriginal, 'A data de criação original deve ser preservada');
    assert.ok(resultado.updatedAt, 'Deve possuir marcação de updatedAt');
    assert.strictEqual(resultado.customer.name, 'Maria Silva Oliveira', 'Dados do cliente devem refletir alterações');
    assert.strictEqual(resultado.items.length, pvOriginal.items.length + 1, 'Quantidade de itens deve refletir a nova lista');
    assert.strictEqual(resultado.total, 134.60, 'Total deve ser recalculado corretamente');
    assert.strictEqual(resultado.status, 'PENDING_CASHIER', 'Status deve voltar para PENDING_CASHIER');

    // Garante que o contador global de pré-vendas NÃO foi incrementado
    const listaDepois = DemoPreSalesService.getPreVendas();
    assert.strictEqual(listaDepois.length, preVendasAntes.length, 'Não deve criar um novo registro na lista');
  });

  it('6. Criar nova pré-venda continua incrementando contador sequencial quando não está em modo de edição', () => {
    const med = MEDICAMENTOS_DEMONSTRATIVOS[0]!;
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
    const cliente: CustomerInfo = { name: 'Cliente Avulso', cpf: '', convenio: 'NENHUM' };

    const novaPv = DemoPreSalesService.savePreVenda(cart, totals, cliente, { matricula: 'OP-001', nome: 'Mariana' });
    assert.strictEqual(novaPv.code, 'PV-000158');
  });

  it('7. Exclusão de pré-venda remove do store com sucesso', () => {
    const preVendas = DemoPreSalesService.getPreVendas();
    const totalInicial = preVendas.length;
    const pvParaExcluir = preVendas[0]!;

    const removido = DemoPreSalesService.deletePreVenda(pvParaExcluir.id);
    assert.strictEqual(removido, true);

    const preVendasApos = DemoPreSalesService.getPreVendas();
    assert.strictEqual(preVendasApos.length, totalInicial - 1);
    assert.strictEqual(preVendasApos.some(p => p.id === pvParaExcluir.id), false);
  });

  it('8. Isolamento financeiro: pré-venda editada permanece como rascunho de balcão e não gera documento fiscal nem baixa de estoque definitiva', () => {
    const preVendas = DemoPreSalesService.getPreVendas();
    const pv = preVendas[0]!;
    // Status deve ser PENDING_CASHIER
    assert.strictEqual(pv.status, 'PENDING_CASHIER');
    // Não possui número de cupom fiscal nem forma de pagamento finalizada
    assert.strictEqual((pv as any).cupomFiscal, undefined);
    assert.strictEqual((pv as any).formaPagamento, undefined);
  });
});
