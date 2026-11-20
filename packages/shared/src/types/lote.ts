import { AuditoriaEntidade, Identificador, ValorMonetarioCentavos } from './comum';

export type StatusLote = 'ATIVO' | 'QUARENTENA' | 'BLOQUEADO' | 'VENCIDO' | 'ESGOTADO';

export type OrigemEntradaLote =
  | 'COMPRA_NFE'
  | 'AJUSTE_INVENTARIO'
  | 'TRANSFERENCIA_ENTRADA'
  | 'DEVOLUCAO_CLIENTE';

/**
 * Lote de medicamento / produto associado a uma filial específica (FEFO).
 */
export interface Lote {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  produtoId: Identificador;
  numeroLote: string;
  dataFabricacao: string; // ISO 8601
  dataValidade: string; // ISO 8601
  quantidadeRecebida: number;
  quantidadeDisponivel: number;
  quantidadeReservada: number;
  quantidadeBloqueada: number;
  
  // Compatibilidade com Etapa 02
  quantidadeInicial?: number;
  quantidadeAtual?: number;
  
  precoCustoUnitarioCentavos: ValorMonetarioCentavos;
  status: StatusLote;
  motivoBloqueio?: string;
  origemEntradaTipo: OrigemEntradaLote;
  origemEntradaId?: string;
  temperaturaMonitorada?: number;
  auditoria?: AuditoriaEntidade;
}
