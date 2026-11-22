import React, { useState, useEffect } from 'react';
import { CartItemBalcao } from '../../types/balcao.js';
import { AlertTriangle, Trash2, Check, X } from 'lucide-react';

interface ConfirmarExclusaoModalProps {
  aberto: boolean;
  item: CartItemBalcao | null;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

export const ConfirmarExclusaoModal: React.FC<ConfirmarExclusaoModalProps> = ({
  aberto,
  item,
  aoConfirmar,
  aoCancelar,
}) => {
  const [opcao, setOpcao] = useState<'SIM' | 'NAO'>('SIM');

  useEffect(() => {
    if (aberto) {
      setOpcao('SIM');
    }
  }, [aberto, item]);

  useEffect(() => {
    if (!aberto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab') {
        e.preventDefault();
        setOpcao(prev => (prev === 'SIM' ? 'NAO' : 'SIM'));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (opcao === 'SIM') {
          aoConfirmar();
        } else {
          aoCancelar();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        aoCancelar();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto, opcao, aoConfirmar, aoCancelar]);

  if (!aberto || !item) return null;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-exclusao-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-800">
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="modal-exclusao-titulo" className="font-black text-base tracking-tight leading-none uppercase">
                EXCLUIR ITEM DA SACOLA
              </h3>
              <span className="text-[11px] text-red-100 font-medium">
                Atalho de Exclusão (F8)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={aoCancelar}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detalhes do Produto a ser Excluído */}
        <div className="p-4 space-y-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Medicamento Selecionado
                </span>
                <strong className="text-slate-900 text-sm font-black block leading-tight break-words">
                  {item.medication.descricao}
                </strong>
                <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                  {item.medication.laboratorio} • {item.medication.principioAtivo}
                </span>

                {/* Códigos Interno e EAN */}
                <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-slate-600 bg-white border border-slate-200 rounded-lg p-1.5">
                  <span>Cód. interno: <strong className="text-slate-900">{item.medication.codigoInterno}</strong></span>
                  <span>|</span>
                  <span>EAN: <strong className="text-slate-900">{item.medication.ean}</strong></span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center font-mono">
              <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                <span className="text-[9px] text-slate-400 uppercase font-sans block font-semibold">
                  Quantidade
                </span>
                <strong className="text-slate-800 text-xs font-bold">
                  {item.quantity} un
                </strong>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                <span className="text-[9px] text-slate-400 uppercase font-sans block font-semibold">
                  Unitário
                </span>
                <strong className="text-slate-800 text-xs font-bold">
                  {formatBRL(item.unitPrice)}
                </strong>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                <span className="text-[9px] text-slate-400 uppercase font-sans block font-semibold">
                  Total da Linha
                </span>
                <strong className="text-red-700 text-xs font-black">
                  {formatBRL(item.subtotal)}
                </strong>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-700 font-bold text-xs">
            Deseja realmente remover este medicamento da sacola de atendimento?
          </p>

          {/* Botões SIM / NÃO */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={aoConfirmar}
              className={`py-2.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                opcao === 'SIM'
                  ? 'bg-red-600 text-white shadow-md shadow-red-200 ring-2 ring-red-400 ring-offset-2'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>SIM (Enter)</span>
            </button>

            <button
              type="button"
              onClick={aoCancelar}
              className={`py-2.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                opcao === 'NAO'
                  ? 'bg-slate-800 text-white shadow-md ring-2 ring-slate-400 ring-offset-2'
                  : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
              }`}
            >
              <X className="w-4 h-4" />
              <span>NÃO (ESC)</span>
            </button>
          </div>

          {/* Dica de Teclado */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] text-slate-500 text-center font-medium flex items-center justify-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded font-mono font-bold text-slate-700">←</kbd>
              <kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded font-mono font-bold text-slate-700">→</kbd>
              <span>Alternar opção</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-slate-300 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">Enter</kbd>
              <span>Confirmar</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-slate-300 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">ESC</kbd>
              <span>Cancelar</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
