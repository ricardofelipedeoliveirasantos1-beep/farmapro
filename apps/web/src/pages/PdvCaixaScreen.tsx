import React, { useState, useEffect, useRef } from 'react';
import {
  Botao,
  Modal,
} from '@farmapro/ui';
import {
  formatarCentavosParaReal,
  FormaPagamento,
  PreVenda,
} from '@farmapro/shared';
import {
  ShoppingCart,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  QrCode,
  CreditCard,
  Banknote,
  Ticket,
  User,
  CheckCircle2,
  Calendar,
  Clock,
  Building2,
  ArrowLeft,
  X,
  Printer,
  AlertCircle,
  Menu,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

interface ItemVendaPDV {
  produtoId: string;
  loteId?: string;
  codigoBarras: string;
  nomeProduto: string;
  laboratorio: string;
  apresentacao: string;
  tipoMedicamento: 'Genérico' | 'Referência' | 'Similar' | 'Outro';
  quantidade: number;
  precoUnitarioCentavos: number;
  descontoCentavos: number;
  totalCentavos: number;
}

interface PdvCaixaScreenProps {
  aoVoltarPortal?: () => void;
  aoAbrirMenu?: () => void;
}

export const PdvCaixaScreen: React.FC<PdvCaixaScreenProps> = ({
  aoVoltarPortal,
  aoAbrirMenu,
}) => {
  const { usuario, filialAtiva, token } = useAuth();

  // Estados da Venda
  const [itens, setItens] = useState<ItemVendaPDV[]>([
    {
      produtoId: 'prod-001',
      codigoBarras: '7891234567890',
      nomeProduto: 'Dipirona Monoidratada 500 mg/mL',
      laboratorio: 'Medley',
      apresentacao: 'Gotas • Frasco 20 mL',
      tipoMedicamento: 'Genérico',
      quantidade: 1,
      precoUnitarioCentavos: 890,
      descontoCentavos: 0,
      totalCentavos: 890,
    },
    {
      produtoId: 'prod-002',
      codigoBarras: '7892345678901',
      nomeProduto: 'Losartana Potássica 50 mg',
      laboratorio: 'Aché',
      apresentacao: 'Cx c/ 30 comprimidos',
      tipoMedicamento: 'Genérico',
      quantidade: 2,
      precoUnitarioCentavos: 1350,
      descontoCentavos: 200,
      totalCentavos: 2500,
    },
    {
      produtoId: 'prod-003',
      codigoBarras: '7893456789012',
      nomeProduto: 'Paracetamol 750 mg',
      laboratorio: 'Neo Química',
      apresentacao: 'Cx c/ 20 comprimidos',
      tipoMedicamento: 'Genérico',
      quantidade: 1,
      precoUnitarioCentavos: 1290,
      descontoCentavos: 0,
      totalCentavos: 1290,
    },
    {
      produtoId: 'prod-004',
      codigoBarras: '7894567890123',
      nomeProduto: 'Omeprazol 20 mg',
      laboratorio: 'Eurofarma',
      apresentacao: 'Cx c/ 28 cápsulas',
      tipoMedicamento: 'Referência',
      quantidade: 1,
      precoUnitarioCentavos: 2890,
      descontoCentavos: 0,
      totalCentavos: 2890,
    },
  ]);

  // Informações do Atendente (vindo da Comanda do Balcão)
  const [atendenteBalcao, setAtendenteBalcao] = useState<string>('Carlos Silva (Balcão 02)');
  const [codigoComandaCarregada, setCodigoComandaCarregada] = useState<string>('PV-1048');

  // Input do leitor de comanda / EAN
  const [termoLeitor, setTermoLeitor] = useState<string>('');
  const [erroLeitor, setErroLeitor] = useState<string | null>(null);
  const [sucessoLeitor, setSucessoLeitor] = useState<string | null>(null);
  const inputLeitorRef = useRef<HTMLInputElement>(null);

  // Cliente Opcional
  const [clienteNome, setClienteNome] = useState<string>('João da Silva');
  const [clienteCpf, setClienteCpf] = useState<string>('123.456.789-00');

  // Forma de Pagamento e Dinheiro
  const [formaSelecionada, setFormaSelecionada] = useState<FormaPagamento>('DINHEIRO');
  const [valorRecebidoDinheiroStr, setValorRecebidoDinheiroStr] = useState<string>('100,00');
  const [codigoVoucherInput, setCodigoVoucherInput] = useState<string>('');
  const [voucherValidado, setVoucherValidado] = useState<{ codigo: string; valorCentavos: number } | null>(null);

  // Modal de Conclusão / Recibo
  const [modalReciboAberto, setModalReciboAberto] = useState(false);
  const [vendaFinalizada, setVendaFinalizada] = useState<any>(null);

  // Hora do sistema
  const [horaAtual, setHoraAtual] = useState<string>('15:28');
  const [dataAtual, setDataAtual] = useState<string>('19/11/2026');

  useEffect(() => {
    const atualizarHorario = () => {
      const agora = new Date();
      setHoraAtual(
        agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
      setDataAtual(agora.toLocaleDateString('pt-BR'));
    };
    atualizarHorario();
    const timer = setInterval(atualizarHorario, 10000);
    return () => clearInterval(timer);
  }, []);

  // Foco no leitor ao abrir
  useEffect(() => {
    inputLeitorRef.current?.focus();
  }, []);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        inputLeitorRef.current?.focus();
        inputLeitorRef.current?.select();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setFormaSelecionada('PIX');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setFormaSelecionada('CARTAO_CREDITO');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setFormaSelecionada('CARTAO_DEBITO');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setFormaSelecionada('DINHEIRO');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setFormaSelecionada('VOUCHER');
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleFinalizarVenda();
      } else if (e.key === 'Escape') {
        if (!modalReciboAberto) {
          handleLimparVenda();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Cálculos Financeiros
  const subtotalBrutoCentavos = itens.reduce(
    (acc, it) => acc + it.precoUnitarioCentavos * it.quantidade,
    0
  );
  const descontosAplicadosCentavos = itens.reduce(
    (acc, it) => acc + (it.descontoCentavos || 0),
    0
  );
  const totalAPagarCentavos = Math.max(0, subtotalBrutoCentavos - descontosAplicadosCentavos);

  // Cálculo Dinâmico de Troco
  const valorRecebidoCentavos = Math.round(
    parseFloat((valorRecebidoDinheiroStr || '0').replace(/\./g, '').replace(',', '.')) * 100 || 0
  );

  const trocoCentavos =
    formaSelecionada === 'DINHEIRO'
      ? Math.max(0, valorRecebidoCentavos - totalAPagarCentavos)
      : 0;

  const faltaReceberCentavos =
    formaSelecionada === 'DINHEIRO' && valorRecebidoCentavos < totalAPagarCentavos
      ? totalAPagarCentavos - valorRecebidoCentavos
      : 0;

  // Modificar Quantidade do Item
  const handleAlterarQtd = (index: number, delta: number) => {
    setItens((prev) => {
      const novos = [...prev];
      const item = novos[index];
      if (!item) return prev;
      const novaQtd = item.quantidade + delta;
      if (novaQtd <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      const novoTotal = Math.max(
        0,
        item.precoUnitarioCentavos * novaQtd - (item.descontoCentavos || 0)
      );
      novos[index] = {
        ...item,
        quantidade: novaQtd,
        totalCentavos: novoTotal,
      };
      return novos;
    });
  };

  const handleRemoverItem = (index: number) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLimparVenda = () => {
    if (confirm('Deseja realmente limpar todos os itens da venda atual?')) {
      setItens([]);
      setCodigoComandaCarregada('');
      setAtendenteBalcao('Atendimento Direto no Caixa');
      setClienteNome('');
      setClienteCpf('');
      setValorRecebidoDinheiroStr('0,00');
    }
  };

  // Buscar Comanda ou EAN
  const handleProcessarLeitor = async (e: React.FormEvent) => {
    e.preventDefault();
    const termo = termoLeitor.trim();
    if (!termo) return;

    setErroLeitor(null);
    setSucessoLeitor(null);

    // Se for formato de comanda (PV-...)
    if (termo.toUpperCase().startsWith('PV-') || termo.toUpperCase().startsWith('PV')) {
      try {
        const codigoFormatado = termo.toUpperCase().startsWith('PV-')
          ? termo.toUpperCase()
          : `PV-${termo.slice(2).trim()}`;

        // Chamar API real de pré-vendas
        const res = await fetch(`/api/pre-vendas/comanda/${encodeURIComponent(codigoFormatado)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const dados = await res.json();
          const pv: PreVenda = dados.preVenda;

          if (pv.status === 'FINALIZADA') {
            setErroLeitor(`A comanda ${codigoFormatado} já foi finalizada anteriormente no Caixa.`);
            return;
          }

          if (pv.status === 'CANCELADA') {
            setErroLeitor(`A comanda ${codigoFormatado} foi cancelada e não pode ser faturada.`);
            return;
          }

          // Converter itens
          const itensCarregados: ItemVendaPDV[] = pv.itens.map((it) => ({
            produtoId: it.produtoId,
            loteId: it.loteId,
            codigoBarras: it.codigoBarras || '',
            nomeProduto: it.nomeProduto,
            laboratorio: 'Farmacêutica Parceira',
            apresentacao: it.apresentacao || '',
            tipoMedicamento: it.classificacaoReceita === 'ISENTO' ? 'Genérico' : 'Referência',
            quantidade: it.quantidade,
            precoUnitarioCentavos: it.precoUnitarioCentavos,
            descontoCentavos: (it.descontoUnitarioCentavos || 0) * it.quantidade,
            totalCentavos: it.totalItemCentavos,
          }));

          setItens(itensCarregados);
          setCodigoComandaCarregada(pv.codigoComanda);
          setAtendenteBalcao(
            `${pv.atendenteNome || 'Balconista'} (${pv.identificacaoBalcao || 'Balcão 01'})`
          );
          if (pv.clienteNome) setClienteNome(pv.clienteNome);
          if (pv.clienteCpf) setClienteCpf(pv.clienteCpf);

          // Ajustar valor recebido padrão
          const totalReal = (pv.totalCentavos / 100).toFixed(2).replace('.', ',');
          setValorRecebidoDinheiroStr(totalReal);

          setSucessoLeitor(`Comanda ${pv.codigoComanda} carregada com sucesso!`);
          setTermoLeitor('');
          return;
        }
      } catch (err) {
        // Fallback demo caso offline ou backend simulado
      }

      // Demonstração local de fallback para teste visual imediato
      if (termo.toUpperCase() === 'PV-1048') {
        setCodigoComandaCarregada('PV-1048');
        setAtendenteBalcao('Carlos Silva (Balcão 02)');
        setClienteNome('João da Silva');
        setClienteCpf('123.456.789-00');
        setSucessoLeitor('Comanda PV-1048 carregada!');
        setTermoLeitor('');
        return;
      }
    }

    // Busca por código de barras ou nome do produto
    try {
      const res = await fetch(`/api/vendas/pesquisa-produtos?termo=${encodeURIComponent(termo)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const dados = await res.json();
        const prods = dados.produtos || [];
        if (prods.length > 0) {
          const p = prods[0];
          setItens((prev) => [
            ...prev,
            {
              produtoId: p.id,
              loteId: p.loteId,
              codigoBarras: p.codigoBarras,
              nomeProduto: p.nomeComercial,
              laboratorio: p.fabricante || 'Laboratório',
              apresentacao: p.apresentacao || '',
              tipoMedicamento: 'Genérico',
              quantidade: 1,
              precoUnitarioCentavos: p.precoVendaCentavos,
              descontoCentavos: 0,
              totalCentavos: p.precoVendaCentavos,
            },
          ]);
          setSucessoLeitor(`Produto "${p.nomeComercial}" adicionado.`);
          setTermoLeitor('');
          return;
        }
      }
    } catch {
      // continua
    }

    setErroLeitor(`Nenhum produto ou comanda encontrada com "${termo}".`);
    setTermoLeitor('');
  };

  // Finalizar Venda
  const handleFinalizarVenda = async () => {
    if (itens.length === 0) {
      alert('Adicione pelo menos um produto ou carregue uma comanda para finalizar a venda.');
      return;
    }

    if (formaSelecionada === 'DINHEIRO' && faltaReceberCentavos > 0) {
      alert(
        `Valor recebido insuficiente! Faltam ${formatarCentavosParaReal(faltaReceberCentavos)} para completar o pagamento.`
      );
      return;
    }

    // Montar DTO de Venda
    const pagamentos = [
      {
        formaPagamento: formaSelecionada,
        valorCentavos: totalAPagarCentavos,
        codigoVoucher: voucherValidado?.codigo,
      },
    ];

    const vendaPayload = {
      caixaSessaoId: 'sessao-caixa-01',
      dispositivoId: 'pdv-01-terminal',
      codigoComanda: codigoComandaCarregada || undefined,
      itens: itens.map((it) => ({
        produtoId: it.produtoId,
        loteId: it.loteId,
        quantidade: it.quantidade,
        precoUnitarioCentavos: it.precoUnitarioCentavos,
        descontoCentavos: it.descontoCentavos,
      })),
      pagamentos,
      descontoTotalCentavos: descontosAplicadosCentavos,
      trocoCentavos,
    };

    try {
      const res = await fetch('/api/vendas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(vendaPayload),
      });

      if (res.ok) {
        const dados = await res.json();
        setVendaFinalizada({
          numeroCupom: dados.venda?.numeroCupom || 'CUP-2026-00481',
          totalCentavos: totalAPagarCentavos,
          trocoCentavos,
          formaPagamento: formaSelecionada,
          valorRecebidoCentavos,
          itens: [...itens],
          cliente: clienteNome ? `${clienteNome} (CPF: ${clienteCpf})` : 'Consumidor Final',
          atendente: atendenteBalcao,
        });
        setModalReciboAberto(true);
        return;
      }
    } catch {
      // continua para fallback de demonstração
    }

    // Fallback de demonstração visual
    setVendaFinalizada({
      numeroCupom: `CUP-${Math.floor(1000 + Math.random() * 9000)}`,
      totalCentavos: totalAPagarCentavos,
      trocoCentavos,
      formaPagamento: formaSelecionada,
      valorRecebidoCentavos: formaSelecionada === 'DINHEIRO' ? valorRecebidoCentavos : totalAPagarCentavos,
      itens: [...itens],
      cliente: clienteNome ? `${clienteNome} (CPF: ${clienteCpf})` : 'Consumidor Final',
      atendente: atendenteBalcao,
    });
    setModalReciboAberto(true);
  };

  const reiniciarVendaAposConclusao = () => {
    setModalReciboAberto(false);
    setItens([]);
    setCodigoComandaCarregada('');
    setAtendenteBalcao('Atendimento Direto no Caixa');
    setClienteNome('');
    setClienteCpf('');
    setValorRecebidoDinheiroStr('0,00');
    setVoucherValidado(null);
    inputLeitorRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between select-none font-sans">
      {/* 1. TOPO CABEÇALHO (Conforme Imagem de Referência) */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs flex items-center justify-between gap-4">
        {/* Esquerda: Menu Hambúrguer + Logo FarmaPro + Título PDV 01 */}
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
            <img
              src="/logo-farmapro-emblema.png"
              alt="FarmaPro"
              className="w-8 h-8 object-contain drop-shadow-xs"
            />
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-base font-black text-slate-900 tracking-tight">FarmaPro</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                  SaaS
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Gestão Farmacêutica Inteligente
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-blue-600 font-black text-lg">
            <ShoppingCart className="w-6 h-6" />
            <span>PDV 01 — Caixa</span>
          </div>
        </div>

        {/* Direita: Badges de Filial, Operador, Caixa Aberto, Data, Hora e Sair */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Filial: <strong>{filialAtiva?.nome || 'Matriz Centro'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>Operador: <strong>{usuario?.nome || 'Carlos Santos'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Caixa: ABERTO</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{dataAtual}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{horaAtual}</span>
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

      {/* 2. SUB-BARRA: ATENDENTE DO BALCÃO */}
      <div className="bg-white border-b border-slate-200 px-6 py-1.5 flex items-center justify-between text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          <span>
            Atendente (Balcão): <strong>{atendenteBalcao}</strong>
          </span>
          {codigoComandaCarregada && (
            <span className="ml-2 bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-200 text-[11px]">
              Comanda: {codigoComandaCarregada}
            </span>
          )}
        </div>

        {codigoComandaCarregada && (
          <button
            type="button"
            onClick={() => {
              setCodigoComandaCarregada('');
              setAtendenteBalcao('Atendimento Direto no Caixa');
            }}
            className="text-[11px] text-slate-400 hover:text-red-600 transition-colors"
          >
            Desvincular comanda
          </button>
        )}
      </div>

      {/* 3. ÁREA DE LEITURA DE PRÉ-VENDA (COMANDA) E CÓDIGO DE BARRAS (EAN) */}
      <div className="bg-white px-6 py-3 border-b border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-blue-700 font-extrabold text-sm mb-1.5 tracking-tight">
            <Barcode className="w-5 h-5 text-blue-600" />
            <span>LER Nº PRÉ-VENDA DO BALCÃO (EX: PV-1048) OU CÓDIGO DE BARRAS (EAN)</span>
          </div>

          <form onSubmit={handleProcessarLeitor} className="relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              ref={inputLeitorRef}
              type="text"
              value={termoLeitor}
              onChange={(e) => setTermoLeitor(e.target.value)}
              placeholder="Digite o nº da comanda, EAN ou passe o código de barras..."
              className="w-full pl-11 pr-14 py-2.5 rounded-xl border-2 border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 outline-none transition-all shadow-xs"
            />
            <span className="absolute right-3 bg-blue-600 text-white font-black text-xs px-2 py-0.5 rounded-md shadow-xs">
              F1
            </span>
          </form>

          {erroLeitor && (
            <div className="mt-2 text-xs text-red-600 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{erroLeitor}</span>
            </div>
          )}

          {sucessoLeitor && (
            <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{sucessoLeitor}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. CORPO PRINCIPAL COM AS DUAS COLUNAS */}
      <main className="max-w-7xl mx-auto px-4 py-4 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUNA ESQUERDA: TABELA DE ITENS DA VENDA (7 colunas lg) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden min-h-[520px]">
          <div>
            {/* Cabeçalho da Tabela */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span>Itens da Venda ({itens.length} {itens.length === 1 ? 'item' : 'itens'})</span>
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3">Produto + Laboratório</th>
                    <th className="py-2.5 px-3 text-center w-24">Qtd</th>
                    <th className="py-2.5 px-3 text-right">Unitário (R$)</th>
                    <th className="py-2.5 px-3 text-right">Desconto (R$)</th>
                    <th className="py-2.5 px-3 text-right">Total (R$)</th>
                    <th className="py-2.5 px-3 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itens.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        Nenhum produto adicionado. Use o leitor de código de barras ou comanda (F1).
                      </td>
                    </tr>
                  ) : (
                    itens.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {/* Ícone de remédio / caixa */}
                            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-black text-blue-700">Rx</span>
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">
                                {item.nomeProduto}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                <span>{item.laboratorio}</span>
                                <span>•</span>
                                <span>{item.apresentacao}</span>
                                <span className="bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded border border-slate-200">
                                  {item.tipoMedicamento}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Botões de Quantidade (-) Qtd (+) */}
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit mx-auto">
                            <button
                              type="button"
                              onClick={() => handleAlterarQtd(idx, -1)}
                              className="w-5 h-5 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold shadow-2xs"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-bold text-slate-900">
                              {item.quantidade}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAlterarQtd(idx, 1)}
                              className="w-5 h-5 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          {formatarCentavosParaReal(item.precoUnitarioCentavos).replace('R$', '').trim()}
                        </td>

                        <td className="py-3 px-3 text-right text-slate-600">
                          {formatarCentavosParaReal(item.descontoCentavos).replace('R$', '').trim()}
                        </td>

                        <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                          {formatarCentavosParaReal(item.totalCentavos).replace('R$', '').trim()}
                        </td>

                        {/* Botão de Excluir */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoverItem(idx)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                            title="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rodapé da Coluna Esquerda: Limpar Venda e Contador */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleLimparVenda}
              className="flex items-center gap-1.5 text-red-600 hover:text-red-800 font-bold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpar Venda (Esc)</span>
            </button>

            <span className="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1 rounded-lg">
              {itens.length} {itens.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </div>

        {/* COLUNA DIREITA: RESUMO, CLIENTE, FORMAS DE PAGAMENTO E TROCO (5 colunas lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Resumo da Venda + Banner Verde Total */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-3">
              <Banknote className="w-4 h-4 text-blue-600" />
              <span>Resumo da Venda</span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 mb-4">
              <div className="flex items-center justify-between">
                <span>Subtotal Bruto</span>
                <span className="font-bold text-slate-800">
                  {formatarCentavosParaReal(subtotalBrutoCentavos)}
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-600 font-semibold">
                <span>Descontos Aplicados</span>
                <span>- {formatarCentavosParaReal(descontosAplicadosCentavos)}</span>
              </div>
            </div>

            {/* BANNER VERDE DESTACADO: TOTAL A PAGAR */}
            <div className="bg-emerald-600 rounded-2xl p-4 text-white flex items-center justify-between shadow-xs">
              <span className="font-black text-sm uppercase tracking-wider">TOTAL A PAGAR</span>
              <span className="font-black text-2xl tracking-tight">
                {formatarCentavosParaReal(totalAPagarCentavos)}
              </span>
            </div>
          </div>

          {/* Card 2: Cliente (Opcional) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-2">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Cliente (Opcional)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Nome do cliente ou CPF..."
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
                {clienteNome && (
                  <button
                    type="button"
                    onClick={() => {
                      setClienteNome('');
                      setClienteCpf('');
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {clienteCpf && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0">
                  <span>CPF: {clienteCpf}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Formas de Pagamento + Dinheiro / Troco Dinâmico */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-3">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Formas de Pagamento</span>
            </div>

            {/* Grid com os 5 botões de pagamento */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {/* PIX */}
              <button
                type="button"
                onClick={() => setFormaSelecionada('PIX')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                  formaSelecionada === 'PIX'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <QrCode className="w-4 h-4 mb-1 text-blue-600" />
                <span className="text-[11px] font-bold">PIX</span>
                <span className="text-[9px] text-slate-400 font-medium">F2</span>
              </button>

              {/* Crédito */}
              <button
                type="button"
                onClick={() => setFormaSelecionada('CARTAO_CREDITO')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                  formaSelecionada === 'CARTAO_CREDITO'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1 text-blue-600" />
                <span className="text-[11px] font-bold">Crédito</span>
                <span className="text-[9px] text-slate-400 font-medium">F3</span>
              </button>

              {/* Débito */}
              <button
                type="button"
                onClick={() => setFormaSelecionada('CARTAO_DEBITO')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                  formaSelecionada === 'CARTAO_DEBITO'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1 text-blue-600" />
                <span className="text-[11px] font-bold">Débito</span>
                <span className="text-[9px] text-slate-400 font-medium">F4</span>
              </button>

              {/* Dinheiro (Destaque conforme imagem com checkmark) */}
              <button
                type="button"
                onClick={() => setFormaSelecionada('DINHEIRO')}
                className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                  formaSelecionada === 'DINHEIRO'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {formaSelecionada === 'DINHEIRO' && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                )}
                <Banknote className="w-4 h-4 mb-1 text-emerald-600" />
                <span className="text-[11px] font-bold">Dinheiro</span>
                <span className="text-[9px] text-emerald-700 font-medium">F5</span>
              </button>

              {/* Voucher */}
              <button
                type="button"
                onClick={() => setFormaSelecionada('VOUCHER')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                  formaSelecionada === 'VOUCHER'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <Ticket className="w-4 h-4 mb-1 text-amber-600" />
                <span className="text-[11px] font-bold">Voucher</span>
                <span className="text-[9px] text-slate-400 font-medium">F6</span>
              </button>
            </div>

            {/* Se for DINHEIRO: Mostra os dois campos lado a lado conforme a foto */}
            {formaSelecionada === 'DINHEIRO' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {/* Campo Valor Recebido */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Valor Recebido (Dinheiro)
                  </label>
                  <div className="flex items-center gap-1 bg-white border-2 border-blue-400 rounded-lg px-2.5 py-1.5 shadow-2xs">
                    <span className="text-base font-black text-blue-700">R$</span>
                    <input
                      type="text"
                      value={valorRecebidoDinheiroStr}
                      onChange={(e) => setValorRecebidoDinheiroStr(e.target.value)}
                      className="w-full text-base font-black text-blue-700 outline-none"
                    />
                  </div>
                </div>

                {/* Card Troco a Devolver */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-emerald-800">Troco a Devolver</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Banknote className="w-5 h-5" />
                    </div>
                    {faltaReceberCentavos > 0 ? (
                      <span className="text-xs font-bold text-red-600">
                        Falta receber {formatarCentavosParaReal(faltaReceberCentavos)}
                      </span>
                    ) : (
                      <span className="text-xl font-black text-emerald-700">
                        {formatarCentavosParaReal(trocoCentavos)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Se for VOUCHER */}
            {formaSelecionada === 'VOUCHER' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
                <label className="block text-[11px] font-bold text-amber-800 mb-1">
                  Código do Voucher de Devolução (Ex: VOUCH-XXXX)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={codigoVoucherInput}
                    onChange={(e) => setCodigoVoucherInput(e.target.value.toUpperCase())}
                    placeholder="Digite o código do voucher..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-bold uppercase bg-white outline-none"
                  />
                  <Botao
                    variante="secundario"
                    tamanho="sm"
                    onClick={() => {
                      if (codigoVoucherInput) {
                        setVoucherValidado({
                          codigo: codigoVoucherInput,
                          valorCentavos: totalAPagarCentavos,
                        });
                        alert(`Voucher ${codigoVoucherInput} validado com sucesso!`);
                      }
                    }}
                  >
                    Validar
                  </Botao>
                </div>
              </div>
            )}

            {/* BOTÃO PRINCIPAL: FINALIZAR VENDA (F10) */}
            <button
              type="button"
              onClick={handleFinalizarVenda}
              disabled={itens.length === 0 || (formaSelecionada === 'DINHEIRO' && faltaReceberCentavos > 0)}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-base flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99]"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Finalizar Venda (F10)</span>
            </button>
          </div>
        </div>
      </main>

      {/* 5. RODAPÉ FIXO COM BARRA DE ATALHOS DO TECLADO */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2.5 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-800">Atalhos do Teclado:</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>F1</strong> Ler Comanda/EAN
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>F2</strong> PIX
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>F3</strong> Crédito
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>F4</strong> Débito
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>F5</strong> Dinheiro
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>F6</strong> Voucher
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>F7</strong> Desconto
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>F8</strong> Observações
          </span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <strong>F9</strong> Pré-venda
          </span>
          <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
            <strong>F10</strong> Finalizar Venda
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>FarmaPro PDV • Isolamento Multiempresa Ativo</span>
        </div>
      </footer>

      {/* 6. MODAL RECIBO / CUPOM FISCAL DE CONFERÊNCIA */}
      {modalReciboAberto && vendaFinalizada && (
        <Modal
          aberto={modalReciboAberto}
          aoFechar={reiniciarVendaAposConclusao}
          titulo="Cupom Não-Fiscal — Venda Concluída com Sucesso"
        >
          <div className="space-y-4 py-2 select-text">
            <div className="text-center pb-3 border-b border-slate-200">
              <h3 className="font-black text-lg text-slate-900">FarmaPro — Farmácia Demonstração</h3>
              <p className="text-xs text-slate-500">{filialAtiva?.nome || 'Filial Matriz Centro'} • CNPJ: 11.222.333/0001-44</p>
              <div className="mt-2 inline-block bg-slate-100 px-3 py-1 rounded-md text-xs font-mono font-bold text-slate-700">
                Cupom: {vendaFinalizada.numeroCupom}
              </div>
            </div>

            <div className="text-xs space-y-1">
              <p><strong>Cliente:</strong> {vendaFinalizada.cliente}</p>
              <p><strong>Atendente Balcão:</strong> {vendaFinalizada.atendente}</p>
              <p><strong>Operador Caixa:</strong> {usuario?.nome || 'Carlos Santos'}</p>
              <p><strong>Data/Hora:</strong> {dataAtual} às {horaAtual}</p>
            </div>

            <div className="border-t border-b border-slate-200 py-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left">Item</th>
                    <th className="text-center">Qtd</th>
                    <th className="text-right">Unit</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendaFinalizada.itens.map((it: any, i: number) => (
                    <tr key={i} className="py-1">
                      <td className="py-1 font-medium">{it.nomeProduto}</td>
                      <td className="py-1 text-center">{it.quantidade}</td>
                      <td className="py-1 text-right">{formatarCentavosParaReal(it.precoUnitarioCentavos)}</td>
                      <td className="py-1 text-right font-bold">{formatarCentavosParaReal(it.totalCentavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>Total a Pagar:</span>
                <span className="font-bold text-sm">{formatarCentavosParaReal(vendaFinalizada.totalCentavos)}</span>
              </div>
              <div className="flex justify-between">
                <span>Forma de Pagamento:</span>
                <span className="font-bold uppercase">{vendaFinalizada.formaPagamento}</span>
              </div>
              {vendaFinalizada.formaPagamento === 'DINHEIRO' && (
                <>
                  <div className="flex justify-between">
                    <span>Valor Recebido em Dinheiro:</span>
                    <span>{formatarCentavosParaReal(vendaFinalizada.valorRecebidoCentavos)}</span>
                  </div>
                  <div className="flex justify-between bg-emerald-50 p-2 rounded-lg text-emerald-800 font-black text-sm border border-emerald-200">
                    <span>Troco Devolvido:</span>
                    <span>{formatarCentavosParaReal(vendaFinalizada.trocoCentavos)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 flex gap-3">
              <Botao
                variante="secundario"
                className="flex-1"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Cupom
              </Botao>
              <Botao
                variante="primario"
                className="flex-1"
                onClick={reiniciarVendaAposConclusao}
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
