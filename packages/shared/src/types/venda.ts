import { AuditoriaEntidade, Identificador, ValorMonetarioCentavos } from './comum';

export type StatusCaixa = 'ABERTO' | 'FECHADO' | 'EM_CONFERENCIA';

export interface CaixaSessao {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  dispositivoId: Identificador;
  operadorAberturaId: Identificador;
  operadorAtualId?: Identificador;
  operadorFechamentoId?: Identificador;
  saldoInicialCentavos: ValorMonetarioCentavos;
  saldoFechamentoDeclaradoCentavos?: ValorMonetarioCentavos;
  saldoFechamentoApuradoCentavos?: ValorMonetarioCentavos;
  diferencaFechamentoCentavos?: ValorMonetarioCentavos;
  justificativaDiferenca?: string;
  status: StatusCaixa;
  abertoEm: string;
  fechadoEm?: string;
  observacoes?: string;
}

export type TipoMovimentacaoCaixa = 'SUPRIMENTO' | 'SANGRIA' | 'SANGRIA_AUTOMATICA';

export interface CaixaMovimentacao {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  caixaSessaoId: Identificador;
  tipoMovimentacao: TipoMovimentacaoCaixa;
  valorCentavos: ValorMonetarioCentavos;
  motivo: string;
  usuarioId: Identificador;
  autorizadoPorId?: Identificador;
  criadoEm: string;
}

export interface CaixaOperadorSessao {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  caixaSessaoId: Identificador;
  usuarioId: Identificador;
  assumidoEm: string;
  entregueEm?: string;
  saldoFechamentoDeclaradoCentavos?: ValorMonetarioCentavos;
  saldoFechamentoApuradoCentavos?: ValorMonetarioCentavos;
  diferencaFechamentoCentavos?: ValorMonetarioCentavos;
  justificativaDiferenca?: string;
  status: 'ABERTO' | 'FECHADO';
}

export interface ResumoCaixa {
  caixaSessaoId: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  dispositivoId: Identificador;
  operadorAberturaId: Identificador;
  operadorAtualId?: Identificador;
  status: StatusCaixa;
  abertoEm: string;
  fechadoEm?: string;
  saldoInicialCentavos: ValorMonetarioCentavos;
  totalVendasDinheiroCentavos: ValorMonetarioCentavos;
  totalVendasPixCentavos: ValorMonetarioCentavos;
  totalVendasCartaoDebitoCentavos: ValorMonetarioCentavos;
  totalVendasCartaoCreditoCentavos: ValorMonetarioCentavos;
  totalVendasVoucherCentavos: ValorMonetarioCentavos;
  totalSuprimentosCentavos: ValorMonetarioCentavos;
  totalSangriasCentavos: ValorMonetarioCentavos;
  totalTrocoDevolvidoCentavos: ValorMonetarioCentavos;
  saldoGavetaDinheiroEsperadoCentavos: ValorMonetarioCentavos;
  quantidadeVendasConcluidas: number;
  quantidadeVendasCanceladas: number;
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
  caixaSessaoId: Identificador;
  dispositivoId: Identificador;
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

// ==============================================================================
// DTOs para Operações de Venda e Caixa
// ==============================================================================

export interface CriarItemVendaDTO {
  produtoId: string;
  loteId?: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  descontoCentavos?: number;
}

export interface CriarPagamentoVendaDTO {
  formaPagamento: FormaPagamento;
  valorCentavos: number;
  parcelas?: number;
  bandeiraCartao?: string;
  autorizacaoTefNsu?: string;
  codigoVoucher?: string;
  voucherId?: string;
  detalhes?: Record<string, unknown>;
}

export interface CriarVendaDTO {
  filialId?: string;
  caixaSessaoId: string;
  dispositivoId: string;
  clienteId?: string;
  clienteIdentificacao?: {
    cpf?: string;
    nome?: string;
  };
  itens: CriarItemVendaDTO[];
  pagamentos: CriarPagamentoVendaDTO[];
  descontoTotalCentavos?: number;
  trocoCentavos?: number;
  observacoes?: string;
}

export interface CancelarVendaDTO {
  vendaId: string;
  motivo: string;
  autorizadorId?: string;
  emitirVoucher?: boolean;
}

export interface AbrirCaixaDTO {
  filialId?: string;
  dispositivoId: string;
  saldoInicialCentavos: number;
  observacoes?: string;
}

export interface MovimentacaoCaixaDTO {
  caixaSessaoId: string;
  tipoMovimentacao: TipoMovimentacaoCaixa;
  valorCentavos: number;
  motivo: string;
  autorizadorId?: string;
}

export interface TrocarOperadorCaixaDTO {
  caixaSessaoId: string;
  novoOperadorId: string;
  saldoDeclaradoOperadorAnteriorCentavos?: number;
  justificativaDiferenca?: string;
}

export interface FecharCaixaDTO {
  caixaSessaoId: string;
  saldoDeclaradoCentavos: number;
  justificativaDiferenca?: string;
  observacoes?: string;
}
