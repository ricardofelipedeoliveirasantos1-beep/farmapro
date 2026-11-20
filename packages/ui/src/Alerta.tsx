import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type TipoAlerta = 'sucesso' | 'aviso' | 'erro' | 'info';

export interface AlertaProps extends React.HTMLAttributes<HTMLDivElement> {
  tipo?: TipoAlerta;
  titulo?: string;
  aoFechar?: () => void;
}

const icones: Record<TipoAlerta, React.ReactNode> = {
  sucesso: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
  aviso: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
  erro: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
};

const estilosAlerta: Record<TipoAlerta, string> = {
  sucesso: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
  aviso: 'bg-amber-50/80 border-amber-200 text-amber-900',
  erro: 'bg-rose-50/80 border-rose-200 text-rose-900',
  info: 'bg-blue-50/80 border-blue-200 text-blue-900',
};

export const Alerta: React.FC<AlertaProps> = ({
  tipo = 'info',
  titulo,
  aoFechar,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm transition-all ${estilosAlerta[tipo]} ${className}`}
      {...props}
    >
      <div className="mt-0.5">{icones[tipo]}</div>
      <div className="flex-1 space-y-0.5">
        {titulo && <h5 className="font-semibold tracking-tight">{titulo}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {aoFechar && (
        <button
          onClick={aoFechar}
          className="p-1 rounded-md hover:bg-black/5 text-current opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Fechar alerta"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

