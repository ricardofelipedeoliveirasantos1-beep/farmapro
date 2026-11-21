import React from 'react';
import { MedicamentoDemonstrativo } from '../../services/demoCatalogData.js';
import {
  MapPin,
  FileCheck2,
  Calendar,
  Unlock,
  PlusCircle,
} from 'lucide-react';

interface PinnedProductDetailsProps {
  medicamento: MedicamentoDemonstrativo;
  aoDestravar: () => void;
  aoConfirmarSacola: () => void;
  multiplicador: number;
}

export const PinnedProductDetails: React.FC<PinnedProductDetailsProps> = ({
  medicamento,
  aoDestravar,
  aoConfirmarSacola,
  multiplicador,
}) => {
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getTipoDesc = (tipo: 'R' | 'S' | 'G') => {
    switch (tipo) {
      case 'R':
        return 'MEDICAMENTO DE REFERÊNCIA (INVENTOR)';
      case 'S':
        return 'MEDICAMENTO SIMILAR';
      case 'G':
        return 'MEDICAMENTO GENÉRICO (LEI 9.787/99)';
      default:
        return 'MEDICAMENTO';
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50/70 via-white to-blue-50/40 rounded-xl border border-blue-200/90 p-4 shadow-sm space-y-3">
      {/* Topo do Produto Fixado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wide ${
                medicamento.tipo === 'R'
                  ? 'bg-blue-600 text-white'
                  : medicamento.tipo === 'S'
                  ? 'bg-amber-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {getTipoDesc(medicamento.tipo)}
            </span>

            <span className="bg-slate-200 text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded">
              {medicamento.laboratorio}
            </span>

            <span className="text-[11px] font-mono text-slate-500 font-semibold">
              EAN: {medicamento.ean} • Cód: {medicamento.codigoInterno}
            </span>
          </div>

          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            {medicamento.descricao}
          </h3>
        </div>

        {/* Preço e Botão Adicionar */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block leading-none">Preço Balcão</span>
            <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
              {formatBRL(medicamento.preco)}
            </span>
          </div>

          <button
            type="button"
            onClick={aoConfirmarSacola}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Adicionar à sacola (ENTER)"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Adicionar {multiplicador > 1 ? `(${multiplicador}x)` : ''} (Enter)</span>
          </button>

          <button
            type="button"
            onClick={aoDestravar}
            className="p-2 border border-slate-300 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Destravar produto e voltar à pesquisa (ESC)"
          >
            <Unlock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grade de Informações Farmacêuticas e Logísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
        {/* 1. Princípio Ativo */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">Princípio Ativo</span>
          <span className="font-bold text-slate-800 line-clamp-2 mt-0.5">
            {medicamento.principioAtivo}
          </span>
        </div>

        {/* 2. Armazenamento */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold block uppercase flex items-center gap-1">
            <MapPin className="w-3 h-3 text-blue-500" /> Armazenamento
          </span>
          <span className="font-bold text-slate-800 mt-0.5 block">{medicamento.armazenamento}</span>
        </div>

        {/* 3. PMC */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">PMC Oficial</span>
          <span className="font-bold text-slate-700 font-mono mt-0.5 block">
            {formatBRL(medicamento.pmc)}
          </span>
        </div>

        {/* 4. Programas Credenciados */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold block uppercase flex items-center gap-1">
            <FileCheck2 className="w-3 h-3 text-emerald-500" /> Programas
          </span>
          <span className="font-bold text-slate-800 mt-0.5 block">
            {medicamento.pbm ? 'PBM / Desconto Lab' : medicamento.farmaciaPopular ? 'Farmácia Popular' : 'Particular'}
          </span>
        </div>

        {/* 5. Lote */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">Lote FEFO</span>
          <span className="font-bold text-slate-800 font-mono mt-0.5 block">{medicamento.lote}</span>
        </div>

        {/* 6. Validade */}
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold block uppercase flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-500" /> Validade
          </span>
          <span
            className={`font-black font-mono mt-0.5 block ${
              medicamento.loteProximoVencer ? 'text-amber-700' : 'text-slate-800'
            }`}
          >
            {medicamento.validade}
            {medicamento.loteProximoVencer && ' (Atenção)'}
          </span>
        </div>
      </div>
    </div>
  );
};
