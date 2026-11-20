import { Identificador, ValorMonetarioCentavos } from './comum';

export type TipoMovimentacaoEstoque =
  | 'ENTRADA_COMPRA_NFE'
  | 'SAIDA_VENDA_PDV'
  | 'ESTORNO_CANCELAMENTO_VENDA'
  | 'AJUSTE_POSITIVO_INVENTARIO'
  | 'AJUSTE_NEGATIVO_INVENTARIO'
  | 'PERDA_AVARIA'
  | 'PERDA_VENCIMENTO'
  | 'TRANSFERENCIA_SAIDA'
  | 'TRANSFERENCIA_ENTRADA'
  | 'BLOQUEIO_QUARENTENA';

/**
 * Saldo consolidado de estoque por produto em uma filial específica.
 */
export interface EstoqueSaldo {
  empresaId: Identificador;
  filialId: Identificador;
  produtoId: Identificador;
  quantidadeFisica: number;
  quantidadeReservada: number;
  quantidadeDisponivel: number;
  custoMedioCentavos: ValorMonetarioCentavos;
  ultimoCustoCentavos: ValorMonetarioCentavos;
  atualizadoEm: string;
}

/**
 * Livro-razão imutável de movimentações de estoque (Ledger).
 */
export interface EstoqueMovimentacao {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  produtoId: Identificador;
  loteId?: Identificador;
  tipoMovimentacao: TipoMovimentacaoEstoque;
  quantidade: number;
  custoUnitarioCentavos: ValorMonetarioCentavos;
  saldoAnterior: number;
  saldoPosterior: number;
  origemDocumentoTipo?: string;
  origemDocumentoId?: string;
  usuarioId: Identificador;
  motivo?: string;
  idOfflineUuid?: string;
  chaveIdempotencia?: string;
  dataHoraMovimento: string;
  criadoEm: string;
}

/**
 * Reserva temporária de estoque para concorrência de caixas simultâneos no PDV.
 */
export interface EstoqueReserva {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  produtoId: Identificador;
  loteId?: Identificador;
  vendaId?: Identificador;
  dispositivoId: Identificador;
  quantidadeReservada: number;
  expiraEm: string;
  status: 'PENDENTE' | 'CONFIRMADA' | 'EXPIRADA_CANCELADA';
  criadoEm: string;
}
