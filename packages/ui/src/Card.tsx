import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  destaque?: boolean;
}

export const Card: React.FC<CardProps> = ({ className = '', destaque = false, children, ...props }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm transition-shadow ${
        destaque ? 'ring-2 ring-blue-500/20 shadow-md' : 'hover:shadow-md'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardCabecalho: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 border-b border-slate-100 flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitulo: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`text-base font-semibold text-slate-900 tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescricao: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-xs text-slate-500 mt-0.5 ${className}`} {...props}>
    {children}
  </p>
);

export const CardConteudo: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardRodape: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-4 bg-slate-50/70 rounded-b-xl border-t border-slate-100 flex items-center justify-end gap-2 ${className}`} {...props}>
    {children}
  </div>
);

