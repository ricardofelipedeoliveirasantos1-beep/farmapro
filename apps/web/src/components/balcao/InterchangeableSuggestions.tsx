import React from 'react';
import { MedicamentoDemonstrativo } from '../../services/demoCatalogData.js';
import { ArrowLeftRight, Check } from 'lucide-react';

interface InterchangeableSuggestionsProps {
  sugestoes: MedicamentoDemonstrativo[];
  medicamentoFixado: MedicamentoDemonstrativo;
  aoSelecionarSugestao: (med: MedicamentoDemonstrativo) => void;
  indiceFocadoSugestao?: number;
}

export const InterchangeableSuggestions: React.FC<InterchangeableSuggestionsProps> = ({
  sugestoes,
  medicamentoFixado,
  aoSelecionarSugestao,
  indiceFocadoSugestao = -1,
}) => {
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (sugestoes.length === 0) {
    return null;
  }

  const getBadgeInfo = (tipo: 'R' | 'S' | 'G') => {
    switch (tipo) {
      case 'R':
        return { label: 'R Referência', bg: 'bg-blue-600 text-white' };
      case 'S':
        return { label: 'S Similar', bg: 'bg-amber-500 text-white' };
      case 'G':
        return { label: 'G Genérico', bg: 'bg-emerald-600 text-white' };
      default:
        return { label: 'Alternativa', bg: 'bg-slate-600 text-white' };
    }
  };

  return (
    <div className="flex flex-col select-none shrink-0 rounded-xl overflow-hidden shadow-2xs">
      {/* 1. CABEÇALHO AZUL CLARO OFICIAL (EXATO À IMAGEM 2) */}
      <div className="bg-blue-50/90 border border-blue-200/90 px-3 py-1.5 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-1.5">
          <ArrowLeftRight className="w-3.5 h-3.5 text-blue-700" />
          <h4 className="text-xs font-bold text-blue-950 tracking-tight">
            Sugestões de Medicamentos (Intercambiáveis)
          </h4>
        </div>

        <span className="text-[10px] text-blue-800/80 font-medium hidden sm:inline">
          Setas ← / → alternam • Clique para selecionar
        </span>
      </div>

      {/* 2. GRADE DE 3 CARDS HORIZONTAIS (EXATO À IMAGEM 2) */}
      <div className="bg-white border border-t-0 border-blue-200/90 rounded-b-xl p-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {sugestoes.map((sug, idx) => {
          const isCurrent = sug.id === medicamentoFixado.id;
          const isFocado = idx === indiceFocadoSugestao;
          const badge = getBadgeInfo(sug.tipo);

          return (
            <div
              key={sug.id}
              onClick={() => aoSelecionarSugestao(sug)}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isCurrent
                  ? 'bg-blue-50/90 border-blue-500 shadow-2xs ring-1 ring-blue-300'
                  : isFocado
                  ? 'bg-slate-50 border-blue-400 shadow-2xs ring-1 ring-blue-200'
                  : 'bg-slate-50/50 hover:bg-slate-100/70 border-slate-200 hover:border-blue-300'
              }`}
            >
              <div>
                {/* Linha do Badge R / S / G */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide ${badge.bg}`}
                  >
                    {badge.label}
                  </span>

                  {isCurrent && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-700 bg-blue-100 px-1 py-0.2 rounded">
                      <Check className="w-2.5 h-2.5" /> Atual
                    </span>
                  )}
                </div>

                {/* Nome do Produto */}
                <div className="font-bold text-xs text-slate-900 truncate" title={sug.descricao}>
                  {sug.descricao}
                </div>

                {/* Laboratório */}
                <div className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                  {sug.laboratorio}
                </div>
              </div>

              {/* Rodapé do Card: Preço e Saldo */}
              <div className="mt-1.5 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-xs sm:text-[13px] font-black text-slate-900 font-mono">
                  {formatBRL(sug.preco)}
                </span>

                <span className="text-[10px] font-semibold text-slate-500">
                  Saldo:{' '}
                  <strong className={sug.saldo > 0 ? 'text-emerald-700' : 'text-red-600'}>
                    {sug.saldo}
                  </strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
