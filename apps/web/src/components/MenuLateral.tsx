import React, { useState } from 'react';
import {
  Home,
  ShoppingCart,
  Tag,
  Settings,
  HelpCircle,
  Power,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

export type ModuloNavegacao =
  | 'portal-operacional'
  | 'balcao-consulta'
  | 'pdv-caixa';

interface MenuLateralProps {
  moduloAtivo: ModuloNavegacao;
  aoSelecionarModulo: (modulo: ModuloNavegacao) => void;
  abertoMobile: boolean;
  aoFecharMobile: () => void;
  aoAcessarCaixa: () => void;
  aoAcessarBalcao: () => void;
  aoAbrirConfiguracoes?: (subitem?: string) => void;
  aoAbrirAjuda?: (subitem?: string) => void;
}

export const MenuLateral: React.FC<MenuLateralProps> = ({
  moduloAtivo,
  aoSelecionarModulo,
  abertoMobile,
  aoFecharMobile,
  aoAcessarCaixa,
  aoAcessarBalcao,
  aoAbrirConfiguracoes,
  aoAbrirAjuda,
}) => {
  const { logout } = useAuth();

  // Estados de expansão das seções do menu (conforme imagem de referência)
  const [configuracoesAberto, setConfiguracoesAberto] = useState<boolean>(true);
  const [ajudaAberto, setAjudaAberto] = useState<boolean>(true);

  const subitensConfiguracoes = [
    'Parâmetros da Loja',
    'Usuários e Permissões',
    'Dispositivos / Terminais',
    'Impressoras',
    'Operação de Caixa',
  ];

  const subitensAjuda = [
    'Manual do Sistema',
    'Atalhos do Teclado',
    'Suporte Online',
    'Sobre o FarmaPro',
  ];

  const handleSair = () => {
    if (confirm('Deseja realmente sair do sistema FarmaPro?')) {
      logout();
    }
  };

  const conteudoMenu = (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-2xl border border-slate-200 select-none overflow-hidden text-slate-800">
      {/* 1. TOPO AZUL COM LOGOMARCA E BOTÃO FECHAR (EXATO À REFERÊNCIA) */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 p-3.5 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/60 border border-white/20 text-white flex items-center justify-center font-black text-lg shadow-2xs">
            +
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-base font-black tracking-tight">FarmaPro</span>
              <span className="text-[10px] bg-white/20 text-white font-bold px-1.5 py-0.5 rounded">
                SaaS
              </span>
            </div>
            <span className="text-[10px] text-blue-100 font-medium block">
              Gestão Farmacêutica Inteligente
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={aoFecharMobile}
          className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          title="Fechar Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. ITENS PRINCIPAIS DE NAVEGAÇÃO */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs">
        {/* Item: Início */}
        <button
          type="button"
          onClick={() => {
            aoSelecionarModulo('portal-operacional');
            aoFecharMobile();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all ${
            moduloAtivo === 'portal-operacional'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Início</span>
        </button>

        {/* Item: PDV – Caixa (F2) */}
        <button
          type="button"
          onClick={() => {
            aoAcessarCaixa();
            aoFecharMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-slate-800 hover:bg-slate-100 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-4 h-4 text-slate-700 group-hover:text-blue-600 transition-colors" />
            <span>PDV – Caixa</span>
          </div>
          <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-md font-mono">
            F2
          </span>
        </button>

        {/* Item: Painel de Venda (F3) */}
        <button
          type="button"
          onClick={() => {
            aoAcessarBalcao();
            aoFecharMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-slate-800 hover:bg-slate-100 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-slate-700 group-hover:text-emerald-600 transition-colors" />
            <span>Painel de Venda</span>
          </div>
          <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-md font-mono">
            F3
          </span>
        </button>

        {/* Seção Expansível: Configurações */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setConfiguracoesAberto((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 text-slate-800 font-bold hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-700" />
              <span>Configurações</span>
            </div>
            {configuracoesAberto ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {configuracoesAberto && (
            <div className="pl-6 pr-2 py-1 space-y-1">
              {subitensConfiguracoes.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    if (aoAbrirConfiguracoes) aoAbrirConfiguracoes(sub);
                    aoFecharMobile();
                  }}
                  className="w-full flex items-center gap-2 py-1 px-2 text-[11px] text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  <span>{sub}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Seção Expansível: Ajuda e Suporte */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setAjudaAberto((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 text-slate-800 font-bold hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-700" />
              <span>Ajuda e Suporte</span>
            </div>
            {ajudaAberto ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {ajudaAberto && (
            <div className="pl-6 pr-2 py-1 space-y-1">
              {subitensAjuda.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    if (aoAbrirAjuda) aoAbrirAjuda(sub);
                    aoFecharMobile();
                  }}
                  className="w-full flex items-center gap-2 py-1 px-2 text-[11px] text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  <span>{sub}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. RODAPÉ: SAIR DO SISTEMA (EM VERMELHO COM ÍCONE POWER) */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <button
          type="button"
          onClick={handleSair}
          className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs transition-colors"
        >
          <Power className="w-4 h-4 text-red-600" />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Menu Drawer Sobreposto (Posicionado exatamente à esquerda) */}
      {abertoMobile && (
        <div className="fixed inset-0 z-50 flex pointer-events-auto">
          {/* Fundo escuro sutil para fechar ao clicar fora */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
            onClick={aoFecharMobile}
          />
          {/* Caixa do Menu */}
          <div className="relative z-10 w-72 max-w-[85vw] h-[calc(100vh-2rem)] my-auto ml-4 shadow-2xl animate-in slide-in-from-left duration-200">
            {conteudoMenu}
          </div>
        </div>
      )}
    </>
  );
};
