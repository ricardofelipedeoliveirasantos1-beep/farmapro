import React, { useState, useEffect } from 'react';
import { DiscountMode } from '../../types/balcao.js';
import { Tag, X, Check, Percent, DollarSign, AlertCircle } from 'lucide-react';

interface DiscountModalProps {
  aberto: boolean;
  subtotalBruto: number;
  descontoAtual: number;
  aoAplicarDesconto: (valorTotalDesconto: number) => void;
  aoFechar: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  aberto,
  subtotalBruto,
  descontoAtual,
  aoAplicarDesconto,
  aoFechar,
}) => {
  const [modo, setModo] = useState<DiscountMode>('PCT');
  const [valorInput, setValorInput] = useState<string>('');
  const [erro, setErro] = useState<string>('');

  useEffect(() => {
    if (aberto) {
      if (descontoAtual > 0 && subtotalBruto > 0) {
        const pct = ((descontoAtual / subtotalBruto) * 100).toFixed(1);
        setValorInput(pct);
        setModo('PCT');
      } else {
        setValorInput('');
      }
      setErro('');
    }
  }, [aberto, descontoAtual, subtotalBruto]);

  if (!aberto) return null;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const calcularDesconto = (): number => {
    const num = parseFloat(valorInput.replace(',', '.')) || 0;
    if (num <= 0) return 0;

    if (modo === 'PCT') {
      return (subtotalBruto * num) / 100;
    } else {
      return num;
    }
  };

  const descontoCalculado = calcularDesconto();
  const totalPrevisto = Math.max(0, subtotalBruto - descontoCalculado);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(valorInput.replace(',', '.')) || 0;

    if (num < 0) {
      setErro('O desconto não pode ser negativo.');
      return;
    }

    if (modo === 'PCT' && num > 50) {
      setErro('Limite operacional máximo para o Balcão: 50% de desconto.');
      return;
    }

    if (descontoCalculado > subtotalBruto) {
      setErro('O valor do desconto não pode superar o total dos produtos.');
      return;
    }

    aoAplicarDesconto(descontoCalculado);
    aoFechar();
  };

  const handleRemoverDesconto = () => {
    aoAplicarDesconto(0);
    aoFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden text-slate-800">
        {/* Topo do Modal */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-200" />
            <h3 className="font-black text-base tracking-tight">Aplicar Desconto (Ctrl+D)</h3>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {/* Seletor de Modo: Porcentagem ou Valor Fixo */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setModo('PCT');
                setValorInput('');
                setErro('');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                modo === 'PCT' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Porcentagem (%)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModo('VAL');
                setValorInput('');
                setErro('');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                modo === 'VAL' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Valor em Reais (R$)</span>
            </button>
          </div>

          {/* Campo de Entrada */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {modo === 'PCT' ? 'Percentual de Desconto (%)' : 'Valor do Desconto (R$)'}
            </label>
            <input
              type="text"
              value={valorInput}
              onChange={e => {
                setValorInput(e.target.value);
                setErro('');
              }}
              placeholder={modo === 'PCT' ? 'Ex: 10' : 'Ex: 5,00'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base font-black font-mono text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              autoFocus
            />
          </div>

          {/* Botões de Percentual Rápido */}
          {modo === 'PCT' && (
            <div className="flex items-center gap-1.5">
              {[5, 10, 15, 20].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setValorInput(pct.toString());
                    setErro('');
                  }}
                  className="flex-1 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 text-xs transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}

          {/* Preview Financeiro */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 font-mono text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal Bruto:</span>
              <span>{formatBRL(subtotalBruto)}</span>
            </div>
            <div className="flex justify-between text-red-600 font-bold">
              <span>Desconto:</span>
              <span>- {formatBRL(descontoCalculado)}</span>
            </div>
            <div className="pt-1 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
              <span>Novo Total:</span>
              <span className="text-emerald-700">{formatBRL(totalPrevisto)}</span>
            </div>
          </div>

          {erro && (
            <div className="p-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleRemoverDesconto}
              className="text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg font-bold text-xs transition-colors"
            >
              Remover Desconto
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={aoFechar}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
