import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  ClipboardList,
  ShoppingCart,
  ArrowLeftRight,
  BarChart3,
  LogOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export type OpcaoMenuPainelVenda =
  | 'cadastrar-cliente'
  | 'historico-compra'
  | 'pre-venda'
  | 'troca'
  | 'devolucao'
  | 'consulta-troca'
  | 'pesquisa-receita'
  | 'relatorios'
  | 'sair';

interface PainelVendaMenuProps {
  aberto: boolean;
  aoFechar: () => void;
  aoSelecionarOpcao: (opcao: OpcaoMenuPainelVenda) => void;
  contadorPreVendas: number;
  opcaoAtiva?: string;
}

export const PainelVendaMenu: React.FC<PainelVendaMenuProps> = ({
  aberto,
  aoFechar,
  aoSelecionarOpcao,
  contadorPreVendas,
  opcaoAtiva,
}) => {
  const [trocaDevolucaoExpandido, setTrocaDevolucaoExpandido] = useState<boolean>(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora dele
  useEffect(() => {
    if (!aberto) return;

    const handleClickFora = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        aoFechar();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        aoFechar();
      }
    };

    // Pequeno delay para evitar que o clique no próprio botão hambúrguer feche imediatamente
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickFora);
      document.addEventListener('keydown', handleKeyDown);
    }, 50);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickFora);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  const handleClickItem = (opcao: OpcaoMenuPainelVenda) => {
    aoSelecionarOpcao(opcao);
    aoFechar();
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-3 top-13 z-50 w-72 bg-[#091f3c] text-white rounded-2xl shadow-2xl border border-blue-800/60 py-2.5 px-2 select-none font-sans animate-in fade-in zoom-in-95 duration-150"
      style={{
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 20px 0 rgba(14, 165, 233, 0.15)',
      }}
    >
      {/* 1. Cadastrar Cliente */}
      <button
        type="button"
        onClick={() => handleClickItem('cadastrar-cliente')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
          opcaoAtiva === 'cadastrar-cliente'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-200 hover:bg-blue-800/40 hover:text-white'
        }`}
      >
        <UserPlus className="w-4 h-4 text-blue-300 shrink-0" />
        <span className="flex-1 text-left">Cadastrar Cliente</span>
      </button>

      {/* 2. Histórico de Compra */}
      <button
        type="button"
        onClick={() => handleClickItem('historico-compra')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all mt-0.5 ${
          opcaoAtiva === 'historico-compra'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-200 hover:bg-blue-800/40 hover:text-white'
        }`}
      >
        <ClipboardList className="w-4 h-4 text-blue-300 shrink-0" />
        <span className="flex-1 text-left">Histórico de Compra</span>
      </button>

      {/* 3. Pré-venda com Badge numérico */}
      <button
        type="button"
        onClick={() => handleClickItem('pre-venda')}
        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all mt-0.5 ${
          opcaoAtiva === 'pre-venda'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-200 hover:bg-blue-800/40 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-4 h-4 text-blue-300 shrink-0" />
          <span>Pré-venda</span>
        </div>
        <span className="bg-blue-500 text-white font-bold text-[11px] px-2 py-0.5 rounded-full shadow-xs min-w-[20px] text-center">
          {contadorPreVendas}
        </span>
      </button>

      {/* 4. Troca e Devolução (Expansível conforme imagem de referência) */}
      <div className="mt-0.5">
        <button
          type="button"
          onClick={() => setTrocaDevolucaoExpandido(!trocaDevolucaoExpandido)}
          className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            opcaoAtiva?.startsWith('troca') || opcaoAtiva === 'devolucao'
              ? 'text-blue-300 bg-blue-900/30'
              : 'text-slate-200 hover:bg-blue-800/40 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-4 h-4 text-blue-300 shrink-0" />
            <span>Troca e Devolução</span>
          </div>
          {trocaDevolucaoExpandido ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Submenu de Troca e Devolução */}
        {trocaDevolucaoExpandido && (
          <div className="my-1 ml-4 pl-3 border-l-2 border-blue-700/50 flex flex-col gap-0.5 py-1">
            <button
              type="button"
              onClick={() => handleClickItem('troca')}
              className={`w-full text-left py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                opcaoAtiva === 'troca'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-blue-800/30'
              }`}
            >
              • Troca
            </button>
            <button
              type="button"
              onClick={() => handleClickItem('devolucao')}
              className={`w-full text-left py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                opcaoAtiva === 'devolucao'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-blue-800/30'
              }`}
            >
              • Devolução
            </button>
            <button
              type="button"
              onClick={() => handleClickItem('consulta-troca')}
              className={`w-full text-left py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                opcaoAtiva === 'consulta-troca'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-blue-800/30'
              }`}
            >
              • Consulta
            </button>
          </div>
        )}
      </div>

      {/* 5. Pesquisa de Receita */}
      <button
        type="button"
        onClick={() => handleClickItem('pesquisa-receita')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all mt-0.5 ${
          opcaoAtiva === 'pesquisa-receita'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-200 hover:bg-blue-800/40 hover:text-white'
        }`}
      >
        <span className="font-serif font-bold text-xs text-blue-300 italic px-0.5">Rx</span>
        <span className="flex-1 text-left">Pesquisa de Receita</span>
      </button>

      {/* 6. Relatórios */}
      <button
        type="button"
        onClick={() => handleClickItem('relatorios')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all mt-0.5 ${
          opcaoAtiva === 'relatorios'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-200 hover:bg-blue-800/40 hover:text-white'
        }`}
      >
        <BarChart3 className="w-4 h-4 text-blue-300 shrink-0" />
        <span className="flex-1 text-left">Relatórios</span>
      </button>

      {/* Linha Divisória */}
      <div className="my-1.5 border-t border-blue-800/60" />

      {/* 7. Sair do Sistema */}
      <button
        type="button"
        onClick={() => handleClickItem('sair')}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-all"
      >
        <LogOut className="w-4 h-4 text-red-400 shrink-0" />
        <span className="flex-1 text-left">Sair do Sistema</span>
      </button>
    </div>
  );
};
