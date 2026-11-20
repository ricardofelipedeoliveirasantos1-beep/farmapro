import React, { useState } from 'react';
import {
  Card,
  Botao,
  CampoTexto,
  Badge,
  Alerta,
  Modal,
  TabelaContainer,
  TabelaCabecalho,
  TabelaCorpo,
  TabelaLinha,
  TabelaColuna,
  TabelaCelula,
} from '@farmapro/ui';
import {
  formatarCentavosParaReal,
  formatarDataHoraBR,
  ProdutoEstoqueItem,
  ResumoPainelEstoque,
  Inventario,
  EstoqueMovimentacao,
} from '@farmapro/shared';
import {
  Boxes,
  Search,
  Plus,
  Minus,
  SlidersHorizontal,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  History,
  ClipboardList,
  Lock,
  Unlock,
  DollarSign,
  TrendingDown,
  Info,
  Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

// Dados demonstrativos iniciais de produtos no estoque
const PRODUTOS_ESTOQUE_INICIAIS: ProdutoEstoqueItem[] = [
  {
    produtoId: 'prod-001',
    empresaId: '11111111-1111-4111-a111-111111111111',
    filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
    nomeComercial: 'Amoxicilina + Clavulanato 500/125mg',
    nomeGenerico: 'Amoxicilina + Clavulanato de Potássio',
    fabricante: 'EMS S/A',
    apresentacao: 'Caixa com 21 comprimidos revestidos',
    tipoProduto: 'MEDICAMENTO_GENERICO',
    categoriaNome: 'Antimicrobianos',
    codigoBarrasPrincipal: '7896004701234',
    precoCustoCentavos: 2850,
    precoVendaCentavos: 5490,
    estoqueMinimo: 10,
    estoqueMaximo: 80,
    localizacaoPrateleira: 'A-02-03',
    quantidadeFisica: 24,
    quantidadeReservada: 0,
    quantidadeDisponivel: 24,
    statusProduto: 'ATIVO',
    totalLotesAtivos: 2,
    proximoVencimento: '2026-12-15',
    alertaEstoque: 'VENCENDO',
  },
  {
    produtoId: 'prod-002',
    empresaId: '11111111-1111-4111-a111-111111111111',
    filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
    nomeComercial: 'Dipirona Monoidratada 500mg',
    nomeGenerico: 'Dipirona Sódica',
    fabricante: 'Medley Farmacêutica',
    apresentacao: 'Frasco conta-gotas 20ml',
    tipoProduto: 'MEDICAMENTO_MIP',
    categoriaNome: 'Analgésicos & Antitérmicos',
    codigoBarrasPrincipal: '7896422501112',
    precoCustoCentavos: 420,
    precoVendaCentavos: 1250,
    estoqueMinimo: 15,
    estoqueMaximo: 150,
    localizacaoPrateleira: 'B-01-01',
    quantidadeFisica: 8,
    quantidadeReservada: 0,
    quantidadeDisponivel: 8,
    statusProduto: 'ATIVO',
    totalLotesAtivos: 1,
    proximoVencimento: '2027-08-30',
    alertaEstoque: 'BAIXO',
  },
  {
    produtoId: 'prod-003',
    empresaId: '11111111-1111-4111-a111-111111111111',
    filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
    nomeComercial: 'Losartana Potássica 50mg',
    nomeGenerico: 'Losartana Potássica',
    fabricante: 'Eurofarma Laboratórios',
    apresentacao: 'Caixa com 30 comprimidos revestidos',
    tipoProduto: 'MEDICAMENTO_GENERICO',
    categoriaNome: 'Cardiovascular / Hipertensão',
    codigoBarrasPrincipal: '7891317456789',
    precoCustoCentavos: 380,
    precoVendaCentavos: 990,
    estoqueMinimo: 20,
    estoqueMaximo: 200,
    localizacaoPrateleira: 'C-04-02',
    quantidadeFisica: 0,
    quantidadeReservada: 0,
    quantidadeDisponivel: 0,
    statusProduto: 'ATIVO',
    totalLotesAtivos: 0,
    alertaEstoque: 'ZERADO',
  },
  {
    produtoId: 'prod-004',
    empresaId: '11111111-1111-4111-a111-111111111111',
    filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
    nomeComercial: 'Omeprazol 20mg',
    nomeGenerico: 'Omeprazol',
    fabricante: 'Aché Laboratórios',
    apresentacao: 'Caixa com 28 cápsulas',
    tipoProduto: 'MEDICAMENTO_GENERICO',
    categoriaNome: 'Aparelho Digestivo',
    codigoBarrasPrincipal: '7896658004321',
    precoCustoCentavos: 750,
    precoVendaCentavos: 1890,
    estoqueMinimo: 12,
    estoqueMaximo: 100,
    localizacaoPrateleira: 'A-03-01',
    quantidadeFisica: 42,
    quantidadeReservada: 0,
    quantidadeDisponivel: 42,
    statusProduto: 'ATIVO',
    totalLotesAtivos: 3,
    proximoVencimento: '2026-12-10',
    alertaEstoque: 'VENCENDO',
  },
  {
    produtoId: 'prod-005',
    empresaId: '11111111-1111-4111-a111-111111111111',
    filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
    nomeComercial: 'Soro Fisiológico 0,9%',
    nomeGenerico: 'Cloreto de Sódio 0,9%',
    fabricante: 'Farmax',
    apresentacao: 'Frasco com 500ml',
    tipoProduto: 'PRODUTO_SAUDE_CORRELATO',
    categoriaNome: 'Primeiros Socorros',
    codigoBarrasPrincipal: '7898123450987',
    precoCustoCentavos: 250,
    precoVendaCentavos: 650,
    estoqueMinimo: 10,
    estoqueMaximo: 60,
    localizacaoPrateleira: 'D-01-05',
    quantidadeFisica: 15,
    quantidadeReservada: 0,
    quantidadeDisponivel: 15,
    statusProduto: 'BLOQUEADO',
    totalLotesAtivos: 1,
    proximoVencimento: '2027-11-20',
    alertaEstoque: 'NORMAL',
  },
];

interface LoteDemo {
  id: string;
  produtoId: string;
  nomeProduto: string;
  numeroLote: string;
  dataFabricacao: string;
  dataValidade: string;
  quantidadeDisponivel: number;
  custoUnitarioCentavos: number;
  status: 'ATIVO' | 'QUARENTENA' | 'BLOQUEADO' | 'VENCIDO' | 'ESGOTADO';
  motivoBloqueio?: string;
}

const LOTES_DEMO_INICIAIS: LoteDemo[] = [
  {
    id: 'lote-101',
    produtoId: 'prod-004',
    nomeProduto: 'Omeprazol 20mg',
    numeroLote: 'LOTE-OME-DEZ-2026',
    dataFabricacao: '2025-01-10',
    dataValidade: '2026-12-10',
    quantidadeDisponivel: 12,
    custoUnitarioCentavos: 750,
    status: 'ATIVO',
  },
  {
    id: 'lote-102',
    produtoId: 'prod-004',
    nomeProduto: 'Omeprazol 20mg',
    numeroLote: 'LOTE-OME-JAN-2027',
    dataFabricacao: '2025-02-15',
    dataValidade: '2027-01-20',
    quantidadeDisponivel: 30,
    custoUnitarioCentavos: 750,
    status: 'ATIVO',
  },
  {
    id: 'lote-103',
    produtoId: 'prod-001',
    nomeProduto: 'Amoxicilina + Clavulanato 500/125mg',
    numeroLote: 'AMX-2026-B',
    dataFabricacao: '2025-03-01',
    dataValidade: '2026-12-15',
    quantidadeDisponivel: 24,
    custoUnitarioCentavos: 2850,
    status: 'ATIVO',
  },
  {
    id: 'lote-104',
    produtoId: 'prod-002',
    nomeProduto: 'Dipirona Monoidratada 500mg',
    numeroLote: 'DIP-2024-VENCIDO',
    dataFabricacao: '2023-01-01',
    dataValidade: '2024-01-01',
    quantidadeDisponivel: 5,
    custoUnitarioCentavos: 420,
    status: 'VENCIDO',
    motivoBloqueio: 'Data de validade expirada. Segregado para descarte.',
  },
  {
    id: 'lote-105',
    produtoId: 'prod-005',
    nomeProduto: 'Soro Fisiológico 0,9%',
    numeroLote: 'SF-QUARENTENA-01',
    dataFabricacao: '2025-10-01',
    dataValidade: '2027-11-20',
    quantidadeDisponivel: 15,
    custoUnitarioCentavos: 250,
    status: 'QUARENTENA',
    motivoBloqueio: 'Aguardando laudo de inspeção do frasco pelo RT.',
  },
];

export const PainelEstoquePage: React.FC = () => {
  const { temPermissao, usuario, empresaAtiva, filialAtiva } = useAuth();

  // Sub-abas: 'produtos' | 'lotes' | 'inventarios' | 'movimentacoes'
  const [abaAtiva, setAbaAtiva] = useState<'produtos' | 'lotes' | 'inventarios' | 'movimentacoes'>('produtos');

  // Estados dos Produtos e Filtros
  const [produtos, setProdutos] = useState<ProdutoEstoqueItem[]>(PRODUTOS_ESTOQUE_INICIAIS);
  const [lotes, setLotes] = useState<LoteDemo[]>(LOTES_DEMO_INICIAIS);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('TODOS');

  // Notificações
  const [alertaSucesso, setAlertaSucesso] = useState<string | null>(null);
  const [alertaErro, setAlertaErro] = useState<string | null>(null);

  // Modais de Ação de Estoque
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [modalSaidaAberto, setModalSaidaAberto] = useState(false);
  const [modalAjusteAberto, setModalAjusteAberto] = useState(false);
  const [modalStatusLoteAberto, setModalStatusLoteAberto] = useState(false);

  // Estados de Formulário
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoEstoqueItem | null>(null);
  const [loteSelecionado, setLoteSelecionado] = useState<LoteDemo | null>(null);

  // Form Entrada
  const [numeroLoteEntrada, setNumeroLoteEntrada] = useState('');
  const [validadeEntrada, setValidadeEntrada] = useState('');
  const [quantidadeEntrada, setQuantidadeEntrada] = useState<number>(10);
  const [custoEntradaReais, setCustoEntradaReais] = useState<string>('15,00');

  // Form Saída
  const [quantidadeSaida, setQuantidadeSaida] = useState<number>(1);
  const [motivoSaida, setMotivoSaida] = useState('');

  // Form Ajuste
  const [quantidadeAjuste, setQuantidadeAjuste] = useState<number>(1);
  const [tipoAjusteSinal, setTipoAjusteSinal] = useState<'+' | '-'>('+');
  const [justificativaAjuste, setJustificativaAjuste] = useState('');

  // Form Status Lote
  const [novoStatusLote, setNovoStatusLote] = useState<'ATIVO' | 'QUARENTENA' | 'BLOQUEADO' | 'VENCIDO'>('QUARENTENA');
  const [motivoStatusLote, setMotivoStatusLote] = useState('');

  // Inventários
  const [inventarios, setInventarios] = useState<Inventario[]>([
    {
      id: 'inv-demo-01',
      empresaId: '11111111-1111-4111-a111-111111111111',
      filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
      codigoSequencial: 101,
      descricao: 'Inventário Geral Mensal Farmácia Centro',
      tipoInventario: 'GERAL',
      status: 'AGUARDANDO_APROVACAO',
      abertoPorId: 'user-01',
      abertoEm: new Date(Date.now() - 3600000 * 24).toISOString(),
      criadoEm: new Date(Date.now() - 3600000 * 24).toISOString(),
      atualizadoEm: new Date().toISOString(),
      nomeAbertoPor: 'Ana Farmacêutica',
      totalItens: 5,
      totalDivergencias: 1,
      valorDivergenciaTotalCentavos: 1250,
    },
  ]);
  const [modalInventarioAberto, setModalInventarioAberto] = useState(false);
  const [descricaoInventario, setDescricaoInventario] = useState('');
  const [modalAprovarInvAberto, setModalAprovarInvAberto] = useState(false);
  const [inventarioParaAprovar, setInventarioParaAprovar] = useState<Inventario | null>(null);
  const [justificativaAprovacaoInv, setJustificativaAprovacaoInv] = useState('');

  // Movimentações no Livro-Razão
  const [movimentacoes, setMovimentacoes] = useState<EstoqueMovimentacao[]>([
    {
      id: 'mov-001',
      empresaId: '11111111-1111-4111-a111-111111111111',
      filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
      produtoId: 'prod-001',
      tipoMovimentacao: 'ENTRADA_COMPRA_NFE',
      quantidade: 50,
      custoUnitarioCentavos: 2850,
      saldoAnterior: 0,
      saldoPosterior: 50,
      usuarioId: 'user-01',
      dataHoraMovimento: new Date(Date.now() - 3600000 * 48).toISOString(),
      criadoEm: new Date(Date.now() - 3600000 * 48).toISOString(),
      nomeProduto: 'Amoxicilina + Clavulanato 500/125mg',
      numeroLote: 'AMX-2026-B',
      nomeUsuario: 'Carlos Gerente',
      motivo: 'Entrada de mercadoria NF-e 49219',
    },
    {
      id: 'mov-002',
      empresaId: '11111111-1111-4111-a111-111111111111',
      filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
      produtoId: 'prod-001',
      tipoMovimentacao: 'SAIDA_VENDA_PDV',
      quantidade: -26,
      custoUnitarioCentavos: 2850,
      saldoAnterior: 50,
      saldoPosterior: 24,
      usuarioId: 'user-02',
      dataHoraMovimento: new Date(Date.now() - 3600000 * 12).toISOString(),
      criadoEm: new Date(Date.now() - 3600000 * 12).toISOString(),
      nomeProduto: 'Amoxicilina + Clavulanato 500/125mg',
      numeroLote: 'AMX-2026-B',
      nomeUsuario: 'Mariana Caixa',
      motivo: 'Venda Balcão PDV - Cupom CUP-982341',
    },
  ]);

  // Cálculos consolidados para o Painel de Indicadores
  const resumoPainel: ResumoPainelEstoque = {
    totalProdutosCadastrados: produtos.length,
    produtosEstoqueBaixo: produtos.filter(p => p.quantidadeDisponivel <= p.estoqueMinimo && p.quantidadeDisponivel > 0).length,
    produtosSemEstoque: produtos.filter(p => p.quantidadeDisponivel <= 0).length,
    produtosProximosVencimento: lotes.filter(l => l.status === 'ATIVO' && l.dataValidade <= '2026-12-31').length,
    produtosVencidosOuBloqueados: lotes.filter(l => l.status === 'VENCIDO' || l.status === 'BLOQUEADO' || l.status === 'QUARENTENA').length,
    valorTotalEstoqueCustoCentavos: produtos.reduce((acc, p) => acc + p.quantidadeFisica * p.precoCustoCentavos, 0),
    valorTotalEstoqueVendaCentavos: produtos.reduce((acc, p) => acc + p.quantidadeFisica * p.precoVendaCentavos, 0),
    criterioCalculoValorEstoque:
      'Custo Total: Quantidade Física × Custo Unitário Médio. Venda Total: Quantidade Física × Preço de Venda Praticado na Filial.',
  };

  // Filtragem dos Produtos
  const produtosFiltrados = produtos.filter(prod => {
    const termo = termoBusca.toLowerCase().trim();
    const matchTermo =
      !termo ||
      prod.nomeComercial.toLowerCase().includes(termo) ||
      (prod.nomeGenerico && prod.nomeGenerico.toLowerCase().includes(termo)) ||
      (prod.codigoBarrasPrincipal && prod.codigoBarrasPrincipal.includes(termo));

    if (!matchTermo) return false;

    if (filtroSituacao === 'ESTOQUE_BAIXO') return prod.quantidadeDisponivel <= prod.estoqueMinimo && prod.quantidadeDisponivel > 0;
    if (filtroSituacao === 'SEM_ESTOQUE') return prod.quantidadeDisponivel <= 0;
    if (filtroSituacao === 'VENCENDO') return prod.alertaEstoque === 'VENCENDO';
    if (filtroSituacao === 'BLOQUEADOS') return prod.statusProduto === 'BLOQUEADO';

    return true;
  });

  // Executar Entrada de Mercadoria
  const handleConfirmarEntrada = () => {
    if (!produtoSelecionado) return;
    if (!numeroLoteEntrada.trim()) {
      setAlertaErro('Informe o número do lote.');
      return;
    }
    if (!validadeEntrada) {
      setAlertaErro('Informe a data de validade.');
      return;
    }
    if (quantidadeEntrada <= 0) {
      setAlertaErro('A quantidade deve ser maior que zero.');
      return;
    }

    const custoCentavos = Math.round(parseFloat(custoEntradaReais.replace(',', '.')) * 100) || produtoSelecionado.precoCustoCentavos;

    // Atualizar Produto
    setProdutos(produtos.map(p => {
      if (p.produtoId === produtoSelecionado.produtoId) {
        const novaQtd = p.quantidadeFisica + quantidadeEntrada;
        return {
          ...p,
          quantidadeFisica: novaQtd,
          quantidadeDisponivel: novaQtd - p.quantidadeReservada,
          alertaEstoque: novaQtd <= p.estoqueMinimo ? 'BAIXO' : 'NORMAL',
        };
      }
      return p;
    }));

    // Inserir Lote
    const novoLote: LoteDemo = {
      id: `lote-${Date.now()}`,
      produtoId: produtoSelecionado.produtoId,
      nomeProduto: produtoSelecionado.nomeComercial,
      numeroLote: numeroLoteEntrada.trim(),
      dataFabricacao: new Date().toISOString().substring(0, 10),
      dataValidade: validadeEntrada,
      quantidadeDisponivel: quantidadeEntrada,
      custoUnitarioCentavos: custoCentavos,
      status: 'ATIVO',
    };
    setLotes([...lotes, novoLote]);

    // Registrar no Livro-Razão
    const novoMov: EstoqueMovimentacao = {
      id: `mov-${Date.now()}`,
      empresaId: empresaAtiva?.id || 'emp-demo',
      filialId: filialAtiva?.id || 'filial-demo',
      produtoId: produtoSelecionado.produtoId,
      tipoMovimentacao: 'ENTRADA_AVULSA',
      quantidade: quantidadeEntrada,
      custoUnitarioCentavos: custoCentavos,
      saldoAnterior: produtoSelecionado.quantidadeFisica,
      saldoPosterior: produtoSelecionado.quantidadeFisica + quantidadeEntrada,
      usuarioId: usuario?.id || 'user-demo',
      dataHoraMovimento: new Date().toISOString(),
      criadoEm: new Date().toISOString(),
      nomeProduto: produtoSelecionado.nomeComercial,
      numeroLote: numeroLoteEntrada.trim(),
      nomeUsuario: usuario?.nome || 'Operador',
      motivo: 'Entrada manual autorizada com controle de lote',
    };
    setMovimentacoes([novoMov, ...movimentacoes]);

    setModalEntradaAberto(false);
    setAlertaSucesso(`Entrada de ${quantidadeEntrada} un de "${produtoSelecionado.nomeComercial}" registrada com sucesso.`);
  };

  // Executar Saída de Mercadoria
  const handleConfirmarSaida = () => {
    if (!produtoSelecionado) return;
    if (quantidadeSaida <= 0) {
      setAlertaErro('A quantidade deve ser maior que zero.');
      return;
    }
    if (!motivoSaida.trim()) {
      setAlertaErro('O motivo da saída é obrigatório.');
      return;
    }
    if (produtoSelecionado.quantidadeDisponivel < quantidadeSaida) {
      setAlertaErro(`Saldo insuficiente (${produtoSelecionado.quantidadeDisponivel} un). O sistema proíbe estoque negativo.`);
      return;
    }

    setProdutos(produtos.map(p => {
      if (p.produtoId === produtoSelecionado.produtoId) {
        const novaQtd = p.quantidadeFisica - quantidadeSaida;
        return {
          ...p,
          quantidadeFisica: novaQtd,
          quantidadeDisponivel: novaQtd - p.quantidadeReservada,
          alertaEstoque: novaQtd <= 0 ? 'ZERADO' : novaQtd <= p.estoqueMinimo ? 'BAIXO' : 'NORMAL',
        };
      }
      return p;
    }));

    // Registrar no Livro-Razão
    const novoMov: EstoqueMovimentacao = {
      id: `mov-${Date.now()}`,
      empresaId: empresaAtiva?.id || 'emp-demo',
      filialId: filialAtiva?.id || 'filial-demo',
      produtoId: produtoSelecionado.produtoId,
      tipoMovimentacao: 'SAIDA_AVULSA',
      quantidade: -quantidadeSaida,
      custoUnitarioCentavos: produtoSelecionado.precoCustoCentavos,
      saldoAnterior: produtoSelecionado.quantidadeFisica,
      saldoPosterior: produtoSelecionado.quantidadeFisica - quantidadeSaida,
      usuarioId: usuario?.id || 'user-demo',
      dataHoraMovimento: new Date().toISOString(),
      criadoEm: new Date().toISOString(),
      nomeProduto: produtoSelecionado.nomeComercial,
      nomeUsuario: usuario?.nome || 'Operador',
      motivo: motivoSaida.trim(),
    };
    setMovimentacoes([novoMov, ...movimentacoes]);

    setModalSaidaAberto(false);
    setAlertaSucesso(`Saída de ${quantidadeSaida} un de "${produtoSelecionado.nomeComercial}" registrada.`);
  };

  // Executar Ajuste de Estoque com Justificativa Obrigatória
  const handleConfirmarAjuste = () => {
    if (!produtoSelecionado) return;
    if (justificativaAjuste.trim().length < 5) {
      setAlertaErro('A justificativa de ajuste deve ter no mínimo 5 caracteres.');
      return;
    }

    const delta = tipoAjusteSinal === '+' ? quantidadeAjuste : -quantidadeAjuste;
    const novoSaldo = produtoSelecionado.quantidadeFisica + delta;

    if (novoSaldo < 0) {
      setAlertaErro('Ajuste bloqueado: O FarmaPro proíbe estoque negativo.');
      return;
    }

    setProdutos(produtos.map(p => {
      if (p.produtoId === produtoSelecionado.produtoId) {
        return {
          ...p,
          quantidadeFisica: novoSaldo,
          quantidadeDisponivel: novoSaldo - p.quantidadeReservada,
          alertaEstoque: novoSaldo <= 0 ? 'ZERADO' : novoSaldo <= p.estoqueMinimo ? 'BAIXO' : 'NORMAL',
        };
      }
      return p;
    }));

    // Registrar no Livro-Razão
    const tipoMov = delta > 0 ? 'AJUSTE_MANUAL_POSITIVO' : 'AJUSTE_MANUAL_NEGATIVO';
    const novoMov: EstoqueMovimentacao = {
      id: `mov-${Date.now()}`,
      empresaId: empresaAtiva?.id || 'emp-demo',
      filialId: filialAtiva?.id || 'filial-demo',
      produtoId: produtoSelecionado.produtoId,
      tipoMovimentacao: tipoMov,
      quantidade: delta,
      custoUnitarioCentavos: produtoSelecionado.precoCustoCentavos,
      saldoAnterior: produtoSelecionado.quantidadeFisica,
      saldoPosterior: novoSaldo,
      usuarioId: usuario?.id || 'user-demo',
      dataHoraMovimento: new Date().toISOString(),
      criadoEm: new Date().toISOString(),
      nomeProduto: produtoSelecionado.nomeComercial,
      nomeUsuario: usuario?.nome || 'Operador',
      motivo: justificativaAjuste.trim(),
    };
    setMovimentacoes([novoMov, ...movimentacoes]);

    setModalAjusteAberto(false);
    setAlertaSucesso(`Ajuste de estoque concluído. Novo saldo físico: ${novoSaldo} un.`);
  };

  // Alternar Bloqueio/Desbloqueio de Produto
  const handleAlternarStatusProduto = (prod: ProdutoEstoqueItem) => {
    const novo = prod.statusProduto === 'BLOQUEADO' ? 'ATIVO' : 'BLOQUEADO';
    setProdutos(produtos.map(p => p.produtoId === prod.produtoId ? { ...p, statusProduto: novo } : p));
    setAlertaSucesso(`Produto "${prod.nomeComercial}" ${novo === 'BLOQUEADO' ? 'bloqueado para vendas' : 'desbloqueado com sucesso'}.`);
  };

  // Alterar Status Sanitário do Lote
  const handleConfirmarStatusLote = () => {
    if (!loteSelecionado) return;
    if (!motivoStatusLote.trim()) {
      setAlertaErro('O motivo da alteração de status do lote é obrigatório.');
      return;
    }

    setLotes(lotes.map(l => l.id === loteSelecionado.id ? { ...l, status: novoStatusLote, motivoBloqueio: motivoStatusLote } : l));
    setModalStatusLoteAberto(false);
    setAlertaSucesso(`Lote "${loteSelecionado.numeroLote}" alterado para ${novoStatusLote}.`);
  };

  // Criar Inventário
  const handleCriarInventario = () => {
    if (!descricaoInventario.trim()) {
      setAlertaErro('Informe a descrição do inventário.');
      return;
    }

    const novoInv: Inventario = {
      id: `inv-${Date.now()}`,
      empresaId: empresaAtiva?.id || 'emp-demo',
      filialId: filialAtiva?.id || 'filial-demo',
      codigoSequencial: inventarios.length + 101,
      descricao: descricaoInventario.trim(),
      tipoInventario: 'GERAL',
      status: 'EM_ANDAMENTO',
      abertoPorId: usuario?.id || 'user-demo',
      abertoEm: new Date().toISOString(),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      nomeAbertoPor: usuario?.nome || 'Operador',
      totalItens: produtos.length,
      totalDivergencias: 0,
      valorDivergenciaTotalCentavos: 0,
    };

    setInventarios([novoInv, ...inventarios]);
    setModalInventarioAberto(false);
    setDescricaoInventario('');
    setAlertaSucesso(`Inventário #${novoInv.codigoSequencial} aberto com sucesso.`);
  };

  // Aprovar Divergências do Inventário
  const handleAprovarInventario = () => {
    if (!inventarioParaAprovar) return;
    if (justificativaAprovacaoInv.trim().length < 5) {
      setAlertaErro('A aprovação exige uma justificativa formal com no mínimo 5 caracteres.');
      return;
    }

    setInventarios(inventarios.map(inv => {
      if (inv.id === inventarioParaAprovar.id) {
        return {
          ...inv,
          status: 'CONCLUIDO_APROVADO',
          aprovadoPorId: usuario?.id,
          aprovadoEm: new Date().toISOString(),
          nomeAprovadoPor: usuario?.nome,
          observacoes: justificativaAprovacaoInv.trim(),
        };
      }
      return inv;
    }));

    setModalAprovarInvAberto(false);
    setJustificativaAprovacaoInv('');
    setAlertaSucesso(`Inventário #${inventarioParaAprovar.codigoSequencial} aprovado e divergências aplicadas ao estoque.`);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-600" />
            Gestão de Estoque, Lotes e Inventário
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Controle físico e financeiro de mercadorias, priorização FEFO, rastreabilidade sanitária e livro-razão imutável.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {temPermissao('estoque:entrada_mercadoria') && (
            <Botao
              variante="primario"
              tamanho="sm"
              onClick={() => {
                setProdutoSelecionado(produtos[0] || null);
                setModalEntradaAberto(true);
              }}
              iconeEsquerda={<Plus className="w-4 h-4" />}
            >
              Nova Entrada
            </Botao>
          )}

          {temPermissao('estoque:inventario') && (
            <Botao
              variante="outline"
              tamanho="sm"
              onClick={() => setModalInventarioAberto(true)}
              iconeEsquerda={<ClipboardList className="w-4 h-4" />}
            >
              Novo Inventário
            </Botao>
          )}
        </div>
      </div>

      {/* Alertas Reativos */}
      {alertaSucesso && (
        <Alerta tipo="sucesso" aoFechar={() => setAlertaSucesso(null)}>
          {alertaSucesso}
        </Alerta>
      )}
      {alertaErro && (
        <Alerta tipo="erro" aoFechar={() => setAlertaErro(null)}>
          {alertaErro}
        </Alerta>
      )}

      {/* 2. PAINEL DE INDICADORES DO ESTOQUE (Cards Retangulares) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total de Produtos */}
        <Card className="p-3">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium">Produtos Cadastrados</span>
            <Boxes className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-xl font-bold text-slate-900 block">
            {resumoPainel.totalProdutosCadastrados}
          </span>
          <span className="text-[10px] text-slate-400">Ativos no catálogo</span>
        </Card>

        {/* Estoque Baixo */}
        <Card className="p-3">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium">Estoque Baixo</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xl font-bold text-amber-600 block">
            {resumoPainel.produtosEstoqueBaixo}
          </span>
          <span className="text-[10px] text-amber-600 font-medium">Abaixo do mínimo</span>
        </Card>

        {/* Sem Estoque */}
        <Card className="p-3">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium">Sem Estoque</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-xl font-bold text-red-600 block">
            {resumoPainel.produtosSemEstoque}
          </span>
          <span className="text-[10px] text-red-600 font-medium">Saldo zerado</span>
        </Card>

        {/* Próximos do Vencimento */}
        <Card className="p-3">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium">Vencendo em 60d</span>
            <Calendar className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-xl font-bold text-orange-600 block">
            {resumoPainel.produtosProximosVencimento}
          </span>
          <span className="text-[10px] text-orange-600 font-medium">Prioridade FEFO</span>
        </Card>

        {/* Vencidos ou Bloqueados */}
        <Card className="p-3">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium">Vencidos / Bloq.</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-xl font-bold text-rose-600 block">
            {resumoPainel.produtosVencidosOuBloqueados}
          </span>
          <span className="text-[10px] text-rose-600 font-medium">Venda proibida</span>
        </Card>

        {/* Valor Total Estimado */}
        <Card className="p-3 bg-blue-50/40 border-blue-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium text-blue-900">Valor em Estoque</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-sm font-bold text-slate-900 block truncate font-mono">
            {formatarCentavosParaReal(resumoPainel.valorTotalEstoqueVendaCentavos)}
          </span>
          <span className="text-[10px] text-slate-500 block truncate font-mono">
            Custo: {formatarCentavosParaReal(resumoPainel.valorTotalEstoqueCustoCentavos)}
          </span>
        </Card>
      </div>

      {/* Barra de Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setAbaAtiva('produtos')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            abaAtiva === 'produtos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          Produtos & Saldos por Filial
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('lotes')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            abaAtiva === 'lotes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Controle de Lotes & FEFO
          {resumoPainel.produtosVencidosOuBloqueados > 0 && (
            <Badge variante="perigo" tamanho="sm">{resumoPainel.produtosVencidosOuBloqueados}</Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('inventarios')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            abaAtiva === 'inventarios'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Inventário Físico
          {inventarios.filter(i => i.status === 'AGUARDANDO_APROVACAO').length > 0 && (
            <Badge variante="aviso" tamanho="sm">1 pendente</Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('movimentacoes')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            abaAtiva === 'movimentacoes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Livro-Razão de Movimentações
        </button>
      </div>

      {/* ABA 1: PRODUTOS & SALDOS POR FILIAL */}
      {abaAtiva === 'produtos' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-80">
              <CampoTexto
                placeholder="Pesquisar por nome, SKU ou código de barras..."
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                iconeEsquerda={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500">Situação:</span>
              <select
                value={filtroSituacao}
                onChange={e => setFiltroSituacao(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-700"
              >
                <option value="TODOS">Todos os Produtos</option>
                <option value="ESTOQUE_BAIXO">Estoque Baixo</option>
                <option value="SEM_ESTOQUE">Sem Estoque</option>
                <option value="VENCENDO">Próximos do Vencimento</option>
                <option value="BLOQUEADOS">Bloqueados para Venda</option>
              </select>
            </div>
          </div>

          {/* Tabela de Produtos */}
          <Card>
            <TabelaContainer>
              <TabelaCabecalho>
                <TabelaLinha>
                  <TabelaColuna>Produto & Apresentação</TabelaColuna>
                  <TabelaColuna>Categoria / Local</TabelaColuna>
                  <TabelaColuna className="text-right">Preço Venda</TabelaColuna>
                  <TabelaColuna className="text-center">Mín / Máx</TabelaColuna>
                  <TabelaColuna className="text-center">Físico</TabelaColuna>
                  <TabelaColuna className="text-center">Disponível</TabelaColuna>
                  <TabelaColuna className="text-center">Status</TabelaColuna>
                  <TabelaColuna className="text-right">Ações</TabelaColuna>
                </TabelaLinha>
              </TabelaCabecalho>
              <TabelaCorpo>
                {produtosFiltrados.length === 0 ? (
                  <TabelaLinha>
                    <TabelaCelula colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      Nenhum produto encontrado com os filtros aplicados.
                    </TabelaCelula>
                  </TabelaLinha>
                ) : (
                  produtosFiltrados.map(prod => (
                    <TabelaLinha key={prod.produtoId}>
                      <TabelaCelula>
                        <span className="font-semibold text-slate-900 block text-xs">
                          {prod.nomeComercial}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {prod.apresentacao} • {prod.fabricante}
                        </span>
                        {prod.codigoBarrasPrincipal && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            EAN: {prod.codigoBarrasPrincipal}
                          </span>
                        )}
                      </TabelaCelula>

                      <TabelaCelula className="text-xs text-slate-600">
                        <span>{prod.categoriaNome || 'Geral'}</span>
                        {prod.localizacaoPrateleira && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Prat: {prod.localizacaoPrateleira}
                          </span>
                        )}
                      </TabelaCelula>

                      <TabelaCelula className="text-right text-xs font-bold text-slate-900 font-mono">
                        {formatarCentavosParaReal(prod.precoVendaCentavos)}
                      </TabelaCelula>

                      <TabelaCelula className="text-center text-xs text-slate-500 font-mono">
                        {prod.estoqueMinimo} / {prod.estoqueMaximo}
                      </TabelaCelula>

                      <TabelaCelula className="text-center text-xs font-semibold text-slate-700 font-mono">
                        {prod.quantidadeFisica} un
                      </TabelaCelula>

                      <TabelaCelula className="text-center">
                        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                          prod.quantidadeDisponivel <= 0
                            ? 'bg-red-50 text-red-700'
                            : prod.quantidadeDisponivel <= prod.estoqueMinimo
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {prod.quantidadeDisponivel} un
                        </span>
                      </TabelaCelula>

                      <TabelaCelula className="text-center">
                        <Badge
                          variante={
                            prod.statusProduto === 'ATIVO'
                              ? 'sucesso'
                              : prod.statusProduto === 'BLOQUEADO'
                              ? 'perigo'
                              : 'neutro'
                          }
                          tamanho="sm"
                        >
                          {prod.statusProduto}
                        </Badge>
                      </TabelaCelula>

                      <TabelaCelula className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {temPermissao('estoque:entrada_mercadoria') && (
                            <button
                              type="button"
                              onClick={() => {
                                setProdutoSelecionado(prod);
                                setModalEntradaAberto(true);
                              }}
                              title="Registrar Entrada"
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {temPermissao('estoque:movimentar') && (
                            <button
                              type="button"
                              onClick={() => {
                                setProdutoSelecionado(prod);
                                setModalSaidaAberto(true);
                              }}
                              title="Registrar Saída"
                              className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-slate-100"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {temPermissao('estoque:ajuste_manual') && (
                            <button
                              type="button"
                              onClick={() => {
                                setProdutoSelecionado(prod);
                                setModalAjusteAberto(true);
                              }}
                              title="Ajuste com Justificativa"
                              className="p-1 rounded text-slate-500 hover:text-purple-600 hover:bg-slate-100"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {temPermissao('estoque:bloquear_produto') && (
                            <button
                              type="button"
                              onClick={() => handleAlternarStatusProduto(prod)}
                              title={prod.statusProduto === 'BLOQUEADO' ? 'Desbloquear Produto' : 'Bloquear Produto'}
                              className={`p-1 rounded ${
                                prod.statusProduto === 'BLOQUEADO'
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-slate-400 hover:text-red-600 hover:bg-slate-100'
                              }`}
                            >
                              {prod.statusProduto === 'BLOQUEADO' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </TabelaCelula>
                    </TabelaLinha>
                  ))
                )}
              </TabelaCorpo>
            </TabelaContainer>
          </Card>
        </div>
      )}

      {/* ABA 2: CONTROLE DE LOTES & FEFO */}
      {abaAtiva === 'lotes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Rastreabilidade sanitária unitária por filial. O sistema prioriza automaticamente os lotes com vencimento mais próximo (FEFO).
            </p>
            {temPermissao('estoque:gerenciar_lotes') && (
              <Botao
                variante="outline"
                tamanho="sm"
                onClick={() => {
                  setProdutoSelecionado(produtos[0] || null);
                  setModalEntradaAberto(true);
                }}
                iconeEsquerda={<Plus className="w-4 h-4" />}
              >
                Cadastrar Novo Lote
              </Botao>
            )}
          </div>

          <Card>
            <TabelaContainer>
              <TabelaCabecalho>
                <TabelaLinha>
                  <TabelaColuna>Número do Lote</TabelaColuna>
                  <TabelaColuna>Produto Vinculado</TabelaColuna>
                  <TabelaColuna>Fabricação</TabelaColuna>
                  <TabelaColuna>Data Validade (FEFO)</TabelaColuna>
                  <TabelaColuna className="text-center">Quantidade</TabelaColuna>
                  <TabelaColuna className="text-right">Custo Unit.</TabelaColuna>
                  <TabelaColuna className="text-center">Situação Sanitária</TabelaColuna>
                  <TabelaColuna className="text-right">Ação</TabelaColuna>
                </TabelaLinha>
              </TabelaCabecalho>
              <TabelaCorpo>
                {lotes.map(l => (
                  <TabelaLinha key={l.id}>
                    <TabelaCelula className="font-mono font-bold text-xs text-slate-900">
                      {l.numeroLote}
                    </TabelaCelula>
                    <TabelaCelula className="text-xs text-slate-700">
                      {l.nomeProduto}
                    </TabelaCelula>
                    <TabelaCelula className="text-xs text-slate-500 font-mono">
                      {l.dataFabricacao}
                    </TabelaCelula>
                    <TabelaCelula>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-900 font-semibold">
                          {l.dataValidade}
                        </span>
                        {l.status === 'VENCIDO' && (
                          <Badge variante="perigo" tamanho="sm">Vencido</Badge>
                        )}
                        {l.status === 'ATIVO' && l.dataValidade <= '2026-12-31' && (
                          <Badge variante="aviso" tamanho="sm">Vencendo</Badge>
                        )}
                      </div>
                    </TabelaCelula>
                    <TabelaCelula className="text-center font-mono font-semibold text-xs text-slate-900">
                      {l.quantidadeDisponivel} un
                    </TabelaCelula>
                    <TabelaCelula className="text-right font-mono text-xs text-slate-600">
                      {formatarCentavosParaReal(l.custoUnitarioCentavos)}
                    </TabelaCelula>
                    <TabelaCelula className="text-center">
                      <Badge
                        variante={
                          l.status === 'ATIVO'
                            ? 'sucesso'
                            : l.status === 'QUARENTENA'
                            ? 'aviso'
                            : l.status === 'VENCIDO' || l.status === 'BLOQUEADO'
                            ? 'perigo'
                            : 'neutro'
                        }
                        tamanho="sm"
                      >
                        {l.status}
                      </Badge>
                      {l.motivoBloqueio && (
                        <p className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5" title={l.motivoBloqueio}>
                          {l.motivoBloqueio}
                        </p>
                      )}
                    </TabelaCelula>
                    <TabelaCelula className="text-right">
                      {temPermissao('estoque:gerenciar_lotes') && (
                        <button
                          type="button"
                          onClick={() => {
                            setLoteSelecionado(l);
                            setNovoStatusLote(l.status === 'ATIVO' ? 'QUARENTENA' : 'ATIVO');
                            setModalStatusLoteAberto(true);
                          }}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Alterar Situação
                        </button>
                      )}
                    </TabelaCelula>
                  </TabelaLinha>
                ))}
              </TabelaCorpo>
            </TabelaContainer>
          </Card>
        </div>
      )}

      {/* ABA 3: INVENTÁRIO FÍSICO */}
      {abaAtiva === 'inventarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Contagem física com cálculo automático de divergências. A contagem NÃO altera o estoque até aprovação formal.
            </p>
            {temPermissao('estoque:inventario') && (
              <Botao
                variante="primario"
                tamanho="sm"
                onClick={() => setModalInventarioAberto(true)}
                iconeEsquerda={<Plus className="w-4 h-4" />}
              >
                Abrir Novo Inventário
              </Botao>
            )}
          </div>

          <Card>
            <TabelaContainer>
              <TabelaCabecalho>
                <TabelaLinha>
                  <TabelaColuna>Código / Descrição</TabelaColuna>
                  <TabelaColuna>Aberto Em</TabelaColuna>
                  <TabelaColuna>Responsável</TabelaColuna>
                  <TabelaColuna className="text-center">Itens</TabelaColuna>
                  <TabelaColuna className="text-center">Divergências</TabelaColuna>
                  <TabelaColuna className="text-center">Status</TabelaColuna>
                  <TabelaColuna className="text-right">Ação</TabelaColuna>
                </TabelaLinha>
              </TabelaCabecalho>
              <TabelaCorpo>
                {inventarios.map(inv => (
                  <TabelaLinha key={inv.id}>
                    <TabelaCelula>
                      <span className="font-semibold text-slate-900 block text-xs">
                        #{inv.codigoSequencial} — {inv.descricao}
                      </span>
                      <span className="text-[11px] text-slate-400">Tipo: {inv.tipoInventario}</span>
                    </TabelaCelula>
                    <TabelaCelula className="text-xs text-slate-500 font-mono">
                      {formatarDataHoraBR(inv.abertoEm)}
                    </TabelaCelula>
                    <TabelaCelula className="text-xs text-slate-700">
                      {inv.nomeAbertoPor || 'Farmacêutico'}
                    </TabelaCelula>
                    <TabelaCelula className="text-center text-xs font-mono text-slate-600">
                      {inv.totalItens || 0}
                    </TabelaCelula>
                    <TabelaCelula className="text-center">
                      {(inv.totalDivergencias || 0) > 0 ? (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          {inv.totalDivergencias} divergência(s)
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" /> 100% conferido
                        </span>
                      )}
                    </TabelaCelula>
                    <TabelaCelula className="text-center">
                      <Badge
                        variante={
                          inv.status === 'CONCLUIDO_APROVADO'
                            ? 'sucesso'
                            : inv.status === 'AGUARDANDO_APROVACAO'
                            ? 'aviso'
                            : 'info'
                        }
                        tamanho="sm"
                      >
                        {inv.status}
                      </Badge>
                    </TabelaCelula>
                    <TabelaCelula className="text-right">
                      {inv.status === 'AGUARDANDO_APROVACAO' && temPermissao('estoque:aprovar_divergencia') && (
                        <Botao
                          variante="primario"
                          tamanho="sm"
                          onClick={() => {
                            setInventarioParaAprovar(inv);
                            setModalAprovarInvAberto(true);
                          }}
                        >
                          Aprovar Divergências
                        </Botao>
                      )}
                      {inv.status === 'CONCLUIDO_APROVADO' && (
                        <span className="text-xs text-slate-400 font-medium">Aprovado e consolidado</span>
                      )}
                    </TabelaCelula>
                  </TabelaLinha>
                ))}
              </TabelaCorpo>
            </TabelaContainer>
          </Card>
        </div>
      )}

      {/* ABA 4: LIVRO-RAZÃO DE MOVIMENTAÇÕES */}
      {abaAtiva === 'movimentacoes' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Audit Trail Contábil imutável. Cada movimentação registra produto, lote, usuário, saldo anterior, posterior e justificativa.
          </p>

          <Card>
            <TabelaContainer>
              <TabelaCabecalho>
                <TabelaLinha>
                  <TabelaColuna>Data e Horário</TabelaColuna>
                  <TabelaColuna>Produto & Lote</TabelaColuna>
                  <TabelaColuna>Operação</TabelaColuna>
                  <TabelaColuna className="text-center">Qtd</TabelaColuna>
                  <TabelaColuna className="text-center">Saldo Anterior</TabelaColuna>
                  <TabelaColuna className="text-center">Saldo Posterior</TabelaColuna>
                  <TabelaColuna>Responsável & Motivo</TabelaColuna>
                </TabelaLinha>
              </TabelaCabecalho>
              <TabelaCorpo>
                {movimentacoes.map(m => (
                  <TabelaLinha key={m.id}>
                    <TabelaCelula className="text-xs font-mono text-slate-600">
                      {formatarDataHoraBR(m.dataHoraMovimento)}
                    </TabelaCelula>
                    <TabelaCelula>
                      <span className="font-semibold text-slate-900 block text-xs">
                        {m.nomeProduto}
                      </span>
                      {m.numeroLote && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Lote: {m.numeroLote}
                        </span>
                      )}
                    </TabelaCelula>
                    <TabelaCelula>
                      <Badge
                        variante={
                          m.quantidade > 0
                            ? 'sucesso'
                            : m.tipoMovimentacao.includes('PERDA') || m.tipoMovimentacao.includes('BLOQUEIO')
                            ? 'perigo'
                            : 'info'
                        }
                        tamanho="sm"
                      >
                        {m.tipoMovimentacao}
                      </Badge>
                    </TabelaCelula>
                    <TabelaCelula className="text-center font-mono font-bold text-xs">
                      <span className={m.quantidade > 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade} un
                      </span>
                    </TabelaCelula>
                    <TabelaCelula className="text-center text-xs font-mono text-slate-500">
                      {m.saldoAnterior} un
                    </TabelaCelula>
                    <TabelaCelula className="text-center text-xs font-mono font-bold text-slate-800">
                      {m.saldoPosterior} un
                    </TabelaCelula>
                    <TabelaCelula className="text-xs text-slate-600">
                      <span className="font-medium text-slate-800 block">{m.nomeUsuario}</span>
                      <span className="text-[11px] text-slate-400">{m.motivo || 'Sem observações'}</span>
                    </TabelaCelula>
                  </TabelaLinha>
                ))}
              </TabelaCorpo>
            </TabelaContainer>
          </Card>
        </div>
      )}

      {/* MODAL 1: ENTRADA DE MERCADORIA */}
      <Modal
        aberto={modalEntradaAberto}
        aoFechar={() => setModalEntradaAberto(false)}
        titulo="Registrar Entrada de Mercadoria"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Produto:</label>
            <span className="font-bold text-slate-900 block text-sm">{produtoSelecionado?.nomeComercial}</span>
            <span className="text-slate-500 text-[11px] block">{produtoSelecionado?.apresentacao}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Número do Lote:</label>
              <CampoTexto
                placeholder="Ex: LOTE-2026-X"
                value={numeroLoteEntrada}
                onChange={e => setNumeroLoteEntrada(e.target.value)}
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Data de Validade:</label>
              <CampoTexto
                type="date"
                value={validadeEntrada}
                onChange={e => setValidadeEntrada(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Quantidade Recebida:</label>
              <CampoTexto
                type="number"
                min="1"
                value={String(quantidadeEntrada)}
                onChange={e => setQuantidadeEntrada(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Custo Unitário (R$):</label>
              <CampoTexto
                placeholder="0,00"
                value={custoEntradaReais}
                onChange={e => setCustoEntradaReais(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Botao variante="outline" onClick={() => setModalEntradaAberto(false)}>Cancelar</Botao>
            <Botao variante="primario" onClick={handleConfirmarEntrada}>Confirmar Entrada</Botao>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: SAÍDA DE MERCADORIA */}
      <Modal
        aberto={modalSaidaAberto}
        aoFechar={() => setModalSaidaAberto(false)}
        titulo="Registrar Saída de Mercadoria"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Produto:</label>
            <span className="font-bold text-slate-900 block text-sm">{produtoSelecionado?.nomeComercial}</span>
            <span className="text-slate-500 text-[11px] block">
              Saldo Físico Atual: {produtoSelecionado?.quantidadeFisica} un (Disponível: {produtoSelecionado?.quantidadeDisponivel} un)
            </span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Quantidade a Retirar:</label>
            <CampoTexto
              type="number"
              min="1"
              max={produtoSelecionado?.quantidadeDisponivel}
              value={String(quantidadeSaida)}
              onChange={e => setQuantidadeSaida(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Motivo Obrigatório:</label>
            <CampoTexto
              placeholder="Ex: Descarte por avaria, amostra de controle, etc."
              value={motivoSaida}
              onChange={e => setMotivoSaida(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Botao variante="outline" onClick={() => setModalSaidaAberto(false)}>Cancelar</Botao>
            <Botao variante="primario" onClick={handleConfirmarSaida}>Confirmar Saída</Botao>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: AJUSTE COM JUSTIFICATIVA OBRIGATÓRIA */}
      <Modal
        aberto={modalAjusteAberto}
        aoFechar={() => setModalAjusteAberto(false)}
        titulo="Ajuste Manual de Estoque (Auditoria Obrigatória)"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Produto:</label>
            <span className="font-bold text-slate-900 block text-sm">{produtoSelecionado?.nomeComercial}</span>
            <span className="text-slate-500 text-[11px] block">
              Saldo Atual: {produtoSelecionado?.quantidadeFisica} un
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tipo de Ajuste:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTipoAjusteSinal('+')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border ${
                    tipoAjusteSinal === '+'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  + Acréscimo
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAjusteSinal('-')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border ${
                    tipoAjusteSinal === '-'
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  - Redução
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Quantidade de Ajuste:</label>
              <CampoTexto
                type="number"
                min="1"
                value={String(quantidadeAjuste)}
                onChange={e => setQuantidadeAjuste(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Justificativa Formal Obrigatória:</label>
            <CampoTexto
              placeholder="Descreva detalhadamente a razão do ajuste (mín. 5 caracteres)..."
              value={justificativaAjuste}
              onChange={e => setJustificativaAjuste(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Botao variante="outline" onClick={() => setModalAjusteAberto(false)}>Cancelar</Botao>
            <Botao variante="primario" onClick={handleConfirmarAjuste}>Gravar Ajuste</Botao>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: ALTERAÇÃO DE SITUAÇÃO DO LOTE */}
      <Modal
        aberto={modalStatusLoteAberto}
        aoFechar={() => setModalStatusLoteAberto(false)}
        titulo={`Alterar Situação do Lote ${loteSelecionado?.numeroLote}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Produto:</label>
            <span className="font-bold text-slate-900 block">{loteSelecionado?.nomeProduto}</span>
            <span className="text-slate-500 text-[11px] block">Validade: {loteSelecionado?.dataValidade}</span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Nova Situação Sanitária:</label>
            <select
              value={novoStatusLote}
              onChange={e =>
                setNovoStatusLote(
                  e.target.value as 'ATIVO' | 'QUARENTENA' | 'BLOQUEADO' | 'VENCIDO'
                )
              }
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
            >
              <option value="ATIVO">ATIVO (Disponível para venda)</option>
              <option value="QUARENTENA">QUARENTENA (Em inspeção técnica)</option>
              <option value="BLOQUEADO">BLOQUEADO (Suspenso / Bloqueio ANVISA)</option>
              <option value="VENCIDO">VENCIDO (Descarte)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Motivo Obrigatório:</label>
            <CampoTexto
              placeholder="Ex: Laudo do farmacêutico, alerta da vigilância sanitária, etc."
              value={motivoStatusLote}
              onChange={e => setMotivoStatusLote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Botao variante="outline" onClick={() => setModalStatusLoteAberto(false)}>Cancelar</Botao>
            <Botao variante="primario" onClick={handleConfirmarStatusLote}>Salvar Nova Situação</Botao>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: ABERTURA DE INVENTÁRIO */}
      <Modal
        aberto={modalInventarioAberto}
        aoFechar={() => setModalInventarioAberto(false)}
        titulo="Abrir Novo Inventário Físico"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Descrição do Inventário:</label>
            <CampoTexto
              placeholder="Ex: Inventário Geral Balanço Mensal..."
              value={descricaoInventario}
              onChange={e => setDescricaoInventario(e.target.value)}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-800 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              O inventário registrará um instantâneo (*snapshot*) de todos os produtos ativos. A digitação da contagem não altera o saldo de estoque até a conferência e aprovação formal do responsável técnico.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Botao variante="outline" onClick={() => setModalInventarioAberto(false)}>Cancelar</Botao>
            <Botao variante="primario" onClick={handleCriarInventario}>Abrir Inventário</Botao>
          </div>
        </div>
      </Modal>

      {/* MODAL 6: APROVAÇÃO FORMAL DE INVENTÁRIO */}
      <Modal
        aberto={modalAprovarInvAberto}
        aoFechar={() => setModalAprovarInvAberto(false)}
        titulo={`Aprovar Divergências do Inventário #${inventarioParaAprovar?.codigoSequencial}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <p className="text-slate-600">
              Foram identificadas <strong>{inventarioParaAprovar?.totalDivergencias} divergência(s)</strong> entre a contagem física e o saldo do sistema.
            </p>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Justificativa Formal da Aprovação:</label>
            <CampoTexto
              placeholder="Descreva a conferência e autorização para lançamento dos ajustes contábeis..."
              value={justificativaAprovacaoInv}
              onChange={e => setJustificativaAprovacaoInv(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Botao variante="outline" onClick={() => setModalAprovarInvAberto(false)}>Cancelar</Botao>
            <Botao variante="primario" onClick={handleAprovarInventario}>Aprovar e Ajustar Estoque</Botao>
          </div>
        </div>
      </Modal>
    </div>
  );
};
