import { AuditoriaEntidade, Identificador, StatusAtivo } from './comum';

/**
 * Usuário / Funcionário da farmácia.
 */
export interface Usuario {
  id: Identificador;
  empresaId: Identificador;
  filialPadraoId: Identificador;
  filiaisPermitidasIds: Identificador[];
  cargoId: Identificador;
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  
  // Dados regulatórios farmacêuticos (se aplicável)
  crfNumero?: string;
  crfUf?: string;
  eResponsavelTecnico: boolean;
  
  status: StatusAtivo;
  ultimoAcessoEm?: string;
  auditoria: AuditoriaEntidade;
}

