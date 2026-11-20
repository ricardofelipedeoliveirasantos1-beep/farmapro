import { AuditoriaEntidade, Identificador, StatusAtivo } from './comum';

export type PlanoAssinatura = 'BASICO' | 'PROFISSIONAL' | 'ENTERPRISE';

/**
 * Entidade Tenant (Empresa / Rede de Farmácias).
 * Representa o cliente assinante do SaaS.
 */
export interface Empresa {
  id: Identificador;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  emailContato: string;
  telefoneContato: string;
  status: StatusAtivo;
  plano: PlanoAssinatura;
  configuracoes: Record<string, unknown>;
  auditoria: AuditoriaEntidade;
}

