import { AuditoriaEntidade, Identificador, ValorMonetarioCentavos } from './comum';

export type StatusLote = 'ATIVO' | 'ESGOTADO' | 'VENCIDO' | 'BLOQUEADO';

/**
 * Lote de medicamento / produto associado a uma filial específica.
 */
export interface Lote {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  produtoId: Identificador;
  numeroLote: string;
  dataFabricacao: string; // ISO 8601
  dataValidade: string; // ISO 8601
  quantidadeInicial: number;
  quantidadeAtual: number;
  precoCustoUnitarioCentavos: ValorMonetarioCentavos;
  status: StatusLote;
  auditoria: AuditoriaEntidade;
}

