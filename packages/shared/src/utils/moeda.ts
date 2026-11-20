import { ValorMonetarioCentavos } from '../types/comum';

/**
 * Converte valor inteiro em centavos para string formatada em Real brasileiro.
 * Exemplo: 4990 -> "R$ 49,90"
 */
export function formatarCentavosParaReal(centavos: ValorMonetarioCentavos): string {
  const valorDecimal = (centavos || 0) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valorDecimal);
}

/**
 * Converte uma entrada em string ("49,90" ou "R$ 49,90") ou número float para centavos inteiros.
 */
export function converterRealParaCentavos(valor: string | number): ValorMonetarioCentavos {
  if (typeof valor === 'number') {
    return Math.round(valor * 100);
  }

  // Remove caracteres que não sejam dígitos, vírgula, ponto ou traço
  const limpo = valor.replace(/[^\d,-]/g, '').replace(',', '.');
  const numero = parseFloat(limpo);
  if (isNaN(numero)) {
    return 0;
  }
  return Math.round(numero * 100);
}

