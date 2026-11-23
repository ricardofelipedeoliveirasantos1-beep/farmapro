import { MedicamentoDemonstrativo } from '../services/demoCatalogData.js';

export type SearchMode = 'NAME' | 'PRINCIPIO' | 'EAN' | 'CODE';
export type DiscountMode = 'PCT' | 'VAL';

export interface CartItemBalcao {
  numeroSequencial?: number;
  medication: MedicamentoDemonstrativo;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface CustomerInfo {
  name: string;
  cpf: string;
  convenio: string;
}

export interface VendedorResponsavel {
  id: string;
  matricula: string;
  nome: string;
  cargoNome: string;
}

export interface PreVendaDemo {
  id: string;
  code: string;
  createdAt: string;
  updatedAt?: string;
  attendantName: string; // Mantido para compatibilidade
  vendedorMatricula: string;
  vendedorNome: string;
  criadoPorUsuarioId?: string;
  criadoPorNome?: string;
  customer: CustomerInfo;
  items: CartItemBalcao[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'PENDING_CASHIER' | 'IN_EDIT' | 'CANCELLED' | 'COMPLETED';
}

export interface CartTotals {
  distinctItems: number;
  totalVolumes: number;
  subtotalBruto: number;
  discountTotal: number;
  totalLiquido: number;
}
