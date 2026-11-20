// ==============================================================================
// FarmaPro — Tipos Comuns do Sistema
// ==============================================================================

/**
 * Identificador padrão universal (UUID v4).
 */
export type Identificador = string;

/**
 * Status de ativação de entidades no sistema.
 */
export type StatusAtivo = 'ATIVO' | 'INATIVO' | 'BLOQUEADO';

/**
 * Representação de valores monetários estritamente em centavos inteiros (BRL).
 * Exemplo: R$ 49,90 = 4990 centavos.
 * Evita erros clássicos de arredondamento IEEE-754 de ponto flutuante.
 */
export type ValorMonetarioCentavos = number;

/**
 * Metadados padrão de auditoria para entidades persistidas.
 */
export interface AuditoriaEntidade {
  criadoEm: string; // ISO 8601
  atualizadoEm: string; // ISO 8601
  criadoPorId?: Identificador;
  atualizadoPorId?: Identificador;
}

/**
 * Endereço padrão brasileiro.
 */
export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

/**
 * Envelope para resultados paginados.
 */
export interface PaginacaoResultado<T> {
  itens: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

/**
 * Envelope para respostas de operações de serviço.
 */
export interface RespostaResultado<T> {
  sucesso: boolean;
  dados?: T;
  mensagem?: string;
  erro?: string;
  codigoErro?: string;
}

