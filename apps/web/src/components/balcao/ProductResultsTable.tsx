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

  const formatPreco = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Cálculo da rentabilidade demonstrativa coerente com a referência (G ~ 81-85%, S ~ 78-82%, R ~ 34-35%)
  const getRentabilidade = (med: MedicamentoDemonstrativo) => {
    if (med.tipo === 'G') {
      const val = 81.0 + (med.id % 5) * 0.88;
      return `${val.toFixed(2).replace('.', ',')}%`;
    } else if (med.tipo === 'S') {
      const val = 79.5 + (med.id % 4) * 0.63;
      return `${val.toFixed(2).replace('.', ',')}%`;
    } else {
      const val = 34.5 + (med.id % 3) * 0.25;
      return `${val.toFixed(2).replace('.', ',')}%`;
    }
  };

  const getTipoBadge = (tipo: 'R' | 'S' | 'G') => {
    switch (tipo) {
      case 'G':
        return (
          <span
            className="w-6 h-6 rounded bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xs shadow-2xs shrink-0"
            title="Genérico (G) - Lei 9.787/99"
          >
            G
          </span>
        );
      case 'R':
        return (
          <span
            className="w-6 h-6 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold text-xs shrink-0"
            title="Medicamento de Referência / Ético"
          >
            R
          </span>
        );
      case 'S':
        return (
          <span
            className="w-6 h-6 rounded bg-blue-100 text-blue-800 border border-blue-300 flex items-center justify-center font-bold text-xs shrink-0"
            title="Medicamento Similar Equivalente"
          >
            S
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
      className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col flex-1 min-h-0 select-none"
    >
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-left text-xs border-collapse">
          {/* Cabeçalho Azul Escuro Corporativo Oficial (#1a365d) */}
          <thead className="bg-[#1a365d] text-white font-bold sticky top-0 z-10 shadow-2xs">
            <tr className="border-b border-blue-900/60 uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 w-12 text-center">Tipo</th>
              <th className="py-2.5 px-3 w-20">Cód.</th>
              <th className="py-2.5 px-3 min-w-[280px]">Medicamento / Princípio Ativo</th>
              <th className="py-2.5 px-3 min-w-[140px]">Fabricante</th>
              <th className="py-2.5 px-3 text-center w-20">Estoque</th>
              <th className="py-2.5 px-3 text-right w-24">Preço R$</th>
              <th className="py-2.5 px-3 text-right w-20">Rent.%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {medicamentos.map((med, idx) => {
              const isSelected = idx === indiceSelecionado;
              const isPinned = medicamentoFixadoId === med.id;
              const isComposto = med.descricao.includes('+') || med.descricao.includes('DORSAY');

              return (
                <tr
                  key={med.id}
                  data-selected={isSelected}
                  onClick={() => {
                    aoSelecionarIndice(idx);
                    aoFixarMedicamento(med);
                  }}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#2563eb] text-white font-medium'
                      : isPinned
                      ? 'bg-blue-100/90 text-slate-900 border-l-4 border-blue-600'
                      : idx % 2 === 0
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-slate-50/50 hover:bg-slate-100/70'
                  }`}
                >
                  {/* TIPO */}
                  <td className="py-2.5 px-3 text-center">
                    {getTipoBadge(med.tipo)}
                  </td>

                  {/* CÓDIGO */}
                  <td
                    className={`py-2.5 px-3 font-mono font-bold ${
                      isSelected ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {med.codigoInterno}
                  </td>

                  {/* MEDICAMENTO / PRINCÍPIO ATIVO (2 Linhas) */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-black text-xs ${
                            isSelected
                              ? 'text-white'
                              : isComposto
                              ? 'text-[#881337]'
                              : 'text-slate-900'
                          }`}
                        >
                          {med.descricao}
                        </span>
                        {med.promocao && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            PROMO
                          </span>
                        )}
                        {med.farmaciaPopular && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            POPULAR
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-semibold tracking-tight uppercase mt-0.5 ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {med.principioAtivo}
                      </span>
                    </div>
                  </td>

                  {/* FABRICANTE */}
                  <td
                    className={`py-2.5 px-3 font-semibold uppercase text-xs ${
                      isSelected ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {med.laboratorio}
                  </td>

                  {/* ESTOQUE */}
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`font-mono font-black text-xs px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'text-white bg-white/20'
                          : med.saldo > 10
                          ? 'text-emerald-700 bg-emerald-50'
                          : med.saldo > 0
                          ? 'text-amber-700 bg-amber-50'
                          : 'text-red-700 bg-red-50'
                      }`}
                    >
                      {med.saldo}
                    </span>
                  </td>

                  {/* PREÇO R$ */}
                  <td
                    className={`py-2.5 px-3 text-right font-mono font-black text-[13px] ${
                      isSelected ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {formatPreco(med.preco)}
                  </td>

                  {/* RENT.% */}
                  <td
                    className={`py-2.5 px-3 text-right font-mono font-bold text-xs ${
                      isSelected ? 'text-white' : 'text-emerald-700'
                    }`}
                  >
                    {getRentabilidade(med)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Rodapé da Tabela: Totalizadores e Instrução de 1º Enter */}
      <div className="bg-slate-50 px-3 py-2 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between font-medium">
        <span>
          <strong className="text-slate-900 font-bold">{medicamentos.length}</strong> medicamento(s) encontrado(s) em ordem alfabética
        </span>
        <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-xs">
          <span>Passo 1:</span>
          <kbd className="bg-white border border-slate-300 text-slate-800 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
            1º Enter
          </kbd>
          <span className="text-slate-700">fixa o medicamento e mostra 3 sugestões</span>
        </div>
      </div>
    </div>
  );
};
