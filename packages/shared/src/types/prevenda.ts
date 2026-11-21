// ==============================================================================
// FarmaPro — Tipos Compartilhados para Pré-Venda e Balcão de Atendimento
// ==============================================================================

import { Identificador, ValorMonetarioCentavos } from './comum';

export type StatusPreVenda =
  | 'PENDENTE'
  | 'EM_ATENDIMENTO'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'EXPIRADA';

export interface PreVendaItem {
  id: Identificador;
  empresaId?: Identificador;
  filialId?: Identificador;
  preVendaId?: Identificador;
  produtoId: Identificador;
  loteId?: Identificador;
  numeroItem: number;
  codigoBarras?: string;
  nomeProduto: string;
  apresentacao?: string;
  quantidade: number;
  precoUnitarioCentavos: ValorMonetarioCentavos;
  descontoUnitarioCentavos: ValorMonetarioCentavos;
  totalItemCentavos: ValorMonetarioCentavos;
  exigeReceita?: boolean;
  classificacaoReceita?: string;
  criadoEm?: string;
}

export interface PreVenda {
  id: Identificador;
  empresaId: Identificador;
  filialId: Identificador;
  codigoComanda: string;
  atendenteId: Identificador;
  atendenteNome?: string;
  identificacaoBalcao: string;
  clienteId?: Identificador;
  clienteNome?: string;
  clienteCpf?: string;
  subtotalCentavos: ValorMonetarioCentavos;
  descontoCentavos: ValorMonetarioCentavos;
  totalCentavos: ValorMonetarioCentavos;
  status: StatusPreVenda;
  vendaId?: Identificador;
  caixaOperadorId?: Identificador;
  validadeMinutos: number;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm?: string;
  finalizadoEm?: string;
  canceladoEm?: string;
  itens: PreVendaItem[];
}

export interface ItemPreVendaDTO {
  produtoId: string;
  loteId?: string;
  codigoBarras?: string;
  nomeProduto?: string;
  apresentacao?: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  descontoUnitarioCentavos?: number;
}

export interface CriarPreVendaDTO {
  filialId?: string;
  identificacaoBalcao?: string;
  clienteId?: string;
  clienteNome?: string;
  clienteCpf?: string;
  itens: ItemPreVendaDTO[];
  descontoCentavos?: number;
  observacoes?: string;
}

export interface ConsultaProdutoBalcao {
  id: string;
  codigoBarras: string;
  nomeComercial: string;
  nomeGenerico?: string;
  principioAtivo?: string;
  apresentacao: string;
  fabricante: string;
  tipoProduto: string;
  classificacaoReceita: string;
  precoVendaCentavos: number;
  estoqueTotal: number;
  loteFefo?: {
    id: string;
    numeroLote: string;
    dataValidade: string;
    diasAteVencimento: number;
    quantidadeDisponivel: number;
  };
  lotesValidos: Array<{
    id: string;
    numeroLote: string;
    dataValidade: string;
    quantidadeDisponivel: number;
    status: string;
  }>;
}
