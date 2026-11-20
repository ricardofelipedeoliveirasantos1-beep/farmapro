import React from 'react';
import { Loader2 } from 'lucide-react';

export interface IndicadorCarregamentoProps {
  tamanho?: 'sm' | 'md' | 'lg';
  texto?: string;
  className?: string;
}

const tamanhosIcone = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const IndicadorCarregamento: React.FC<IndicadorCarregamentoProps> = ({
  tamanho = 'md',
  texto,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center gap-2.5 text-blue-600 ${className}`}>
      <Loader2 className={`animate-spin ${tamanhosIcone[tamanho]}`} />
      {texto && <span className="text-xs font-medium text-slate-600">{texto}</span>}
    </div>
  );
};

export const Esqueleto: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  ...props
}) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 ${className}`}
      {...props}
    />
  );
};

