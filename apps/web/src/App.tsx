import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext.js';
import { PortalOperacionalScreen } from './pages/PortalOperacionalScreen.js';
import { PdvCaixaScreen } from './pages/PdvCaixaScreen.js';
import { BalcaoConsultaScreen } from './pages/BalcaoConsultaScreen.js';
import { LoginModal } from './pages/LoginModal.js';
import { SelecionarTenantModal } from './pages/SelecionarTenantModal.js';
import { LoginOperacionalModal } from './components/LoginOperacionalModal.js';
import { ConfiguracoesOperacionaisModal } from './components/ConfiguracoesOperacionaisModal.js';
import { AjudaOperacionalModal } from './components/AjudaOperacionalModal.js';
import {
  ModalAtalhosOperacionais,
  TipoAtalhoOperacional,
} from './components/ModalAtalhosOperacionais.js';
import { MenuLateral, ModuloNavegacao } from './components/MenuLateral.js';

export const App: React.FC = () => {
  const { temPermissao, usuario, logout } = useAuth();

  // Navegação Global FarmaPro — Exclusivamente os dois ambientes operacionais
  const [moduloAtivo, setModuloAtivo] = useState<ModuloNavegacao>('portal-operacional');
  const [menuAberto, setMenuAberto] = useState<boolean>(true);

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
    if (
      usuario &&
      (temPermissao('balcao:consultar') ||
        temPermissao('pre_venda:criar') ||
        temPermissao('pdv:acesso'))
    ) {
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
          aoClicarMedicamentos={() => setAtalhoAtivo('medicamentos')}
          aoClicarEstoque={() => setAtalhoAtivo('estoque')}
          aoClicarPreVendas={() => setAtalhoAtivo('prevendas')}
          aoClicarClientes={() => setAtalhoAtivo('clientes')}
          aoClicarRelatorios={() => setAtalhoAtivo('relatorios')}
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
        <BalcaoConsultaScreen
          aoVoltarPortal={() => setModuloAtivo('portal-operacional')}
          aoAbrirMenu={() => setMenuAberto(true)}
        />
      )}

      {/* 4. MENU LATERAL FLUTUANTE (EXATO À IMAGEM DE REFERÊNCIA) */}
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
