import { AuditoriaEntidade, Identificador, StatusAtivo, ValorMonetarioCentavos } from './comum';

export type TipoProduto =
  | 'MEDICAMENTO_REFERENCIA'
  | 'MEDICAMENTO_GENERICO'
  | 'MEDICAMENTO_SIMILAR'
  | 'MEDICAMENTO_CONTROLADO'
  | 'PERFUMARIA'
  | 'CORRELATO'
  | 'SUPLEMENTO';

export type ClassificacaoReceita =
  | 'ISENTO' // Venda livre (MIP)
  | 'RECEITA_BRANCA_SIMPLES'
  | 'RECEITA_BRANCA_CONTROLE_ESPECIAL' // Antimicrobianos / Controlados C1
  | 'RECEITA_AZUL' // Psicotrópicos B1/B2
  | 'RECEITA_AMARELA'; // Entorpecentes A1/A2

/**
 * Catálogo de Produto / Medicamento.
 */
export interface Produto {
  id: Identificador;
  empresaId: Identificador;
  codigoBarras: string; // EAN-13
  codigoInterno?: string;
  nomeComercial: string;
  nomeGenerico?: string;
  apresentacao: string; // Ex: "500mg Caixa com 20 comprimidos"
  principioAtivo?: string;
  fabricante: string;
  tipo: TipoProduto;
  classificacaoReceita: ClassificacaoReceita;
  registroAnvisa?: string;
  
  // Precificação em centavos
  precoCustoCentavos: ValorMonetarioCentavos;
  precoVendaCentavos: ValorMonetarioCentavos;
  precoPromocionalCentavos?: ValorMonetarioCentavos;
  
  // Estoque consolidado
  estoqueMinimo: number;
  estoqueAtual: number;
  unidadeMedida: 'UN' | 'CX' | 'FR' | 'BL';
  fracionavel: boolean;
  
  status: StatusAtivo;
  auditoria: AuditoriaEntidade;
}

