import React, { useEffect, useRef } from 'react';
import { MedicamentoDemonstrativo } from '../../services/demoCatalogData.js';
import { Pill } from 'lucide-react';

interface ProductResultsTableProps {
  medicamentos: MedicamentoDemonstrativo[];
  indiceSelecionado: number;
  aoSelecionarIndice: (idx: number) => void;
  aoFixarMedicamento: (med: MedicamentoDemonstrativo) => void;
  medicamentoFixadoId: number | null;
}

export const ProductResultsTable: React.FC<ProductResultsTableProps> = ({
  medicamentos,
  indiceSelecionado,
  aoSelecionarIndice,
  aoFixarMedicamento,
  medicamentoFixadoId,
}) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para manter a linha selecionada sempre visível na navegação por teclado
  useEffect(() => {
    if (tableContainerRef.current) {
      const activeRow = tableContainerRef.current.querySelector('[data-selected="true"]');
      if (activeRow) {
        activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [indiceSelecionado]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getTipoBadge = (tipo: 'R' | 'S' | 'G') => {
    switch (tipo) {
      case 'R':
        return (
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center justify-center font-black text-[10px] shrink-0" title="Referência">
            R
          </span>
        );
      case 'S':
        return (
          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-black text-[10px] shrink-0" title="Similar">
            S
          </span>
        );
      case 'G':
        return (
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center font-black text-[10px] shrink-0" title="Genérico">
            G
          </span>
        );
      default:
        return null;
    }
  };

  if (medicamentos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-2xs">
        <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-700">Nenhum medicamento encontrado</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Tente buscar pelo nome comercial, princípio ativo, código interno ou passe o leitor de código de barras (EAN).
        </p>
      </div>
    );
  }

  return (
    <div
      ref={tableContainerRef}
      className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col flex-1 min-h-0"
    >
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 text-slate-600 font-bold sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
            <tr>
              <th className="py-2 px-3 w-10 text-center">Tipo</th>
              <th className="py-2 px-3 w-20">Código</th>
              <th className="py-2 px-3 min-w-[200px]">Descrição do Medicamento</th>
              <th className="py-2 px-3 min-w-[150px]">Princípio Ativo</th>
              <th className="py-2 px-3 min-w-[110px]">Laboratório</th>
              <th className="py-2 px-3 text-center w-16">Saldo</th>
              <th className="py-2 px-3 text-right w-24">Preço (R$)</th>
              <th className="py-2 px-3 text-right w-20 text-slate-400">PMC</th>
              <th className="py-2 px-3 w-16 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {medicamentos.map((med, idx) => {
              const isSelected = idx === indiceSelecionado;
              const isPinned = medicamentoFixadoId === med.id;

              return (
                <tr
                  key={med.id}
                  data-selected={isSelected}
                  onClick={() => {
                    aoSelecionarIndice(idx);
                    aoFixarMedicamento(med);
                  }}
                  className={`cursor-pointer transition-colors select-none ${
                    isPinned
                      ? 'bg-blue-100/80 font-semibold border-l-4 border-blue-600'
                      : isSelected
                      ? 'bg-blue-50/90 border-l-4 border-blue-500'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center">{getTipoBadge(med.tipo)}</td>

                  <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                    {med.codigoInterno}
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900">{med.descricao}</span>
                      {med.promocao && (
                        <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.2 rounded">
                          PROMO
                        </span>
                      )}
                      {med.farmaciaPopular && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                          POPULAR
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-2.5 px-3 text-slate-600 font-medium">{med.principioAtivo}</td>

                  <td className="py-2.5 px-3 text-slate-500">{med.laboratorio}</td>

                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`font-black font-mono px-1.5 py-0.5 rounded ${
                        med.saldo > 10
                          ? 'bg-emerald-50 text-emerald-700'
                          : med.saldo > 0
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {med.saldo}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono text-[13px]">
                    {formatBRL(med.preco)}
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                    {formatBRL(med.pmc)}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all ${
                        isPinned
                          ? 'bg-blue-600 text-white'
                          : isSelected
                          ? 'bg-blue-200 text-blue-900'
                          : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-800'
                      }`}
                    >
                      {isPinned ? 'Fixado' : 'Enter'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Use as setas ↑ ↓ para navegar • Pressione <strong>ENTER</strong> para fixar a ficha técnica</span>
        <span className="font-mono">Total na tabela: {medicamentos.length}</span>
      </div>
    </div>
  );
};
