import { AuditoriaEntidade, Endereco, Identificador, StatusAtivo } from './comum';

export type FinalidadeConsentimentoLGPD =
  | 'MARKETING_PROMOCIONAL'
  | 'LEMBRETE_TRATAMENTO_CONTINUO'
  | 'RETENCAO_HISTORICO_PRESCRICAO'
  | 'PROGRAMA_FIDELIDADE_DESCONTO';

export type CanalConsentimento = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'TELEFONE';

export interface ClienteConsentimentoLGPD {
  id: Identificador;
  empresaId: Identificador;
  clienteId: Identificador;
  finalidade: FinalidadeConsentimentoLGPD;
  canal: CanalConsentimento;
  consentido: boolean;
  dataConsentimento: string;
  revogadoEm?: string;
}

/**
 * Cadastro Central de Cliente / Paciente.
 * NOTA: O FarmaPro NÃO possui crediário próprio, limite de crédito ou carteira de crédito.
 */
export interface Cliente {
  id: Identificador;
  empresaId: Identificador;
  tipoPessoa?: 'PF' | 'PJ';
  nomeCompleto: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  sexo?: 'M' | 'F' | 'O';
  telefone: string;
  telefoneSecundario?: string;
  email?: string;
  endereco?: Endereco;
  status: StatusAtivo;
  observacoes?: string;
  consentimentosLGPD?: ClienteConsentimentoLGPD[];
  auditoria?: AuditoriaEntidade;
}
