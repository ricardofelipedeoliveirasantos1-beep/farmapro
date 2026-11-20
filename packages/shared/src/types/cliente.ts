import { AuditoriaEntidade, Endereco, Identificador, StatusAtivo, ValorMonetarioCentavos } from './comum';

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

export type TipoMovimentacaoCarteira =
  | 'CREDITO_TROCO_PDV'
  | 'CREDITO_DEVOLUCAO'
  | 'CREDITO_AJUSTE_MANUAL'
  | 'DEBITO_UTILIZACAO_VENDA'
  | 'DEBITO_RESGATE_ESPECIE';

export interface ClienteCarteiraMovimentacao {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  clienteId: Identificador;
  tipoMovimentacao: TipoMovimentacaoCarteira;
  valorCentavos: ValorMonetarioCentavos;
  saldoAnteriorCentavos: ValorMonetarioCentavos;
  saldoPosteriorCentavos: ValorMonetarioCentavos;
  vendaId?: Identificador;
  operadorId: Identificador;
  motivo?: string;
  criadoEm: string;
}

/**
 * Cadastro de Cliente / Paciente.
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
  
  // Crediário da Farmácia ("Caderno Digital")
  limiteCrediarioCentavos: ValorMonetarioCentavos;
  saldoDevedorCentavos: ValorMonetarioCentavos;
  bloqueadoParaCrediario: boolean;
  motivoBloqueioCrediario?: string;
  
  // Carteira de Crédito (Saldo de troco / devoluções)
  saldoCreditoCentavos: ValorMonetarioCentavos;
  
  status: StatusAtivo;
  observacoes?: string;
  consentimentosLGPD?: ClienteConsentimentoLGPD[];
  auditoria?: AuditoriaEntidade;
}
