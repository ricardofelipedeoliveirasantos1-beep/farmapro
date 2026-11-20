import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  largura?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  rodape?: React.ReactNode;
}

const largurasModal = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  aberto,
  aoFechar,
  titulo,
  descricao,
  largura = 'md',
  children,
  rodape,
}) => {
  useEffect(() => {
    const tratarTeclaEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && aberto) {
        aoFechar();
      }
    };

    if (aberto) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', tratarTeclaEsc);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', tratarTeclaEsc);
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Fundo com desfoque suave */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={aoFechar}
        aria-hidden="true"
      />

      {/* Conteúdo do Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className={`relative w-full ${largurasModal[largura]} bg-white rounded-2xl border border-slate-200 shadow-2xl z-10 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200`}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h3 id="modal-titulo" className="text-base font-semibold text-slate-900">
              {titulo}
            </h3>
            {descricao && <p className="text-xs text-slate-500 mt-1">{descricao}</p>}
          </div>
          <button
            onClick={aoFechar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 max-h-[75vh] overflow-y-auto text-slate-700 text-sm leading-relaxed">
          {children}
        </div>

        {/* Rodapé opcional */}
        {rodape && (
          <div className="flex items-center justify-end gap-2 p-4 bg-slate-50/80 border-t border-slate-100">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
};

