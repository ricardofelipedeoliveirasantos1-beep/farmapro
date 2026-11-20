import { Identificador, ValorMonetarioCentavos } from './comum';

/**
 * Situação do Voucher.
 * NOTA DE AUDITORIA: O status 'EXPIRADO' é mantido para suporte futuro,
 * mas NENHUMA regra de expiração automática é ativada nesta fase.
 * A definição de prazo de validade depende de aprovação comercial e jurídica prévia.
 */
export type StatusVoucher = 'DISPONIVEL' | 'UTILIZADO' | 'CANCELADO' | 'EXPIRADO';

export type OperacaoVoucherHistorico =
  | 'EMISSAO'
  | 'CONSULTA_VALIDACAO'
  | 'RESGATE_UTILIZACAO'
  | 'CANCELAMENTO_VOUCHER'
  | 'ESTORNO_VENDA_RESGATE';

/**
 * Entidade Voucher.
 * Emitido EXCLUSIVAMENTE no cancelamento/devolução autorizada de uma venda anterior.
 *
 * REGRAS FINANCEIRAS E DE INTEGRIDADE:
 * 1. Resgate 100% integral em uma única compra.
 * 2. Não gera troco, não gera saldo residual, não permite uso parcial.
 * 3. Proibida emissão duplicada para o mesmo cancelamento de venda.
 * 4. Não é contabilizado como dinheiro em espécie na gaveta de caixa.
 * 5. Registros protegidos contra exclusão em cascata (ON DELETE RESTRICT).
 */
export interface Voucher {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador; // Filial emissora do voucher (cancelamento da venda original)
  filialOrigemId?: Identificador; // Alias de compatibilidade para filialId
  codigo: string; // Ex: "VCH-2026-X89A-4B21" (Nomenclatura única padronizada)
  codigoVoucher?: string; // Alias de compatibilidade para codigo
  valorCentavos: ValorMonetarioCentavos;
  clienteId?: Identificador;
  vendaOrigemId: Identificador; // Unicidade: 1 voucher por venda cancelada
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
  filialId: Identificador; // Filial da ocorrência do evento de auditoria
  voucherId: Identificador;
  operacao: OperacaoVoucherHistorico;
  statusAnterior?: StatusVoucher;
  statusNovo: StatusVoucher;
  vendaId?: Identificador;
  operadorId: Identificador;
  justificativa?: string;
  criadoEm: string;
}
