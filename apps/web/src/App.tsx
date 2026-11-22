import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext.js';
import { PortalOperacionalScreen } from './pages/PortalOperacionalScreen.js';
import { PdvCaixaScreen } from './pages/PdvCaixaScreen.js';
import { BalcaoConsultaScreen } from './pages/BalcaoConsultaScreen.js';
import { LoginModal } from './pages/LoginModal.js';
import { SelecionarTenantModal } from './pages/SelecionarTenantModal.js';
import { LoginOperacionalModal } from './components/LoginOperacionalModal.js';
import { ConfiguracoesOperacionaisModal } from './components/ConfiguracoesOperacionaisModal.js';
import { AjudaOperacionalModal } from './components/AjudaOperacionalModal.js';
import { PwaUpdatePrompt } from './components/pwa/PwaUpdatePrompt.js';
import {
  ModalAtalhosOperacionais,
  TipoAtalhoOperacional,
} from './components/ModalAtalhosOperacionais.js';
import { MenuLateral, ModuloNavegacao } from './components/MenuLateral.js';

// Detecção inicial da rota via URL para suportar acesso direto aos ambientes independentes
const obterModuloInicial = (): ModuloNavegacao => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.toLowerCase();
    const host = window.location.hostname.toLowerCase();
    if (path.startsWith('/balcao') || host.startsWith('balcao')) return 'balcao-consulta';
    if (path.startsWith('/pdv') || path.startsWith('/caixa') || host.startsWith('pdv')) return 'pdv-caixa';
  }
  return 'portal-operacional';
};

