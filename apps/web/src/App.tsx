import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext.js';
import { PortalOperacionalScreen } from './pages/PortalOperacionalScreen.js';
import { PdvCaixaScreen } from './pages/PdvCaixaScreen.js';
import { BalcaoConsultaScreen } from './pages/BalcaoConsultaScreen.js';
import { LoginModal } from './pages/LoginModal.js';
import { SelecionarTenantModal } from './pages/SelecionarTenantModal.js';
import { ConfiguracoesOperacionaisModal } from './components/ConfiguracoesOperacionaisModal.js';
import { AjudaOperacionalModal } from './components/AjudaOperacionalModal.js';
import { MenuLateral, ModuloNavegacao } from './components/MenuLateral.js';

export const App: React.FC = () => {
  const {
    temPermissao,
  } = useAuth();

  // Navegação Global FarmaPro — Exclusivamente os dois ambientes operacionais
  const [moduloAtivo, setModuloAtivo] = useState<ModuloNavegacao>('portal-operacional');
  const [menuAbertoMobile, setMenuAbertoMobile] = useState<boolean>(false);

  // Modais de Sessão, Configurações e Ajuda
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [modalTenantAberto, setModalTenantAberto] = useState(false);
  const [modalConfiguracoesAberto, setModalConfiguracoesAberto] = useState(false);
  const [modalAjudaAberto, setModalAjudaAberto] = useState(false);

  return (
    <>
      {/* 1. TELA INICIAL: PORTAL OPERACIONAL (SOMENTE OS DOIS ACESSOS OPERACIONAIS) */}
      {moduloAtivo === 'portal-operacional' && (
        <PortalOperacionalScreen
          aoNavegarCaixa={() => {
            if (temPermissao('pdv:acesso')) {
              setModuloAtivo('pdv-caixa');
            } else {
              alert('Acesso negado: Seu usuário não possui a permissão de Caixa (pdv:acesso).');
            }
          }}
          aoNavegarBalcao={() => {
            if (
              temPermissao('balcao:consultar') ||
              temPermissao('pdv:acesso') ||
              temPermissao('pre_venda:criar')
            ) {
              setModuloAtivo('balcao-consulta');
            } else {
              alert('Acesso negado: Seu usuário não possui permissão de Balcão (balcao:consultar).');
            }
          }}
          aoAbrirLogin={() => setModalLoginAberto(true)}
          aoAbrirMenu={() => setMenuAbertoMobile(true)}
          aoAbrirConfiguracoes={() => setModalConfiguracoesAberto(true)}
          aoAbrirAjuda={() => setModalAjudaAberto(true)}
        />
      )}

      {/* 2. AMBIENTE OPERACIONAL: PDV — CAIXA (EXCLUSIVO) */}
      {moduloAtivo === 'pdv-caixa' && (
        <PdvCaixaScreen
          aoVoltarPortal={() => setModuloAtivo('portal-operacional')}
          aoAbrirMenu={() => setMenuAbertoMobile(true)}
        />
      )}

      {/* 3. AMBIENTE OPERACIONAL: PAINEL DE VENDA — BALCÃO & CONSULTA (EXCLUSIVO) */}
      {moduloAtivo === 'balcao-consulta' && (
        <BalcaoConsultaScreen
          aoVoltarPortal={() => setModuloAtivo('portal-operacional')}
          aoAbrirMenu={() => setMenuAbertoMobile(true)}
        />
      )}

      {/* 4. MENU HAMBÚRGUER OPERACIONAL (CANTO SUPERIOR ESQUERDO) */}
      <MenuLateral
        moduloAtivo={moduloAtivo}
        aoSelecionarModulo={(mod) => setModuloAtivo(mod)}
        abertoMobile={menuAbertoMobile}
        aoFecharMobile={() => setMenuAbertoMobile(false)}
        aoAbrirConfiguracoes={() => setModalConfiguracoesAberto(true)}
        aoAbrirAjuda={() => setModalAjudaAberto(true)}
        aoAbrirLogin={() => setModalLoginAberto(true)}
      />

      {/* 5. MODAIS DE SESSÃO, FILIAIS, CONFIGURAÇÕES E AJUDA */}
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
