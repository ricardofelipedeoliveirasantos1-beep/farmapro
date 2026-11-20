import { Identificador, ValorMonetarioCentavos } from './comum';

export type TipoMovimentacaoEstoque =
  | 'ENTRADA_COMPRA_NFE'
  | 'ENTRADA_AVULSA'
  | 'SAIDA_VENDA_PDV'
  | 'SAIDA_AVULSA'
  | 'ESTORNO_CANCELAMENTO_VENDA'
  | 'AJUSTE_POSITIVO_INVENTARIO'
  | 'AJUSTE_NEGATIVO_INVENTARIO'
  | 'AJUSTE_MANUAL_POSITIVO'
  | 'AJUSTE_MANUAL_NEGATIVO'
  | 'RESERVA_PDV'
  | 'LIBERACAO_RESERVA'
  | 'PERDA_AVARIA'
  | 'PERDA_VENCIMENTO'
  | 'BLOQUEIO_QUARENTENA'
  | 'BLOQUEIO_SANITARIO'
  | 'DESBLOQUEIO_SANITARIO'
  | 'TRANSFERENCIA_SAIDA'
  | 'TRANSFERENCIA_ENTRADA';

/**
 * Saldo consolidado de estoque por produto em uma filial específica.
 */
export interface EstoqueSaldo {
  empresaId: Identificador;
  filialId: Identificador;
  produtoId: Identificador;
  quantidadeFisica: number;
  quantidadeReservada: number;
  quantidadeDisponivel: number;
  custoMedioCentavos: ValorMonetarioCentavos;
  ultimoCustoCentavos: ValorMonetarioCentavos;
  atualizadoEm: string;
}

/**
 * Livro-razão imutável de movimentações de estoque (Ledger).
 */
export interface EstoqueMovimentacao {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  produtoId: Identificador;
  loteId?: Identificador;
  tipoMovimentacao: TipoMovimentacaoEstoque;
  quantidade: number;
  custoUnitarioCentavos: ValorMonetarioCentavos;
  saldoAnterior: number;
  saldoPosterior: number;
  origemDocumentoTipo?: string;
  origemDocumentoId?: string;
  usuarioId: Identificador;
  motivo?: string;
  idOfflineUuid?: string;
  chaveIdempotencia?: string;
  dataHoraMovimento: string;
  criadoEm: string;
  // Campos complementares de leitura
  nomeProduto?: string;
  numeroLote?: string;
  nomeUsuario?: string;
  codigoBarras?: string;
}

/**
 * Reserva temporária de estoque para concorrência de caixas simultâneos no PDV.
 */
export interface EstoqueReserva {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  produtoId: Identificador;
  loteId?: Identificador;
  vendaId?: Identificador;
  dispositivoId: Identificador;
  quantidadeReservada: number;
  expiraEm: string;
  status: 'PENDENTE' | 'CONFIRMADA' | 'EXPIRADA_CANCELADA';
  criadoEm: string;
}

/**
 * Tipos e Interfaces para Inventário Físico por Filial
 */
export type StatusInventario =
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_APROVACAO'
  | 'CONCLUIDO_APROVADO'
  | 'CANCELADO';

export type TipoInventario = 'GERAL' | 'CATEGORIA' | 'ROTATIVO' | 'ESPECIFICO';

export type StatusItemInventario = 'PENDENTE' | 'CONTADO' | 'APROVADO' | 'REJEITADO';

export interface Inventario {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  codigoSequencial: number;
  descricao: string;
  tipoInventario: TipoInventario;
  categoriaId?: Identificador;
  status: StatusInventario;
  abertoPorId: Identificador;
  abertoEm: string;
  finalizadoPorId?: Identificador;
  finalizadoEm?: string;
  aprovadoPorId?: Identificador;
  aprovadoEm?: string;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
  // Campos enriquecidos
  nomeAbertoPor?: string;
  nomeAprovadoPor?: string;
  totalItens?: number;
  totalDivergencias?: number;
  valorDivergenciaTotalCentavos?: ValorMonetarioCentavos;
  itens?: InventarioItem[];
}

export interface InventarioItem {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  inventarioId: Identificador;
  produtoId: Identificador;
  loteId?: Identificador;
  quantidadeSistema: number;
  quantidadeContada?: number;
  divergencia?: number;
  custoUnitarioCentavos: ValorMonetarioCentavos;
  valorDivergenciaCentavos?: ValorMonetarioCentavos;
  justificativa?: string;
  contadoPorId?: Identificador;
  contadoEm?: string;
  statusItem: StatusItemInventario;
  criadoEm: string;
  atualizadoEm: string;
  // Enriquecidos
  nomeProduto?: string;
  apresentacao?: string;
  codigoBarras?: string;
  numeroLote?: string;
  dataValidade?: string;
}

