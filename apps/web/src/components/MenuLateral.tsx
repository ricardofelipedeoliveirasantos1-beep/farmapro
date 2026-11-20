import React from 'react';
import {
  ShoppingCart,
  Coins,
  Receipt,
  Boxes,
  Users,
  ShieldCheck,
  Pill,
  LayoutDashboard,
  Palette,
  FileCode,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@farmapro/ui';
import { useAuth } from '../contexts/AuthContext.js';

export type ModuloNavegacao =
  | 'pdv-balcao'
  | 'operacao-caixa'
  | 'historico-vendas'
  | 'estoque-lotes'
  | 'funcionarios'
  | 'cargos-permissoes'
  | 'catalogo-demo'
  | 'visao-geral'
  | 'design-system'
  | 'contratos';

interface MenuLateralProps {
  moduloAtivo: ModuloNavegacao;
  aoSelecionarModulo: (modulo: ModuloNavegacao) => void;
  abertoMobile: boolean;
  aoFecharMobile: () => void;
  recolhidoDesktop: boolean;
  aoAlternarRecolhidoDesktop: () => void;
}

interface ItemMenu {
  id: ModuloNavegacao;
  titulo: string;
  descricao?: string;
  icone: React.ComponentType<{ className?: string }>;
  permissao?: string;
  badge?: string;
  destaque?: boolean;
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
  recolhidoDesktop,
  aoAlternarRecolhidoDesktop,
}) => {
  const { temPermissao } = useAuth();

  const grupos: GrupoMenu[] = [
    {
      titulo: 'Atendimento & Caixa',
      itens: [
        {
          id: 'pdv-balcao',
          titulo: 'PDV Balcão',
          descricao: 'Vendas rápidas e leitor de código de barras',
          icone: ShoppingCart,
          permissao: 'pdv:acesso',
          destaque: true,
          badge: 'Etapa 06',
        },
        {
          id: 'operacao-caixa',
          titulo: 'Operação de Caixa',
          descricao: 'Abertura, suprimentos, sangrias e fechamento',
          icone: Coins,
          permissao: 'pdv:acesso',
          badge: 'Etapa 06',
        },
        {
          id: 'historico-vendas',
          titulo: 'Histórico & Cancelamentos',
          descricao: 'Cupons emitidos, cancelamentos e vouchers',
          icone: Receipt,
          permissao: 'pdv:acesso',
          badge: 'Etapa 06',
        },
      ],
    },
    {
      titulo: 'Estoque & Rastreabilidade',
      itens: [
        {
          id: 'estoque-lotes',
          titulo: 'Estoque, Lotes & FEFO',
          descricao: 'Painel, lotes, FEFO, inventário e ledger',
          icone: Boxes,
          permissao: 'estoque:visualizar',
          destaque: true,
          badge: 'Etapa 07',
        },
        {
          id: 'catalogo-demo',
          titulo: 'Catálogo de Produtos',
          descricao: 'Consulta de produtos e consulta rápida',
          icone: Pill,
          permissao: 'estoque:visualizar',
        },
      ],
    },
    {
      titulo: 'Gestão de Pessoas & Acessos',
      itens: [
        {
          id: 'funcionarios',
          titulo: 'Colaboradores & PIN',
          descricao: 'Usuários, filiais e PIN de terminal',
          icone: Users,
          permissao: 'usuarios:gerenciar',
        },
        {
          id: 'cargos-permissoes',
          titulo: 'Cargos & Permissões',
          descricao: 'Matriz granular sem cargo Estoquista',
          icone: ShieldCheck,
          permissao: 'cargos:gerenciar',
        },
      ],
    },
    {
      titulo: 'Fundação & Demonstração',
      itens: [
        {
          id: 'visao-geral',
          titulo: 'Visão Geral',
          icone: LayoutDashboard,
        },
        {
          id: 'design-system',
          titulo: 'Design System (Light)',
          icone: Palette,
        },
        {
          id: 'contratos',
          titulo: 'Contratos & Tipos',
          icone: FileCode,
        },
      ],
    },
  ];

  // Filtra itens autorizados com base nas permissões efetivas do usuário
  const gruposFiltrados = grupos
    .map(grupo => ({
      ...grupo,
      itens: grupo.itens.filter(item => {
        if (!item.permissao) return true;
        return temPermissao(item.permissao);
      }),
    }))
    .filter(grupo => grupo.itens.length > 0);

  const renderItem = (item: ItemMenu) => {
    const ativo = moduloAtivo === item.id;
    const Icone = item.icone;

    return (
      <button
        key={item.id}
        type="button"
        title={recolhidoDesktop ? `${item.titulo} — ${item.descricao || ''}` : undefined}
        onClick={() => {
          aoSelecionarModulo(item.id);
          aoFecharMobile();
        }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
          ativo
            ? 'bg-blue-600 text-white shadow-xs font-semibold'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
        } ${recolhidoDesktop ? 'justify-center px-2' : ''}`}
      >
        <Icone
          className={`shrink-0 ${
            ativo ? 'text-white' : item.destaque ? 'text-blue-600' : 'text-slate-500'
          } ${recolhidoDesktop ? 'w-5 h-5' : 'w-4 h-4'}`}
        />

        {!recolhidoDesktop && (
          <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
            <span className="text-xs truncate">{item.titulo}</span>
            {item.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                  ativo ? 'bg-blue-700/80 text-blue-100' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  const conteudoMenu = (
    <div className="h-full flex flex-col bg-white select-none">
      {/* Topo do Menu com Controle de Recolher/Expandir */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        {!recolhidoDesktop && (
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Navegação FarmaPro
          </span>
        )}
        <button
          type="button"
          onClick={aoAlternarRecolhidoDesktop}
          title={recolhidoDesktop ? 'Expandir Menu' : 'Recolher Menu'}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors mx-auto"
        >
          {recolhidoDesktop ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          onClick={aoFecharMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Lista de Módulos por Categoria */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {gruposFiltrados.map((grupo, idx) => (
          <div key={idx} className="space-y-1">
            {!recolhidoDesktop && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {grupo.titulo}
              </p>
            )}
            <div className="space-y-1">{grupo.itens.map(renderItem)}</div>
          </div>
        ))}
      </div>

      {/* Rodapé Informativo */}
      {!recolhidoDesktop && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 rounded-b-xl text-[11px] text-slate-500 flex items-center justify-between">
          <span>Modo Light Ativo</span>
          <Badge variante="sucesso" tamanho="sm">FarmaPro v0.1</Badge>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Gaveta Móvel (Drawer) para Celular e Tablet */}
      {abertoMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Fundo escurecido com clique para fechar */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={aoFecharMobile}
          />
          {/* Gaveta lateral deslizante */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col">
            {conteudoMenu}
          </div>
        </div>
      )}

      {/* 2. Menu Lateral Fixo para Desktop (Recolhível) */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 ${
          recolhidoDesktop ? 'w-20' : 'w-64'
        }`}
      >
        <div className="sticky top-20 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {conteudoMenu}
        </div>
      </aside>
    </>
  );
};
