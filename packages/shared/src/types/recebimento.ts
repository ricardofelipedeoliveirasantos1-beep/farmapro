// ==============================================================================
// FarmaPro — Módulo de Recebimento de Mercadorias e Importação de XML de NF-e (Etapa 09)
// Tipagem estrita com valores monetários em centavos inteiros e isolamento multiempresa
// ==============================================================================

export type StatusNfeRecebida =
  | 'IMPORTADA'
  | 'EM_CONFERENCIA'
  | 'CONCILIADA'
  | 'DIVERGENCIA_PENDENTE'
  | 'RECEBIDA_PARCIAL'
  | 'RECEBIDA_TOTAL'
  | 'CANCELADA';

export type StatusRecebimento =
  | 'EM_CONFERENCIA'
  | 'AGUARDANDO_APROVACAO_DIVERGENCIA'
  | 'APROVADO'
  | 'CONCLUIDO'
  | 'REJEITADO'
  | 'CANCELADO';

export type TipoDivergenciaRecebimento =
  | 'NENHUMA'
  | 'QUANTIDADE_A_MAIS'
  | 'QUANTIDADE_A_MENOS'
  | 'PRECO_DIVERGENTE'
  | 'PRODUTO_DIVERGENTE'
  | 'LOTE_VENCIDO'
  | 'AVARIA_QUARENTENA'
  | 'OUTRA';

export type StatusLoteRecebimento =
  | 'ATIVO'
  | 'QUARENTENA'
  | 'BLOQUEADO'
  | 'VENCIDO';

export interface NfeRecebidaItem {
  id: string;
  empresaId: string;
  nfeId: string;
  numeroItem: number;
  codigoProdutoFornecedor: string;
  codigoBarras?: string;
  nomeProduto: string;
  ncm?: string;
  cfop?: string;
  unidadeComercial: string;
  quantidadeComercial: number;
  valorUnitarioCentavos: number;
  valorTotalCentavos: number;
  descontoCentavos: number;
  produtoId?: string;
  nomeProdutoCadastrado?: string;
  pedidoItemId?: string;
  loteFornecedor?: string;
  dataFabricacao?: string;
  dataValidade?: string;
  criadoEm: string;
}

export interface NfeRecebida {
  id: string;
  empresaId: string;
  filialId: string;
  nomeFilial?: string;
  chaveAcesso: string; // 44 dígitos estritos
  numeroNfe: string;
  serieNfe: string;
  dataEmissao: string;
  fornecedorId?: string;
  razaoSocialFornecedor?: string;
  nomeFantasiaFornecedor?: string;
  cnpjEmitente: string;
  razaoSocialEmitente: string;
  nomeFantasiaEmitente?: string;
  cnpjDestinatario: string;
  valorProdutosCentavos: number;
  valorFreteCentavos: number;
  valorDescontoCentavos: number;
  valorTotalCentavos: number;
  status: StatusNfeRecebida;
  pedidoCompraId?: string;
  numeroPedidoCompra?: string;
  xmlConteudo: string;
  importadoPorId: string;
  nomeImportador?: string;
  criadoEm: string;
  atualizadoEm: string;
  itens: NfeRecebidaItem[];
}

export interface RecebimentoMercadoriaItem {
  id: string;
  empresaId: string;
  recebimentoId: string;
  produtoId: string;
  nomeProduto?: string;
  codigoBarras?: string;
  filialDestinoId: string;
  nomeFilialDestino?: string;
  pedidoItemId?: string;
  nfeItemId?: string;
  quantidadePedida: number;
  quantidadeNotaFiscal: number;
  quantidadeRecebidaFisica: number;
  quantidadeLiberadaVenda: number;
  valorUnitarioPedidoCentavos: number;
  valorUnitarioNfeCentavos: number;
  valorUnitarioReconhecidoCentavos: number;
  numeroLote: string;
  dataFabricacao: string;
  dataValidade: string;
  statusLote: StatusLoteRecebimento;
  divergenciaDetectada: TipoDivergenciaRecebimento;
  motivoDivergencia?: string;
  loteId?: string;
  estoqueAtualizado: boolean;
  criadoEm: string;
}

export interface RecebimentoDivergenciaHistorico {
  id: string;
  empresaId: string;
  recebimentoId: string;
  tipoDivergencia: string;
  status: 'REGISTRADA' | 'APROVADA' | 'REJEITADA';
  usuarioId: string;
  nomeUsuario?: string;
  justificativa: string;
  detalhes?: Record<string, unknown>;
  criadoEm: string;
}

export interface RecebimentoMercadoria {
  id: string;
  empresaId: string;
  filialId: string;
  nomeFilial?: string;
  nfeId?: string;
  chaveAcessoNfe?: string;
  numeroNfe?: string;
  pedidoCompraId?: string;
  numeroPedidoCompra?: string;
  fornecedorNome?: string;
  numeroRecebimento: string;
  numeroSequencial: number;
  status: StatusRecebimento;
  temDivergencia: boolean;
  justificativaDivergencia?: string;
  divergenciaRegistradaPorId?: string;
  nomeDivergenciaRegistrador?: string;
  divergenciaAprovadaPorId?: string;
  nomeDivergenciaAprovador?: string;
  dataAprovacaoDivergencia?: string;
  // Estruturação financeira para Contas a Pagar
  valorTotalNfeCentavos: number;
  valorTotalPedidoCentavos: number;
  valorReconhecidoCentavos: number;
  conferidoPorId: string;
  nomeConferente?: string;
  finalizadoPorId?: string;
  nomeFinalizador?: string;
  dataRecebimento: string;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
  itens: RecebimentoMercadoriaItem[];
  historicoDivergencias?: RecebimentoDivergenciaHistorico[];
}

// ==============================================================================
// DTOs e Contratos de Entrada/Saída
// ==============================================================================

export interface ImportarNfeXmlDTO {
  xmlConteudo: string;
  filialId: string;
  pedidoCompraId?: string;
}

export interface ItemConferenciaFisicaInput {
  nfeItemId?: string;
  pedidoItemId?: string;
  produtoId: string;
  filialDestinoId: string;
  quantidadePedida?: number;
  quantidadeNotaFiscal?: number;
  quantidadeRecebidaFisica: number;
  quantidadeLiberadaVenda?: number;
  valorUnitarioPedidoCentavos?: number;
  valorUnitarioNfeCentavos?: number;
  valorUnitarioReconhecidoCentavos?: number;
  numeroLote: string;
  dataFabricacao: string;
  dataValidade: string;
  statusLote?: StatusLoteRecebimento;
  divergenciaDetectada?: TipoDivergenciaRecebimento;
  motivoDivergencia?: string;
}

export interface RegistrarConferenciaFisicaDTO {
  recebimentoId: string;
  itens: ItemConferenciaFisicaInput[];
  justificativaDivergencia?: string;
  observacoes?: string;
}

export interface IniciarConferenciaDTO {
  nfeId?: string;
  pedidoCompraId?: string;
  filialId: string;
}

export interface AprovarDivergenciaDTO {
  recebimentoId: string;
  aprovado: boolean;
  justificativa: string;
}

export interface ConfirmarRecebimentoDTO {
  recebimentoId: string;
  observacoes?: string;
}

export interface AssociarProdutoItemNfeDTO {
  nfeItemId: string;
  produtoId: string;
}
