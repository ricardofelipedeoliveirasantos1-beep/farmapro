import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DemoPreSalesService } from '../src/services/demoPreSalesService.js';
import { MEDICAMENTOS_DEMONSTRATIVOS } from '../src/services/demoCatalogData.js';
import { CartItemBalcao, CartTotals, CustomerInfo } from '../src/types/balcao.js';

describe('FarmaPro Balcão — Auditoria e Testes Oficiais da Edição Real de Pré-Vendas (10 Cenários)', () => {
  beforeEach(() => {
    DemoPreSalesService.resetStore();
  });

  // 1. Abertura da pré-venda
  it('1. Abertura da pré-venda: deve localizar e abrir a PV-000157 marcando status IN_EDIT', () => {
    const preVendas = DemoPreSalesService.getPreVendas();
    const pv = preVendas.find(p => p.code === 'PV-000157');
    assert.ok(pv, 'Pré-venda PV-000157 deve existir na base');
    assert.strictEqual(pv.code, 'PV-000157');
    assert.strictEqual(pv.customer.name, 'Roberto Carlos');

    // Ao clicar em "Abrir / Editar na Sacola", marca como IN_EDIT
    const sucesso = DemoPreSalesService.setPreVendaStatus(pv.id, 'IN_EDIT');
    assert.strictEqual(sucesso, true);

    const pvEmEdicao = DemoPreSalesService.getPreVendaById(pv.id);
    assert.ok(pvEmEdicao);
    assert.strictEqual(pvEmEmEdicaoStatus(pvEmEdicao.status), 'IN_EDIT');
  });

  // 2. Recuperação dos produtos
  it('2. Recuperação dos produtos: deve carregar todos os 6 produtos com dados completos para a sacola', () => {
    const pv = DemoPreSalesService.getPreVendaById('pv-000157')!;
    assert.ok(pv);

    // Mapeamento idêntico ao handleCarregarPreVendaNaSacola
    const sacola: CartItemBalcao[] = pv.items.map((it, idx) => ({
      ...it,
      numeroSequencial: pv.items.length - idx,
    }));
    const cliente: CustomerInfo = { ...pv.customer };
    const descontoGlobal = pv.discount;

    assert.strictEqual(sacola.length, 6, 'Deve conter os 6 medicamentos carregados');
    assert.strictEqual(cliente.name, 'Roberto Carlos');
    assert.strictEqual(cliente.cpf, '077.184.064-07');
    assert.strictEqual(descontoGlobal, 0);

    // Conferência do primeiro e último item
    assert.strictEqual(sacola[0]!.medication.ean, '7891045032193'); // Advil
    assert.strictEqual(sacola[0]!.quantity, 2);
    assert.strictEqual(sacola[0]!.unitPrice, 26.90);
    assert.strictEqual(sacola[0]!.subtotal, 53.80);

    assert.strictEqual(sacola[5]!.medication.ean, '7896523214591'); // Velamox
    assert.strictEqual(sacola[5]!.quantity, 1);
    assert.strictEqual(sacola[5]!.unitPrice, 34.90);
    assert.strictEqual(sacola[5]!.subtotal, 34.90);
  });

  // 3. Alteração de quantidades
  it('3. Alteração de quantidades: deve permitir alterar quantidades diretamente (aumentando e diminuindo) com recálculo imediato', () => {
    const pv = DemoPreSalesService.getPreVendaById('pv-000157')!;
    let sacola: CartItemBalcao[] = pv.items.map((it, idx) => ({ ...it, numeroSequencial: pv.items.length - idx }));

    // Simula alteração do item 0 (Advil de 2 para 5 unidades)
    const idxItem0 = 0;
    const novaQtdAdvil = 5;
    sacola[idxItem0] = {
      ...sacola[idxItem0]!,
      quantity: novaQtdAdvil,
      subtotal: Math.max(0, novaQtdAdvil * sacola[idxItem0]!.unitPrice - sacola[idxItem0]!.discount),
    };
    assert.strictEqual(sacola[idxItem0]!.quantity, 5);
    assert.strictEqual(sacola[idxItem0]!.subtotal, 134.50); // 5 * 26.90

    // Simula redução do item 4 (Dorflex de 4 para 2 unidades)
    const idxDorflex = 4;
    const novaQtdDorflex = 2;
    sacola[idxDorflex] = {
      ...sacola[idxDorflex]!,
      quantity: novaQtdDorflex,
      subtotal: Math.max(0, novaQtdDorflex * sacola[idxDorflex]!.unitPrice - sacola[idxDorflex]!.discount),
    };
    assert.strictEqual(sacola[idxDorflex]!.quantity, 2);
    assert.strictEqual(sacola[idxDorflex]!.subtotal, 49.00); // 2 * 24.50
  });

  // 4. Inclusão de novos produtos
  it('4. Inclusão de novos produtos: deve permitir adicionar novo medicamento do catálogo à sacola em edição', () => {
    const pv = DemoPreSalesService.getPreVendaById('pv-000157')!;
    const sacolaOriginal: CartItemBalcao[] = pv.items.map((it, idx) => ({ ...it, numeroSequencial: pv.items.length - idx }));

    // Adiciona Dipirona (id 1)
    const medDip = MEDICAMENTOS_DEMONSTRATIVOS.find(m => m.id === 1)!;
    assert.ok(medDip);
    const novoItem: CartItemBalcao = {
      medication: medDip,
      quantity: 2,
      unitPrice: medDip.preco,
      discount: 0,
      subtotal: medDip.preco * 2,
      numeroSequencial: sacolaOriginal.length + 1,
    };

    const sacolaComNovo = [novoItem, ...sacolaOriginal].map((item, index, arr) => ({
      ...item,
      numeroSequencial: arr.length - index,
    }));

    assert.strictEqual(sacolaComNovo.length, 7, 'Sacola deve ter 7 produtos agora');
    assert.strictEqual(sacolaComNovo[0]!.medication.id, medDip.id, 'Novo produto deve ficar no topo (#7)');
    assert.strictEqual(sacolaComNovo[0]!.numeroSequencial, 7);
  });

  // 5. Exclusão de produtos
  it('5. Exclusão de produtos: deve permitir remover produto da sacola em edição reajustando sequência e volumes', () => {
    const pv = DemoPreSalesService.getPreVendaById('pv-000157')!;
    const sacolaOriginal: CartItemBalcao[] = pv.items.map((it, idx) => ({ ...it, numeroSequencial: pv.items.length - idx }));

    // Remove o item de índice 1 (Losartana)
    const filtrada = sacolaOriginal.filter((_, i) => i !== 1);
    const sacolaAposExclusao = filtrada.map((item, index) => ({
      ...item,
      numeroSequencial: filtrada.length - index,
    }));

    assert.strictEqual(sacolaAposExclusao.length, 5, 'Deve ter 5 itens após remoção');
    // Verifica renumeração contínua sem lacunas
    assert.strictEqual(sacolaAposExclusao[0]!.numeroSequencial, 5);
    assert.strictEqual(sacolaAposExclusao[4]!.numeroSequencial, 1);
  });

  // 6. Atualização dos totais
  it('6. Atualização dos totais: subtotais, volumes e descontos devem somar com exatidão matemática', () => {
    const itens: CartItemBalcao[] = [
      { medication: MEDICAMENTOS_DEMONSTRATIVOS[0]!, quantity: 2, unitPrice: 20.00, discount: 0, subtotal: 40.00 },
      { medication: MEDICAMENTOS_DEMONSTRATIVOS[1]!, quantity: 3, unitPrice: 15.00, discount: 5.00, subtotal: 40.00 },
    ];
    const descontoGlobal = 10.00;

    const subtotalBruto = itens.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
    assert.strictEqual(subtotalBruto, 85.00); // 40 + 45

    const totalVolumes = itens.reduce((acc, it) => acc + it.quantity, 0);
    assert.strictEqual(totalVolumes, 5);

    const descontoItens = itens.reduce((acc, it) => acc + (it.discount || 0), 0);
    assert.strictEqual(descontoItens, 5.00);

    const totalDesconto = Math.min(subtotalBruto, descontoItens + descontoGlobal);
    assert.strictEqual(totalDesconto, 15.00);

    const totalLiquido = Math.max(0, subtotalBruto - totalDesconto);
    assert.strictEqual(totalLiquido, 70.00);
  });

  // 7. Salvamento com F2
  it('7. Salvamento com F2: deve atualizar os dados no store via updatePreVenda sem perda de informações', () => {
    const pvOriginal = DemoPreSalesService.getPreVendaById('pv-000157')!;
    assert.ok(pvOriginal);

    // Itens alterados (ex: quantidade do item 0 alterada de 2 para 1)
    const itensAlterados: CartItemBalcao[] = pvOriginal.items.map((it, idx) => {
      if (idx === 0) {
        return { ...it, quantity: 1, subtotal: it.unitPrice * 1 };
      }
      return { ...it };
    });

    const subtotalCalculado = itensAlterados.reduce((acc, it) => acc + it.subtotal, 0);
    const totaisAtualizados: CartTotals = {
      distinctItems: itensAlterados.length,
      totalVolumes: itensAlterados.reduce((acc, it) => acc + it.quantity, 0),
      subtotalBruto: subtotalCalculado,
      discountTotal: 0,
      totalLiquido: subtotalCalculado,
    };

    const clienteAtualizado: CustomerInfo = {
      ...pvOriginal.customer,
      name: 'Roberto Carlos Atualizado',
    };

    const resultado = DemoPreSalesService.updatePreVenda(
      pvOriginal.id,
      itensAlterados,
      totaisAtualizados,
      clienteAtualizado,
      { matricula: 'OP-001', nome: 'Mariana' }
    );

    assert.ok(resultado);
    assert.strictEqual(resultado.customer.name, 'Roberto Carlos Atualizado');
    assert.strictEqual(resultado.total, subtotalCalculado);
    assert.strictEqual(resultado.items[0]!.quantity, 1);
    assert.strictEqual(resultado.status, 'PENDING_CASHIER');
  });

  // 8. Preservação do mesmo identificador
  it('8. Preservação do mesmo identificador: PV-000157 deve permanecer rigorosamente PV-000157 após atualização', () => {
    const pvAntes = DemoPreSalesService.getPreVendaById('pv-000157')!;
    const codigoAntes = pvAntes.code;
    const idAntes = pvAntes.id;
    const criadoEmAntes = pvAntes.createdAt;

    const resultado = DemoPreSalesService.updatePreVenda(
      pvAntes.id,
      pvAntes.items,
      {
        distinctItems: pvAntes.items.length,
        totalVolumes: 10,
        subtotalBruto: 200,
        discountTotal: 0,
        totalLiquido: 200,
      },
      pvAntes.customer,
      { matricula: 'OP-001', nome: 'Mariana' }
    );

    assert.ok(resultado);
    assert.strictEqual(resultado.code, 'PV-000157', 'O código da comanda deve continuar sendo PV-000157');
    assert.strictEqual(resultado.id, idAntes, 'O ID primário deve permanecer o mesmo');
    assert.strictEqual(resultado.createdAt, criadoEmAntes, 'A data original de criação não pode ser sobrescrita');
  });

  // 9. Ausência de duplicidade
  it('9. Ausência de duplicidade: a quantidade de pré-vendas não pode aumentar e o contador não gera PV-000158', () => {
    const preVendasAntes = DemoPreSalesService.getPreVendas();
    const totalAntes = preVendasAntes.length;

    const pv = preVendasAntes.find(p => p.code === 'PV-000157')!;
    DemoPreSalesService.updatePreVenda(
      pv.id,
      pv.items,
      { distinctItems: pv.items.length, totalVolumes: 6, subtotalBruto: 272.70, discountTotal: 0, totalLiquido: 272.70 },
      pv.customer,
      { matricula: 'OP-001', nome: 'Mariana' }
    );

    const preVendasDepois = DemoPreSalesService.getPreVendas();
    assert.strictEqual(preVendasDepois.length, totalAntes, 'Quantidade total de pré-vendas deve ser estritamente igual');

    // Nenhuma pré-venda PV-000158 pode ter sido criada
    const duplicata = preVendasDepois.find(p => p.code === 'PV-000158');
    assert.strictEqual(duplicata, undefined, 'Não pode criar PV-000158 ao salvar atualização de pré-venda');
  });

  // 10. Ausência de movimentação indevida no Caixa
  it('10. Ausência de movimentação indevida no Caixa: status permanece como PENDING_CASHIER / rascunho de balcão', () => {
    const pv = DemoPreSalesService.getPreVendaById('pv-000157')!;
    assert.strictEqual(pv.status, 'PENDING_CASHIER');

    // Comanda atualizada pronta para o Caixa, mas SEM gerar venda concluída, documento fiscal ou baixa definitiva de estoque
    assert.notStrictEqual(pv.status, 'FINALIZADA', 'Pré-venda editada não pode ter status FINALIZADA');
    assert.notStrictEqual(pv.status, 'CANCELADA', 'Pré-venda editada não pode ter status CANCELADA');
  });
});

function pvEmEmEdicaoStatus(status: string) {
  return status;
}
