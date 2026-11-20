import { AuditoriaEntidade, Identificador, StatusAtivo } from './comum';
import { Permissao } from './permissao';

/**
 * Níveis de Acesso básicos no FarmaPro.
 * NOTA: Não existe o cargo predefinido "Estoquista". As funções de estoque
 * são atribuídas via permissões granulares configuradas pelo proprietário.
 */
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
  auditoria?: AuditoriaEntidade;
}
