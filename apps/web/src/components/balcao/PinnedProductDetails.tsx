import React, { useState, useEffect, useRef } from 'react';
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
  aoConfirmarSacola: (quantidade: number) => void;
  quantidadeInicial: number;
}

export const PinnedProductDetails: React.FC<PinnedProductDetailsProps> = ({
  medicamento,
  aoDestravar,
  aoConfirmarSacola,
  quantidadeInicial,
}) => {
  const [quantidade, setQuantidade] = useState<number>(() =>
    quantidadeInicial && quantidadeInicial > 0 ? quantidadeInicial : 1,
  );
  const inputQtdRef = useRef<HTMLInputElement>(null);

  // Foca e seleciona o campo de quantidade ao fixar ou alternar o medicamento
  useEffect(() => {
    const qtdValida = quantidadeInicial && quantidadeInicial > 0 ? quantidadeInicial : 1;
    setQuantidade(qtdValida);
    setTimeout(() => {
      inputQtdRef.current?.focus();
      inputQtdRef.current?.select();
    }, 40);
  }, [medicamento.id, quantidadeInicial]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleMudarQuantidade = (novaQtd: number) => {
    if (novaQtd >= 1) {
      setQuantidade(Math.floor(novaQtd));
    }
  };

  const handleConfirmar = () => {
    const qtdFinal = Math.max(1, Math.floor(quantidade || 1));
    aoConfirmarSacola(qtdFinal);
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

  const totalCalculado = medicamento.preco * (quantidade || 1);

  return (
    <div className="bg-gradient-to-r from-blue-50/70 via-white to-blue-50/40 rounded-xl border border-blue-200/90 p-3.5 shadow-sm space-y-2.5">
      {/* Topo do Produto Fixado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-blue-100 pb-2.5">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                medicamento.tipo === 'R'
                  ? 'bg-blue-600 text-white'
                  : medicamento.tipo === 'S'
                  ? 'bg-amber-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {getTipoDesc(medicamento.tipo)}
            </span>

            <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">
              {medicamento.laboratorio}
            </span>

            <span className="text-[10px] font-mono text-slate-500 font-semibold">
              EAN: {medicamento.ean} • Cód: {medicamento.codigoInterno}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
            {medicamento.descricao}
          </h3>
        </div>

        {/* CONTROLE DE QUANTIDADE ANTES DA INCLUSÃO E CONFIRMAÇÃO */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 bg-white border border-blue-200 p-2 rounded-xl shadow-xs">
          {/* Preço Unitário */}
          <div className="text-right pr-1 border-r border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">
              Unitário
            </span>
            <span className="text-base font-black text-slate-800 font-mono">
              {formatBRL(medicamento.preco)}
            </span>
          </div>

          {/* Campo de Quantidade Interativo */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-lg p-0.5">
            <span className="text-[10px] font-black text-blue-900 uppercase pl-1.5 font-sans">
              Qtd:
            </span>
            <button
              type="button"
              onClick={() => handleMudarQuantidade(quantidade - 1)}
              className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-black flex items-center justify-center text-xs transition-colors cursor-pointer"
              title="Diminuir quantidade"
            >
              -
            </button>
            <input
              ref={inputQtdRef}
              type="number"
              min="1"
              step="1"
              value={quantidade}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) {
                  setQuantidade(val);
                } else if (e.target.value === '') {
                  setQuantidade(1);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmar();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  aoDestravar();
                }
              }}
              className="w-12 text-center font-black font-mono text-sm text-blue-900 bg-transparent outline-none"
              title="Digite a quantidade desejada"
            />
            <button
              type="button"
              onClick={() => handleMudarQuantidade(quantidade + 1)}
              className="w-6 h-6 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-black flex items-center justify-center text-xs transition-colors cursor-pointer"
              title="Aumentar quantidade"
            >
              +
            </button>
          </div>

          {/* Subtotal da Linha Calculado */}
          <div className="text-right px-1">
            <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">
              Total Linha
            </span>
            <span className="text-lg font-black text-emerald-700 font-mono leading-tight">
              {formatBRL(totalCalculado)}
            </span>
          </div>

          {/* Botão de Adicionar à Sacola */}
          <button
            type="button"
            onClick={handleConfirmar}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-3.5 py-2 rounded-lg shadow-xs transition-all cursor-pointer text-xs"
            title="Confirmar e incluir na sacola (ENTER)"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Adicionar (Enter)</span>
          </button>

          {/* Botão Destravar */}
          <button
            type="button"
            onClick={aoDestravar}
            className="p-2 border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Destravar produto e voltar à pesquisa (ESC)"
          >
            <Unlock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grade Compacta de Informações Farmacêuticas e Logísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        {/* 1. Princípio Ativo */}
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[9px] text-slate-400 font-bold block uppercase">Princípio Ativo</span>
          <span className="font-bold text-slate-800 line-clamp-1 mt-0.5 text-[11px]">
            {medicamento.principioAtivo}
          </span>
        </div>

        {/* 2. Armazenamento */}
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[9px] text-slate-400 font-bold block uppercase flex items-center gap-1">
            <MapPin className="w-3 h-3 text-blue-500" /> Armazenamento
          </span>
          <span className="font-bold text-slate-800 mt-0.5 block text-[11px] truncate">{medicamento.armazenamento}</span>
        </div>

        {/* 3. PMC */}
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[9px] text-slate-400 font-bold block uppercase">PMC Oficial</span>
          <span className="font-bold text-slate-700 font-mono mt-0.5 block text-[11px]">
            {formatBRL(medicamento.pmc)}
          </span>
        </div>

        {/* 4. Programas Credenciados */}
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[9px] text-slate-400 font-bold block uppercase flex items-center gap-1">
            <FileCheck2 className="w-3 h-3 text-emerald-500" /> Programas
          </span>
          <span className="font-bold text-slate-800 mt-0.5 block text-[11px] truncate">
            {medicamento.pbm ? 'PBM / Desconto Lab' : medicamento.farmaciaPopular ? 'Farmácia Popular' : 'Particular'}
          </span>
        </div>

        {/* 5. Lote */}
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[9px] text-slate-400 font-bold block uppercase">Lote FEFO</span>
          <span className="font-bold text-slate-800 font-mono mt-0.5 block text-[11px]">{medicamento.lote}</span>
        </div>

        {/* 6. Validade */}
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[9px] text-slate-400 font-bold block uppercase flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-500" /> Validade
          </span>
          <span
            className={`font-black font-mono mt-0.5 block text-[11px] ${
              medicamento.loteProximoVencer ? 'text-amber-700' : 'text-slate-800'
            }`}
          >
            {medicamento.validade}
          </span>
        </div>
      </div>
    </div>
  );
};
