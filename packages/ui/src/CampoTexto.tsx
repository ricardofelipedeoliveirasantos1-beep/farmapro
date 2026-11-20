import React from 'react';

export interface CampoTextoProps extends React.InputHTMLAttributes<HTMLInputElement> {
  rotulo?: string;
  dica?: string;
  erro?: string;
  iconeEsquerda?: React.ReactNode;
  iconeDireita?: React.ReactNode;
}

export const CampoTexto = React.forwardRef<HTMLInputElement, CampoTextoProps>(
  ({ rotulo, dica, erro, iconeEsquerda, iconeDireita, className = '', id, ...props }, ref) => {
    const inputId = id || (rotulo ? rotulo.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {rotulo && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 tracking-wide">
            {rotulo}
          </label>
        )}

        <div className="relative rounded-lg shadow-sm">
          {iconeEsquerda && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {iconeEsquerda}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
              iconeEsquerda ? 'pl-10' : ''
            } ${iconeDireita ? 'pr-10' : ''} ${
              erro
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-100'
            } ${className}`}
            {...props}
          />

          {iconeDireita && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              {iconeDireita}
            </div>
          )}
        </div>

        {erro ? (
          <p className="text-xs text-rose-600 font-medium">{erro}</p>
        ) : dica ? (
          <p className="text-xs text-slate-500">{dica}</p>
        ) : null}
      </div>
    );
  },
);

CampoTexto.displayName = 'CampoTexto';

