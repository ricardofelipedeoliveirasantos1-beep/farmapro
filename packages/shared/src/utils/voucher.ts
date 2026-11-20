import { Voucher, VoucherHistorico } from '../types/voucher';
import { formatarCentavosParaReal } from './moeda';

export interface ResultadoValidacaoVoucher {
  valido: boolean;
  mensagem: string;
  codigoErro?:
    | 'EMPRESA_DIVERGENTE'
    | 'VOUCHER_NAO_DISPONIVEL'
    | 'VALOR_COMPRA_INFERIOR_AO_VOUCHER';
  valorAbatidoCentavos: number;
  valorComplementarCentavos: number;
}

/**
 * Validação rigorosa das regras de resgate de voucher.
 * REGRAS OBRIGATÓRIAS DO FARMAPRO:
 * 1. O voucher pertence estritamente à empresa emissora (zero vazamento multiempresa).
 * 2. O voucher deve estar na situação 'DISPONIVEL'.
 * 3. Uso estritamente integral em uma única compra:
 *    - Se compra < voucher: BLOQUEAR resgate. Não há troco, não há saldo residual.
 *    - Se compra == voucher: Abate 100%, complemento = 0.
 *    - Se compra > voucher: Abate 100% do voucher, cliente paga a diferença por outra modalidade.
 */
export function validarResgateVoucher(
  voucher: Voucher,
  valorTotalCompraCentavos: number,
  empresaIdSessao: string,
): ResultadoValidacaoVoucher {
  // 1. Isolamento Multiempresa
  if (voucher.empresaId !== empresaIdSessao) {
    return {
      valido: false,
      mensagem: 'O voucher informado não pertence a esta farmácia e não pode ser resgatado.',
      codigoErro: 'EMPRESA_DIVERGENTE',
      valorAbatidoCentavos: 0,
      valorComplementarCentavos: valorTotalCompraCentavos,
    };
  }

  // 2. Situação do Voucher
  if (voucher.status !== 'DISPONIVEL') {
    return {
      valido: false,
      mensagem: `Voucher não disponível para resgate. Situação atual: ${voucher.status}.`,
      codigoErro: 'VOUCHER_NAO_DISPONIVEL',
      valorAbatidoCentavos: 0,
      valorComplementarCentavos: valorTotalCompraCentavos,
    };
  }

  // 3. Regra de Utilização Integral (Bloqueio de uso parcial)
  if (valorTotalCompraCentavos < voucher.valorCentavos) {
    const valorCompraFormatado = formatarCentavosParaReal(valorTotalCompraCentavos);
    const valorVoucherFormatado = formatarCentavosParaReal(voucher.valorCentavos);
    return {
      valido: false,
      mensagem: `O valor da compra (${valorCompraFormatado}) é inferior ao valor do voucher (${valorVoucherFormatado}). O voucher deve ser utilizado integralmente em uma única operação. Não é permitida utilização parcial nem devolução de troco.`,
      codigoErro: 'VALOR_COMPRA_INFERIOR_AO_VOUCHER',
      valorAbatidoCentavos: 0,
      valorComplementarCentavos: valorTotalCompraCentavos,
    };
  }

  // 4. Compra válida: abatimento integral do voucher
  const diferencaComplementar = valorTotalCompraCentavos - voucher.valorCentavos;

  return {
    valido: true,
    mensagem:
      diferencaComplementar === 0
        ? 'Voucher cobre 100% do valor da compra.'
        : `Voucher resgatado integralmente. Valor restante a pagar: ${formatarCentavosParaReal(diferencaComplementar)}.`,
    valorAbatidoCentavos: voucher.valorCentavos,
    valorComplementarCentavos: diferencaComplementar,
  };
}

/**
 * Cria o registro auditável para cancelamento de compra que utilizou voucher.
 * Preserva o histórico sem duplicar valores nem gerar créditos automáticos.
 */
export function criarHistoricoEstornoVendaComVoucher(params: {
  empresaId: string;
  voucherId: string;
  vendaId: string;
  operadorId: string;
  justificativa: string;
}): VoucherHistorico {
  return {
    id: `vch-hist-${Date.now()}`,
    empresaId: params.empresaId,
    voucherId: params.voucherId,
    operacao: 'ESTORNO_VENDA_RESGATE',
    statusAnterior: 'UTILIZADO',
    statusNovo: 'CANCELADO', // O tratamento auditável documenta o estorno
    vendaId: params.vendaId,
    operadorId: params.operadorId,
    justificativa: params.justificativa,
    criadoEm: new Date().toISOString(),
  };
}
