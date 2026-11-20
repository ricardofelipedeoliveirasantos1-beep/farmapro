import React from 'react';
import { Loader2 } from 'lucide-react';

export type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'outline' | 'fantasma';
export type TamanhoBotao = 'sm' | 'md' | 'lg';

export interface BotaoProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  carregando?: boolean;
  iconeEsquerda?: React.ReactNode;
  iconeDireita?: React.ReactNode;
}

const estilosVariantes: Record<VarianteBotao, string> = {
  primario:
    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm focus:ring-blue-500',
  secundario:
    'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 focus:ring-slate-400',
  perigo:
    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm focus:ring-rose-500',
  outline:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:ring-blue-500',
  fantasma:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400',
};

const estilosTamanhos: Record<TamanhoBotao, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

export const Botao = React.forwardRef<HTMLButtonElement, BotaoProps>(
  (
    {
      className = '',
      variante = 'primario',
      tamanho = 'md',
      carregando = false,
      disabled,
      iconeEsquerda,
      iconeDireita,
      children,
      ...props
    },
    ref,
  ) => {
    const estaDesabilitado = disabled || carregando;

    return (
      <button
        ref={ref}
        disabled={estaDesabilitado}
        className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none ${
          estilosVariantes[variante]
        } ${estilosTamanhos[tamanho]} ${
          estaDesabilitado ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        } ${className}`}
        {...props}
      >
        {carregando ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          iconeEsquerda && <span className="inline-flex shrink-0">{iconeEsquerda}</span>
        )}
        <span>{children}</span>
        {!carregando && iconeDireita && (
          <span className="inline-flex shrink-0">{iconeDireita}</span>
        )}
      </button>
    );
  },
);

Botao.displayName = 'Botao';

