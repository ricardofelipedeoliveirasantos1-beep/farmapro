import React from 'react';
import { Search, X, Layers, Sparkles } from 'lucide-react';
import { SearchMode } from '../../types/balcao.js';

interface ProductSearchProps {
  termoBusca: string;
  aoMudarBusca: (termo: string) => void;
  aoLimparBusca: () => void;
  modoBusca: SearchMode;
  aoAlternarModo: () => void;
  multiplicadorPendente: number;
  inputRef: React.RefObject<HTMLInputElement>;
  totalResultados: number;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  termoBusca,
  aoMudarBusca,
  aoLimparBusca,
  modoBusca,
  aoAlternarModo,
  multiplicadorPendente,
  inputRef,
  totalResultados,
}) => {
  const getModoLabel = () => {
    switch (modoBusca) {
      case 'NAME':
        return 'Nome Comercial';
      case 'PRINCIPIO':
        return 'Princípio Ativo';
      case 'EAN':
        return 'Código de Barras (EAN)';
      case 'CODE':
        return 'Código Interno';
      default:
        return 'Nome';
    }
  };

  const sugestoesRapidas = ['Dipirona', 'Losartana', 'Amoxicilina', 'Omeprazol', 'Dorflex', 'Glimepirida'];

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs space-y-2.5">
      {/* Barra de Pesquisa Principal */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
            <Search className="w-5 h-5 text-blue-600" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={termoBusca}
            onChange={e => aoMudarBusca(e.target.value)}
            placeholder="Pesquisar por nome, princípio ativo, código ou EAN... (Ex: 3*omeprazol)"
            className="w-full pl-11 pr-24 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            autoComplete="off"
            spellCheck={false}
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            {multiplicadorPendente > 1 && (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black px-2 py-0.5 rounded-md shadow-2xs animate-pulse">
                {multiplicadorPendente}x QTD
              </span>
            )}

            {termoBusca && (
              <button
                type="button"
                onClick={aoLimparBusca}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                title="Limpar pesquisa (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded font-mono">
              F1
            </span>
          </div>
        </div>

        {/* Botão de Modo de Pesquisa (Clique Direto) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={aoAlternarModo}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Clique para alternar o modo de busca (Nome, Princípio Ativo, EAN, Código Interno)"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Modo:</span>
            <span className="text-blue-700 underline underline-offset-2">{getModoLabel()}</span>
          </button>
        </div>
      </div>

      {/* Linha de Atalhos Rápidos de Amostra e Contador de Resultados */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-0.5">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-500" /> Sugestões:
          </span>
          {sugestoesRapidas.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => {
                aoMudarBusca(s);
                inputRef.current?.focus();
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-md text-[11px] font-medium transition-colors shrink-0"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 font-medium shrink-0">
          <strong className="text-slate-800 font-mono font-bold">{totalResultados}</strong>{' '}
          {totalResultados === 1 ? 'medicamento' : 'medicamentos'}
        </div>
      </div>
    </div>
  );
};
