import React from 'react';
import {
  Search,
  Sparkles,
  Pill,
} from 'lucide-react';

interface BalcaoEmptySearchStateProps {
  aoSelecionarSugestao: (termo: string) => void;
}

export const BalcaoEmptySearchState: React.FC<BalcaoEmptySearchStateProps> = ({
  aoSelecionarSugestao,
}) => {
  const sugestoes = [
    { termo: 'Dipirona', desc: 'Analgésico e Antipirético', tipo: 'G' },
    { termo: 'Losartana', desc: 'Anti-hipertensivo', tipo: 'G' },
    { termo: 'Amoxicilina', desc: 'Antimicrobiano', tipo: 'G' },
    { termo: 'Omeprazol', desc: 'Inibidor de Bomba de Prótons', tipo: 'G' },
    { termo: 'Dorflex', desc: 'Relaxante Muscular', tipo: 'R' },
    { termo: 'Rivotril', desc: 'Ansiolítico / Psicotrópico', tipo: 'R' },
  ];

  const atalhos = [
    { tecla: 'F1', nome: 'Pesquisar Produto' },
    { tecla: 'F2', nome: 'Salvar Pré-Venda' },
    { tecla: 'F3', nome: 'Imprimir Comanda' },
    { tecla: 'F8', nome: 'Excluir da Sacola' },
    { tecla: 'F10', nome: 'Identificar Cliente' },
    { tecla: 'Ctrl+D', nome: 'Desconto' },
  ];

  return (
    <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
      {/* 1. LOGO FARMAPRO COM SÍMBOLO FARMACÊUTICO MODERNO */}
      <div className="relative mb-3 flex flex-col items-center">
        {/* Efeito Glow Suave no Fundo */}
        <div className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 via-emerald-400/20 to-blue-500/20 rounded-full blur-xl opacity-75" />

        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white flex items-center justify-center shadow-md shadow-blue-200/50 border border-blue-400/30">
          {/* Cruz Farmacêutica estilizada com Pill */}
          <div className="relative flex items-center justify-center">
            <span className="text-3xl sm:text-4xl font-black leading-none tracking-tighter select-none">
              +
            </span>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-xs">
              <Pill className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Nome FarmaPro Balcão */}
        <div className="mt-3 flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none">
            Farma<span className="text-blue-600">Pro</span>
          </h1>
          <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
            Balcão PDV
          </span>
        </div>

        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 max-w-md">
          Terminal Inteligente de Consulta, Intercambialidade & Pré-Venda
        </p>
      </div>

      {/* 2. CAIXA DE INSTRUÇÃO E PRONTIDÃO */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 max-w-lg w-full mb-4 shadow-2xs">
        <div className="flex items-center justify-center gap-2 text-blue-900 font-bold text-xs sm:text-sm mb-1">
          <Search className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>Aguardando pesquisa de medicamento</span>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
          Os medicamentos permanecem ocultos até que uma busca seja realizada. Digite o{' '}
          <strong>nome comercial</strong>, <strong>princípio ativo</strong>,{' '}
          <strong>código interno</strong> ou leia o código de barras com o{' '}
          <strong>leitor EAN</strong>.
        </p>
      </div>

      {/* 3. SUGESTÕES RÁPIDAS DE PESQUISA (CLIQUE DIRETO) */}
      <div className="max-w-lg w-full mb-4">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Ou clique em uma consulta rápida de amostra:</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sugestoes.map(s => (
            <button
              key={s.termo}
              type="button"
              onClick={() => aoSelecionarSugestao(s.termo)}
              className="p-2 bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 group-hover:text-blue-700">
                  {s.termo}
                </span>
                <span
                  className={`text-[9px] font-black px-1 rounded ${
                    s.tipo === 'G'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {s.tipo}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. GUIA RÁPIDO DE TECLADO / ATALHOS */}
      <div className="pt-2 border-t border-slate-200/60 max-w-lg w-full flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-[11px] text-slate-500 font-mono">
        {atalhos.map(at => (
          <div key={at.tecla} className="flex items-center gap-1">
            <kbd className="bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs">
              {at.tecla}
            </kbd>
            <span className="text-[10px] text-slate-600 font-sans font-medium">{at.nome}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
