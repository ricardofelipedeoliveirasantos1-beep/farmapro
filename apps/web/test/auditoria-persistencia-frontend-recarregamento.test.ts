import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DemoPreSalesService } from '../src/services/demoPreSalesService.js';
import { MEDICAMENTOS_DEMONSTRATIVOS } from '../src/services/demoCatalogData.js';

describe('FarmaPro — Auditoria Frontend de Persistência e Comportamento ao Recarregar Aplicação', () => {
  it('1. Deve comprovar que alterações em PV-000157 são salvas apenas em memória na sessão atual', () => {
    const pv157 = DemoPreSalesService.getPreVendaById('pv-000157');
    assert.ok(pv157, 'PV-000157 deve existir na lista inicial de demonstração');
    assert.strictEqual(pv157.code, 'PV-000157');
    assert.strictEqual(pv157.items.length, 6);

    // Alterar quantidade de um item (Dorflex de 4 para 10)
    const itemDorflex = pv157.items.find(i => (i.medication.descricao || '').toUpperCase().includes('DORFLEX'))!;
    const novosItens = [
      {
        ...itemDorflex,
        quantity: 10,
        subtotal: 10 * itemDorflex.unitPrice,
      },
      // Adicionar novo medicamento (ex: Novalgina)
      {
        medication: MEDICAMENTOS_DEMONSTRATIVOS[0]!,
        quantity: 2,
        unitPrice: 26.90,
        discount: 0,
        subtotal: 53.80,
      },
    ];

    const novoTotal = novosItens.reduce((acc, i) => acc + i.subtotal, 0);

    const atualizado = DemoPreSalesService.updatePreVenda(
      'pv-000157',
      novosItens,
      { subtotalBruto: novoTotal, discountTotal: 0, totalLiquido: novoTotal, itemsCount: novosItens.length, totalVolume: 12 },
      pv157.customer,
      { matricula: 'OP-001', nome: 'Mariana' },
      { id: 'usr-1', nome: 'Roberto Carlos' }
    );

    assert.ok(atualizado);
    assert.strictEqual(atualizado.code, 'PV-000157');
    assert.strictEqual(atualizado.items.length, 2);

    // Na sessão em memória, a alteração persiste
    const pvConsultada = DemoPreSalesService.getPreVendaById('pv-000157');
    assert.strictEqual(pvConsultada?.items.length, 2);
  });

  it('2. Deve comprovar que ao recarregar a aplicação (novo ciclo do navegador), a memória é reiniciada a partir dos mocks', async () => {
    // Ao recarregar a aplicação web (F5), um novo ciclo do navegador importa o módulo novamente.
    // Como os dados não foram persistidos em banco de dados real via HTTP (PUT /api/pre-vendas),
    // o estado inicial da aplicação sempre recarrega o mock com 6 itens e R$ 272,70.
    const novoModulo = await import(`../src/services/demoPreSalesService.js?t=${Date.now()}`);
    // O mock estático original contém exatamente 6 itens para PV-000157
    const pvFresh = novoModulo.DemoPreSalesService.getPreVendas().find((p: any) => p.code === 'PV-000157');
    assert.ok(pvFresh);
    assert.strictEqual(
      pvFresh.items.length,
      6,
      'Após F5 / recarregar a aplicação, os dados voltam ao estado estático inicial de 6 itens'
    );
  });
});
