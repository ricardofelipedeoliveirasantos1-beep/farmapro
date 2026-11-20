import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardCabecalho,
  CardTitulo,
  CardConteudo,
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
  formatarCpf,
  validarCpf,
  FormaPagamento,
} from '@farmapro/shared';
import {
  Search,
  Barcode,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Ticket,
  UserCheck,
  CheckCircle2,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

interface ProdutoItemPDV {
  id: string;
  codigoBarras: string;
  nomeComercial: string;
  apresentacao: string;
  fabricante: string;
  precoVendaCentavos: number;
  estoqueDisponivel: number;
  loteId?: string;
  numeroLote?: string;
  dataValidade?: string;
  loteVencido?: boolean;
  loteBloqueado?: boolean;
}

interface ItemCarrinho {
  produtoId: string;
  loteId?: string;
  codigoBarras: string;
  nomeComercial: string;
  apresentacao: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  descontoCentavos: number;
  subtotalCentavos: number;
}

interface PagamentoItem {
  forma: FormaPagamento;
  valorCentavos: number;
  parcelas?: number;
  bandeira?: string;
  codigoVoucher?: string;
  confirmado?: boolean;
}

// Catálogo Fictício de Demonstração para Testes Visuais Imediatos
const PRODUTOS_CATALOGO_DEMO: ProdutoItemPDV[] = [
  {
    id: 'prod-001',
    codigoBarras: '7891111111111',
    nomeComercial: 'Amoxicilina + Clavulanato 500mg',
    apresentacao: '500mg/125mg — Cx 21 comprimidos',
    fabricante: 'Laboratório Nacional',
    precoVendaCentavos: 4490,
    estoqueDisponivel: 48,
    loteId: 'lote-amx-01',
    numeroLote: 'AMX-2026-B1',
    dataValidade: '2027-10-15',
    loteVencido: false,
    loteBloqueado: false,
  },
  {
    id: 'prod-002',
    codigoBarras: '7892222222222',
    nomeComercial: 'Dipirona Monoidratada Gotas',
    apresentacao: '500mg/mL — Frasco 20mL',
    fabricante: 'MedSimilares Brasil',
    precoVendaCentavos: 890,
    estoqueDisponivel: 95,
    loteId: 'lote-dip-01',
    numeroLote: 'DIP-2026-X9',
    dataValidade: '2028-02-28',
    loteVencido: false,
    loteBloqueado: false,
  },
  {
    id: 'prod-003',
    codigoBarras: '7893333333333',
    nomeComercial: 'Losartana Potássica 50mg',
    apresentacao: '50mg — Cx 30 comprimidos',
    fabricante: 'CardioFarma SA',
    precoVendaCentavos: 1350,
    estoqueDisponivel: 24,
    loteId: 'lote-los-01',
    numeroLote: 'LOS-2026-C3',
    dataValidade: '2027-05-20',
    loteVencido: false,
    loteBloqueado: false,
  },
  {
    id: 'prod-004',
    codigoBarras: '7894444444444',
    nomeComercial: 'Omeprazol 20mg Cápsulas',
    apresentacao: '20mg — Cx 28 cápsulas',
    fabricante: 'GastroMed Brasil',
    precoVendaCentavos: 1690,
    estoqueDisponivel: 60,
    loteId: 'lote-omp-01',
    numeroLote: 'OMP-2026-A4',
    dataValidade: '2028-08-30',
    loteVencido: false,
    loteBloqueado: false,
  },
  {
    id: 'prod-005',
    codigoBarras: '7895555555555',
    nomeComercial: 'Dipirona Lote Vencido (Atenção Sanitária)',
    apresentacao: '500mg — Cx 10 comp',
    fabricante: 'Lab Exemplo',
    precoVendaCentavos: 750,
    estoqueDisponivel: 10,
    loteId: 'lote-venc-01',
    numeroLote: 'VENC-2024-X',
    dataValidade: '2024-01-01',
    loteVencido: true,
    loteBloqueado: false,
  },
];

export const PdvBalcaoPage: React.FC = () => {
  const { temPermissao, usuario, empresaAtiva, filialAtiva } = useAuth();

  // Estados do Carrinho e Busca
  const [termoBusca, setTermoBusca] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [descontoGlobalCentavos, setDescontoGlobalCentavos] = useState<number>(0);
  const [mensagemAlerta, setMensagemAlerta] = useState<string | null>(null);

  // Identificação do Cliente
  const [cpfCliente, setCpfCliente] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [clienteIdentificado, setClienteIdentificado] = useState(false);

  // Modal de Pagamento
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [pagamentos, setPagamentos] = useState<PagamentoItem[]>([]);
  const [formaSelecionada, setFormaSelecionada] = useState<FormaPagamento>('DINHEIRO');
  const [valorInputCentavos, setValorInputCentavos] = useState<number>(0);
  const [parcelasCartao, setParcelasCartao] = useState<number>(1);
  const [codigoVoucherInput, setCodigoVoucherInput] = useState<string>('');
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);

  // Modal de Venda Concluída (Comprovante)
  const [modalConcluidoAberto, setModalConcluidoAberto] = useState(false);
  const [dadosVendaFinalizada, setDadosVendaFinalizada] = useState<{
    numeroCupom: string;
    totalCentavos: number;
    trocoCentavos: number;
    pagamentos: PagamentoItem[];
    itens: ItemCarrinho[];
  } | null>(null);

  const campoBuscaRef = useRef<HTMLInputElement>(null);

  // Atalho global de teclado para leitor de código de barras ou F2 para foco
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        campoBuscaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Foco inicial automático no campo de busca
  useEffect(() => {
    campoBuscaRef.current?.focus();
  }, []);

  // Filtro de produtos
  const produtosFiltrados = PRODUTOS_CATALOGO_DEMO.filter(p => {
    if (!termoBusca.trim()) return false;
    const t = termoBusca.toLowerCase().trim();
    return (
      p.nomeComercial.toLowerCase().includes(t) ||
      p.codigoBarras.includes(t) ||
      p.fabricante.toLowerCase().includes(t)
    );
  });

  // Cálculos do Carrinho
  const subtotalCentavos = carrinho.reduce((acc, it) => acc + it.subtotalCentavos, 0);
  const totalDescontosCentavos =
    carrinho.reduce((acc, it) => acc + it.descontoCentavos, 0) + descontoGlobalCentavos;
  const totalLiquidoCentavos = Math.max(0, subtotalCentavos - totalDescontosCentavos);

  // Adicionar produto ao carrinho
  const adicionarAoCarrinho = (prod: ProdutoItemPDV) => {
    setMensagemAlerta(null);

    // Validação Sanitária Obrigatória: Lote Vencido
    if (prod.loteVencido) {
      setMensagemAlerta(
        `Venda Bloqueada: O lote "${prod.numeroLote}" está VENCIDO (${prod.dataValidade}). A comercialização é proibida por determinação da ANVISA.`,
      );
      return;
    }

    // Validação Sanitária: Lote Bloqueado
    if (prod.loteBloqueado) {
      setMensagemAlerta(`Venda Bloqueada: O lote "${prod.numeroLote}" está bloqueado pela garantia de qualidade.`);
      return;
    }

    // Validação de Estoque
    if (prod.estoqueDisponivel <= 0) {
      setMensagemAlerta(`Produto sem estoque disponível no momento.`);
      return;
    }

    const itemExistente = carrinho.find(it => it.produtoId === prod.id);

    if (itemExistente) {
      if (itemExistente.quantidade + 1 > prod.estoqueDisponivel) {
        setMensagemAlerta(`Estoque insuficiente. Quantidade máxima disponível: ${prod.estoqueDisponivel}.`);
        return;
      }
      setCarrinho(
        carrinho.map(it =>
          it.produtoId === prod.id
            ? {
                ...it,
                quantidade: it.quantidade + 1,
                subtotalCentavos: (it.quantidade + 1) * it.precoUnitarioCentavos - it.descontoCentavos,
              }
            : it,
        ),
      );
    } else {
      setCarrinho([
        ...carrinho,
        {
          produtoId: prod.id,
          loteId: prod.loteId,
          codigoBarras: prod.codigoBarras,
          nomeComercial: prod.nomeComercial,
          apresentacao: prod.apresentacao,
          quantidade: 1,
          precoUnitarioCentavos: prod.precoVendaCentavos,
          descontoCentavos: 0,
          subtotalCentavos: prod.precoVendaCentavos,
        },
      ]);
    }

    setTermoBusca('');
    campoBuscaRef.current?.focus();
  };

  const alterarQuantidade = (produtoId: string, delta: number) => {
    const item = carrinho.find(it => it.produtoId === produtoId);
    if (!item) return;

    const prodCatalogo = PRODUTOS_CATALOGO_DEMO.find(p => p.id === produtoId);
    const estoqueMax = prodCatalogo ? prodCatalogo.estoqueDisponivel : 999;

    const novaQtd = item.quantidade + delta;
    if (novaQtd <= 0) {
      removerItem(produtoId);
      return;
    }

    if (novaQtd > estoqueMax) {
      setMensagemAlerta(`Estoque insuficiente. Quantidade máxima: ${estoqueMax}.`);
      return;
    }

    setCarrinho(
      carrinho.map(it =>
        it.produtoId === produtoId
          ? {
              ...it,
              quantidade: novaQtd,
              subtotalCentavos: novaQtd * it.precoUnitarioCentavos - it.descontoCentavos,
            }
          : it,
      ),
    );
  };

  const removerItem = (produtoId: string) => {
    setCarrinho(carrinho.filter(it => it.produtoId !== produtoId));
  };

  const limparVenda = () => {
    setCarrinho([]);
    setDescontoGlobalCentavos(0);
    setCpfCliente('');
    setNomeCliente('');
    setClienteIdentificado(false);
    setMensagemAlerta(null);
    setPagamentos([]);
    campoBuscaRef.current?.focus();
  };

  // Abrir Modal de Pagamento
  const abrirModalPagamento = () => {
    if (carrinho.length === 0) {
      setMensagemAlerta('Adicione ao menos um produto no carrinho antes de finalizar a venda.');
      return;
    }
    setPagamentos([]);
    setErroPagamento(null);
    setValorInputCentavos(totalLiquidoCentavos);
    setFormaSelecionada('DINHEIRO');
    setModalPagamentoAberto(true);
  };

  // Cálculos no Modal de Pagamento
  const totalPagoAtualCentavos = pagamentos.reduce((acc, p) => acc + p.valorCentavos, 0);
  const saldoRestanteCentavos = Math.max(0, totalLiquidoCentavos - totalPagoAtualCentavos);
  const totalDinheiroPagoCentavos = pagamentos
    .filter(p => p.forma === 'DINHEIRO')
    .reduce((acc, p) => acc + p.valorCentavos, 0);

  const trocoCalculadoCentavos =
    totalPagoAtualCentavos > totalLiquidoCentavos && totalDinheiroPagoCentavos > 0
      ? Math.min(totalDinheiroPagoCentavos, totalPagoAtualCentavos - totalLiquidoCentavos)
      : 0;

  // Adicionar Pagamento Parcial ou Total
  const adicionarPagamento = () => {
    setErroPagamento(null);

    if (valorInputCentavos <= 0) {
      setErroPagamento('O valor do pagamento deve ser maior que zero.');
      return;
    }

    // Regra de Voucher
    if (formaSelecionada === 'VOUCHER') {
      const codigoLimpo = codigoVoucherInput.trim().toUpperCase();
      if (!codigoLimpo) {
        setErroPagamento('Informe o código do voucher para validação.');
        return;
      }

      // Simulação de validação do voucher
      // Supondo voucher demo de R$ 30,00 ou R$ 50,00
      const valorVoucherDemo = codigoLimpo.includes('50') ? 5000 : 3000;

      // Regra obrigatória: compra < voucher é BLOQUEADA
      if (totalLiquidoCentavos < valorVoucherDemo) {
        setErroPagamento(
          `O valor total da compra (${formatarCentavosParaReal(totalLiquidoCentavos)}) é inferior ao valor do voucher (${formatarCentavosParaReal(valorVoucherDemo)}). O resgate deve ser 100% integral sem troco residual.`,
        );
        return;
      }

      setPagamentos([
        ...pagamentos,
        {
          forma: 'VOUCHER',
          valorCentavos: valorVoucherDemo,
          codigoVoucher: codigoLimpo,
          confirmado: true,
        },
      ]);
      setCodigoVoucherInput('');
      const novoRestante = Math.max(0, totalLiquidoCentavos - (totalPagoAtualCentavos + valorVoucherDemo));
      setValorInputCentavos(novoRestante);
      return;
    }

    // Adiciona pagamento tradicional
    setPagamentos([
      ...pagamentos,
      {
        forma: formaSelecionada,
        valorCentavos: valorInputCentavos,
        parcelas: formaSelecionada === 'CARTAO_CREDITO' ? parcelasCartao : 1,
        bandeira: formaSelecionada.includes('CARTAO') ? 'MASTERCARD' : undefined,
        confirmado: true,
      },
    ]);

    const novoRestante = Math.max(0, totalLiquidoCentavos - (totalPagoAtualCentavos + valorInputCentavos));
    setValorInputCentavos(novoRestante);
  };

  const removerPagamento = (idx: number) => {
    const novos = pagamentos.filter((_, i) => i !== idx);
    setPagamentos(novos);
    const novoTotal = novos.reduce((acc, p) => acc + p.valorCentavos, 0);
    setValorInputCentavos(Math.max(0, totalLiquidoCentavos - novoTotal));
  };

  // Finalizar a Venda
  const concluirVenda = () => {
    setErroPagamento(null);

    if (totalPagoAtualCentavos < totalLiquidoCentavos) {
      setErroPagamento(
        `Faltam pagar ${formatarCentavosParaReal(saldoRestanteCentavos)} para completar o total da venda.`,
      );
      return;
    }

    const cupomGerado = `CUP-${Date.now().toString().slice(-6)}`;

    setDadosVendaFinalizada({
      numeroCupom: cupomGerado,
      totalCentavos: totalLiquidoCentavos,
      trocoCentavos: trocoCalculadoCentavos,
      pagamentos: [...pagamentos],
      itens: [...carrinho],
    });

    setModalPagamentoAberto(false);
    setModalConcluidoAberto(true);
    limparVenda();
  };

  return (
    <div className="space-y-6">
      {/* Banner Superior do PDV Balcão */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              PDV Balcão — Frente de Caixa
            </h1>
            <Badge variante="sucesso" tamanho="sm">Turno Aberto</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Terminal conectado: <strong>CX-01</strong> • Operador:{' '}
            <strong>{usuario?.nome || 'Operador Balcão'}</strong> • Pressione{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono text-[10px]">F2</kbd>{' '}
            para focar no leitor de código de barras.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Botao
            variante="outline"
            tamanho="sm"
            onClick={limparVenda}
            iconeEsquerda={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Cancelar Venda Atual
          </Botao>
          <Botao
            variante="primario"
            tamanho="md"
            disabled={carrinho.length === 0}
            onClick={abrirModalPagamento}
            iconeEsquerda={<CheckCircle2 className="w-4 h-4" />}
          >
            Finalizar Venda ({formatarCentavosParaReal(totalLiquidoCentavos)})
          </Botao>
        </div>
      </div>

      {mensagemAlerta && (
        <Alerta tipo="aviso" titulo="Atenção Operacional">
          {mensagemAlerta}
        </Alerta>
      )}

      {/* Grid Principal do PDV: Busca e Carrinho */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Busca de Medicamentos & Catálogo (5 Colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardCabecalho>
              <CardTitulo className="text-sm flex items-center gap-2">
                <Barcode className="w-4 h-4 text-blue-600" />
                Leitor & Pesquisa de Medicamentos
              </CardTitulo>
            </CardCabecalho>
            <CardConteudo className="space-y-3">
              <div className="relative">
                <CampoTexto
                  ref={campoBuscaRef}
                  placeholder="Digite o código de barras (EAN-13), nome ou SKU..."
                  value={termoBusca}
                  onChange={e => setTermoBusca(e.target.value)}
                  iconeEsquerda={<Search className="w-4 h-4 text-slate-400" />}
                />
              </div>

              {termoBusca.trim() && (
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-xs">
                  {produtosFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Nenhum produto encontrado com o termo pesquisado.
                    </div>
                  ) : (
                    produtosFiltrados.map(prod => (
                      <div
                        key={prod.id}
                        onClick={() => adicionarAoCarrinho(prod)}
                        className={`p-3 text-left transition-colors cursor-pointer hover:bg-blue-50/60 flex items-center justify-between gap-3 ${
                          prod.loteVencido ? 'opacity-60 bg-red-50/30' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {prod.nomeComercial}
                            </span>
                            {prod.loteVencido && (
                              <Badge variante="perigo" tamanho="sm">Vencido</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{prod.apresentacao}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                            <span className="font-mono">EAN: {prod.codigoBarras}</span>
                            <span>Lote: {prod.numeroLote}</span>
                            <span>Estoque: {prod.estoqueDisponivel} un</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-900 block">
                            {formatarCentavosParaReal(prod.precoVendaCentavos)}
                          </span>
                          <span className="text-[10px] text-blue-600 font-semibold hover:underline">
                            + Adicionar
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Dica do leitor de código de barras USB */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2.5">
                <Barcode className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 block">Leitor USB Automático</span>
                  Passe o leitor de código de barras a qualquer momento para buscar e inserir o produto no carrinho instantaneamente.
                </div>
              </div>
            </CardConteudo>
          </Card>

          {/* Card de Identificação de Cliente */}
          <Card>
            <CardCabecalho>
              <CardTitulo className="text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Identificação do Cliente (Opcional)
              </CardTitulo>
            </CardCabecalho>
            <CardConteudo className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CampoTexto
                  placeholder="CPF (apenas números)"
                  value={cpfCliente}
                  onChange={e => setCpfCliente(e.target.value)}
                  maxLength={14}
                />
                <CampoTexto
                  placeholder="Nome do cliente"
                  value={nomeCliente}
                  onChange={e => setNomeCliente(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  {cpfCliente && validarCpf(cpfCliente) ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> CPF Válido: {formatarCpf(cpfCliente)}
                    </span>
                  ) : (
                    'Nota sem identificação do consumidor'
                  )}
                </span>
                <Botao
                  variante="outline"
                  tamanho="sm"
                  onClick={() => setClienteIdentificado(true)}
                  disabled={!cpfCliente && !nomeCliente}
                >
                  {clienteIdentificado ? 'Identificado' : 'Vincular'}
                </Botao>
              </div>
            </CardConteudo>
          </Card>
        </div>

        {/* Painel Direito: Carrinho de Compras & Totais (7 Colunas) */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardCabecalho className="flex items-center justify-between">
              <div>
                <CardTitulo className="text-sm">Itens da Venda em Andamento</CardTitulo>
                <p className="text-xs text-slate-500">
                  {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'} no cupom
                </p>
              </div>
              {carrinho.length > 0 && (
                <button
                  type="button"
                  onClick={limparVenda}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Limpar Carrinho
                </button>
              )}
            </CardCabecalho>
            <CardConteudo>
              {carrinho.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                  <p className="text-xs font-medium">O carrinho está vazio</p>
                  <p className="text-[11px] text-slate-400">
                    Utilize a busca ou o leitor de código de barras para incluir itens nesta venda.
                  </p>
                </div>
              ) : (
                <TabelaContainer>
                  <TabelaCabecalho>
                    <TabelaLinha>
                      <TabelaColuna>Item</TabelaColuna>
                      <TabelaColuna>Preço Unit.</TabelaColuna>
                      <TabelaColuna className="text-center">Qtd</TabelaColuna>
                      <TabelaColuna className="text-right">Total</TabelaColuna>
                      <TabelaColuna className="w-8"></TabelaColuna>
                    </TabelaLinha>
                  </TabelaCabecalho>
                  <TabelaCorpo>
                    {carrinho.map(item => (
                      <TabelaLinha key={item.produtoId}>
                        <TabelaCelula>
                          <span className="font-semibold text-slate-900 block text-xs">
                            {item.nomeComercial}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {item.apresentacao}
                          </span>
                        </TabelaCelula>
                        <TabelaCelula className="text-xs text-slate-700 font-mono">
                          {formatarCentavosParaReal(item.precoUnitarioCentavos)}
                        </TabelaCelula>
                        <TabelaCelula className="text-center">
                          <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                            <button
                              type="button"
                              onClick={() => alterarQuantidade(item.produtoId, -1)}
                              className="p-1 rounded hover:bg-slate-200 text-slate-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-slate-900">
                              {item.quantidade}
                            </span>
                            <button
                              type="button"
                              onClick={() => alterarQuantidade(item.produtoId, 1)}
                              className="p-1 rounded hover:bg-slate-200 text-slate-600"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </TabelaCelula>
                        <TabelaCelula className="text-right font-bold text-xs text-slate-900 font-mono">
                          {formatarCentavosParaReal(item.subtotalCentavos)}
                        </TabelaCelula>
                        <TabelaCelula className="text-center">
                          <button
                            type="button"
                            onClick={() => removerItem(item.produtoId)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </TabelaCelula>
                      </TabelaLinha>
                    ))}
                  </TabelaCorpo>
                </TabelaContainer>
              )}

              {/* Totais do Carrinho */}
              {carrinho.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Subtotal dos Itens:</span>
                    <span className="font-mono font-medium">{formatarCentavosParaReal(subtotalCentavos)}</span>
                  </div>

                  {temPermissao('pdv:aplicar_desconto') && (
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        Desconto Autorizado:
                        <Badge variante="info" tamanho="sm">Permissão Ativa</Badge>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDescontoGlobalCentavos(Math.round(subtotalCentavos * 0.05))}
                          className="text-[10px] text-blue-600 underline"
                        >
                          5%
                        </button>
                        <button
                          type="button"
                          onClick={() => setDescontoGlobalCentavos(Math.round(subtotalCentavos * 0.10))}
                          className="text-[10px] text-blue-600 underline"
                        >
                          10%
                        </button>
                        <button
                          type="button"
                          onClick={() => setDescontoGlobalCentavos(0)}
                          className="text-[10px] text-red-600 underline"
                        >
                          Zerar
                        </button>
                        <span className="font-mono text-emerald-600 font-medium">
                          - {formatarCentavosParaReal(totalDescontosCentavos)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Total a Pagar:</span>
                    <span className="text-xl font-extrabold text-blue-700 font-mono">
                      {formatarCentavosParaReal(totalLiquidoCentavos)}
                    </span>
                  </div>

                  <div className="pt-3">
                    <Botao
                      variante="primario"
                      tamanho="lg"
                      className="w-full justify-center"
                      onClick={abrirModalPagamento}
                      iconeEsquerda={<CheckCircle2 className="w-5 h-5" />}
                    >
                      Avançar para Pagamento ({formatarCentavosParaReal(totalLiquidoCentavos)})
                    </Botao>
                  </div>
                </div>
              )}
            </CardConteudo>
          </Card>
        </div>
      </div>

      {/* Modal de Pagamento & Múltiplas Modalidades */}
      <Modal
        aberto={modalPagamentoAberto}
        aoFechar={() => setModalPagamentoAberto(false)}
        titulo="Pagamento e Finalização da Venda"
        descricao={`Total Líquido: ${formatarCentavosParaReal(totalLiquidoCentavos)}`}
      >
        <div className="space-y-4">
          {erroPagamento && (
            <Alerta tipo="erro" titulo="Aviso de Pagamento">
              {erroPagamento}
            </Alerta>
          )}

          {/* Seleção da Forma de Pagamento */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Forma de Pagamento:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setFormaSelecionada('DINHEIRO')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 text-xs ${
                  formaSelecionada === 'DINHEIRO'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                Dinheiro
              </button>

              <button
                type="button"
                onClick={() => setFormaSelecionada('PIX')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 text-xs ${
                  formaSelecionada === 'PIX'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <QrCode className="w-4 h-4 text-teal-600" />
                PIX
              </button>

              <button
                type="button"
                onClick={() => setFormaSelecionada('CARTAO_DEBITO')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 text-xs ${
                  formaSelecionada === 'CARTAO_DEBITO'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                Débito
              </button>

              <button
                type="button"
                onClick={() => setFormaSelecionada('CARTAO_CREDITO')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 text-xs ${
                  formaSelecionada === 'CARTAO_CREDITO'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Crédito
              </button>

              <button
                type="button"
                onClick={() => setFormaSelecionada('VOUCHER')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 text-xs ${
                  formaSelecionada === 'VOUCHER'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <Ticket className="w-4 h-4 text-amber-600" />
                Voucher
              </button>
            </div>
          </div>

          {/* Configuração específica da forma selecionada */}
          {formaSelecionada === 'VOUCHER' ? (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-2">
              <span className="font-bold text-amber-900 block flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-amber-700" />
                Resgate de Voucher (Uso 100% Integral Obrigatório)
              </span>
              <p className="text-[11px] text-amber-800">
                O voucher não gera troco e não admite resgate parcial. Para demonstrar, use o código{' '}
                <code className="font-bold text-amber-900">VCH-2026-30</code> (R$ 30) ou{' '}
                <code className="font-bold text-amber-900">VCH-2026-50</code> (R$ 50).
              </p>
              <div className="flex gap-2">
                <CampoTexto
                  placeholder="Código do Voucher (ex: VCH-2026-30)"
                  value={codigoVoucherInput}
                  onChange={e => setCodigoVoucherInput(e.target.value)}
                />
                <Botao variante="primario" tamanho="sm" onClick={adicionarPagamento}>
                  Validar & Aplicar
                </Botao>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Valor a Pagar (Centavos ou Real):
                </label>
                <div className="flex gap-2">
                  <CampoTexto
                    type="number"
                    value={(valorInputCentavos / 100).toFixed(2)}
                    onChange={e => setValorInputCentavos(Math.round(parseFloat(e.target.value || '0') * 100))}
                  />
                  <Botao variante="outline" tamanho="sm" onClick={adicionarPagamento}>
                    Inserir
                  </Botao>
                </div>
              </div>

              {formaSelecionada === 'CARTAO_CREDITO' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Número de Parcelas:
                  </label>
                  <select
                    value={parcelasCartao}
                    onChange={e => setParcelasCartao(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900"
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                      <option key={n} value={n}>
                        {n}x de {formatarCentavosParaReal(Math.round(valorInputCentavos / n))} sem juros
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Lista de Pagamentos Inseridos */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Pagamentos Registrados:
            </label>
            {pagamentos.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
                Nenhuma forma de pagamento registrada ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white text-xs">
                {pagamentos.map((pag, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{pag.forma}</span>
                      {pag.parcelas && pag.parcelas > 1 && (
                        <span className="text-slate-500 ml-1">({pag.parcelas}x)</span>
                      )}
                      {pag.codigoVoucher && (
                        <span className="text-amber-700 ml-1 font-mono">[{pag.codigoVoucher}]</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900">
                        {formatarCentavosParaReal(pag.valorCentavos)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removerPagamento(idx)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo Financeiro da Finalização */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Total da Venda:</span>
              <span className="font-bold text-slate-900">{formatarCentavosParaReal(totalLiquidoCentavos)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Pago:</span>
              <span className="font-bold text-blue-700 font-mono">
                {formatarCentavosParaReal(totalPagoAtualCentavos)}
              </span>
            </div>
            {saldoRestanteCentavos > 0 && (
              <div className="flex justify-between text-amber-700 font-semibold">
                <span>Restante a Pagar:</span>
                <span className="font-mono">{formatarCentavosParaReal(saldoRestanteCentavos)}</span>
              </div>
            )}
            {trocoCalculadoCentavos > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-200">
                <span>Troco em Dinheiro:</span>
                <span className="font-mono text-sm">{formatarCentavosParaReal(trocoCalculadoCentavos)}</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Botao variante="outline" onClick={() => setModalPagamentoAberto(false)}>
              Voltar ao Carrinho
            </Botao>
            <Botao
              variante="primario"
              disabled={totalPagoAtualCentavos < totalLiquidoCentavos}
              onClick={concluirVenda}
              iconeEsquerda={<CheckCircle2 className="w-4 h-4" />}
            >
              Concluir & Emitir Cupom
            </Botao>
          </div>
        </div>
      </Modal>

      {/* Modal de Comprovante de Venda Concluída */}
      {dadosVendaFinalizada && (
        <Modal
          aberto={modalConcluidoAberto}
          aoFechar={() => setModalConcluidoAberto(false)}
          titulo="Venda Concluída com Sucesso!"
          descricao={`Cupom: ${dadosVendaFinalizada.numeroCupom}`}
        >
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Transação finalizada e estoque baixado com garantia de atomicidade.</span>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-white font-mono text-xs space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <span className="font-bold block">{empresaAtiva?.nomeFantasia}</span>
                <span className="text-[10px] text-slate-500 block">{filialAtiva?.nome}</span>
                <span className="text-[10px] text-slate-500 block">CNPJ: {empresaAtiva?.cnpj}</span>
              </div>

              <div className="space-y-1">
                {dadosVendaFinalizada.itens.map(it => (
                  <div key={it.produtoId} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[200px]">
                      {it.quantidade}x {it.nomeComercial}
                    </span>
                    <span>{formatarCentavosParaReal(it.subtotalCentavos)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>{formatarCentavosParaReal(dadosVendaFinalizada.totalCentavos)}</span>
                </div>
                {dadosVendaFinalizada.trocoCentavos > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>TROCO:</span>
                    <span>{formatarCentavosParaReal(dadosVendaFinalizada.trocoCentavos)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Botao
                variante="outline"
                onClick={() => window.print()}
                iconeEsquerda={<Printer className="w-4 h-4" />}
              >
                Imprimir Cupom
              </Botao>
              <Botao
                variante="primario"
                onClick={() => setModalConcluidoAberto(false)}
              >
                Nova Venda
              </Botao>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
