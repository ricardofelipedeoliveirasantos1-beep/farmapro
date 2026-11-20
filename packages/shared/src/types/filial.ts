import { AuditoriaEntidade, Endereco, Identificador, StatusAtivo } from './comum';

/**
 * Entidade Filial (Unidade Física da Farmácia).
 * Uma empresa pode ter uma ou mais filiais.
 */
export interface Filial {
  id: Identificador;
  empresaId: Identificador;
  codigoFilial: string;
  nome: string;
  cnpj: string;
  inscricaoEstadual?: string;
  endereco: Endereco;
  telefone: string;
  eMatriz: boolean;
  status: StatusAtivo;
  auditoria: AuditoriaEntidade;
}

