import { AuditoriaEntidade, Identificador, StatusAtivo } from './comum';

export type PapelEmpresa = 'PROPRIETARIO' | 'ADMINISTRADOR' | 'COLABORADOR';

/**
 * Usuário / Operador do sistema.
 */
export interface Usuario {
  id: Identificador;
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
  
  // Campos relacionais de compatibilidade
  empresaId?: Identificador;
  filialPadraoId?: Identificador;
  filiaisPermitidasIds?: Identificador[];
  cargoId?: Identificador;
  
  auditoria?: AuditoriaEntidade;
}

/**
 * Vínculo do Usuário com a Empresa (Tenant).
 */
export interface UsuarioEmpresa {
  id: Identificador;
  usuarioId: Identificador;
  empresaId: Identificador;
  papelEmpresa: PapelEmpresa;
  status: StatusAtivo;
  criadoEm: string;
}

/**
 * Vínculo explícito do Usuário com Filial específica.
 */
export interface UsuarioFilial {
  id: Identificador;
  usuarioId: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  cargoId: Identificador;
  eFilialPadrao: boolean;
  status: StatusAtivo;
  criadoEm: string;
}

/**
 * Exceções de Permissões por Filial.
 */
export interface UsuarioFilialPermissao {
  id: Identificador;
  usuarioFilialId: Identificador;
  permissaoId: string;
  concedida: boolean;
  motivoConcessao?: string;
  concedidoPorId?: Identificador;
  criadoEm: string;
}

/**
 * Dispositivo / Terminal de PDV Autorizado.
 */
export interface DispositivoAutorizado {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  identificadorHardware: string;
  nomeTerminal: string;
  numeroSerieCaixa: string;
  tipoDispositivo: 'DESKTOP_PDV' | 'WEB_RETRO' | 'MOBILE_COLETOR';
  ativo: boolean;
  ultimoIp?: string;
  ultimoSyncEm?: string;
}
