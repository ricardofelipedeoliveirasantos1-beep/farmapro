import React from 'react';
import { Search, X } from 'lucide-react';
import { SearchMode } from '../../types/balcao.js';

interface ProductSearchProps {
  termoBusca: string;
  aoMudarBusca: (termo: string) => void;
  aoLimparBusca: () => void;
  modoBusca?: SearchMode;
  aoAlternarModo?: () => void;
  multiplicadorPendente: number;
  inputRef: React.RefObject<HTMLInputElement>;
  totalResultados: number;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  termoBusca,
  aoMudarBusca,
  aoLimparBusca,
  multiplicadorPendente,
  inputRef,
  totalResultados,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-2 sm:p-2.5 shadow-2xs">
      {/* Barra de Pesquisa Principal Full-Width (Sem botão de modo e sem linha de sugestões) */}
      <div className="relative w-full flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
          <Search className="w-5 h-5 text-blue-600" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={termoBusca}
          onChange={e => aoMudarBusca(e.target.value)}
          placeholder="Pesquisar por nome, princípio ativo, código interno ou leitor EAN... (Ex: dip ou 3*omeprazol)"
          className="w-full pl-11 pr-28 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-inner"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {multiplicadorPendente > 1 && (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black px-2 py-0.5 rounded-md shadow-2xs animate-pulse">
              {multiplicadorPendente}x QTD
            </span>
          )}

          {termoBusca && (
            <button
              type="button"
              onClick={aoLimparBusca}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Limpar pesquisa (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {termoBusca.trim() && (
            <span className="hidden sm:inline-flex bg-slate-100 text-slate-600 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-slate-200">
              {totalResultados} {totalResultados === 1 ? 'item' : 'itens'}
            </span>
          )}

          <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded font-mono shadow-2xs">
            F1
          </span>
        </div>
      </div>
    </div>
  );
};