/**
 * Resumo do Painel de Estoque
 */
export interface ResumoPainelEstoque {
  totalProdutosCadastrados: number;
  produtosEstoqueBaixo: number;
  produtosSemEstoque: number;
  produtosProximosVencimento: number;
  produtosVencidosOuBloqueados: number;
  valorTotalEstoqueCustoCentavos: ValorMonetarioCentavos;
  valorTotalEstoqueVendaCentavos: ValorMonetarioCentavos;
  criterioCalculoValorEstoque: string;
}

export interface FiltrosPainelEstoque {
  filialId?: Identificador;
  categoriaId?: Identificador;
  situacao?: 'TODOS' | 'ESTOQUE_BAIXO' | 'SEM_ESTOQUE' | 'PROXIMO_VENCIMENTO' | 'VENCIDO_BLOQUEADO' | 'NORMAL';
  termoBusca?: string;
  pagina?: number;
  limite?: number;
}

export interface ProdutoEstoqueItem {
  produtoId: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  nomeComercial: string;
  nomeGenerico?: string;
  fabricante: string;
  apresentacao: string;
  tipoProduto: string;
  categoriaNome?: string;
  codigoBarrasPrincipal?: string;
  precoCustoCentavos: ValorMonetarioCentavos;
  precoVendaCentavos: ValorMonetarioCentavos;
  estoqueMinimo: number;
  estoqueMaximo: number;
  localizacaoPrateleira?: string;
  quantidadeFisica: number;
  quantidadeReservada: number;
  quantidadeDisponivel: number;
  statusProduto: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  totalLotesAtivos: number;
  proximoVencimento?: string;
  alertaEstoque: 'NORMAL' | 'BAIXO' | 'ZERADO' | 'VENCENDO' | 'VENCIDO';
}

/**
 * DTOs para Operações de Estoque
 */
export interface EntradaMercadoriaDTO {
  filialId: Identificador;
  produtoId: Identificador;
  numeroLote: string;
  dataFabricacao?: string;
  dataValidade: string;
  quantidade: number;
  custoUnitarioCentavos: ValorMonetarioCentavos;
  motivo?: string;
  documentoOrigem?: string;
}

export interface SaidaMercadoriaDTO {
  filialId: Identificador;
  produtoId: Identificador;
  loteId?: Identificador;
  quantidade: number;
  motivo: string;
  tipoSaida: 'SAIDA_AVULSA' | 'PERDA_AVARIA' | 'PERDA_VENCIMENTO';
}

export interface AjusteEstoqueDTO {
  filialId: Identificador;
  produtoId: Identificador;
  loteId?: Identificador;
  quantidadeAjuste: number; // Positivo para acréscimo, negativo para redução
  justificativa: string; // Obrigatória
}

export interface BloqueioDesbloqueioProdutoDTO {
  produtoId: Identificador;
  filialId?: Identificador;
  novoStatus: 'ATIVO' | 'BLOQUEADO' | 'INATIVO';
  motivo: string;
}

export interface CadastrarLoteDTO {
  filialId: Identificador;
  produtoId: Identificador;
  numeroLote: string;
  dataFabricacao?: string;
  dataValidade: string;
  quantidade: number;
  custoUnitarioCentavos: ValorMonetarioCentavos;
  status?: 'ATIVO' | 'QUARENTENA' | 'BLOQUEADO';
  motivoBloqueio?: string;
}

export interface AlterarStatusLoteDTO {
  loteId: Identificador;
  novoStatus: 'ATIVO' | 'QUARENTENA' | 'BLOQUEADO' | 'VENCIDO';
  motivo: string;
}

export interface CriarInventarioDTO {
  filialId: Identificador;
  descricao: string;
  tipoInventario: TipoInventario;
  categoriaId?: Identificador;
  produtosIds?: Identificador[];
}

export interface RegistrarContagemInventarioDTO {
  inventarioId: Identificador;
  contagens: Array<{
    itemId: Identificador;
    quantidadeContada: number;
    justificativa?: string;
  }>;
}

export interface AprovarInventarioDTO {
  inventarioId: Identificador;
  justificativaGeral: string;
}
