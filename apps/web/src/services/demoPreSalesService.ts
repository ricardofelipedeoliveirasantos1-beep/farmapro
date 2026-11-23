import { PreVendaDemo, CartItemBalcao, CartTotals, CustomerInfo } from '../types/balcao.js';
import { MEDICAMENTOS_DEMONSTRATIVOS } from './demoCatalogData.js';

class DemoPreSalesStore {
  private preVendas: PreVendaDemo[] = [];
  private counter = 157;
  private readonly STORAGE_KEY = 'farmapro_prevendas_store_v1';

  constructor() {
    if (!this.loadLocal()) {
      this.seedInitialPreVendas();
    }
  }

  private loadLocal(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.preVendas = parsed;
            return true;
          }
        }
      } catch {
        // Fallback seguro para seed inicial
      }
    }
    return false;
  }

  private persistLocal(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preVendas));
      } catch {
        // Ignora erro de cota ou modo anônimo
      }
    }
  }

  private seedInitialPreVendas() {
    const medAdvil = MEDICAMENTOS_DEMONSTRATIVOS.find(m => m.ean === '7891045032193') || MEDICAMENTOS_DEMONSTRATIVOS[0]!;
    const medLosart = MEDICAMENTOS_DEMONSTRATIVOS.find(m => m.ean === '7896422506182') || MEDICAMENTOS_DEMONSTRATIVOS[1]!;
    const medAmox = MEDICAMENTOS_DEMONSTRATIVOS.find(m => m.ean === '7891317440121') || MEDICAMENTOS_DEMONSTRATIVOS[2]!;
    const medParacetamol = MEDICAMENTOS_DEMONSTRATIVOS.find(m => m.ean === '7896004708829') || MEDICAMENTOS_DEMONSTRATIVOS[3]!;
    const medDorflex = MEDICAMENTOS_DEMONSTRATIVOS.find(m => m.ean === '7891058001209') || MEDICAMENTOS_DEMONSTRATIVOS[4]!;
    const medVelamox = MEDICAMENTOS_DEMONSTRATIVOS.find(m => m.ean === '7896523214591') || MEDICAMENTOS_DEMONSTRATIVOS[5]!;
    const medDip = MEDICAMENTOS_DEMONSTRATIVOS.find(m => m.id === 1) || MEDICAMENTOS_DEMONSTRATIVOS[0]!;

    // Lista realista baseada rigorosamente na Imagem de referência oficial (18 pré-vendas com dados exatos)
    this.preVendas = [
      {
        id: 'pv-000157',
        code: 'PV-000157',
        createdAt: '2026-11-22T17:35:00.000Z',
        attendantName: 'Mariana (Balcão 01)',
        vendedorMatricula: 'OP-001',
        vendedorNome: 'Mariana',
        customer: {
          name: 'Roberto Carlos',
          cpf: '077.184.064-07',
          convenio: 'PARTICULAR',
        },
        items: [
          { medication: medAdvil, quantity: 2, unitPrice: 26.90, discount: 0, subtotal: 53.80 },
          { medication: medLosart, quantity: 1, unitPrice: 6.50, discount: 0, subtotal: 6.50 },
          { medication: medAmox, quantity: 3, unitPrice: 19.90, discount: 0, subtotal: 59.70 },
          { medication: medParacetamol, quantity: 2, unitPrice: 9.90, discount: 0, subtotal: 19.80 },
          { medication: medDorflex, quantity: 4, unitPrice: 24.50, discount: 0, subtotal: 98.00 },
          { medication: medVelamox, quantity: 1, unitPrice: 34.90, discount: 0, subtotal: 34.90 },
        ],
        subtotal: 272.70,
        discount: 0,
        total: 272.70,
        status: 'PENDING_CASHIER', // Apresentado como "Salva" (verde)
      },
      {
        id: 'pv-000156',
        code: 'PV-000156',
        createdAt: '2026-11-22T16:20:00.000Z',
        attendantName: 'Carlos Silva (Balcão 02)',
        vendedorMatricula: 'CX-001',
        vendedorNome: 'Carlos Silva',
        customer: {
          name: 'João Pereira',
          cpf: '987.654.321-02',
          convenio: 'BRADESCO SAÚDE',
        },
        items: [
          { medication: medAmox, quantity: 4, unitPrice: 19.90, discount: 0, subtotal: 79.60 },
          { medication: medAdvil, quantity: 3, unitPrice: 26.90, discount: 0, subtotal: 80.70 },
          { medication: medDorflex, quantity: 2, unitPrice: 29.75, discount: 0, subtotal: 59.50 },
        ],
        subtotal: 219.80,
        discount: 0,
        total: 219.80,
        status: 'PENDING_CASHIER', // Apresentado como "Salva" (verde)
      },
      {
        id: 'pv-000154',
        code: 'PV-000154',
        createdAt: '2026-11-22T15:10:00.000Z',
        attendantName: 'Mariana (Balcão 01)',
        vendedorMatricula: 'OP-001',
        vendedorNome: 'Mariana',
        customer: {
          name: 'Consumidor Final',
          cpf: '',
          convenio: 'NENHUM',
        },
        items: [
          { medication: medDorflex, quantity: 2, unitPrice: 24.50, discount: 0, subtotal: 49.00 },
          { medication: medAmox, quantity: 1, unitPrice: 20.90, discount: 0, subtotal: 20.90 },
        ],
        subtotal: 69.90,
        discount: 0,
        total: 69.90,
        status: 'PENDING_CASHIER', // Apresentado como "Salva" (verde)
      },
      {
        id: 'pv-000153',
        code: 'PV-000153',
        createdAt: '2026-11-22T14:05:00.000Z',
        attendantName: 'Roberto (Balcão 03)',
        vendedorMatricula: 'OP-003',
        vendedorNome: 'Roberto',
        customer: {
          name: 'Ana Costa',
          cpf: '234.567.890-03',
          convenio: 'UNIMED NACIONAL',
        },
        items: [
          { medication: medAdvil, quantity: 3, unitPrice: 26.90, discount: 0, subtotal: 80.70 },
          { medication: medLosart, quantity: 2, unitPrice: 33.40, discount: 0, subtotal: 66.80 },
        ],
        subtotal: 147.50,
        discount: 0,
        total: 147.50,
        status: 'IN_EDIT', // Apresentado como "Em edição" (azul claro)
      },
      {
        id: 'pv-000152',
        code: 'PV-000152',
        createdAt: '2026-11-22T11:47:00.000Z',
        attendantName: 'Carlos Silva (Balcão 02)',
        vendedorMatricula: 'CX-001',
        vendedorNome: 'Carlos Silva',
        customer: {
          name: 'Carlos Mendes',
          cpf: '345.678.901-04',
          convenio: 'PARTICULAR',
        },
        items: [
          { medication: medAmox, quantity: 3, unitPrice: 19.90, discount: 0, subtotal: 59.70 },
          { medication: medDorflex, quantity: 3, unitPrice: 43.40, discount: 0, subtotal: 130.20 },
        ],
        subtotal: 189.90,
        discount: 0,
        total: 189.90,
        status: 'PENDING_CASHIER', // Apresentado como "Salva" (verde)
      },
      // Registro de suporte para exemplo do prompt (digitar "RO" sugere Roberto Carlos e Rodrigo Silva)
      {
        id: 'pv-000151',
        code: 'PV-000151',
        createdAt: '2026-11-22T10:30:00.000Z',
        attendantName: 'Mariana (Balcão 01)',
        vendedorMatricula: 'OP-001',
        vendedorNome: 'Mariana',
        customer: {
          name: 'Rodrigo Silva',
          cpf: '123.456.789-00',
          convenio: 'BRADESCO SAÚDE',
        },
        items: [
          { medication: medAdvil, quantity: 2, unitPrice: 26.90, discount: 0, subtotal: 53.80 },
          { medication: medDip, quantity: 2, unitPrice: 37.55, discount: 0, subtotal: 75.10 },
        ],
        subtotal: 128.90,
        discount: 0,
        total: 128.90,
        status: 'PENDING_CASHIER',
      },
      // Páginas seguintes (para totalizar 18 pré-vendas e habilitar paginação real)
      {
        id: 'pv-000151',
        code: 'PV-000151',
        createdAt: '2026-11-22T10:30:00.000Z',
        attendantName: 'Mariana (Balcão 01)',
        vendedorMatricula: 'OP-001',
        vendedorNome: 'Mariana',
        customer: { name: 'Lucas Ferreira', cpf: '456.789.012-05', convenio: 'SULAMERICA' },
        items: [{ medication: medDip, quantity: 3, unitPrice: 15.00, discount: 0, subtotal: 45.00 }],
        subtotal: 45.00,
        discount: 0,
        total: 45.00,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000150',
        code: 'PV-000150',
        createdAt: '2026-11-22T10:00:00.000Z',
        attendantName: 'Roberto (Balcão 03)',
        vendedorMatricula: 'OP-003',
        vendedorNome: 'Roberto',
        customer: { name: 'Patricia Souza', cpf: '567.890.123-06', convenio: 'BRADESCO SAÚDE' },
        items: [{ medication: medAmox, quantity: 2, unitPrice: 38.90, discount: 0, subtotal: 77.80 }],
        subtotal: 77.80,
        discount: 0,
        total: 77.80,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000149',
        code: 'PV-000149',
        createdAt: '2026-11-22T09:40:00.000Z',
        attendantName: 'Carlos Silva (Balcão 02)',
        vendedorMatricula: 'CX-001',
        vendedorNome: 'Carlos Silva',
        customer: { name: 'Fernanda Lima', cpf: '678.901.234-07', convenio: 'PARTICULAR' },
        items: [{ medication: medAdvil, quantity: 2, unitPrice: 26.90, discount: 0, subtotal: 53.80 }],
        subtotal: 53.80,
        discount: 0,
        total: 53.80,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000148',
        code: 'PV-000148',
        createdAt: '2026-11-22T09:15:00.000Z',
        attendantName: 'Mariana (Balcão 01)',
        vendedorMatricula: 'OP-001',
        vendedorNome: 'Mariana',
        customer: { name: 'Consumidor Final', cpf: '', convenio: 'NENHUM' },
        items: [{ medication: medDorflex, quantity: 1, unitPrice: 26.90, discount: 0, subtotal: 26.90 }],
        subtotal: 26.90,
        discount: 0,
        total: 26.90,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000147',
        code: 'PV-000147',
        createdAt: '2026-11-22T08:50:00.000Z',
        attendantName: 'Roberto (Balcão 03)',
        vendedorMatricula: 'OP-003',
        vendedorNome: 'Roberto',
        customer: { name: 'Rodrigo Alves', cpf: '789.012.345-08', convenio: 'UNIMED' },
        items: [{ medication: medAmox, quantity: 3, unitPrice: 29.90, discount: 0, subtotal: 89.70 }],
        subtotal: 89.70,
        discount: 0,
        total: 89.70,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000146',
        code: 'PV-000146',
        createdAt: '2026-11-21T18:30:00.000Z',
        attendantName: 'Carlos Silva (Balcão 02)',
        vendedorMatricula: 'CX-001',
        vendedorNome: 'Carlos Silva',
        customer: { name: 'Aline Barbosa', cpf: '890.123.456-09', convenio: 'PARTICULAR' },
        items: [{ medication: medDip, quantity: 2, unitPrice: 11.90, discount: 0, subtotal: 23.80 }],
        subtotal: 23.80,
        discount: 0,
        total: 23.80,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000145',
        code: 'PV-000145',
        createdAt: '2026-11-21T17:10:00.000Z',
        attendantName: 'Mariana (Balcão 01)',
        vendedorMatricula: 'OP-001',
        vendedorNome: 'Mariana',
        customer: { name: 'Thiago Martins', cpf: '901.234.567-10', convenio: 'BRADESCO SAÚDE' },
        items: [{ medication: medDorflex, quantity: 4, unitPrice: 24.50, discount: 0, subtotal: 98.00 }],
        subtotal: 98.00,
        discount: 0,
        total: 98.00,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000144',
        code: 'PV-000144',
        createdAt: '2026-11-21T16:00:00.000Z',
        attendantName: 'Roberto (Balcão 03)',
        vendedorMatricula: 'OP-003',
        vendedorNome: 'Roberto',
        customer: { name: 'Camila Rocha', cpf: '012.345.678-11', convenio: 'UNIMED' },
        items: [{ medication: medAdvil, quantity: 1, unitPrice: 26.90, discount: 0, subtotal: 26.90 }],
        subtotal: 26.90,
        discount: 0,
        total: 26.90,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000143',
        code: 'PV-000143',
        createdAt: '2026-11-21T14:45:00.000Z',
        attendantName: 'Mariana (Balcão 01)',
        vendedorMatricula: 'OP-001',
        vendedorNome: 'Mariana',
        customer: { name: 'Bruno Castro', cpf: '123.098.765-12', convenio: 'PARTICULAR' },
        items: [{ medication: medAmox, quantity: 2, unitPrice: 19.90, discount: 0, subtotal: 39.80 }],
        subtotal: 39.80,
        discount: 0,
        total: 39.80,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000142',
        code: 'PV-000142',
        createdAt: '2026-11-21T13:20:00.000Z',
        attendantName: 'Carlos Silva (Balcão 02)',
        vendedorMatricula: 'CX-001',
        vendedorNome: 'Carlos Silva',
        customer: { name: 'Juliana Dias', cpf: '234.109.876-13', convenio: 'SULAMERICA' },
        items: [{ medication: medDorflex, quantity: 3, unitPrice: 25.00, discount: 0, subtotal: 75.00 }],
        subtotal: 75.00,
        discount: 0,
        total: 75.00,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000141',
        code: 'PV-000141',
        createdAt: '2026-11-21T11:00:00.000Z',
        attendantName: 'Roberto (Balcão 03)',
        vendedorMatricula: 'OP-003',
        vendedorNome: 'Roberto',
        customer: { name: 'Guilherme Pires', cpf: '345.210.987-14', convenio: 'PARTICULAR' },
        items: [{ medication: medDip, quantity: 1, unitPrice: 7.99, discount: 0, subtotal: 7.99 }],
        subtotal: 7.99,
        discount: 0,
        total: 7.99,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000140',
        code: 'PV-000140',
        createdAt: '2026-11-21T10:15:00.000Z',
        attendantName: 'Mariana (Balcão 01)',
        vendedorMatricula: 'OP-001',
        vendedorNome: 'Mariana',
        customer: { name: 'Beatriz Fonseca', cpf: '456.321.098-15', convenio: 'BRADESCO SAÚDE' },
        items: [{ medication: medAdvil, quantity: 2, unitPrice: 26.90, discount: 0, subtotal: 53.80 }],
        subtotal: 53.80,
        discount: 0,
        total: 53.80,
        status: 'PENDING_CASHIER',
      },
      {
        id: 'pv-000139',
        code: 'PV-000139',
        createdAt: '2026-11-21T09:30:00.000Z',
        attendantName: 'Carlos Silva (Balcão 02)',
        vendedorMatricula: 'CX-001',
        vendedorNome: 'Carlos Silva',
        customer: { name: 'Renato Nogueira', cpf: '567.432.109-16', convenio: 'UNIMED' },
        items: [{ medication: medDorflex, quantity: 2, unitPrice: 24.50, discount: 0, subtotal: 49.00 }],
        subtotal: 49.00,
        discount: 0,
        total: 49.00,
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
    const code = `PV-${String(this.counter).padStart(6, '0')}`;

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
    this.persistLocal();
    return newPv;
  }

  deletePreVenda(id: string): boolean {
    const idx = this.preVendas.findIndex(p => p.id === id);
    if (idx >= 0) {
      this.preVendas.splice(idx, 1);
      this.persistLocal();
      return true;
    }
    return false;
  }

  updatePreVenda(
    id: string,
    cart: CartItemBalcao[],
    totals: CartTotals,
    customer: CustomerInfo,
    vendedor: { matricula: string; nome: string },
    criadoPor?: { id?: string; nome?: string },
  ): PreVendaDemo | null {
    const idx = this.preVendas.findIndex(p => p.id === id);
    if (idx < 0) return null;

    const existing = this.preVendas[idx]!;
    const updatedPv: PreVendaDemo = {
      ...existing,
      updatedAt: new Date().toISOString(),
      vendedorMatricula: vendedor.matricula,
      vendedorNome: vendedor.nome,
      attendantName: `${vendedor.nome} (Balcão)`,
      criadoPorUsuarioId: criadoPor?.id || existing.criadoPorUsuarioId,
      criadoPorNome: criadoPor?.nome || existing.criadoPorNome,
      customer: { ...customer },
      items: cart.map(i => ({ ...i })),
      subtotal: totals.subtotalBruto,
      discount: totals.discountTotal,
      total: totals.totalLiquido,
      status: 'PENDING_CASHIER', // Retorna para a fila de espera do Caixa atualizada
    };

    this.preVendas[idx] = updatedPv;
    this.persistLocal();
    return updatedPv;
  }

  setPreVendaStatus(id: string, status: PreVendaDemo['status']): boolean {
    const pv = this.preVendas.find(p => p.id === id);
    if (pv) {
      pv.status = status;
      this.persistLocal();
      return true;
    }
    return false;
  }

  getPreVendaById(id: string): PreVendaDemo | null {
    return this.preVendas.find(p => p.id === id) || null;
  }

  cancelPreVenda(id: string): boolean {
    const pv = this.preVendas.find(p => p.id === id);
    if (pv && pv.status === 'PENDING_CASHIER') {
      pv.status = 'CANCELLED';
      this.persistLocal();
      return true;
    }
    return false;
  }

  pesquisarPreVendas(termo: string): PreVendaDemo[] {
    const termoLimpo = normalizarTexto(termo);
    if (!termoLimpo) return [...this.preVendas];

    const digitosBusca = extrairApenasDigitos(termo);

    return this.preVendas.filter(pv => {
      const matchCodigo = normalizarTexto(pv.code).includes(termoLimpo);
      const matchNome = normalizarTexto(pv.customer.name).includes(termoLimpo);
      const digitosCpf = extrairApenasDigitos(pv.customer.cpf || '');
      const matchCpf = (digitosBusca.length > 0 && digitosCpf.length > 0)
        ? digitosCpf.includes(digitosBusca)
        : false;
      return matchCodigo || matchNome || matchCpf;
    });
  }

  pesquisarSugestoes(termo: string): SugestaoPesquisaPreVenda[] {
    const termoLimpo = normalizarTexto(termo);
    if (!termoLimpo) return [];

    const preVendasFiltradas = this.pesquisarPreVendas(termo);
    const sugestoes: SugestaoPesquisaPreVenda[] = [];
    const chavesVistas = new Set<string>();

    for (const pv of preVendasFiltradas) {
      const chave = `${pv.customer.name}-${pv.customer.cpf || ''}-${pv.code}`;
      if (!chavesVistas.has(chave)) {
        chavesVistas.add(chave);
        sugestoes.push({
          clienteNome: pv.customer.name,
          clienteCpf: formatarCpf(pv.customer.cpf || ''),
          codigoPreVenda: pv.code,
          total: pv.total,
          preVendaId: pv.id,
        });
      }
      if (sugestoes.length >= 8) break;
    }

    return sugestoes;
  }

  resetStore() {
    this.counter = 157;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(this.STORAGE_KEY);
      } catch {
        // Ignora
      }
    }
    this.seedInitialPreVendas();
  }
}

export interface SugestaoPesquisaPreVenda {
  clienteNome: string;
  clienteCpf: string;
  codigoPreVenda: string;
  total: number;
  preVendaId: string;
}

export function normalizarTexto(txt: string): string {
  return (txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function extrairApenasDigitos(txt: string): string {
  return (txt || '').replace(/\D/g, '');
}

export function formatarCpf(cpf: string): string {
  const digitos = extrairApenasDigitos(cpf).slice(0, 11);
  if (!digitos) return '';
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
}

export const DemoPreSalesService = new DemoPreSalesStore();
