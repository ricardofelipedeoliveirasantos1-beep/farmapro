// ==============================================================================
// FarmaPro — Módulo de Fornecedores, Solicitações e Pedidos de Compra (Etapa 08)
// Tipagem estrita com valores monetários em centavos inteiros e isolamento tenant
// ==============================================================================

export type StatusFornecedor =
  | 'PENDENTE_APROVACAO'
  | 'ATIVO'
  | 'BLOQUEADO'
  | 'INATIVO';

export interface FornecedorContato {
  nome: string;
  cargo?: string;
  telefone?: string;
  email?: string;
}

export interface FornecedorDadosBancarios {
  banco?: string;
  agencia?: string;
  conta?: string;
  chavePix?: string;
  tipoChavePix?: 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
}

export interface FornecedorDocumento {
  id: string;
  tipo: string;
  titulo: string;
  url?: string;
  dataValidade?: string;
}

export interface Fornecedor {
  id: string;
  empresaId: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string; // 14 dígitos estritos
  inscricaoEstadual?: string;
  email?: string;
  telefone?: string;
  contatoPrincipal?: FornecedorContato;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  condicoesComerciais?: string;
  prazoEntregaDias: number;
  dadosBancarios?: FornecedorDadosBancarios;
  observacoes?: string;
  documentos?: FornecedorDocumento[];
  status: StatusFornecedor;
  solicitadoPorId?: string;
  aprovadoPorId?: string;
  dataAprovacao?: string;
  motivoRejeicao?: string;
  motivoBloqueio?: string;
  bloqueadoPorId?: string;
  dataBloqueio?: string;
  criadoEm: string;
  atualizadoEm: string;
  desativadoParaFiliais?: string[];
}

export interface FornecedorFilialDesativado {
  id: string;
  empresaId: string;
  fornecedorId: string;
  filialId: string;
  desativadoPorId: string;
  motivo: string;
  dataDesativacao: string;
}

export type PrioridadeSolicitacao = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export type StatusSolicitacaoCompra =
  | 'RASCUNHO'
  | 'PENDENTE_APROVACAO'
  | 'APROVADA_TOTAL'
  | 'APROVADA_PARCIAL'
  | 'REJEITADA'
  | 'CONSOLIDADA'
  | 'CANCELADA';

export interface SolicitacaoCompraItem {
  id: string;
  empresaId: string;
  solicitacaoId: string;
  produtoId: string;
  nomeProduto?: string;
  codigoBarras?: string;
  quantidadeSolicitada: number;
  quantidadeAprovada?: number;
  justificativaItem?: string;
}

export interface SolicitacaoCompra {
  id: string;
  empresaId: string;
  filialId: string;
  nomeFilial?: string;
  numeroSequencial: number;
  solicitadoPorId: string;
  nomeSolicitante?: string;
  justificativaGeral: string;
  prioridade: PrioridadeSolicitacao;
  status: StatusSolicitacaoCompra;
  aprovadoPorId?: string;
  dataDecisao?: string;
  justificativaDecisao?: string;
  pedidoCompraConsolidadoId?: string;
  criadoEm: string;
  atualizadoEm: string;
  itens: SolicitacaoCompraItem[];
}

export type StatusPedidoCompra =
  | 'RASCUNHO'
  | 'PENDENTE_APROVACAO'
  | 'APROVADO'
  | 'ENVIADO_FORNECEDOR'
  | 'CONFIRMADO_FORNECEDOR'
  | 'PARCIALMENTE_ATENDIDO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export interface PedidoCompraItem {
  id: string;
  empresaId: string;
  pedidoId: string;
  produtoId: string;
  nomeProduto?: string;
  codigoBarras?: string;
  filialDestinoId: string;
  nomeFilialDestino?: string;
  quantidadePedida: number;
  quantidadeEntregue: number;
  valorUnitarioCentavos: number;
  descontoCentavos: number;
  valorTotalCentavos: number;
  solicitacaoItemId?: string;
}

export interface PedidoCompraHistorico {
  id: string;
  empresaId: string;
  pedidoId: string;
  statusAnterior?: string;
  statusNovo: string;
  usuarioId: string;
  nomeUsuario?: string;
  motivoAlteracao?: string;
  alteracoesDetalhe?: Record<string, unknown>;
  dataRegistro: string;
}

