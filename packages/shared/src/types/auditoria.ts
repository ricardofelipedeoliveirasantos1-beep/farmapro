import { Identificador } from './comum';

export type TipoOperacaoAuditoria =
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN_SUCESSO'
  | 'LOGIN_FALHA'
  | 'DESCONTO_ALCADA_SUPERIOR'
  | 'CANCELAMENTO_ITEM_PDV'
  | 'CANCELAMENTO_VENDA_TOTAL'
  | 'SANGRIA_CAIXA'
  | 'SUPRIMENTO_CAIXA'
  | 'AJUSTE_ESTOQUE_MANUAL'
  | 'BLOQUEIO_LOTE_ANVISA';

/**
 * Trilha de auditoria imutável (Audit Trail).
 */
export interface AuditoriaLog {
  id: Identificador;
  empresaId: Identificador;
  filialId?: Identificador;
  usuarioId?: Identificador;
  operacao: TipoOperacaoAuditoria;
  tabelaAfetada: string;
  registroAfetadoId?: string;
  dadosAnteriores?: Record<string, unknown>;
  dadosNovos?: Record<string, unknown>;
  ipOrigem?: string;
  userAgent?: string;
  dispositivoId?: Identificador;
  idOfflineUuid?: string;
  criadoEm: string;
}

export type TipoConflitoOffline =
  | 'ESTOQUE_INSUFICIENTE_OFFLINE'
  | 'DIVERGENCIA_PRECO_CATALOGO'
  | 'LOTE_VENCIDO_DURANTE_OFFLINE'
  | 'DUPLICIDADE_CHAVE_REJEITADA';

export type ResolucaoConflitoOffline =
  | 'PENDENTE_INTERVENCAO'
  | 'ACEITO_COM_AJUSTE_ESTOQUE'
  | 'REJEITADO_RECONCILIADO'
  | 'IGNORADO_DUPLICADO';

/**
 * Registro de conflito e reconciliação na sincronização offline.
 */
export interface SincronizacaoOfflineConflito {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  dispositivoId: Identificador;
  entidadeTipo: 'VENDA' | 'ESTOQUE_MOVIMENTO' | 'CLIENTE';
  idOfflineUuid: string;
  chaveIdempotencia?: string;
  dadosPayload: Record<string, unknown>;
  tipoConflito: TipoConflitoOffline;
  resolucaoAdotada: ResolucaoConflitoOffline;
  resolvidoPorId?: Identificador;
  resolvidoEm?: string;
  detalhesResolucao?: string;
  criadoEm: string;
}
