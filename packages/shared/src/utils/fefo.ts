import { Lote } from '../types/lote';

/**
 * Ordena lotes farmacêuticos pela regra FEFO (First Expired, First Out).
 * Os lotes com data de validade mais próxima vêm primeiro.
 */
export function ordenarLotesPorFEFO(lotes: Lote[]): Lote[] {
  return [...lotes].sort((a, b) => {
    const dataA = new Date(a.dataValidade).getTime();
    const dataB = new Date(b.dataValidade).getTime();
    return dataA - dataB;
  });
}

/**
 * Classifica lotes entre Válidos, Em Alerta de Validade e Vencidos.
 * Garante que produtos vencidos ou bloqueados sejam imediatamente segregados da venda.
 */
export function classificarLotesValidade(
  lotes: Lote[],
  dataReferencia: Date = new Date(),
  diasAlerta: number = 90,
): {
  vendaveis: Lote[];
  emAlerta: Lote[];
  vencidos: Lote[];
  bloqueados: Lote[];
} {
  const tempoRef = dataReferencia.getTime();
  const milissegundosAlerta = diasAlerta * 24 * 60 * 60 * 1000;

  const vendaveis: Lote[] = [];
  const emAlerta: Lote[] = [];
  const vencidos: Lote[] = [];
  const bloqueados: Lote[] = [];

  for (const lote of lotes) {
    if (lote.status === 'BLOQUEADO' || lote.status === 'QUARENTENA') {
      bloqueados.push(lote);
      continue;
    }

    const dataValidade = new Date(lote.dataValidade).getTime();

    if (dataValidade <= tempoRef || lote.status === 'VENCIDO') {
      vencidos.push(lote);
    } else if (dataValidade <= tempoRef + milissegundosAlerta) {
      emAlerta.push(lote);
      vendaveis.push(lote); // Vendável prioritário
    } else {
      vendaveis.push(lote);
    }
  }

  return {
    vendaveis: ordenarLotesPorFEFO(vendaveis),
    emAlerta: ordenarLotesPorFEFO(emAlerta),
    vencidos,
    bloqueados,
  };
}