export interface PedidoCompra {
  id: string;
  empresaId: string;
  fornecedorId: string;
  razaoSocialFornecedor?: string;
  nomeFantasiaFornecedor?: string;
  numeroPedido: string;
  numeroSequencial: number;
  filialDestinoPrincipalId?: string;
  destinadoMultiplasFiliais: boolean;
  status: StatusPedidoCompra;
  valorSubtotalCentavos: number;
  valorDescontoCentavos: number;
  valorFreteCentavos: number;
  valorTotalCentavos: number;
  condicoesPagamento?: string;
  prazoEntregaPrevisto?: string;
  observacoes?: string;
  criadoPorId: string;
  nomeCriador?: string;
  aprovadoPorId?: string;
  dataAprovacao?: string;
  dataEnvio?: string;
  dataConfirmacao?: string;
  canceladoPorId?: string;
  dataCancelamento?: string;
  motivoCancelamento?: string;
  criadoEm: string;
  atualizadoEm: string;
  itens: PedidoCompraItem[];
  historico?: PedidoCompraHistorico[];
}

// ==============================================================================
// DTOs para Operações de Compras e Fornecedores
// ==============================================================================

export interface CadastrarFornecedorDTO {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  email?: string;
  telefone?: string;
  contatoPrincipalNome?: string;
  contatoPrincipalCargo?: string;
  contatoPrincipalTelefone?: string;
  contatoPrincipalEmail?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  condicoesComerciais?: string;
  prazoEntregaDias?: number;
  dadosBancarios?: FornecedorDadosBancarios;
  observacoes?: string;
  documentos?: FornecedorDocumento[];
  solicitarAprovacao?: boolean; // Se true, cria como PENDENTE_APROVACAO
}

export interface AtualizarFornecedorDTO {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  email?: string;
  telefone?: string;
  contatoPrincipalNome?: string;
  contatoPrincipalCargo?: string;
  contatoPrincipalTelefone?: string;
  contatoPrincipalEmail?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  condicoesComerciais?: string;
  prazoEntregaDias?: number;
  dadosBancarios?: FornecedorDadosBancarios;
  observacoes?: string;
  documentos?: FornecedorDocumento[];
  justificativaSensivel?: string; // Obrigatória se alterar CNPJ, razão social ou dados bancários
}

export interface DecisaoFornecedorDTO {
  aprovado: boolean;
  motivo?: string;
}

export interface BloquearFornecedorDTO {
  motivo: string;
}

export interface DesativarFornecedorFilialDTO {
  fornecedorId: string;
  filialId: string;
  motivo: string;
}

export interface ItemSolicitacaoCompraDTO {
  produtoId: string;
  quantidadeSolicitada: number;
  justificativaItem?: string;
}

export interface CriarSolicitacaoCompraDTO {
  filialId: string;
  justificativaGeral: string;
  prioridade?: PrioridadeSolicitacao;
  enviarParaAprovacao?: boolean;
  itens: ItemSolicitacaoCompraDTO[];
}

export interface DecisaoItemSolicitacaoDTO {
  itemId: string;
  quantidadeAprovada: number;
}

export interface DecisaoSolicitacaoCompraDTO {
  acao: 'APROVAR_TOTAL' | 'APROVAR_PARCIAL' | 'REJEITAR' | 'SOLICITAR_CORRECAO';
  justificativa: string;
  itensAprovados?: DecisaoItemSolicitacaoDTO[];
}

export interface ItemPedidoCompraDTO {
  produtoId: string;
  filialDestinoId: string;
  quantidadePedida: number;
  valorUnitarioCentavos: number;
  descontoCentavos?: number;
  solicitacaoItemId?: string;
}

export interface CriarPedidoCompraDTO {
  fornecedorId: string;
  filialDestinoPrincipalId?: string;
  condicoesPagamento?: string;
  prazoEntregaPrevisto?: string;
  valorFreteCentavos?: number;
  observacoes?: string;
  enviarParaAprovacao?: boolean;
  itens: ItemPedidoCompraDTO[];
}

export interface ConsolidarSolicitacoesDTO {
  fornecedorId: string;
  solicitacaoIds: string[];
  condicoesPagamento?: string;
  prazoEntregaPrevisto?: string;
  valorFreteCentavos?: number;
  observacoes?: string;
  itensComPreco: {
    solicitacaoItemId: string;
    valorUnitarioCentavos: number;
    descontoCentavos?: number;
  }[];
}

export interface AlterarStatusPedidoDTO {
  novoStatus: StatusPedidoCompra;
  motivo?: string;
  detalhes?: Record<string, unknown>;
}
