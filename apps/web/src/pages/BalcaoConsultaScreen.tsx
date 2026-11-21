import React, { useState, useEffect, useRef } from 'react';
import {
  Botao,
  Modal,
} from '@farmapro/ui';
import {
  formatarCentavosParaReal,
  ConsultaProdutoBalcao,
  PreVenda,
} from '@farmapro/shared';
import {
  Pill,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Building2,
  ArrowLeft,
  Printer,
  FileText,
  AlertTriangle,
  Sparkles,
  Barcode,
  Menu,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

interface ItemOrcamento {
  produtoId: string;
  loteId?: string;
  codigoBarras: string;
  nomeProduto: string;
  apresentacao: string;
  fabricante: string;
  classificacaoReceita: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  descontoUnitarioCentavos: number;
  totalCentavos: number;
}

interface BalcaoConsultaScreenProps {
  aoVoltarPortal?: () => void;
  aoAbrirMenu?: () => void;
}

export const BalcaoConsultaScreen: React.FC<BalcaoConsultaScreenProps> = ({
  aoVoltarPortal,
  aoAbrirMenu,
}) => {
  const { usuario, tenant, filialAtiva, token } = useAuth();

  // Estados de Busca e Catálogo
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<ConsultaProdutoBalcao[]>([]);
  const [carregandoBusca, setCarregandoBusca] = useState<boolean>(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [indiceFocado, setIndiceFocado] = useState<number>(-1);
  const inputBuscaRef = useRef<HTMLInputElement>(null);

  // Estados do Orçamento / Pré-venda (Carrinho de Balcão)
  const [itensOrcamento, setItensOrcamento] = useState<ItemOrcamento[]>([]);
  const [clienteNome, setClienteNome] = useState<string>('');
  const [clienteCpf, setClienteCpf] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  // Comanda Gerada
  const [comandaGerada, setComandaGerada] = useState<PreVenda | null>(null);
  const [modalComandaAberta, setModalComandaAberta] = useState<boolean>(false);
  const [gerandoComanda, setGerandoComanda] = useState<boolean>(false);

  // Posição de Atendimento
  const [posicaoBalcao] = useState<string>('Balcão 02');

  // Catálogo local para busca imediata / fallback
  const catalogoLocalDemonstrativo: ConsultaProdutoBalcao[] = [
    {
      id: 'prod-001',
      codigoBarras: '7891234567890',
      nomeComercial: 'Dipirona Monoidratada',
      nomeGenerico: 'Dipirona Sódica',
      principioAtivo: 'Dipirona Monoidratada 500 mg/mL',
      apresentacao: 'Gotas • Frasco 20 mL',
      fabricante: 'Medley',
      tipoProduto: 'MEDICAMENTO_GENERICO',
      classificacaoReceita: 'ISENTO',
      precoVendaCentavos: 890,
      estoqueTotal: 120,
      loteFefo: {
        id: 'lote-01',
        numeroLote: 'DIP-2026-X9',
        dataValidade: '2028-02-28',
        diasAteVencimento: 450,
        quantidadeDisponivel: 120,
      },
      lotesValidos: [
        {
          id: 'lote-01',
          numeroLote: 'DIP-2026-X9',
          dataValidade: '2028-02-28',
          quantidadeDisponivel: 120,
          status: 'ATIVO',
        },
      ],
    },
    {
      id: 'prod-002',
      codigoBarras: '7892345678901',
      nomeComercial: 'Losartana Potássica 50 mg',
      nomeGenerico: 'Losartana Potássica',
      principioAtivo: 'Losartana Potássica 50 mg',
      apresentacao: 'Cx c/ 30 comprimidos',
      fabricante: 'Aché',
      tipoProduto: 'MEDICAMENTO_GENERICO',
      classificacaoReceita: 'RECEITA_BRANCA_SIMPLES',
      precoVendaCentavos: 1350,
      estoqueTotal: 45,
      loteFefo: {
        id: 'lote-02',
        numeroLote: 'LOS-2026-C3',
        dataValidade: '2027-05-20',
        diasAteVencimento: 180,
        quantidadeDisponivel: 45,
      },
      lotesValidos: [
        {
          id: 'lote-02',
          numeroLote: 'LOS-2026-C3',
          dataValidade: '2027-05-20',
          quantidadeDisponivel: 45,
          status: 'ATIVO',
        },
      ],
    },
    {
      id: 'prod-003',
      codigoBarras: '7893456789012',
      nomeComercial: 'Paracetamol 750 mg',
      nomeGenerico: 'Paracetamol',
      principioAtivo: 'Paracetamol 750 mg',
      apresentacao: 'Cx c/ 20 comprimidos',
      fabricante: 'Neo Química',
      tipoProduto: 'MEDICAMENTO_GENERICO',
      classificacaoReceita: 'ISENTO',
      precoVendaCentavos: 1290,
      estoqueTotal: 80,
      loteFefo: {
        id: 'lote-03',
        numeroLote: 'PAR-2026-N1',
        dataValidade: '2027-11-15',
        diasAteVencimento: 360,
        quantidadeDisponivel: 80,
      },
      lotesValidos: [
        {
          id: 'lote-03',
          numeroLote: 'PAR-2026-N1',
          dataValidade: '2027-11-15',
          quantidadeDisponivel: 80,
          status: 'ATIVO',
        },
      ],
    },
    {
      id: 'prod-004',
      codigoBarras: '7894567890123',
      nomeComercial: 'Omeprazol 20 mg',
      nomeGenerico: 'Omeprazol',
      principioAtivo: 'Omeprazol 20 mg',
      apresentacao: 'Cx c/ 28 cápsulas',
      fabricante: 'Eurofarma',
      tipoProduto: 'MEDICAMENTO_REFERENCIA',
      classificacaoReceita: 'ISENTO',
      precoVendaCentavos: 2890,
      estoqueTotal: 34,
      loteFefo: {
        id: 'lote-04',
        numeroLote: 'OMP-2026-E4',
        dataValidade: '2028-08-30',
        diasAteVencimento: 600,
        quantidadeDisponivel: 34,
      },
      lotesValidos: [
        {
          id: 'lote-04',
          numeroLote: 'OMP-2026-E4',
          dataValidade: '2028-08-30',
          quantidadeDisponivel: 34,
          status: 'ATIVO',
        },
      ],
    },
    {
      id: 'prod-005',
      codigoBarras: '7895678901234',
      nomeComercial: 'Amoxicilina + Clavulanato 500/125 mg',
      nomeGenerico: 'Amoxicilina + Clavulanato de Potássio',
      principioAtivo: 'Amoxicilina 500 mg + Ácido Clavulânico 125 mg',
      apresentacao: 'Cx c/ 21 comprimidos revestidos',
      fabricante: 'EMS Sigma Pharma',
      tipoProduto: 'MEDICAMENTO_GENERICO',
      classificacaoReceita: 'RECEITA_BRANCA_CONTROLE_ESPECIAL',
      precoVendaCentavos: 4490,
      estoqueTotal: 22,
      loteFefo: {
        id: 'lote-05',
        numeroLote: 'AMX-2026-B1',
        dataValidade: '2027-10-15',
        diasAteVencimento: 320,
        quantidadeDisponivel: 22,
      },
      lotesValidos: [
        {
          id: 'lote-05',
          numeroLote: 'AMX-2026-B1',
          dataValidade: '2027-10-15',
          quantidadeDisponivel: 22,
          status: 'ATIVO',
        },
      ],
    },
  ];

  // Foco no campo de busca ao carregar
  useEffect(() => {
    inputBuscaRef.current?.focus();
    setProdutosEncontrados(catalogoLocalDemonstrativo);
  }, []);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        handleGerarComanda();
      } else if (e.key === '/' || (e.ctrlKey && e.key === 'f')) {
        e.preventDefault();
        inputBuscaRef.current?.focus();
        inputBuscaRef.current?.select();
      } else if (e.key === 'ArrowDown') {
        if (produtosEncontrados.length > 0) {
          e.preventDefault();
          setIndiceFocado((prev) => (prev < produtosEncontrados.length - 1 ? prev + 1 : 0));
        }
      } else if (e.key === 'ArrowUp') {
        if (produtosEncontrados.length > 0) {
          e.preventDefault();
          setIndiceFocado((prev) => (prev > 0 ? prev - 1 : produtosEncontrados.length - 1));
        }
      } else if (e.key === 'Enter') {
        if (indiceFocado >= 0 && indiceFocado < produtosEncontrados.length) {
          const prodSel = produtosEncontrados[indiceFocado];
          if (prodSel) {
            e.preventDefault();
            handleAdicionarAoOrcamento(prodSel);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [produtosEncontrados, indiceFocado, itensOrcamento]);

  // Debounce na busca
  useEffect(() => {
    const termo = termoBusca.trim();
    if (!termo) {
      setProdutosEncontrados(catalogoLocalDemonstrativo);
      return;
    }

    const timer = setTimeout(async () => {
      setCarregandoBusca(true);
      try {
        const res = await fetch(`/api/pre-vendas/produtos?q=${encodeURIComponent(termo)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const dados = await res.json();
          setProdutosEncontrados(dados.produtos || []);
          setCarregandoBusca(false);
          return;
        }
      } catch {
        // Fallback local
      }

      // Filtro local de demonstração
      const termoLow = termo.toLowerCase();
      const filtrados = catalogoLocalDemonstrativo.filter(
        (p) =>
          p.nomeComercial.toLowerCase().includes(termoLow) ||
          p.codigoBarras.includes(termo) ||
          (p.principioAtivo && p.principioAtivo.toLowerCase().includes(termoLow)) ||
          p.fabricante.toLowerCase().includes(termoLow)
      );
      setProdutosEncontrados(filtrados);
      setCarregandoBusca(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [termoBusca, token]);

  // Adicionar produto ao Orçamento
  const handleAdicionarAoOrcamento = (produto: ConsultaProdutoBalcao) => {
    setItensOrcamento((prev) => {
      const idxExistente = prev.findIndex((it) => it.produtoId === produto.id);
      if (idxExistente >= 0) {
        const novos = [...prev];
        const item = novos[idxExistente];
        if (!item) return prev;
        const novaQtd = item.quantidade + 1;
        novos[idxExistente] = {
          ...item,
          quantidade: novaQtd,
          totalCentavos: (item.precoUnitarioCentavos - item.descontoUnitarioCentavos) * novaQtd,
        };
        return novos;
      }

      return [
        ...prev,
        {
          produtoId: produto.id,
          loteId: produto.loteFefo?.id,
          codigoBarras: produto.codigoBarras,
          nomeProduto: produto.nomeComercial,
          apresentacao: produto.apresentacao,
          fabricante: produto.fabricante,
          classificacaoReceita: produto.classificacaoReceita,
          quantidade: 1,
          precoUnitarioCentavos: produto.precoVendaCentavos,
          descontoUnitarioCentavos: 0,
          totalCentavos: produto.precoVendaCentavos,
        },
      ];
    });
  };

  // Alterar quantidade no Orçamento
  const handleAlterarQtdOrcamento = (index: number, delta: number) => {
    setItensOrcamento((prev) => {
      const novos = [...prev];
      const item = novos[index];
      if (!item) return prev;
      const novaQtd = item.quantidade + delta;
      if (novaQtd <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      novos[index] = {
        ...item,
        quantidade: novaQtd,
        totalCentavos: (item.precoUnitarioCentavos - item.descontoUnitarioCentavos) * novaQtd,
      };
      return novos;
    });
  };

  const handleRemoverItemOrcamento = (index: number) => {
    setItensOrcamento((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLimparOrcamento = () => {
    if (confirm('Limpar todos os produtos do orçamento atual?')) {
      setItensOrcamento([]);
      setClienteNome('');
      setClienteCpf('');
      setObservacoes('');
    }
  };

  // Cálculos do Orçamento
  const subtotalCentavos = itensOrcamento.reduce(
    (acc, it) => acc + it.precoUnitarioCentavos * it.quantidade,
    0
  );
  const totalDescontoCentavos = itensOrcamento.reduce(
    (acc, it) => acc + it.descontoUnitarioCentavos * it.quantidade,
    0
  );
  const totalEstimadoCentavos = Math.max(0, subtotalCentavos - totalDescontoCentavos);

  // Gerar Comanda / Pré-Venda (F9)
  const handleGerarComanda = async () => {
    if (itensOrcamento.length === 0) {
      alert('Adicione pelo menos um medicamento para gerar a comanda de pré-venda.');
      return;
    }

    setGerandoComanda(true);

    const payload = {
      identificacaoBalcao: posicaoBalcao,
      clienteNome: clienteNome || undefined,
      clienteCpf: clienteCpf || undefined,
      observacoes: observacoes || undefined,
      itens: itensOrcamento.map((it) => ({
        produtoId: it.produtoId,
        loteId: it.loteId,
        codigoBarras: it.codigoBarras,
        nomeProduto: it.nomeProduto,
        apresentacao: it.apresentacao,
        quantidade: it.quantidade,
        precoUnitarioCentavos: it.precoUnitarioCentavos,
        descontoUnitarioCentavos: it.descontoUnitarioCentavos,
      })),
    };

    try {
      const res = await fetch('/api/pre-vendas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const dados = await res.json();
        setComandaGerada(dados.preVenda);
        setModalComandaAberta(true);
        setGerandoComanda(false);
        return;
      }
    } catch {
      // Fallback local
    }

    // Fallback local imediato
    const numComanda = Math.floor(1000 + Math.random() * 9000);
    const mockComanda: PreVenda = {
      id: `pv-${Date.now()}`,
      empresaId: tenant?.empresaId || 'emp-demo',
      filialId: tenant?.filialId || 'fil-demo',
      codigoComanda: `PV-${numComanda}`,
      atendenteId: usuario?.id || 'usr-demo',
      atendenteNome: usuario?.nome || 'Carlos Silva',
      identificacaoBalcao: posicaoBalcao,
      clienteNome: clienteNome || undefined,
      clienteCpf: clienteCpf || undefined,
      subtotalCentavos,
      descontoCentavos: totalDescontoCentavos,
      totalCentavos: totalEstimadoCentavos,
      status: 'PENDENTE',
      validadeMinutos: 120,
      criadoEm: new Date().toISOString(),
      itens: itensOrcamento.map((it, i) => ({
        id: `it-${i}`,
        produtoId: it.produtoId,
        numeroItem: i + 1,
        codigoBarras: it.codigoBarras,
        nomeProduto: it.nomeProduto,
        apresentacao: it.apresentacao,
        quantidade: it.quantidade,
        precoUnitarioCentavos: it.precoUnitarioCentavos,
        descontoUnitarioCentavos: it.descontoUnitarioCentavos,
        totalItemCentavos: it.totalCentavos,
      })),
    };

    setComandaGerada(mockComanda);
    setModalComandaAberta(true);
    setGerandoComanda(false);
  };

  const reiniciarBalcao = () => {
    setModalComandaAberta(false);
    setComandaGerada(null);
    setItensOrcamento([]);
    setClienteNome('');
    setClienteCpf('');
    setObservacoes('');
    inputBuscaRef.current?.focus();
  };

  // Badge da Classificação de Receita
  const renderBadgeReceita = (classificacao: string) => {
    switch (classificacao) {
      case 'RECEITA_BRANCA_CONTROLE_ESPECIAL':
      case 'RECEITA_AZUL_B':
      case 'RECEITA_AMARELA_A':
        return (
          <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded">
            Retenção de Receita
          </span>
        );
      case 'RECEITA_BRANCA_SIMPLES':
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">
            Receita Branca
          </span>
        );
      default:
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
            MIP / Isento
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between select-none font-sans">
      {/* 1. TOPO CABEÇALHO DO BALCÃO */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={aoAbrirMenu}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            title="Menu Principal"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-lg">
              +
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-base font-black text-slate-900 tracking-tight">FarmaPro</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                  Balcão
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Consulta Farmacêutica & Orçamentos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-emerald-700 font-black text-lg">
            <Pill className="w-6 h-6 text-emerald-600" />
            <span>Balcão & Atendimento</span>
          </div>
        </div>

        {/* Badges de Atendente, Filial e Posição */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Filial: <strong>{filialAtiva?.nome || 'Matriz Centro'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Atendente: <strong>{usuario?.nome || 'Carlos Silva'}</strong></span>
          </div>

          <div className="bg-emerald-50 text-emerald-900 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-bold">
            <span>{posicaoBalcao}</span>
          </div>

          {aoVoltarPortal && (
            <button
              type="button"
              onClick={aoVoltarPortal}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors ml-1"
              title="Voltar ao Portal Operacional"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. SUB-BARRA DE ORIENTAÇÃO DE SEGURANÇA */}
      <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-1.5 flex items-center justify-between text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>
            <strong>Terminal de Consulta e Pré-Venda:</strong> Atendentes não realizam movimentação financeira ou baixa fiscal. A emissão gera comanda para conferência e recebimento no Caixa.
          </span>
        </div>
        <span className="font-semibold text-emerald-700">Atalho rápido: F9 Gerar Comanda</span>
      </div>

      {/* 3. CORPO PRINCIPAL COM AS DUAS ÁREAS: CONSULTA (ESQUERDA) E ORÇAMENTO (DIREITA) */}
      <main className="max-w-7xl mx-auto px-4 py-4 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ÁREA ESQUERDA: CONSULTA DE MEDICAMENTOS (7 colunas lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barra de Pesquisa Rápida */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              CONSULTAR MEDICAMENTO, PRINCÍPIO ATIVO OU CÓDIGO DE BARRAS
            </label>
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                ref={inputBuscaRef}
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Ex: Dipirona, Losartana, Amoxicilina, EAN ou princípio ativo..."
                className="w-full pl-11 pr-14 py-2.5 rounded-xl border-2 border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm text-slate-800 outline-none transition-all shadow-xs"
              />
              <span className="absolute right-3 top-2.5 bg-emerald-600 text-white font-black text-xs px-2 py-0.5 rounded-md shadow-xs">
                Ctrl+F
              </span>
            </div>

            {/* Filtros por Categoria */}
            <div className="flex items-center gap-2 mt-3 text-xs overflow-x-auto pb-1">
              {['TODOS', 'GENÉRICOS', 'REFERÊNCIA', 'ISENTOS', 'CONTROLADOS'].map((filtro) => (
                <button
                  key={filtro}
                  type="button"
                  onClick={() => setFiltroTipo(filtro)}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                    filtroTipo === filtro
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filtro}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Resultados de Medicamentos */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <span className="font-bold text-xs text-slate-700">
                Medicamentos Encontrados ({produtosEncontrados.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Navegue com ↑ ↓ e pressione Enter para adicionar
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {produtosEncontrados.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {carregandoBusca ? 'Pesquisando produtos...' : 'Nenhum medicamento encontrado para o termo pesquisado.'}
                </div>
              ) : (
                produtosEncontrados.map((prod, idx) => {
                  const focado = idx === indiceFocado;
                  return (
                    <div
                      key={prod.id}
                      className={`p-4 transition-all flex items-center justify-between gap-4 ${
                        focado ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                            {prod.nomeComercial}
                          </h4>
                          {renderBadgeReceita(prod.classificacaoReceita)}
                          {prod.tipoProduto === 'MEDICAMENTO_GENERICO' && (
                            <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.2 rounded border border-yellow-300">
                              Genérico
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600">
                          <strong>Princípio Ativo:</strong> {prod.principioAtivo || prod.nomeGenerico || 'Não especificado'}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                          <span>Laboratório: <strong>{prod.fabricante}</strong></span>
                          <span>•</span>
                          <span>Apres.: {prod.apresentacao}</span>
                          <span>•</span>
                          <span>EAN: {prod.codigoBarras}</span>
                        </div>

                        {/* Informações de Estoque e FEFO */}
                        <div className="flex items-center gap-3 pt-1 text-[11px]">
                          <span className="text-slate-700">
                            Estoque Total: <strong>{prod.estoqueTotal} un</strong>
                          </span>
                          {prod.loteFefo && (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                              FEFO: Lote {prod.loteFefo.numeroLote} (Vcto: {prod.loteFefo.dataValidade})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-lg font-black text-slate-900">
                          {formatarCentavosParaReal(prod.precoVendaCentavos)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdicionarAoOrcamento(prod)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ÁREA DIREITA: ORÇAMENTO / PRÉ-VENDA / COMANDA (5 colunas lg) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between min-h-[520px]">
            <div>
              {/* Título do Orçamento */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Orçamento / Comanda ({itensOrcamento.length} {itensOrcamento.length === 1 ? 'item' : 'itens'})</span>
                </div>
                {itensOrcamento.length > 0 && (
                  <button
                    type="button"
                    onClick={handleLimparOrcamento}
                    className="text-xs text-red-600 hover:text-red-800 font-bold transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Identificação Opcional do Cliente */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-2 text-xs">
                <span className="font-bold text-slate-700 block">Identificação do Cliente (Opcional)</span>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Nome do cliente para orçamento..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={clienteCpf}
                  onChange={(e) => setClienteCpf(e.target.value)}
                  placeholder="CPF do cliente (apenas números ou formatado)..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* Lista de Itens Adicionados */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto mb-4 divide-y divide-slate-100">
                {itensOrcamento.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Nenhum produto selecionado no orçamento. Pesquise e clique em "+ Adicionar".
                  </div>
                ) : (
                  itensOrcamento.map((it, idx) => (
                    <div key={idx} className="pt-2 flex items-center justify-between gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{it.nomeProduto}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatarCentavosParaReal(it.precoUnitarioCentavos)} un
                        </p>
                      </div>

                      {/* Botões Quantidade */}
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleAlterarQtdOrcamento(idx, -1)}
                          className="w-4 h-4 rounded bg-white text-slate-700 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-5 text-center font-bold text-slate-800">{it.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => handleAlterarQtdOrcamento(idx, 1)}
                          className="w-4 h-4 rounded bg-white text-slate-700 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <span className="font-black text-slate-900 w-16 text-right">
                        {formatarCentavosParaReal(it.totalCentavos)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoverItemOrcamento(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Resumo Financeiro & Botão de Emitir Comanda */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal Bruto</span>
                  <span className="font-bold text-slate-800">{formatarCentavosParaReal(subtotalCentavos)}</span>
                </div>
                {totalDescontoCentavos > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Desconto</span>
                    <span>- {formatarCentavosParaReal(totalDescontoCentavos)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
                  <span>Total Estimado</span>
                  <span className="text-emerald-700 text-lg">
                    {formatarCentavosParaReal(totalEstimadoCentavos)}
                  </span>
                </div>
              </div>

              {/* Botão Gerar Comanda / Pré-Venda (F9) */}
              <button
                type="button"
                onClick={handleGerarComanda}
                disabled={itensOrcamento.length === 0 || gerandoComanda}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99]"
              >
                <Barcode className="w-4 h-4" />
                <span>{gerandoComanda ? 'Gerando Comanda...' : 'Gerar Pré-Venda / Comanda (F9)'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 4. RODAPÉ FIXO DO BALCÃO */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2.5 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-800">Atalhos Balcão:</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>Ctrl+F ou /</strong> Focar Busca
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>↑ ↓</strong> Navegar Lista
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>Enter</strong> Adicionar ao Orçamento
          </span>
          <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
            <strong>F9</strong> Gerar Comanda
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span>Área Restrita do Balcão • Isolamento Multiempresa RLS</span>
        </div>
      </footer>

      {/* 5. MODAL DE COMANDA GERADA PARA IMPRESSÃO / APRESENTAÇÃO NO CAIXA */}
      {modalComandaAberta && comandaGerada && (
        <Modal
          aberto={modalComandaAberta}
          aoFechar={reiniciarBalcao}
          titulo="Pré-Venda / Comanda Gerada com Sucesso"
        >
          <div className="space-y-4 py-2 select-text">
            <div className="text-center pb-3 border-b border-slate-200">
              <h3 className="font-black text-xl text-slate-900 tracking-tight">FarmaPro — Comanda de Atendimento</h3>
              <p className="text-xs text-slate-500">{filialAtiva?.nome || 'Filial Matriz'} • {posicaoBalcao}</p>
              
              {/* Código Curto e Destaque */}
              <div className="mt-3 bg-blue-50 border-2 border-blue-400 p-3 rounded-2xl">
                <span className="text-xs text-blue-800 font-bold block uppercase tracking-wider">
                  NÚMERO DA COMANDA (PRÉ-VENDA)
                </span>
                <span className="text-4xl font-black text-blue-700 tracking-wider font-mono">
                  {comandaGerada.codigoComanda}
                </span>
              </div>
            </div>

            <div className="text-xs space-y-1 text-slate-700">
              <p><strong>Atendente:</strong> {comandaGerada.atendenteNome || usuario?.nome || 'Carlos Silva'}</p>
              {comandaGerada.clienteNome && <p><strong>Cliente:</strong> {comandaGerada.clienteNome} (CPF: {comandaGerada.clienteCpf || 'Não informado'})</p>}
              <p><strong>Data/Hora de Emissão:</strong> {new Date(comandaGerada.criadoEm).toLocaleString('pt-BR')}</p>
              <p><strong>Validade da Comanda:</strong> 120 minutos</p>
            </div>

            <div className="border-t border-b border-slate-200 py-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="text-left py-1">Medicamento</th>
                    <th className="text-center py-1">Qtd</th>
                    <th className="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comandaGerada.itens.map((it, i) => (
                    <tr key={i}>
                      <td className="py-1 font-medium">{it.nomeProduto}</td>
                      <td className="py-1 text-center">{it.quantidade}</td>
                      <td className="py-1 text-right font-bold">{formatarCentavosParaReal(it.totalItemCentavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-sm">
              <span className="font-bold text-slate-700">Total a Pagar no Caixa:</span>
              <span className="font-black text-emerald-700 text-lg">
                {formatarCentavosParaReal(comandaGerada.totalCentavos)}
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Instrução ao Cliente:</strong> Apresente o código <strong>{comandaGerada.codigoComanda}</strong> diretamente no terminal de Caixa/PDV para conferência, pagamento e retirada dos medicamentos.
              </span>
            </div>

            <div className="pt-2 flex gap-3">
              <Botao
                variante="secundario"
                className="flex-1"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Comanda
              </Botao>
              <Botao
                variante="primario"
                className="flex-1"
                onClick={reiniciarBalcao}
              >
                Novo Atendimento
              </Botao>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
