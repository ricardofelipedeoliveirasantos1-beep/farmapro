import React from 'react';
import {
  X,
  Keyboard,
  RotateCcw,
  Info,
  Download,
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
    { tecla: 'F2', descricao: 'Salvar pré-venda e gerar comanda para o Caixa PDV' },
    { tecla: 'F3', descricao: 'Imprimir comprovante da pré-venda salva' },
    { tecla: 'F4', descricao: 'Abrir fila e histórico de pré-vendas' },
    { tecla: 'F8', descricao: 'Selecionar e excluir produto da sacola' },
    { tecla: 'F10', descricao: 'Identificar cliente, CPF e convênio' },
    { tecla: 'F11', descricao: 'Abrir este menu de opções e guia de atalhos' },
    { tecla: 'Ctrl+D', descricao: 'Aplicar desconto percentual ou em reais' },
    { tecla: 'Enter', descricao: '1º Enter: Fixar produto / 2º Enter: Incluir na sacola / Confirmar ações' },
    { tecla: '← / →', descricao: 'Alternar sugestões intercambiáveis (R/S/G) ou SIM/NÃO no F8' },
    { tecla: '↑ / ↓', descricao: 'Navegar linhas da pesquisa ou itens da sacola no modo de exclusão' },
    { tecla: 'ESC', descricao: 'Fechar modais abertos, cancelar exclusão ou destravar produto' },
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

          {/* Seção PWA Windows */}
          <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl space-y-2">
            <h4 className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-600" />
              Aplicativo PWA Windows (Área de Trabalho)
            </h4>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              O FarmaPro Balcão pode ser instalado como um aplicativo independente no Windows:
            </p>
            <ol className="list-decimal list-inside text-[11px] text-blue-900 space-y-1 font-medium pl-1">
              <li>Acesse <span className="font-mono bg-blue-100 px-1 py-0.5 rounded">/balcao</span> no Microsoft Edge ou Google Chrome.</li>
              <li>Clique no ícone de <strong>Instalar</strong> na barra de endereços (ou menu ⋯ &gt; <em>Aplicativos</em> &gt; <em>Instalar este site como um aplicativo</em>).</li>
              <li>Marque <strong>"Criar atalho na Área de Trabalho"</strong> e <strong>"Fixar na Barra de Tarefas"</strong>.</li>
              <li>O Balcão abrirá em janela exclusiva com o ícone oficial FarmaPro, sem barra de navegação.</li>
            </ol>
          </div>

          {/* Seção de Ações Rápidas de Demonstração */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
            <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-500" />
              Dados do Catálogo e Testes
            </h4>
            <p className="text-slate-600 leading-relaxed">
              O catálogo de medicamentos de demonstração contém 56 itens padronizados pela Anvisa
              com estoque, PMC, PBM e sugestões intercambiáveis (Referência, Similar e Genérico).
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja resetar as pré-vendas e reiniciar o catálogo para os padrões de teste?')) {
                  aoReiniciarDadosDemo();
                  aoFechar();
                }
              }}
              className="w-full mt-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
              <span>Reiniciar Dados de Demonstração</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
