import React from 'react';
import { PreVendaDemo } from '../../types/balcao.js';
import { CheckCircle2, X, Printer, ArrowRight } from 'lucide-react';

interface ComprovantePreVendaModalProps {
  preVenda: PreVendaDemo | null;
  aoFechar: () => void;
}

export const ComprovantePreVendaModal: React.FC<ComprovantePreVendaModalProps> = ({
  preVenda,
  aoFechar,
}) => {
  if (!preVenda) return null;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-800">
        {/* Topo de Sucesso */}
        <div className="bg-emerald-600 p-4 text-white text-center relative">
          <button
            type="button"
            onClick={aoFechar}
            className="absolute right-3 top-3 p-1 rounded-lg hover:bg-emerald-700 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-white">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-black tracking-tight leading-none">
            Pré-Venda Emitida com Sucesso!
          </h3>
          <p className="text-xs text-emerald-100 mt-1">
            Comanda gerada para encaminhamento ao Caixa PDV
          </p>
        </div>

        {/* Corpo do Comprovante */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Caixa de Destaque da Comanda */}
          <div className="bg-slate-50 border-2 border-dashed border-blue-300 rounded-xl p-3 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Número da Comanda / Pré-Venda
            </span>
            <span className="text-3xl font-black font-mono text-blue-700 tracking-tight block">
              {preVenda.code}
            </span>

            {/* Simulação Visual do Código de Barras */}
            <div className="pt-1 flex flex-col items-center justify-center">
              <div className="flex items-center gap-0.5 h-7">
                {[4, 2, 6, 3, 5, 2, 4, 7, 3, 2, 5, 4, 3, 6, 2, 4, 5, 3, 2, 6, 4, 2].map((w, i) => (
                  <div
                    key={i}
                    className="bg-slate-800 h-full"
                    style={{ width: `${w * 1.5}px` }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-slate-400 tracking-widest mt-0.5">
                *{preVenda.code}*
              </span>
            </div>
          </div>

          {/* Dados do Atendimento */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-slate-600">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500">Cliente:</span>
              <strong className="text-slate-800">{preVenda.customer.name}</strong>
            </div>
            {preVenda.customer.cpf && (
              <div className="flex justify-between items-center font-mono text-[11px]">
                <span className="text-slate-500">CPF:</span>
                <span>{preVenda.customer.cpf}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Atendente:</span>
              <span>{preVenda.attendantName}</span>
            </div>
          </div>

          {/* Resumo de Itens e Total */}
          <div className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-1 font-mono text-xs">
            <div className="max-h-24 overflow-y-auto divide-y divide-slate-100 text-[11px]">
              {preVenda.items.map((it, idx) => (
                <div key={idx} className="py-1 flex justify-between">
                  <span className="truncate mr-2 font-sans">{it.quantity}x {it.medication.descricao}</span>
                  <span className="font-bold">{formatBRL(it.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
              <span className="font-sans">Total a Pagar:</span>
              <span className="text-emerald-700">{formatBRL(preVenda.total)}</span>
            </div>
          </div>

          {/* Mensagem Operacional */}
          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-[11px] text-blue-900 leading-snug">
            <strong>Próximo Passo:</strong> Oriente o cliente a se dirigir ao <strong>Caixa PDV</strong> com o código <strong>{preVenda.code}</strong> para conferência dos produtos e pagamento.
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleImprimir}
              className="py-2 px-3 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={aoFechar}
              className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-xs transition-colors flex items-center justify-center gap-1.5"
              autoFocus
            >
              <span>Novo Atendimento (Enter)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
