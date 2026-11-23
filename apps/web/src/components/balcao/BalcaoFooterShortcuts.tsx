import React from 'react';

interface BalcaoFooterShortcutsProps {
  isEdicaoAtiva?: boolean;
}

export const BalcaoFooterShortcuts: React.FC<BalcaoFooterShortcutsProps> = ({
  isEdicaoAtiva = false,
}) => {
  const atalhos = [
    { tecla: 'F1', rotulo: 'Pesquisar Produto' },
    { tecla: 'F2', rotulo: isEdicaoAtiva ? 'Atualizar Pré-Venda' : 'Salvar Pré-Venda' },
    { tecla: 'F3', rotulo: 'Imprimir Comanda' },
    { tecla: 'F8', rotulo: 'Cancelar Item' },
    { tecla: 'F10', rotulo: 'Identificar Cliente' },
    { tecla: 'Ctrl+D', rotulo: 'Desconto' },
    { tecla: 'F11', rotulo: 'Tela Cheia' },
    { tecla: 'ESC', rotulo: 'Voltar à Pesquisa' },
  ];

  return (
    <footer className="w-full bg-gradient-to-r from-[#0a1e38] via-[#0f2d59] to-[#0a1e38] border-t border-blue-900/80 text-white px-3 sm:px-5 py-2 shadow-md shrink-0 select-none font-sans z-30">
      <div className="max-w-full mx-auto flex items-center justify-start overflow-x-auto scrollbar-none">
        {/* Atalhos organizados horizontalmente em linha */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-nowrap">
          {atalhos.map((item, index) => (
            <React.Fragment key={item.tecla}>
              {index > 0 && (
                <div className="h-3 w-[1px] bg-blue-400/20 hidden md:block" />
              )}
              <div className="flex items-center gap-1.5 py-0.5 px-2 rounded-lg bg-blue-950/60 border border-blue-500/25 shadow-xs shrink-0">
                <kbd className="bg-white/15 text-blue-100 font-mono font-bold text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded border border-white/20 shadow-2xs">
                  {item.tecla}
                </kbd>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-100 tracking-tight whitespace-nowrap">
                  {item.rotulo}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </footer>
  );
};
