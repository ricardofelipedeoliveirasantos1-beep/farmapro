import { PreVendaDemo, CartItemBalcao, CartTotals, CustomerInfo } from '../types/balcao.js';
import { MEDICAMENTOS_DEMONSTRATIVOS } from './demoCatalogData.js';

class DemoPreSalesStore {
  private preVendas: PreVendaDemo[] = [];
  private counter = 1048;

  constructor() {
    this.seedInitialPreVendas();
  }

  private seedInitialPreVendas() {
    const med1 = MEDICAMENTOS_DEMONSTRATIVOS.find(m => m.id === 1) || MEDICAMENTOS_DEMONSTRATIVOS[0]!;
    const med4 = MEDICAMENTOS_DEMONSTRATIVOS.find(m => m.id === 4) || MEDICAMENTOS_DEMONSTRATIVOS[1]!;

    this.preVendas = [
      {
        id: 'pv-mock-01',
        code: 'PV-1047',
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        attendantName: 'Carlos Silva (Balcão 02)',
        vendedorMatricula: 'CX-001',
        vendedorNome: 'Carlos Silva',
        criadoPorUsuarioId: '10000000-0000-4000-8000-000000000001',
        criadoPorNome: 'Carlos Silva',
        customer: {
          name: 'Maria Oliveira Santos',
          cpf: '123.456.789-00',
          convenio: 'CONVÊNIO BRADESCO SAÚDE',
        },
        items: [
          {
            medication: med1,
            quantity: 1,
            unitPrice: med1.preco,
            discount: 2.0,
            subtotal: med1.preco - 2.0,
          },
        ],
        subtotal: med1.preco,
        discount: 2.0,
        total: med1.preco - 2.0,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-mock-02',
        code: 'PV-1048',
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        attendantName: 'Mariana Atendente (Balcão 01)',
        vendedorMatricula: 'BC-002',
        vendedorNome: 'Mariana Atendente',
        criadoPorUsuarioId: '10000000-0000-4000-8000-000000000002',
        criadoPorNome: 'Mariana Atendente',
        customer: {
          name: 'João da Silva',
          cpf: '987.654.321-99',
          convenio: 'À VISTA / PARTICULAR',
        },
        items: [
          {
            medication: med4,
            quantity: 2,
            unitPrice: med4.preco,
            discount: 0,
            subtotal: med4.preco * 2,
          },
        ],
        subtotal: med4.preco * 2,
        discount: 0,
        total: med4.preco * 2,
        status: 'PENDING_CASHIER',
      },
    ];
  }

  getPreVendas(): PreVendaDemo[] {
    return [...this.preVendas];
  }

  getPendingCount(): number {
    return this.preVendas.filter(pv => pv.status === 'PENDING_CASHIER').length;
  }

  savePreVenda(
    cart: CartItemBalcao[],
    totals: CartTotals,
    customer: CustomerInfo,
    vendedor: { matricula: string; nome: string },
    criadoPor?: { id?: string; nome?: string },
  ): PreVendaDemo {
    this.counter++;
    const code = `PV-${this.counter}`;

    const newPv: PreVendaDemo = {
      id: `pv-demo-${Date.now()}-${this.counter}`,
      code,
      createdAt: new Date().toISOString(),
      attendantName: `${vendedor.nome} (Balcão)`,
      vendedorMatricula: vendedor.matricula,
      vendedorNome: vendedor.nome,
      criadoPorUsuarioId: criadoPor?.id,
      criadoPorNome: criadoPor?.nome || 'Operador Balcão',
      customer: { ...customer },
      items: cart.map(i => ({ ...i })),
      subtotal: totals.subtotalBruto,
      discount: totals.discountTotal,
      total: totals.totalLiquido,
      status: 'PENDING_CASHIER',
    };

    // Insere no início da lista (sem alterar retroativamente nenhuma pré-venda anterior)
    this.preVendas.unshift(newPv);
    return newPv;
  }

  cancelPreVenda(id: string): boolean {
    const pv = this.preVendas.find(p => p.id === id);
    if (pv && pv.status === 'PENDING_CASHIER') {
      pv.status = 'CANCELLED';
      return true;
    }
    return false;
  }

  resetStore() {
    this.counter = 1048;
    this.seedInitialPreVendas();
  }
}

export const DemoPreSalesService = new DemoPreSalesStore();
