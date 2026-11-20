import { AuditoriaEntidade, Identificador, ValorMonetarioCentavos } from './comum';

export type StatusCaixa = 'ABERTO' | 'FECHADO' | 'EM_CONFERENCIA';

export interface CaixaSessao {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  dispositivoId: Identificador;
  operadorAberturaId: Identificador;
  operadorFechamentoId?: Identificador;
  saldoInicialCentavos: ValorMonetarioCentavos;
  saldoFechamentoDeclaradoCentavos?: ValorMonetarioCentavos;
  saldoFechamentoApuradoCentavos?: ValorMonetarioCentavos;
  diferencaFechamentoCentavos?: ValorMonetarioCentavos;
  status: StatusCaixa;
  abertoEm: string;
  fechadoEm?: string;
  observacoes?: string;
}

export type StatusVenda = 'ABERTA' | 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA' | 'ESTORNADA';

/**
 * Modalidades de pagamento externas e comerciais aceitas no PDV.
 * NOTA: O FarmaPro NÃO possui crediário próprio ou carteira de crédito da farmácia.
 * O Voucher é uma modalidade originada exclusivamente do cancelamento de uma venda anterior.
 */
export type FormaPagamento =
  | 'DINHEIRO'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'PIX'
  | 'VOUCHER'
  | 'CONVENIO_EMPRESA';

export interface ItemVenda {
  id: Identificador;
  empresaId?: Identificador;
  filialId?: Identificador;
  vendaId?: Identificador;
  produtoId: Identificador;
  loteId?: Identificador;
  numeroItem?: number;
  codigoBarras: string;
  nomeProduto: string;
  apresentacao: string;
  quantidade: number;
  precoUnitarioCentavos: ValorMonetarioCentavos;
  descontoCentavos: ValorMonetarioCentavos;
  subtotalCentavos: ValorMonetarioCentavos;
  cancelado?: boolean;
  exigeReceita?: boolean;
  numeroReceitaControle?: string;
}

export interface PagamentoVenda {
  id: Identificador;
  formaPagamento: FormaPagamento;
  valorCentavos: ValorMonetarioCentavos;
  parcelas?: number;
  bandeiraCartao?: string;
  autorizacaoTefNsu?: string;
  voucherId?: Identificador;
  codigoVoucher?: string;
  detalhes?: Record<string, unknown>;
}

/**
 * Registro de Venda no PDV (Frente de Caixa).
 */
export interface Venda {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  caixaSessaoId?: Identificador;
  dispositivoId?: Identificador;
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
  
  // Resiliência Offline e Sincronização
  sincronizadoComNuvem: boolean;
  idOfflineLocal?: string;
  idOfflineUuid?: string;
  chaveIdempotencia?: string;
  sincronizadoEm?: string;
  hashIntegridade?: string;
  
  canceladoPorId?: Identificador;
  motivoCancelamento?: string;
  canceladoEm?: string;
  voucherGeradoId?: Identificador; // Quando o cancelamento gerou um voucher
  
  observacoes?: string;
  auditoria?: AuditoriaEntidade;
}
