import React from 'react';
import {
  X,
  Keyboard,
  RotateCcw,
  Info,
} from 'lucide-react';

interface BalcaoOptionsModalProps {
  aberto: boolean;
  aoReiniciarDadosDemo: () => void;
  aoFechar: () => void;
}

export const BalcaoOptionsModal: React.FC<BalcaoOptionsModalProps> = ({
  aberto,
  aoReiniciarDadosDemo,
  aoFechar,
}) => {
  if (!aberto) return null;

  const atalhos = [
    { tecla: 'F1', descricao: 'Focar campo de pesquisa de medicamentos' },
    { tecla: 'F2', descricao: 'Alternar filtro de produtos com saldo em estoque' },
    { tecla: 'F3', descricao: 'Alternar modo de pesquisa (Nome, Princípio, EAN, Código)' },
    { tecla: 'F4', descricao: 'Abrir fila e histórico de pré-vendas' },
    { tecla: 'F5', descricao: 'Salvar sacola e gerar comanda de pré-venda' },
    { tecla: 'F8', descricao: 'Remover último item adicionado à sacola' },
    { tecla: 'F10', descricao: 'Identificar cliente, CPF e convênio' },
    { tecla: 'F11', descricao: 'Abrir este menu de opções e atalhos' },
    { tecla: 'Ctrl+D', descricao: 'Aplicar desconto percentual ou em reais' },
    { tecla: 'Enter', descricao: '1º Enter: Fixar medicamento selecionado / 2º Enter: Incluir na sacola' },
    { tecla: '← / →', descricao: 'Alternar entre sugestões intercambiáveis (R / S / G)' },
    { tecla: '↑ / ↓', descricao: 'Navegar pelas linhas da tabela de medicamentos' },
    { tecla: 'ESC', descricao: 'Fechar modais abertos ou limpar/destravar pesquisa' },
    { tecla: '3*', descricao: 'Digitar multiplicador antes da busca (Ex: 3*ome inclui 3 unidades)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-800">
        {/* Topo do Modal */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-200" />
            <h3 className="font-black text-base tracking-tight">
              Opções & Guia de Atalhos do Balcão (F11)
            </h3>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Atalhos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-blue-600" />
              Atalhos de Teclado Operacionais
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              {atalhos.map((a, idx) => (
                <div key={idx} className="p-2 flex items-center justify-between gap-3 hover:bg-white">
                  <span className="font-medium text-slate-700">{a.descricao}</span>
                  <kbd className="bg-white border border-slate-300 font-mono font-bold text-blue-900 px-2 py-0.5 rounded text-[11px] shadow-2xs shrink-0">
                    {a.tecla}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Seção de Ações Rápidas de Demonstração */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
            <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-500" />
              Ambiente Demonstrativo Balcão
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Este terminal opera com a base de 56 medicamentos de referência demonstrativos.
              Você pode reiniciar o catálogo e a lista de pré-vendas a qualquer momento.
            </p>

            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja restaurar os dados demonstrativos do catálogo e comandas?')) {
                  aoReiniciarDadosDemo();
                  alert('Dados demonstrativos restaurados com sucesso!');
                  aoFechar();
                }
              }}
              className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
              <span>Restaurar Base Demonstrativa Original</span>
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 p-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={aoFechar}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
          >
            Entendido (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
