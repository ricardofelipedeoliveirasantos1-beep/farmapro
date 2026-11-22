import React from 'react';

export const BalcaoFooterShortcuts: React.FC = () => {
  const atalhos = [
    { tecla: 'F1', rotulo: 'Pesquisar Produto' },
    { tecla: 'F2', rotulo: 'Salvar Pré-Venda' },
    { tecla: 'F3', rotulo: 'Imprimir Comanda' },
    { tecla: 'F8', rotulo: 'Excluir da Sacola' },
    { tecla: 'F10', rotulo: 'Identificar Cliente' },
    { tecla: 'Ctrl+D', rotulo: 'Desconto' },
    { tecla: 'ESC', rotulo: 'Voltar à Pesquisa' },
  ];

  return (
    <footer className="w-full bg-[#1a365d] border-t border-blue-900/60 text-white px-3 py-1.5 shadow-md shrink-0 select-none">
      <div className="max-w-full mx-auto flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {atalhos.map(item => (
            <div
              key={item.tecla}
              className="flex items-center gap-1.5 py-0.5 px-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 transition-colors shrink-0"
            >
              <kbd className="bg-white text-[#1a365d] font-mono font-black text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded shadow-2xs">
                {item.tecla}
              </kbd>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-100 tracking-tight">
                {item.rotulo}
              </span>
            </div>
          ))}
        </div>

        <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-blue-200 font-medium shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>FarmaPro Balcão • PDV Pronto</span>
        </div>
      </div>
    </footer>
  );
};
