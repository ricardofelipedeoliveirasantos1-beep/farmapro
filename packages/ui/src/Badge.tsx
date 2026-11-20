import React from 'react';

export type VarianteBadge = 'sucesso' | 'aviso' | 'perigo' | 'info' | 'neutro';
export type TamanhoBadge = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variante?: VarianteBadge;
  tamanho?: TamanhoBadge;
  ponto?: boolean;
}

const estilosVariantes: Record<VarianteBadge, { fundo: string; texto: string; ponto: string }> = {
  sucesso: {
    fundo: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    texto: 'text-emerald-700',
    ponto: 'bg-emerald-500',
  },
  aviso: {
    fundo: 'bg-amber-50 border-amber-200 text-amber-700',
    texto: 'text-amber-700',
    ponto: 'bg-amber-500',
  },
  perigo: {
    fundo: 'bg-rose-50 border-rose-200 text-rose-700',
    texto: 'text-rose-700',
    ponto: 'bg-rose-500',
  },
  info: {
    fundo: 'bg-blue-50 border-blue-200 text-blue-700',
    texto: 'text-blue-700',
    ponto: 'bg-blue-500',
  },
  neutro: {
    fundo: 'bg-slate-100 border-slate-200 text-slate-700',
    texto: 'text-slate-700',
    ponto: 'bg-slate-400',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variante = 'neutro',
  tamanho = 'md',
  ponto = false,
  children,
  ...props
}) => {
  const estilo = estilosVariantes[variante];
  const classeTamanho = tamanho === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${estilo.fundo} ${classeTamanho} ${className}`}
      {...props}
    >
      {ponto && <span className={`w-1.5 h-1.5 rounded-full ${estilo.ponto}`} />}
      {children}
    </span>
  );
};

