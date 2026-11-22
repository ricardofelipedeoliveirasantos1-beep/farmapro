import React, { useState, useEffect, useRef } from 'react';
import { MedicamentoDemonstrativo } from '../../services/demoCatalogData.js';
import { MedicinePackagingDisplay } from './MedicinePackagingDisplay.js';
import { ShoppingCart } from 'lucide-react';

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

  // Foca e seleciona o campo de quantidade ao abrir ou alternar o medicamento
  useEffect(() => {
    const qtdValida = quantidadeInicial && quantidadeInicial > 0 ? quantidadeInicial : 1;
    setQuantidade(qtdValida);
    setTimeout(() => {
      inputQtdRef.current?.focus();
      inputQtdRef.current?.select();
    }, 40);
  }, [medicamento.id, quantidadeInicial]);

  const formatPriceNum = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  // Apresentação formatada amigável (conforme Imagem 2 de referência)
  const getApresentacaoFormatada = (desc: string) => {
    const upper = desc.toUpperCase();
    if (upper.includes('GTS') || upper.includes('GOTAS')) {
      const mlMatch = upper.match(/(\d+\s*ML)/);
      const ml = mlMatch && mlMatch[1] ? mlMatch[1] : '20 ml';
      return `Solução Oral – Gotas – ${ml.toLowerCase()}`;
    }
    if (upper.includes('XPE') || upper.includes('XAROPE')) {
      const mlMatch = upper.match(/(\d+\s*ML)/);
      const ml = mlMatch && mlMatch[1] ? mlMatch[1] : '120 ml';
      return `Xarope Oral – ${ml.toLowerCase()}`;
    }
    if (upper.includes('CPR') || upper.includes('COMP')) {
      const cprMatch = upper.match(/(\d+\s*CPR|\d+\s*COMP)/);
      const cpr = cprMatch && cprMatch[1] ? cprMatch[1].replace(/CPR|COMP/, 'comprimidos') : 'comprimidos';
      return `Comprimidos – ${cpr.toLowerCase()}`;
    }
    if (upper.includes('CAPS') || upper.includes('CAP')) {
      const capMatch = upper.match(/(\d+\s*CAPS|\d+\s*CAP)/);
      const cap = capMatch && capMatch[1] ? capMatch[1].replace(/CAPS|CAP/, 'cápsulas') : 'cápsulas';
      return `Cápsulas – ${cap.toLowerCase()}`;
    }
    return 'Embalagem Original – Uso Oral';
  };

  // Cálculo rigoroso do preço anterior (PMC) e percentual de desconto (conforme Imagem 2)
  const precoAnterior =
    medicamento.pmc && medicamento.pmc > medicamento.preco
      ? medicamento.pmc
      : Number((medicamento.preco * 1.15).toFixed(2));

  const percentualDesconto = Math.max(
    0,
    ((precoAnterior - medicamento.preco) / precoAnterior) * 100,
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 select-none overflow-hidden rounded-xl shadow-xs">
      {/* 1. CABEÇALHO AZUL OFICIAL (EXATO À IMAGEM 2) */}
      <div className="bg-[#0052cc] px-4 py-2 text-white flex items-center justify-between rounded-t-xl shrink-0">
        <h3 className="font-sans font-bold text-sm tracking-wide text-white leading-none">
          Medicamento Selecionado
        </h3>

        <button
          type="button"
          onClick={aoDestravar}
          className="bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs px-3 py-1 rounded-md shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
          title="Voltar à lista de pesquisa de medicamentos (ESC)"
        >
          <span>ESC — Voltar à pesquisa</span>
        </button>
      </div>

      {/* 2. CORPO DA FICHA DO MEDICAMENTO (EXATO À IMAGEM 2) */}
      <div className="bg-white rounded-b-xl border border-t-0 border-blue-200/90 p-3 sm:p-4 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* LADO ESQUERDO: IMAGEM REALISTA DO MEDICAMENTO (CAIXA 3D + FRASCO OU BLISTER) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-2 bg-slate-50/50 rounded-xl border border-slate-100">
            <MedicinePackagingDisplay medicamento={medicamento} />
          </div>

          {/* LADO DIREITO: DADOS COMPLETOS E PREÇOS */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-2.5">
            {/* Título Principal em Destaque */}
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                {medicamento.descricao}
              </h2>
            </div>

            {/* Tabela Limpa de Metadados em Linhas */}
            <div className="text-xs space-y-1.5 py-1 border-y border-slate-100">
              <div className="flex items-center text-slate-600">
                <span className="w-28 text-slate-400 font-medium shrink-0">Apresentação:</span>
                <span className="font-semibold text-slate-800">
                  {getApresentacaoFormatada(medicamento.descricao)}
                </span>
              </div>

              <div className="flex items-center text-slate-600">
                <span className="w-28 text-slate-400 font-medium shrink-0">Princípio Ativo:</span>
                <span className="font-semibold text-slate-800">{medicamento.principioAtivo}</span>
              </div>

              <div className="flex items-center text-slate-600">
                <span className="w-28 text-slate-400 font-medium shrink-0">Fabricante:</span>
                <span className="font-semibold text-slate-800">{medicamento.laboratorio}</span>
              </div>

              <div className="flex items-center text-slate-600">
                <span className="w-28 text-slate-400 font-medium shrink-0">Lote:</span>
                <span className="font-mono font-semibold text-slate-800">{medicamento.lote}</span>
              </div>

              <div className="flex items-center text-slate-600">
                <span className="w-28 text-slate-400 font-medium shrink-0">Validade:</span>
                <span className="font-mono font-semibold text-slate-800">{medicamento.validade}</span>
              </div>
            </div>

            {/* 3 Caixas de Preços Horizontais (Preço Anterior, Preço Atual, Desconto) */}
            <div className="grid grid-cols-3 gap-2">
              {/* Caixa 1: Preço Anterior */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2 text-center shadow-2xs">
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block leading-tight">
                  Preço anterior:
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-400 line-through font-mono block mt-0.5">
                  R$ {formatPriceNum(precoAnterior)}
                </span>
              </div>

              {/* Caixa 2: Preço Atual (Destaque Verde) */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2 text-center shadow-2xs">
                <span className="text-[10px] sm:text-[11px] text-emerald-800 font-bold block leading-tight">
                  Preço atual:
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono block mt-0.5">
                  R$ {formatPriceNum(medicamento.preco)}
                </span>
              </div>

              {/* Caixa 3: Desconto (%) */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2 text-center shadow-2xs">
                <span className="text-[10px] sm:text-[11px] text-emerald-800 font-bold block leading-tight">
                  Desconto:
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-700 font-mono block mt-0.5">
                  {percentualDesconto.toFixed(2).replace('.', ',')}%
                </span>
              </div>
            </div>

            {/* Linha de Quantidade e Botão Confirmar e Incluir na Sacola (Enter) */}
            <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
              {/* Campo Quantidade */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-2 py-1.5 shrink-0">
                <span className="text-xs font-bold text-slate-700">Quantidade:</span>
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
                  className="w-12 text-center font-black font-mono text-sm text-slate-900 bg-transparent outline-none"
                  title="Digite a quantidade inteira positiva"
                />
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMudarQuantidade(quantidade + 1)}
                    className="w-4 h-3 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold border border-slate-200 cursor-pointer"
                    title="Aumentar"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMudarQuantidade(quantidade - 1)}
                    className="w-4 h-3 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold border border-slate-200 cursor-pointer"
                    title="Diminuir"
                  >
                    ▼
                  </button>
                </div>
              </div>

              {/* Botão Verde com Carrinho de Compras */}
              <button
                type="button"
                onClick={handleConfirmar}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2"
                title="Confirmar e Incluir na Sacola (ENTER)"
              >
                <ShoppingCart className="w-4 h-4 text-white" />
                <span>Confirmar e Incluir na Sacola (Enter)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
