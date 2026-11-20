import { Identificador } from '../types/comum';

export interface ParametrosIdempotencia {
  empresaId: Identificador;
  filialId: Identificador;
  dispositivoId: Identificador;
  numeroSequencial: string;
  idOfflineUuid: string;
}

/**
 * Gera uma chave determinística de idempotência para transações sincronizadas do PDV.
 * O formato garante unicidade por empresa, filial, terminal e ID gerado offline.
 */
export function gerarChaveIdempotencia(params: ParametrosIdempotencia): string {
  const base = `${params.empresaId}|${params.filialId}|${params.dispositivoId}|${params.numeroSequencial}|${params.idOfflineUuid}`;
  // Implementação simples de hash determinístico seguro para client/shared
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Converte para 32bit integer
  }
  const prefixoHex = Math.abs(hash).toString(16).padStart(8, '0');
  return `IDMP-${prefixoHex}-${params.idOfflineUuid}`;
}

/**
 * Validador estrito de contexto multiempresa.
 * Garante que nenhuma operação prossiga sem UUIDs válidos de tenant.
 */
export function validarIsolamentoTenant(
  empresaIdSolicitante?: string | null,
  empresaIdAlvo?: string | null,
): boolean {
  if (!empresaIdSolicitante || !empresaIdAlvo) {
    return false;
  }
  return empresaIdSolicitante.trim() === empresaIdAlvo.trim();
}
