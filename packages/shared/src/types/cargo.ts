import { AuditoriaEntidade, Identificador, StatusAtivo } from './comum';
import { Permissao } from './permissao';

export type NivelAcesso = 'ADMIN' | 'GERENTE' | 'FARMACEUTICO' | 'OPERADOR_CAIXA' | 'ATENDENTE';

/**
 * Cargo / Papel de usuário dentro da empresa.
 */
export interface Cargo {
  id: Identificador;
  empresaId: Identificador;
  nome: string;
  descricao?: string;
  nivelAcesso: NivelAcesso;
  permissoes: Permissao[];
  status: StatusAtivo;
  auditoria: AuditoriaEntidade;
}

