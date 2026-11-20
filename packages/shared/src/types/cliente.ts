import { AuditoriaEntidade, Endereco, Identificador, StatusAtivo, ValorMonetarioCentavos } from './comum';

/**
 * Cadastro de Cliente / Paciente.
 */
export interface Cliente {
  id: Identificador;
  empresaId: Identificador;
  nomeCompleto: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  telefone: string;
  email?: string;
  endereco?: Endereco;
  
  // Crediário da Farmácia ("Caderno Digital")
  limiteCrediarioCentavos: ValorMonetarioCentavos;
  saldoDevedorCentavos: ValorMonetarioCentavos;
  
  // Carteira de Crédito (Saldo de troco / devoluções)
  saldoCreditoCentavos: ValorMonetarioCentavos;
  
  bloqueadoParaCrediario: boolean;
  status: StatusAtivo;
  observacoes?: string;
  auditoria: AuditoriaEntidade;
}

