import { Identificador, ValorMonetarioCentavos } from './comum';

export type StatusVoucher = 'DISPONIVEL' | 'UTILIZADO' | 'CANCELADO' | 'EXPIRADO';

export type OperacaoVoucherHistorico =
  | 'EMISSAO'
  | 'CONSULTA_VALIDACAO'
  | 'RESGATE_UTILIZACAO'
  | 'CANCELAMENTO_VOUCHER'
  | 'ESTORNO_VENDA_RESGATE';

/**
 * Entidade Voucher.
 * Emitido exclusivamente no cancelamento/devolução de uma venda autorizada.
 * REGRA CENTRAL: O voucher deve ser utilizado integralmente em uma única compra.
 * Não gera troco, não gera saldo remanescente e não permite uso parcial.
 */
export interface Voucher {
  id: Identificador;
  empresaId: Identificador;
  filialOrigemId: Identificador;
  codigoVoucher: string; // Ex: "VCH-2026-X89A-4B21"
  valorCentavos: ValorMonetarioCentavos;
  clienteId?: Identificador;
  vendaOrigemId: Identificador;
  motivoCancelamentoOrigem: string;
  status: StatusVoucher;
  emitidoEm: string; // ISO 8601
  emitidoPorId: Identificador;
  autorizadoPorId: Identificador;
  
  // Dados de resgate (preenchidos após utilização)
  utilizadoEm?: string;
  utilizadoPorId?: Identificador;
  filialResgateId?: Identificador;
  vendaResgateId?: Identificador;
  
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * Trilha de auditoria imutável do ciclo de vida do Voucher.
 */
export interface VoucherHistorico {
  id: Identificador;
  empresaId: Identificador;
  voucherId: Identificador;
  operacao: OperacaoVoucherHistorico;
  statusAnterior?: StatusVoucher;
  statusNovo: StatusVoucher;
  vendaId?: Identificador;
  operadorId: Identificador;
  justificativa?: string;
  criadoEm: string;
}