export const App: React.FC = () => {
  const { temPermissao, usuario, logout, trocarUsuario } = useAuth();

  // Navegação Global FarmaPro — Exclusivamente os dois ambientes operacionais
  const [moduloAtivo, setModuloAtivo] = useState<ModuloNavegacao>(obterModuloInicial);
  const [menuAberto, setMenuAberto] = useState<boolean>(() => obterModuloInicial() === 'portal-operacional');

  // Detecção de PWA Standalone (Execução como Aplicativo Windows Instalado)
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        window.location.search.includes('source=pwa')
      );
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Sincronização da URL com o ambiente ativo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const targetPath =
        moduloAtivo === 'balcao-consulta'
          ? '/balcao'
          : moduloAtivo === 'pdv-caixa'
            ? '/pdv'
            : '/';
      if (window.location.pathname !== targetPath) {
        window.history.replaceState(null, '', targetPath);
      }
    }
  }, [moduloAtivo]);

  // Modais de Autenticação Operacional (Matrícula + Senha Numérica 6 Dígitos)
  const [loginOperacional, setLoginOperacional] = useState<{
    aberto: boolean;
    estacao: 'CAIXA' | 'BALCAO';
  }>({
    aberto: false,
    estacao: 'CAIXA',
  });

  // Modal de Atalhos Operacionais (Medicamentos, Estoque, Pré-vendas, Clientes, Relatórios)
  const [atalhoAtivo, setAtalhoAtivo] = useState<TipoAtalhoOperacional>(null);

  // Modais de Sessão Geral, Filiais, Configurações e Ajuda
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [modalTenantAberto, setModalTenantAberto] = useState(false);
  const [modalConfiguracoesAberto, setModalConfiguracoesAberto] = useState(false);
  const [modalAjudaAberto, setModalAjudaAberto] = useState(false);

  // Verificação de permissões do Balcão
  const temAcessoBalcao = Boolean(
    usuario &&
      (temPermissao('balcao:consultar') ||
        temPermissao('pre_venda:criar') ||
        temPermissao('pdv:acesso'))
  );

  // Proteção da rota /balcao para abertura direta no PWA Windows
  useEffect(() => {
    if (moduloAtivo === 'balcao-consulta' && !temAcessoBalcao) {
      setLoginOperacional({ aberto: true, estacao: 'BALCAO' });
    }
  }, [moduloAtivo, temAcessoBalcao]);

  // Acesso ao Caixa (F2): se já autenticado com permissão, vai direto; caso contrário, abre login operacional
  const handleAcessarCaixa = () => {
    if (usuario && temPermissao('pdv:acesso')) {
      setModuloAtivo('pdv-caixa');
      setMenuAberto(false);
    } else {
      setLoginOperacional({ aberto: true, estacao: 'CAIXA' });
    }
  };

  // Acesso ao Balcão (F3): se já autenticado com permissão, vai direto; caso contrário, abre login operacional
  const handleAcessarBalcao = () => {
    if (temAcessoBalcao) {
      setModuloAtivo('balcao-consulta');
      setMenuAberto(false);
    } else {
      setLoginOperacional({ aberto: true, estacao: 'BALCAO' });
    }
  };

  // Sucesso na Autenticação por Matrícula
  const handleSucessoLoginOperacional = (dados: {
    estacao: 'CAIXA' | 'BALCAO';
    usuario: { id: string; nome: string; matricula: string };
  }) => {
    setLoginOperacional({ aberto: false, estacao: 'CAIXA' });
    if (dados.estacao === 'CAIXA') {
      setModuloAtivo('pdv-caixa');
    } else {
      setModuloAtivo('balcao-consulta');
    }
    setMenuAberto(false);
  };

  return (
    <>
      {/* 0. GERENCIADOR PWA WINDOWS (ATUALIZAÇÕES E INSTALAÇÃO) */}
      <PwaUpdatePrompt />

      {/* 1. TELA INICIAL: PORTAL OPERACIONAL (EXATO À REFERÊNCIA VISUAL) */}
      {moduloAtivo === 'portal-operacional' && (
        <PortalOperacionalScreen
          aoAcessarCaixa={handleAcessarCaixa}
          aoAcessarBalcao={handleAcessarBalcao}
          aoAbrirMenu={() => setMenuAberto(true)}
          aoTrocarFilial={() => setModalTenantAberto(true)}
          aoSair={() => {
            if (confirm('Deseja realmente sair do sistema FarmaPro?')) {
              logout();
            }
          }}
        />
      )}

      {/* 2. AMBIENTE OPERACIONAL: PDV — CAIXA (EXCLUSIVO) */}
      {moduloAtivo === 'pdv-caixa' && (
        <PdvCaixaScreen
          aoVoltarPortal={() => setModuloAtivo('portal-operacional')}
          aoAbrirMenu={() => setMenuAberto(true)}
        />
      )}

      {/* 3. AMBIENTE OPERACIONAL: PAINEL DE VENDA — BALCÃO & CONSULTA (EXCLUSIVO) */}
      {moduloAtivo === 'balcao-consulta' && (
        temAcessoBalcao ? (
          <BalcaoConsultaScreen
            aoVoltarPortal={isStandalone ? undefined : () => setModuloAtivo('portal-operacional')}
            aoAbrirMenu={() => setMenuAberto(true)}
            aoTrocarUsuario={() => {
              trocarUsuario();
              setLoginOperacional({ aberto: true, estacao: 'BALCAO' });
            }}
            aoSair={() => {
              if (confirm('Deseja realmente encerrar a sessão e sair do FarmaPro Balcão?')) {
                logout();
                if (!isStandalone) {
                  setModuloAtivo('portal-operacional');
                } else {
                  setLoginOperacional({ aberto: true, estacao: 'BALCAO' });
                }
              }
            }}
          />
        ) : (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-3xl shadow-xl mb-4">
              +
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">FarmaPro Balcão</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-sm">
              Sessão não identificada ou expirada. Identifique-se com sua matrícula e senha de 6 dígitos para acessar o painel de vendas.
            </p>
            <button
              type="button"
              onClick={() => setLoginOperacional({ aberto: true, estacao: 'BALCAO' })}
              className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg"
            >
              Identificar Atendente (Login)
            </button>
          </div>
        )
      )}

      {/* 4. MENU LATERAL FLUTUANTE (Oculto no PWA Standalone do Balcão) */}
      {!isStandalone && (
        <MenuLateral
          moduloAtivo={moduloAtivo}
          aoSelecionarModulo={(mod) => setModuloAtivo(mod)}
          abertoMobile={menuAberto}
          aoFecharMobile={() => setMenuAberto(false)}
          aoAcessarCaixa={handleAcessarCaixa}
          aoAcessarBalcao={handleAcessarBalcao}
          aoAbrirConfiguracoes={(_subitem) => setModalConfiguracoesAberto(true)}
          aoAbrirAjuda={(_subitem) => setModalAjudaAberto(true)}
        />
      )}

      {/* 5. MODAL DE LOGIN OPERACIONAL (MATRÍCULA + SENHA NUMÉRICA 6 DÍGITOS) */}
      <LoginOperacionalModal
        aberto={loginOperacional.aberto}
        estacao={loginOperacional.estacao}
        aoFechar={() => setLoginOperacional({ aberto: false, estacao: 'CAIXA' })}
        aoSucesso={handleSucessoLoginOperacional}
      />

      {/* 6. MODAL DE ATALHOS OPERACIONAIS (BARRA INFERIOR) */}
      <ModalAtalhosOperacionais
        tipo={atalhoAtivo}
        aoFechar={() => setAtalhoAtivo(null)}
        aoAcessarCaixa={handleAcessarCaixa}
        aoAcessarBalcao={handleAcessarBalcao}
      />

      {/* 7. MODAIS DE SESSÃO GERAL, FILIAIS, CONFIGURAÇÕES E AJUDA */}
      <LoginModal
        aberto={modalLoginAberto}
        aoFechar={() => setModalLoginAberto(false)}
      />

      <SelecionarTenantModal
        aberto={modalTenantAberto}
        aoFechar={() => setModalTenantAberto(false)}
      />

      <ConfiguracoesOperacionaisModal
        aberto={modalConfiguracoesAberto}
        aoFechar={() => setModalConfiguracoesAberto(false)}
        aoTrocarFilial={() => setModalTenantAberto(true)}
      />

      <AjudaOperacionalModal
        aberto={modalAjudaAberto}
        aoFechar={() => setModalAjudaAberto(false)}
      />
    </>
  );
};
