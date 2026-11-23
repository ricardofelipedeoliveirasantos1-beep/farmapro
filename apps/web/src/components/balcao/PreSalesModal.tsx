import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PreVendaDemo } from '../../types/balcao.js';
import {
  normalizarTexto,
  extrairApenasDigitos,
  formatarCpf,
  SugestaoPesquisaPreVenda,
} from '../../services/demoPreSalesService.js';
import {
  RotateCcw,
  Search,
  Printer,
  Trash2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ShoppingBag,
  Info,
} from 'lucide-react';

interface PreSalesModalProps {
  aberto: boolean;
  preVendas: PreVendaDemo[];
  temSacolaAtiva?: boolean;
  aoCarregarPreVendaNaSacola?: (pv: PreVendaDemo) => void;
  aoCancelarPreVenda?: (id: string) => void;
  aoExcluirPreVenda: (id: string) => void;
  aoImprimirPreVenda: (pv: PreVendaDemo) => void;
  aoFechar: () => void;
}

export const PreSalesModal: React.FC<PreSalesModalProps> = ({
  aberto,
  preVendas,
  temSacolaAtiva = false,
  aoCarregarPreVendaNaSacola,
  aoExcluirPreVenda,
  aoImprimirPreVenda,
  aoFechar,
}) => {
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [idSelecionado, setIdSelecionado] = useState<string>('');
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const itensPorPagina = 5;

  // Estados de confirmação e feedback
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<PreVendaDemo | null>(null);
  const [confirmandoSubstituicao, setConfirmandoSubstituicao] = useState<PreVendaDemo | null>(null);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string>('');

  // Estados para o Dropdown de Sugestões Inteligentes (Autocomplete)
  const [mostrarSugestoes, setMostrarSugestoes] = useState<boolean>(false);
  const [indiceSugestaoFocada, setIndiceSugestaoFocada] = useState<number>(-1);
  const buscaContainerRef = useRef<HTMLDivElement>(null);
  const inputBuscaRef = useRef<HTMLInputElement>(null);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDataHora = (isoDate: string) => {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  };

  // Fecha o dropdown de sugestões ao clicar fora do container
  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (buscaContainerRef.current && !buscaContainerRef.current.contains(e.target as Node)) {
        setMostrarSugestoes(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Máscara dinâmica inteligente para CPF
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    // Se o usuário estiver digitando apenas números e separadores de CPF
    const digitos = extrairApenasDigitos(rawVal);
    const contemLetras = /[a-zA-Z]/i.test(rawVal);

    if (!contemLetras && digitos.length > 0) {
      // Aplica a formatação de CPF dinamicamente até 11 dígitos
      const formatado = formatarCpf(rawVal);
      setTermoBusca(formatado);
    } else {
      // Permite digitação livre de nomes ("Roberto", "Ana") ou códigos ("PV-000157")
      setTermoBusca(rawVal);
    }

    setPaginaAtual(1);
    setIndiceSugestaoFocada(-1);
    setMostrarSugestoes(rawVal.trim().length > 0);
  };

  // 1. Filtragem Robusta e Simultânea por Nome, CPF e Número de Pré-Venda
  const preVendasFiltradas = useMemo(() => {
    const termoLimpo = normalizarTexto(termoBusca);
    if (!termoLimpo) return preVendas;

    const digitosBusca = extrairApenasDigitos(termoBusca);

    return preVendas.filter(pv => {
      const matchCodigo = normalizarTexto(pv.code).includes(termoLimpo);
      const matchNome = normalizarTexto(pv.customer.name).includes(termoLimpo);

      // Match por CPF: APENAS quando a busca contém dígitos numéricos
      // Isso elimina 100% dos falsos positivos em buscas textuais como "Ana" ou "Roberto"
      const digitosCpf = extrairApenasDigitos(pv.customer.cpf || '');
      const matchCpf = (digitosBusca.length > 0 && digitosCpf.length > 0)
        ? digitosCpf.includes(digitosBusca)
        : false;

      return matchCodigo || matchNome || matchCpf;
    });
  }, [preVendas, termoBusca]);

  // 2. Sugestões Automáticas Inteligentes (Autocomplete Dropdown)
  const sugestoes = useMemo<SugestaoPesquisaPreVenda[]>(() => {
    const termoLimpo = normalizarTexto(termoBusca);
    if (!termoLimpo) return [];

    const digitosBusca = extrairApenasDigitos(termoBusca);
    const lista: SugestaoPesquisaPreVenda[] = [];
    const vistas = new Set<string>();

    for (const pv of preVendas) {
      const matchCodigo = normalizarTexto(pv.code).includes(termoLimpo);
      const matchNome = normalizarTexto(pv.customer.name).includes(termoLimpo);
      const digitosCpf = extrairApenasDigitos(pv.customer.cpf || '');
      const matchCpf = (digitosBusca.length > 0 && digitosCpf.length > 0)
        ? digitosCpf.includes(digitosBusca)
        : false;

      if (matchCodigo || matchNome || matchCpf) {
        const chave = `${pv.customer.name}-${pv.customer.cpf || ''}-${pv.code}`;
        if (!vistas.has(chave)) {
          vistas.add(chave);
          lista.push({
            clienteNome: pv.customer.name,
            clienteCpf: formatarCpf(pv.customer.cpf || ''),
            codigoPreVenda: pv.code,
            total: pv.total,
            preVendaId: pv.id,
          });
        }
      }
      if (lista.length >= 6) break;
    }

    return lista;
  }, [preVendas, termoBusca]);

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(preVendasFiltradas.length / itensPorPagina));
  const paginaValida = Math.min(paginaAtual, totalPaginas);

  const itensPaginados = useMemo(() => {
    const inicio = (paginaValida - 1) * itensPorPagina;
    return preVendasFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [preVendasFiltradas, paginaValida]);

  // Sincroniza o item selecionado inicial
  useEffect(() => {
    if (preVendasFiltradas.length > 0) {
      const existeAtual = preVendasFiltradas.some(p => p.id === idSelecionado);
      if (!existeAtual) {
        setIdSelecionado(preVendasFiltradas[0]!.id);
      }
    } else {
      setIdSelecionado('');
    }
  }, [preVendasFiltradas, idSelecionado]);

  // Item selecionado atual
  const preVendaSelecionada = useMemo(() => {
    return preVendas.find(p => p.id === idSelecionado) || itensPaginados[0] || null;
  }, [preVendas, idSelecionado, itensPaginados]);

  // Seleção de Sugestão via Mouse ou Teclado
  const handleSelecionarSugestao = (sug: SugestaoPesquisaPreVenda) => {
    setTermoBusca(sug.clienteNome);
    setIdSelecionado(sug.preVendaId);
    setMostrarSugestoes(false);
    setPaginaAtual(1);
    inputBuscaRef.current?.focus();
  };

  // Navegação no Dropdown de Sugestões via Teclado (Setas ↑ / ↓, Enter e ESC)
  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mostrarSugestoes || sugestoes.length === 0) {
      if (e.key === 'Escape') {
        aoFechar();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSugestaoFocada(prev => (prev < sugestoes.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSugestaoFocada(prev => (prev > 0 ? prev - 1 : sugestoes.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (indiceSugestaoFocada >= 0 && indiceSugestaoFocada < sugestoes.length) {
        handleSelecionarSugestao(sugestoes[indiceSugestaoFocada]!);
      } else if (sugestoes.length > 0) {
        handleSelecionarSugestao(sugestoes[0]!);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMostrarSugestoes(false);
    }
  };

  // Exclusão com confirmação
  const handleExcluirConfirmado = () => {
    if (!confirmandoExclusao) return;
    const codigoExcluido = confirmandoExclusao.code;
    aoExcluirPreVenda(confirmandoExclusao.id);
    setConfirmandoExclusao(null);
    setFeedbackSucesso(`Pré-venda ${codigoExcluido} excluída com sucesso!`);
    setTimeout(() => setFeedbackSucesso(''), 3000);
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150 select-none font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-xl w-full flex flex-col overflow-hidden text-slate-800">
        {/* 1. CABEÇALHO DO MODAL: ÍCONE HISTÓRICO AZUL + TÍTULO "Pré-venda" + BOTÃO FECHAR (X) */}
        <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-5 h-5 text-[#0a448d] stroke-[2.4]" />
            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">
              Pré-venda
            </h3>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. CORPO DO MODAL */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Mensagem de Feedback de Exclusão */}
          {feedbackSucesso && (
            <div className="p-2.5 px-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackSucesso}</span>
            </div>
          )}

          {/* Campo de Pesquisa Inteligente com Máscara e Sugestões Automáticas */}
          <div className="relative" ref={buscaContainerRef}>
            <Search className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputBuscaRef}
              type="text"
              value={termoBusca}
              onChange={handleInputChange}
              onKeyDown={handleKeyDownInput}
              onFocus={() => {
                if (termoBusca.trim().length > 0) {
                  setMostrarSugestoes(true);
                }
              }}
              placeholder="Pesquisar por CPF, nome do cliente ou nº da pré-venda..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
              autoFocus
            />

            {termoBusca && (
              <button
                type="button"
                onClick={() => {
                  setTermoBusca('');
                  setMostrarSugestoes(false);
                  inputBuscaRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Menu Suspenso de Sugestões Inteligentes (Dropdown Autocomplete) */}
            {mostrarSugestoes && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-blue-200 z-50 overflow-hidden text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                {sugestoes.length === 0 ? (
                  <div className="p-3.5 text-center text-slate-400 font-medium">
                    Nenhum cliente ou pré-venda encontrado para "{termoBusca}"
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 px-3 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Sugestões Rápidas (Enter para selecionar)
                    </div>
                    {sugestoes.map((sug, idx) => {
                      const isFocado = idx === indiceSugestaoFocada;
                      return (
                        <div
                          key={`${sug.preVendaId}-${idx}`}
                          onMouseDown={() => handleSelecionarSugestao(sug)}
                          onMouseEnter={() => setIndiceSugestaoFocada(idx)}
                          className={`p-2.5 px-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isFocado
                              ? 'bg-blue-50 text-blue-900 font-medium'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-bold text-slate-900 truncate">
                              {sug.clienteNome}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              CPF: {sug.clienteCpf || 'Não informado'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                              {sug.codigoPreVenda}
                            </span>
                            <span className="font-mono text-slate-900 font-black text-xs">
                              {formatBRL(sug.total)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. TABELA DE PRÉ-VENDAS SALVAS COM COLUNA STATUS (EXATA À IMAGEM DE REFERÊNCIA) */}
          <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
            {/* Cabeçalho da Tabela em Azul-Marinho */}
            <div className="bg-[#0a448d] px-3 py-2 text-white font-bold text-[11px] sm:text-xs flex items-center shadow-xs">
              <span className="w-7 shrink-0"></span>
              <span className="w-24 shrink-0 uppercase tracking-wide">Nº PRÉ-VENDA</span>
              <span className="flex-1 min-w-0 pr-2 uppercase tracking-wide">CLIENTE</span>
              <span className="w-28 shrink-0 text-left uppercase tracking-wide">DATA / HORA</span>
              <span className="w-12 shrink-0 text-center uppercase tracking-wide">ITENS</span>
              <span className="w-20 shrink-0 text-right uppercase tracking-wide">TOTAL</span>
              <span className="w-20 shrink-0 text-center uppercase tracking-wide">STATUS</span>
            </div>

            {/* Linhas da Tabela com Seleção por Radio */}
            <div className="divide-y divide-slate-100 bg-white min-h-[220px]">
              {itensPaginados.length === 0 ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
                  <RotateCcw className="w-8 h-8 text-slate-300 mb-1.5" />
                  <p className="font-semibold text-xs text-slate-600">Nenhuma pré-venda encontrada</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tente outro nome, CPF ou número da pré-venda.</p>
                </div>
              ) : (
                itensPaginados.map(pv => {
                  const isSelected = preVendaSelecionada?.id === pv.id;

                  return (
                    <div
                      key={pv.id}
                      onClick={() => setIdSelecionado(pv.id)}
                      className={`px-3 py-2.5 flex items-center text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 font-medium text-slate-900'
                          : 'hover:bg-slate-50/80 text-slate-700'
                      }`}
                    >
                      {/* Coluna 1: Radio Button Circular */}
                      <div className="w-7 shrink-0 flex items-center">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-2 border-[#0c5fd1] bg-white'
                              : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-[#0c5fd1]" />
                          )}
                        </div>
                      </div>

                      {/* Coluna 2: Nº Pré-Venda */}
                      <span className="w-24 shrink-0 font-mono font-bold text-slate-900 text-xs">
                        {pv.code}
                      </span>

                      {/* Coluna 3: Cliente */}
                      <span className="flex-1 min-w-0 pr-2 truncate font-semibold text-slate-800">
                        {pv.customer.name}
                      </span>

                      {/* Coluna 4: Data / Hora */}
                      <span className="w-28 shrink-0 text-slate-600 text-[11px] font-sans">
                        {formatDataHora(pv.createdAt)}
                      </span>

                      {/* Coluna 5: Itens */}
                      <span className="w-12 shrink-0 text-center font-bold text-slate-800">
                        {pv.items.length}
                      </span>

                      {/* Coluna 6: Total */}
                      <span className="w-20 shrink-0 text-right font-black font-mono text-slate-900 text-xs">
                        {formatBRL(pv.total)}
                      </span>

                      {/* Coluna 7: Status */}
                      <div className="w-20 shrink-0 flex items-center justify-center">
                        {pv.status === 'IN_EDIT' ? (
                          <span className="bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] px-2 py-0.5 rounded text-[10px] font-bold tracking-tight">
                            Em edição
                          </span>
                        ) : (
                          <span className="bg-[#e6f4ea] text-[#137333] border border-[#ceead6] px-2 py-0.5 rounded text-[10px] font-bold tracking-tight">
                            Salva
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé da Tabela: Paginação */}
            <div className="bg-slate-50/80 px-4 py-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <span className="text-[11px] font-medium">
                Mostrando {itensPaginados.length} de {preVendasFiltradas.length} pré-vendas
              </span>

              <div className="flex items-center gap-1 font-semibold text-xs">
                <button
                  type="button"
                  onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                  disabled={paginaValida <= 1}
                  className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: totalPaginas }).map((_, i) => {
                  const numPag = i + 1;
                  const isCurrent = numPag === paginaValida;

                  return (
                    <button
                      key={numPag}
                      type="button"
                      onClick={() => setPaginaAtual(numPag)}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#0c5fd1] text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {numPag}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaValida >= totalPaginas}
                  className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Próxima página"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 4. QUADRO INFORMATIVO: SELEÇÃO DE PRÉ-VENDA */}
          <div className="bg-[#e8f0fe]/70 border border-[#d2e3fc] rounded-xl p-2.5 px-3.5 flex items-center gap-2.5 text-xs text-[#1967d2]">
            <Info className="w-4 h-4 text-[#1a73e8] shrink-0" />
            <span className="font-medium text-[11px] sm:text-xs">
              Selecione uma pré-venda para ver os detalhes e escolher uma ação.
            </span>
          </div>

          {/* 5. SEPARADOR INSTITUCIONAL: AÇÕES DISPONÍVEIS */}
          <div className="flex items-center justify-center gap-2 pt-0.5">
            <span className="text-slate-300">·</span>
            <h4 className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-[#0a448d]">
              AÇÕES DISPONÍVEIS
            </h4>
            <span className="text-slate-300">·</span>
          </div>

          {/* 6. BOTÕES DE AÇÃO: DISPOSIÇÃO VERTICAL RIGOROSA CONFORME A IMAGEM DE REFERÊNCIA */}
          <div className="flex flex-col gap-2 pt-0.5">
            {/* Ação 1: Abrir / Editar na Sacola (Azul Sólido) */}
            <button
              type="button"
              disabled={!preVendaSelecionada}
              onClick={() => {
                if (!preVendaSelecionada) return;
                if (temSacolaAtiva) {
                  setConfirmandoSubstituicao(preVendaSelecionada);
                } else {
                  aoCarregarPreVendaNaSacola?.(preVendaSelecionada);
                  aoFechar();
                }
              }}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition-all shadow-md ${
                !preVendaSelecionada
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[#0c5fd1] hover:bg-[#0a4ea8] text-white cursor-pointer active:scale-99 shadow-blue-200/60'
              }`}
              title="Carregar pré-venda selecionada na sacola do balcão para edição"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <span>Abrir / Editar na Sacola</span>
              </div>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
            </button>

            {/* Ação 2: Imprimir Pré-venda (Branco com borda verde) */}
            <button
              type="button"
              disabled={!preVendaSelecionada}
              onClick={() => {
                if (preVendaSelecionada) {
                  aoImprimirPreVenda(preVendaSelecionada);
                }
              }}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition-all border-2 ${
                !preVendaSelecionada
                  ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                  : 'bg-white hover:bg-emerald-50/60 text-[#137333] border-[#34a853] cursor-pointer active:scale-99'
              }`}
              title="Imprimir pré-venda selecionada"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-[#137333]" />
                <span>Imprimir Pré-venda</span>
              </div>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#137333]" />
            </button>

            {/* Ação 3: Excluir Pré-venda (Branco com borda vermelha) */}
            <button
              type="button"
              disabled={!preVendaSelecionada}
              onClick={() => {
                if (preVendaSelecionada) {
                  setConfirmandoExclusao(preVendaSelecionada);
                }
              }}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition-all border-2 ${
                !preVendaSelecionada
                  ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                  : 'bg-white hover:bg-red-50/60 text-[#d93025] border-[#ea4335] cursor-pointer active:scale-99'
              }`}
              title="Excluir pré-venda selecionada"
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#d93025]" />
                <span>Excluir Pré-venda</span>
              </div>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#d93025]" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE PROTEÇÃO CONTRA CONFLITO DE SACOLA ATIVA */}
      {confirmandoSubstituicao && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 max-w-md w-full p-5 space-y-4 text-slate-800">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900">Existe uma Venda em Andamento</h4>
                <p className="text-xs text-slate-500">A sacola atual contém itens de outro atendimento.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>Pré-venda a carregar: <strong className="font-mono text-slate-900">{confirmandoSubstituicao.code}</strong></div>
              <div>Cliente: <strong className="text-slate-900">{confirmandoSubstituicao.customer.name}</strong></div>
              <div>Total: <strong className="font-mono text-slate-900">{formatBRL(confirmandoSubstituicao.total)}</strong> ({confirmandoSubstituicao.items.length} itens)</div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Existe uma venda em andamento. Deseja substituir a sacola atual pela pré-venda selecionada?
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmandoSubstituicao(null)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => {
                  const pv = confirmandoSubstituicao;
                  setConfirmandoSubstituicao(null);
                  aoCarregarPreVendaNaSacola?.(pv);
                  aoFechar();
                }}
                className="py-2.5 px-3 rounded-xl bg-[#0c5fd1] hover:bg-[#0a4ea8] text-white font-bold text-xs shadow-md shadow-blue-200 cursor-pointer"
              >
                Substituir sacola
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO CIRÚRGICA */}
      {confirmandoExclusao && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-md w-full p-5 space-y-4 text-slate-800">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900">Confirmar Exclusão de Pré-Venda</h4>
                <p className="text-xs text-slate-500">Esta ação é irreversível.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>Pré-venda: <strong className="font-mono text-slate-900">{confirmandoExclusao.code}</strong></div>
              <div>Cliente: <strong className="text-slate-900">{confirmandoExclusao.customer.name}</strong></div>
              <div>Total: <strong className="font-mono text-slate-900">{formatBRL(confirmandoExclusao.total)}</strong> ({confirmandoExclusao.items.length} itens)</div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja realmente excluir esta pré-venda? Ela será removida da fila do balcão e não poderá ser finalizada no Caixa.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(null)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExcluirConfirmado}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-200 cursor-pointer"
              >
                Sim, Excluir Pré-Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
