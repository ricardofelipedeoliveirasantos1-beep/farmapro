import React from 'react';

export const TabelaContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ${className}`} {...props}>
    <table className="w-full text-left text-sm text-slate-700">{children}</table>
  </div>
);

export const TabelaCabecalho: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <thead className={`bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider ${className}`} {...props}>
    {children}
  </thead>
);

export const TabelaCorpo: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <tbody className={`divide-y divide-slate-100 ${className}`} {...props}>
    {children}
  </tbody>
);

export const TabelaLinha: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <tr className={`transition-colors hover:bg-slate-50/75 ${className}`} {...props}>
    {children}
  </tr>
);

export const TabelaColuna: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <th className={`px-4 py-3.5 ${className}`} {...props}>
    {children}
  </th>
);

export const TabelaCelula: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <td className={`px-4 py-3.5 align-middle ${className}`} {...props}>
    {children}
  </td>
);

