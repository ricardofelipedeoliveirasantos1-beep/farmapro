import { PreVendaDemo, CartItemBalcao, CartTotals, CustomerInfo } from '../types/balcao.js';
import { DemoPreSalesService, SugestaoPesquisaPreVenda } from './demoPreSalesService.js';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3333/api';

export class PreVendasApiService {
  private static async getHeaders(): Promise<HeadersInit> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('farmapro_auth_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Lista pré-vendas ativas do PostgreSQL (ou fallback demonstrativo se API offline)
   */
  static async listarPreVendas(termo?: string): Promise<PreVendaDemo[]> {
    try {
      const url = termo && termo.trim()
        ? `${API_BASE_URL}/pre-vendas/pesquisa?q=${encodeURIComponent(termo.trim())}`
        : `${API_BASE_URL}/pre-vendas/pendentes`;

      const res = await fetch(url, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.sucesso && Array.isArray(data.preVendas) && data.preVendas.length > 0) {
        // Converte formato da API para PreVendaDemo
        const convertidas: PreVendaDemo[] = data.preVendas.map((pv: any) => ({
          id: pv.id,
          code: pv.codigoComanda,
          createdAt: pv.criadoEm,
          updatedAt: pv.atualizadoEm,
          attendantName: pv.atendenteNome || 'Atendente Balcão',
          customer: {
            name: pv.clienteNome || 'Consumidor Final',
            cpf: pv.clienteCpf || '',
            convenio: 'PARTICULAR',
          },
          items: (pv.itens || []).map((it: any) => ({
            medication: {
              id: it.produtoId,
              descricao: it.nomeProduto,
              codigoInterno: it.codigoBarras || '1000',
              ean: it.codigoBarras || '',
              preco: (it.precoUnitarioCentavos || 0) / 100,
              saldo: 50,
            },
            quantity: Number(it.quantidade),
            unitPrice: (it.precoUnitarioCentavos || 0) / 100,
            discount: (it.descontoUnitarioCentavos || 0) / 100,
            subtotal: (it.totalItemCentavos || 0) / 100,
          })),
          subtotal: (pv.subtotalCentavos || 0) / 100,
          discount: (pv.descontoCentavos || 0) / 100,
          total: (pv.totalCentavos || 0) / 100,
          status: 'PENDING_CASHIER',
        }));
        return convertidas;
      }
    } catch {
      // API offline -> Fallback resiliente para DemoPreSalesService
    }
    return termo && termo.trim()
      ? DemoPreSalesService.pesquisarPreVendas(termo)
      : DemoPreSalesService.getPreVendas();
  }

  /**
   * Salva com F2 uma nova comanda de pré-venda no PostgreSQL
   */
  static async salvarPreVenda(
    cart: CartItemBalcao[],
    totals: CartTotals,
    customer: CustomerInfo,
    vendedor: { matricula: string; nome: string },
    criadoPor?: { id?: string; nome?: string },
  ): Promise<PreVendaDemo> {
    const payload = {
      identificacaoBalcao: 'Balcão 01',
      clienteNome: customer.name || 'Consumidor Final',
      clienteCpf: customer.cpf || null,
      itens: cart.map(it => ({
        produtoId: String(it.medication.id),
        quantidade: it.quantity,
        precoUnitarioCentavos: Math.round(it.unitPrice * 100),
        descontoUnitarioCentavos: Math.round(it.discount * 100),
      })),
      descontoGlobalCentavos: Math.round(totals.discountTotal * 100),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/pre-vendas`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.sucesso && data.preVenda) {
          const pv = data.preVenda;
          const criada: PreVendaDemo = {
            id: pv.id,
            code: pv.codigoComanda,
            createdAt: pv.criadoEm,
            attendantName: `${vendedor.nome} (Balcão)`,
            vendedorMatricula: vendedor.matricula,
            vendedorNome: vendedor.nome,
            customer: { ...customer },
            items: cart.map(i => ({ ...i })),
            subtotal: totals.subtotalBruto,
            discount: totals.discountTotal,
            total: totals.totalLiquido,
            status: 'PENDING_CASHIER',
          };
          // Sincroniza store local
          DemoPreSalesService.savePreVenda(cart, totals, customer, vendedor, criadoPor);
          return criada;
        }
      }
    } catch {
      // Fallback
    }

    return DemoPreSalesService.savePreVenda(cart, totals, customer, vendedor, criadoPor);
  }

  /**
   * Atualiza com F2 uma comanda de pré-venda em edição no PostgreSQL preservando o código
   */
  static async atualizarPreVenda(
    id: string,
    cart: CartItemBalcao[],
    totals: CartTotals,
    customer: CustomerInfo,
    vendedor: { matricula: string; nome: string },
    criadoPor?: { id?: string; nome?: string },
  ): Promise<PreVendaDemo | null> {
    const payload = {
      identificacaoBalcao: 'Balcão 01',
      clienteNome: customer.name || 'Consumidor Final',
      clienteCpf: customer.cpf || null,
      itens: cart.map(it => ({
        produtoId: String(it.medication.id),
        quantidade: it.quantity,
        precoUnitarioCentavos: Math.round(it.unitPrice * 100),
        descontoUnitarioCentavos: Math.round(it.discount * 100),
      })),
      descontoGlobalCentavos: Math.round(totals.discountTotal * 100),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/pre-vendas/${id}`, {
        method: 'PUT',
        headers: await this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.sucesso && data.preVenda) {
          const pv = data.preVenda;
          const atualizada: PreVendaDemo = {
            id: pv.id,
            code: pv.codigoComanda,
            createdAt: pv.criadoEm,
            updatedAt: pv.atualizadoEm || new Date().toISOString(),
            attendantName: `${vendedor.nome} (Balcão)`,
            vendedorMatricula: vendedor.matricula,
            vendedorNome: vendedor.nome,
            customer: { ...customer },
            items: cart.map(i => ({ ...i })),
            subtotal: totals.subtotalBruto,
            discount: totals.discountTotal,
            total: totals.totalLiquido,
            status: 'PENDING_CASHIER',
          };
          DemoPreSalesService.updatePreVenda(id, cart, totals, customer, vendedor, criadoPor);
          return atualizada;
        }
      }
    } catch {
      // Fallback
    }

    return DemoPreSalesService.updatePreVenda(id, cart, totals, customer, vendedor, criadoPor);
  }

  /**
   * Exclui pré-venda pendente no PostgreSQL
   */
  static async excluirPreVenda(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/pre-vendas/${id}`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
      });
      if (res.ok) {
        DemoPreSalesService.deletePreVenda(id);
        return true;
      }
    } catch {
      // Fallback
    }
    return DemoPreSalesService.deletePreVenda(id);
  }

  static obterSugestoesPesquisa(termo: string): SugestaoPesquisaPreVenda[] {
    return DemoPreSalesService.pesquisarSugestoes(termo);
  }
}
