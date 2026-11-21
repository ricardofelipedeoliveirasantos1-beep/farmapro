import { MedicamentoDemonstrativo } from '../services/demoCatalogData.js';

export type SearchMode = 'NAME' | 'PRINCIPIO' | 'EAN' | 'CODE';
export type DiscountMode = 'PCT' | 'VAL';

export interface CartItemBalcao {
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

export interface PreVendaDemo {
  id: string;
  code: string;
  createdAt: string;
  attendantName: string;
  customer: CustomerInfo;
  items: CartItemBalcao[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'PENDING_CASHIER' | 'CANCELLED' | 'COMPLETED';
}

export interface CartTotals {
  distinctItems: number;
  totalVolumes: number;
  subtotalBruto: number;
  discountTotal: number;
  totalLiquido: number;
}
