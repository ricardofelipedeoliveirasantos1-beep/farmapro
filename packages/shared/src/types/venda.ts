import { AuditoriaEntidade, Identificador, ValorMonetarioCentavos } from './comum';

export type StatusVenda = 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA' | 'ESTORNADA';

export type FormaPagamento =
  | 'DINHEIRO'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'PIX'
  | 'CREDIARIO'
  | 'CARTEIRA_CREDITO';

export interface ItemVenda {
  id: Identificador;
  produtoId: Identificador;
  loteId?: Identificador;
  codigoBarras: string;
  nomeProduto: string;
  apresentacao: string;
  quantidade: number;
  precoUnitarioCentavos: ValorMonetarioCentavos;
  descontoCentavos: ValorMonetarioCentavos;
  subtotalCentavos: ValorMonetarioCentavos;
}

export interface PagamentoVenda {
  id: Identificador;
  formaPagamento: FormaPagamento;
  valorCentavos: ValorMonetarioCentavos;
  parcelas?: number;
  detalhes?: Record<string, unknown>;
}

/**
 * Registro de Venda no PDV.
 */
export interface Venda {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  numeroCupom: string;
  serieCaixa: string;
  operadorId: Identificador;
  clienteId?: Identificador;
  dataHora: string; // ISO 8601
  
  itens: ItemVenda[];
  pagamentos: PagamentoVenda[];
  
  subtotalCentavos: ValorMonetarioCentavos;
  descontoTotalCentavos: ValorMonetarioCentavos;
  totalCentavos: ValorMonetarioCentavos;
  trocoCentavos: ValorMonetarioCentavos;
  
  status: StatusVenda;
  
  // Sincronização Offline-First
  sincronizadoComNuvem: boolean;
  idOfflineLocal?: string;
  
  observacoes?: string;
  auditoria: AuditoriaEntidade;
}

