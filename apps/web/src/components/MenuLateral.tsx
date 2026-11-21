import React from 'react';
import {
  ShoppingCart,
  Pill,
  LayoutDashboard,
  Settings,
  HelpCircle,
  X,
  User,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { Badge } from '@farmapro/ui';
import { useAuth } from '../contexts/AuthContext.js';

export type ModuloNavegacao =
  | 'portal-operacional'
  | 'balcao-consulta'
  | 'pdv-caixa'
  | 'configuracoes-operacionais'
  | 'ajuda-operacional';

interface MenuLateralProps {
  moduloAtivo: ModuloNavegacao;
  aoSelecionarModulo: (modulo: ModuloNavegacao) => void;
  abertoMobile: boolean;
  aoFecharMobile: () => void;
  recolhidoDesktop?: boolean;
  aoAlternarRecolhidoDesktop?: () => void;
  aoAbrirConfiguracoes?: () => void;
  aoAbrirAjuda?: () => void;
  aoAbrirLogin?: () => void;
}

interface ItemMenu {
  id: ModuloNavegacao;
  titulo: string;
  descricao?: string;
  icone: React.ComponentType<{ className?: string }>;
  permissao?: string;
  badge?: string;
  destaque?: boolean;
  acaoEspecial?: 'configuracoes' | 'ajuda';
}

interface GrupoMenu {
  titulo: string;
  itens: ItemMenu[];
}

export const MenuLateral: React.FC<MenuLateralProps> = ({
  moduloAtivo,
  aoSelecionarModulo,
  abertoMobile,
  aoFecharMobile,
  aoAbrirConfiguracoes,
  aoAbrirAjuda,
  aoAbrirLogin,
}) => {
  const { usuario, cargoAtual, filialAtiva, logout, temPermissao } = useAuth();

  const grupos: GrupoMenu[] = [
    {
      titulo: 'Terminais Operacionais',
      itens: [
        {
          id: 'portal-operacional',
          titulo: 'Início / Seleção Operacional',
          descricao: 'Portal com os dois acessos de trabalho',
          icone: LayoutDashboard,
          destaque: true,
        },
        {
          id: 'balcao-consulta',
          titulo: 'Painel de Venda (Balcão)',
          descricao: 'Consulta, preços, FEFO e emissão de comanda',
          icone: Pill,
          permissao: 'balcao:consultar',
          badge: 'Balcão',
          destaque: true,
        },
        {
          id: 'pdv-caixa',
          titulo: 'PDV (Caixa)',
          descricao: 'Frente de caixa, leitura de comanda e troco dinâmico',
          icone: ShoppingCart,
          permissao: 'pdv:acesso',
          badge: 'Caixa',
          destaque: true,
        },
      ],
    },
    {
      titulo: 'Operação & Suporte',
      itens: [
        {
          id: 'configuracoes-operacionais',
          titulo: 'Configurações Essenciais',
          descricao: 'Filial, terminal, impressora e modo local',
          icone: Settings,
          acaoEspecial: 'configuracoes',
        },
        {
          id: 'ajuda-operacional',
          titulo: 'Ajuda & Atalhos (F1-F10)',
          descricao: 'Guia rápido de atendimento e teclas de atalho',
          icone: HelpCircle,
          acaoEspecial: 'ajuda',
        },
      ],
    },
  ];

  // Filtra itens autorizados com base nas permissões efetivas do usuário
  const gruposFiltrados = grupos
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => {
        if (!item.permissao) return true;
        return temPermissao(item.permissao);
      }),
    }))
    .filter((grupo) => grupo.itens.length > 0);

  const renderItem = (item: ItemMenu) => {
    const ativo = moduloAtivo === item.id;
    const Icone = item.icone;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          if (item.acaoEspecial === 'configuracoes' && aoAbrirConfiguracoes) {
            aoAbrirConfiguracoes();
            aoFecharMobile();
            return;
          }
          if (item.acaoEspecial === 'ajuda' && aoAbrirAjuda) {
            aoAbrirAjuda();
            aoFecharMobile();
            return;
          }
          aoSelecionarModulo(item.id);
          aoFecharMobile();
        }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
          ativo
            ? 'bg-blue-600 text-white shadow-xs font-semibold'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
        }`}
      >
        <Icone
          className={`shrink-0 w-5 h-5 ${
            ativo
              ? 'text-white'
              : item.id === 'balcao-consulta'
              ? 'text-emerald-600'
              : item.id === 'pdv-caixa'
              ? 'text-blue-600'
              : 'text-slate-500'
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs truncate">{item.titulo}</span>
            {item.badge && (
              <Badge
                variante={item.id === 'balcao-consulta' ? 'sucesso' : 'info'}
                tamanho="sm"
              >
                {item.badge}
              </Badge>
            )}
          </div>
          {item.descricao && (
            <p className={`text-[10px] truncate ${ativo ? 'text-blue-100' : 'text-slate-400'}`}>
              {item.descricao}
            </p>
          )}
        </div>
      </button>
    );
  };

  const conteudoMenu = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Cabeçalho do Menu */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
            +
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-base font-black text-slate-900 tracking-tight">FarmaPro</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                SaaS
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[160px]">
              {filialAtiva?.nome || 'Operação Farmacêutica'}
            </span>
          </div>
        </div>

        {/* Botão Fechar no Mobile */}
        <button
          type="button"
          onClick={aoFecharMobile}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Fechar Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Lista de Módulos Operacionais */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {gruposFiltrados.map((grupo) => (
          <div key={grupo.titulo} className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block">
              {grupo.titulo}
            </span>
            <div className="space-y-0.5">{grupo.itens.map(renderItem)}</div>
          </div>
        ))}
      </div>

      {/* Rodapé do Menu com Usuário Conectado */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2">
        <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-slate-800 text-xs block truncate">
              {usuario?.nome || 'Operador'}
            </span>
            <span className="text-[10px] text-slate-500 block truncate">
              {cargoAtual?.nome || 'Colaborador'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {aoAbrirLogin && (
            <button
              type="button"
              onClick={() => {
                aoAbrirLogin();
                aoFecharMobile();
              }}
              className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
            >
              <KeyRound className="w-3 h-3 text-blue-600" />
              <span>Trocar</span>
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="py-1.5 px-2 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Drawer Gaveta Mobile / Modal */}
      {abertoMobile && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={aoFecharMobile}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {conteudoMenu}
          </div>
        </div>
      )}
    </>
  );
};
