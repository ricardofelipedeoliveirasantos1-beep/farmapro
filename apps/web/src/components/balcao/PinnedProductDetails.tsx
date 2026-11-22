import React, { useState, useEffect, useRef } from 'react';
import { MedicamentoDemonstrativo } from '../../services/demoCatalogData.js';
import {
  MapPin,
  FileCheck2,
  Calendar,
  PlusCircle,
  ArrowLeft,
  Pill,
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

  const getFormatoBadge = (desc: string) => {
    const upper = desc.toUpperCase();
    if (upper.includes('GTS') || upper.includes('GOTAS')) return 'FRASCO CONTA-GOTAS';
    if (upper.includes('CPR') || upper.includes('COMP')) return 'BLISTER COMPRIMIDOS';
    if (upper.includes('CAPS') || upper.includes('CAP')) return 'BLISTER CÁPSULAS';
    if (upper.includes('AMP') || upper.includes('INJ')) return 'AMPOLA INJETÁVEL';
    if (upper.includes('POM') || upper.includes('CREM')) return 'BISNAGA DERMATOLÓGICA';
    return 'EMBALAGEM ORIGINAL';
  };

  const totalCalculado = medicamento.preco * (quantidade || 1);

  return (
    <div className="bg-white rounded-xl border border-blue-200/90 p-3 sm:p-3.5 shadow-sm select-none flex flex-col md:flex-row gap-3.5 flex-1 min-h-0 overflow-hidden">
      {/* 1. FOTOGRAFIA / REPRESENTAÇÃO VISUAL DA EMBALAGEM À ESQUERDA (SEÇÃO 1) */}
      <div className="w-full md:w-40 lg:w-44 shrink-0 bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 flex flex-col items-center justify-between shadow-2xs">
        {/* Formato / Apresentação no topo da foto */}
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono block text-center">
          {getFormatoBadge(medicamento.descricao)}
        </span>

        {/* Embalagem Farmacêutica em Destaque */}
        <div className="my-auto py-1 flex flex-col items-center justify-center">
          <div
            className={`w-28 h-32 rounded-xl border-2 p-2 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all ${
              medicamento.tipo === 'R'
                ? 'bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 border-blue-400 text-white'
                : medicamento.tipo === 'S'
                ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-orange-900 border-amber-300 text-white'
                : 'bg-white border-amber-400 text-slate-900 shadow-md'
            }`}
          >
            {/* Faixa Amarela ANVISA com 'G' quando for Genérico */}
            {medicamento.tipo === 'G' && (
              <div className="absolute top-0 left-0 right-0 bg-amber-400 text-slate-950 px-1 py-0.5 flex items-center justify-between border-b border-amber-500">
                <span className="font-black text-xs leading-none">G</span>
                <span className="text-[7px] font-black uppercase tracking-tighter">GENÉRICO</span>
                <span className="text-[7px] font-mono font-bold">L.9787</span>
              </div>
            )}

            {/* Tarja do Medicamento */}
            <div
              className={`mt-3 text-[7px] font-black uppercase px-1 py-0.5 rounded text-center tracking-tighter shadow-2xs ${
                medicamento.tipo === 'G'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              VENDA SOB PRESCRIÇÃO
            </div>

            {/* Ícone e Nome na Embalagem */}
            <div className="text-center my-auto">
              <Pill
                className={`w-5 h-5 mx-auto mb-0.5 ${
                  medicamento.tipo === 'G' ? 'text-amber-500' : 'text-white'
                }`}
              />
              <span
                className={`text-[9px] font-black uppercase leading-tight line-clamp-2 block ${
                  medicamento.tipo === 'G' ? 'text-slate-900' : 'text-white'
                }`}
              >
                {medicamento.descricao.split(' ')[0]}
              </span>
            </div>

            {/* Selo do Laboratório */}
            <div
              className={`text-[8px] font-bold text-center truncate ${
                medicamento.tipo === 'G' ? 'text-slate-600' : 'text-white/80'
              }`}
            >
              {medicamento.laboratorio}
            </div>
          </div>
        </div>

        {/* Legenda da Fotografia */}
        <span className="text-[9px] text-slate-400 font-medium text-center block leading-tight">
          Foto Ilustrativa • FEFO
        </span>
      </div>

      {/* 2. DADOS COMPLETOS DO MEDICAMENTO À DIREITA (SEÇÃO 1) */}
      <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
        {/* Topo: Badges de Classificação, Laboratório, Códigos e Botão Voltar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide text-white ${
                medicamento.tipo === 'R'
                  ? 'bg-blue-600'
                  : medicamento.tipo === 'S'
                  ? 'bg-amber-600'
                  : 'bg-emerald-600'
              }`}
            >
              {getTipoDesc(medicamento.tipo)}
            </span>

            <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
              {medicamento.laboratorio}
            </span>

            <span className="text-[10px] font-mono text-slate-500 font-semibold">
              Cód: <strong>{medicamento.codigoInterno}</strong> • EAN: <strong>{medicamento.ean}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={aoDestravar}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Voltar à lista de resultados da pesquisa (ESC)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ESC Voltar</span>
          </button>
        </div>

        {/* Nome Comercial e Apresentação */}
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
            {medicamento.descricao}
          </h2>
          <p className="text-xs font-semibold text-blue-900 flex items-center gap-1 mt-0.5">
            <span>Princípio Ativo:</span>
            <strong className="underline underline-offset-2">{medicamento.principioAtivo}</strong>
          </p>
        </div>

        {/* Metadados Técnicos e Logísticos (6 Blocos) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-xs">
          {/* 1. Princípio Ativo */}
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Princípio</span>
            <span className="font-bold text-slate-800 truncate block mt-0.5 text-[11px]">
              {medicamento.principioAtivo}
            </span>
          </div>

          {/* 2. Armazenamento */}
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-blue-500" /> Local
            </span>
            <span className="font-bold text-slate-800 truncate block mt-0.5 text-[11px]">
              {medicamento.armazenamento}
            </span>
          </div>

          {/* 3. PMC Oficial */}
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">PMC Oficial</span>
            <span className="font-bold text-slate-700 font-mono truncate block mt-0.5 text-[11px]">
              {formatBRL(medicamento.pmc)}
            </span>
          </div>

          {/* 4. Programas */}
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none flex items-center gap-1">
              <FileCheck2 className="w-2.5 h-2.5 text-emerald-500" /> Programas
            </span>
            <span className="font-bold text-slate-800 truncate block mt-0.5 text-[11px]">
              {medicamento.pbm ? 'PBM' : medicamento.farmaciaPopular ? 'Popular' : 'Particular'}
            </span>
          </div>

          {/* 5. Lote FEFO */}
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Lote FEFO</span>
            <span className="font-bold text-slate-800 font-mono truncate block mt-0.5 text-[11px]">
              {medicamento.lote}
            </span>
          </div>

          {/* 6. Validade */}
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-amber-500" /> Validade
            </span>
            <span
              className={`font-black font-mono truncate block mt-0.5 text-[11px] ${
                medicamento.loteProximoVencer ? 'text-amber-700' : 'text-slate-800'
              }`}
            >
              {medicamento.validade}
            </span>
          </div>
        </div>

        {/* Preços, Quantidade e Botão de Inclusão */}
        <div className="flex items-center justify-between gap-2.5 pt-1.5 border-t border-slate-200/80 flex-wrap">
          {/* Preços */}
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">
                Preço Unitário
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 font-mono leading-tight">
                {formatBRL(medicamento.preco)}
              </span>
            </div>

            <div className="pl-3 border-l border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">
                Total Linha
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-700 font-mono leading-tight">
                {formatBRL(totalCalculado)}
              </span>
            </div>
          </div>

          {/* Controle de Quantidade e Ação */}
          <div className="flex items-center gap-2">
            {/* Campo Qtd */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-lg p-0.5">
              <span className="text-[10px] font-black text-blue-900 uppercase pl-1.5">Qtd:</span>
              <button
                type="button"
                onClick={() => handleMudarQuantidade(quantidade - 1)}
                className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center text-xs transition-colors cursor-pointer"
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
                title="Digite a quantidade inteira positiva"
              />
              <button
                type="button"
                onClick={() => handleMudarQuantidade(quantidade + 1)}
                className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center text-xs transition-colors cursor-pointer"
                title="Aumentar quantidade"
              >
                +
              </button>
            </div>

            {/* Botão de Inclusão */}
            <button
              type="button"
              onClick={handleConfirmar}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer text-xs sm:text-sm"
              title="Confirmar e incluir na sacola (ENTER)"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Adicionar (Enter)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
