import { AuditoriaEntidade, Identificador, StatusAtivo, ValorMonetarioCentavos } from './comum';

export type TipoProduto =
  | 'MEDICAMENTO_REFERENCIA'
  | 'MEDICAMENTO_GENERICO'
  | 'MEDICAMENTO_SIMILAR'
  | 'MEDICAMENTO_MIP'
  | 'HIGIENE_BELEZA'
  | 'COSMETICOS'
  | 'PERFUMARIA'
  | 'INFANTIL'
  | 'SUPLEMENTO_ALIMENTAR'
  | 'PRODUTO_SAUDE_CORRELATO'
  | 'CONVENIENCIA'
  | 'DIVERSOS';

export type ClassificacaoReceita =
  | 'ISENTO' // MIPs / Venda livre
  | 'RECEITA_BRANCA_SIMPLES'
  | 'RECEITA_BRANCA_CONTROLE_ESPECIAL' // Antimicrobianos / Lista C1
  | 'RECEITA_AZUL' // Psicotrópicos B1/B2
  | 'RECEITA_AMARELA' // Entorpecentes A1/A2/A3
  | 'RECEITA_RETENCAO_OUTROS';

export type TipoCodigoBarras = 'EAN13' | 'EAN14' | 'DUN14' | 'CODIGO_INTERNO' | 'DATAMATRIX';

export interface CategoriaProduto {
  id: Identificador;
  empresaId: Identificador;
  categoriaPaiId?: Identificador;
  nome: string;
  codigo?: string;
  descricao?: string;
  status: 'ATIVO' | 'INATIVO';
  auditoria?: AuditoriaEntidade;
}

export interface ProdutoCodigoBarras {
  id: Identificador;
  empresaId: Identificador;
  produtoId: Identificador;
  codigoBarras: string;
  tipoCodigo: TipoCodigoBarras;
  ePrincipal: boolean;
}

/**
 * Informações regulatórias e clínicas exclusivas de medicamentos (1:0..1).
 */
export interface MedicamentoDadosFarmaceuticos {
  produtoId: Identificador;
  empresaId: Identificador;
  principioAtivoDci: string;
  concentracao?: string;
  formaFarmaceutica: string;
  viaAdministracao: string;
  registroAnvisa?: string;
  classificacaoReceita: ClassificacaoReceita;
  listaControladoPortaria344?: string;
  termossensivel: boolean;
  temperaturaMinimaCelsius?: number;
  temperaturaMaximaCelsius?: number;
  exigeSngpc: boolean;
  auditoria?: AuditoriaEntidade;
}

/**
 * Parametrização comercial e de estoque do produto específica por filial.
 */
export interface ProdutoFilial {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  produtoId: Identificador;
  precoCustoCentavos: ValorMonetarioCentavos;
  precoVendaCentavos: ValorMonetarioCentavos;
  precoPromocionalCentavos?: ValorMonetarioCentavos;
  estoqueMinimo: number;
  estoqueMaximo: number;
  localizacaoPrateleira?: string;
  ativo: boolean;
  auditoria?: AuditoriaEntidade;
}

/**
 * Cadastro Central de Produto.
 */
export interface Produto {
  id: Identificador;
  empresaId: Identificador;
  categoriaId?: Identificador;
  nomeComercial: string;
  nomeGenerico?: string;
  fabricante: string;
  apresentacao: string;
  descricao?: string;
  unidadeMedida: 'UN' | 'CX' | 'FR' | 'BL' | 'TB' | 'ENV' | 'KG' | 'L';
  tipo: TipoProduto;
  fracionavel: boolean;
  status: StatusAtivo;
  
  // Campos relacionais / complementares (facilidade de uso no frontend)
  codigoBarras?: string;
  classificacaoReceita?: ClassificacaoReceita;
  registroAnvisa?: string;
  principioAtivo?: string;
  precoCustoCentavos?: ValorMonetarioCentavos;
  precoVendaCentavos?: ValorMonetarioCentavos;
  precoPromocionalCentavos?: ValorMonetarioCentavos;
  estoqueMinimo?: number;
  estoqueAtual?: number;
  
  dadosFarmaceuticos?: MedicamentoDadosFarmaceuticos;
  codigosBarras?: ProdutoCodigoBarras[];
  configuracoesFilial?: ProdutoFilial[];
  
  auditoria?: AuditoriaEntidade;
}
