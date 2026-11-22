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

  const getTipoNome = (tipo: 'R' | 'S' | 'G') => {
    switch (tipo) {
      case 'R':
        return '1º REFERÊNCIA';
      case 'S':
        return '2º SIMILAR';
      case 'G':
        return '3º GENÉRICO';
      default:
        return 'ALTERNATIVA';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2 sm:p-2.5 shadow-2xs space-y-1.5 select-none shrink-0">
      {/* Cabeçalho Compacto das Sugestões */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
          <h4 className="text-xs font-black text-slate-800 tracking-tight">
            Sugestões Intercambiáveis (ANVISA)
          </h4>
          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
            (Pressione ← / → para alternar ou clique para trocar o produto fixado)
          </span>
        </div>

        <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-mono font-bold">
          {sugestoes.length} opções do mesmo princípio
        </span>
      </div>

      {/* Grade de 3 Sugestões com Altura Reduzida Moderadamente e Distribuídas Horizontalmente (Seção 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {sugestoes.map((sug, idx) => {
          const isCurrent = sug.id === medicamentoFixado.id;
          const isFocado = idx === indiceFocadoSugestao;

          return (
            <div
              key={sug.id}
              onClick={() => aoSelecionarSugestao(sug)}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isCurrent
                  ? 'bg-blue-50/90 border-blue-500 shadow-2xs ring-1 ring-blue-300'
                  : isFocado
                  ? 'bg-slate-50 border-blue-400 shadow-2xs ring-1 ring-blue-200'
                  : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200 hover:border-blue-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded tracking-wide ${
                      sug.tipo === 'R'
                        ? 'bg-blue-600 text-white'
                        : sug.tipo === 'S'
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {getTipoNome(sug.tipo)}
                  </span>

                  <span className="text-[10px] text-slate-500 font-semibold font-mono">
                    Saldo: <strong className={sug.saldo > 0 ? 'text-emerald-700' : 'text-red-600'}>{sug.saldo}</strong>
                  </span>
                </div>

                <div className="font-bold text-xs text-slate-900 truncate" title={sug.descricao}>
                  {sug.descricao}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {sug.laboratorio}
                </div>
              </div>

              <div className="mt-1 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block leading-none">Preço</span>
                  <span className="text-xs sm:text-[13px] font-black text-slate-900 font-mono">
                    {formatBRL(sug.preco)}
                  </span>
                </div>

                {isCurrent ? (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                    <Check className="w-2.5 h-2.5" /> Selecionado
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-300 px-1.5 py-0.5 rounded hover:bg-blue-600 hover:text-white transition-colors">
                    Fixar este
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
