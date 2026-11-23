import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Store,
  User,
  ChevronDown,
  Menu,
  ClipboardList,
  Maximize2,
  Minimize2,
  HelpCircle,
} from 'lucide-react';
import { PainelVendaMenu, OpcaoMenuPainelVenda } from './PainelVendaMenu.js';

interface PainelVendaHeaderProps {
  operadorNome: string;
  filialNome: string;
  contadorPreVendas: number;
  abaAtiva: string;
  aoSelecionarOpcaoMenu: (opcao: OpcaoMenuPainelVenda) => void;
  aoAbrirAtalhos?: () => void;
  aoTrocarUsuario?: () => void;
  aoSair?: () => void;
}

export const PainelVendaHeader: React.FC<PainelVendaHeaderProps> = ({
  operadorNome,
  filialNome,
  contadorPreVendas,
  abaAtiva,
  aoSelecionarOpcaoMenu,
  aoAbrirAtalhos,
  aoTrocarUsuario,
  aoSair,
}) => {
  const [dataAtual, setDataAtual] = useState<string>('');
  const [horaAtual, setHoraAtual] = useState<string>('');
  const [menuAberto, setMenuAberto] = useState<boolean>(false);
  const [menuUsuarioAberto, setMenuUsuarioAberto] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Atualização em tempo real do relógio
  useEffect(() => {
    const atualizarDataHora = () => {
      const agora = new Date();
      setDataAtual(
        agora.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      );
      setHoraAtual(
        agora.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };

    atualizarDataHora();
    const interval = setInterval(atualizarDataHora, 1000);
    return () => clearInterval(interval);
  }, []);

  // Monitora alterações de tela cheia disparadas externamente ou por teclas nativas
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Alternância de Tela Cheia
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullScreen(true))
        .catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullScreen(false))
          .catch(() => {});
      }
    }
  };

  const handleOpcaoMenu = (opcao: OpcaoMenuPainelVenda) => {
    if (opcao === 'sair') {
      if (aoSair) aoSair();
    } else {
      aoSelecionarOpcaoMenu(opcao);
    }
  };

  // Extrai o primeiro nome do operador ou usa o nome amigável
  const primeiroNome = operadorNome ? operadorNome.split(' ')[0] : 'Operador';

  return (
    <header className="relative z-40 bg-gradient-to-r from-[#0a1e38] via-[#0f2d59] to-[#0a1e38] text-white px-3 sm:px-5 py-2 flex items-center justify-between border-b border-blue-900/80 shadow-md select-none font-sans">
      {/* 1. LADO ESQUERDO: LOGO FARMAPRO + DIVISOR + PAINEL DE VENDA */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* 1. Logo FarmaPro */}
        <div className="flex items-center gap-2">
          <img
            src="/logo-farmapro-emblema.png"
            alt="FarmaPro Emblema"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-xs"
          />
          <span className="text-base sm:text-lg font-black tracking-tight text-white flex items-center">
            FarmaPro
          </span>
        </div>

        {/* Divisor vertical sutil */}
        <div className="h-4.5 w-[1px] bg-blue-400/25 mx-0.5 sm:mx-1 hidden sm:block" />

        {/* 2. Nome Painel de Venda */}
        <div className="flex items-center gap-1.5 text-blue-100 text-xs sm:text-sm font-semibold">
          <ClipboardList className="w-4 h-4 text-blue-300 shrink-0" />
          <span>Painel de Venda</span>
        </div>
      </div>

      {/* 3. CENTRO: UNIDADE 01 CENTRALIZADA NA BARRA */}
      <div className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-white text-xs font-semibold shadow-inner pointer-events-auto">
          <Store className="w-3.5 h-3.5 text-blue-300" />
          <span>{filialNome || 'Unidade 01'}</span>
        </div>
      </div>

      {/* LADO DIREITO: 4. DATA/HORA, 5. ATIVO, 6. OPERADOR, 7. TELA CHEIA, 8. ?, 9. HAMBÚRGUER */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* 4. Data e hora atualizadas automaticamente */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-blue-950/50 border border-blue-500/20 text-xs text-blue-100 font-mono shadow-2xs">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-300" />
            <span>{dataAtual || '22/11/2026'}</span>
          </div>
          <span className="text-blue-400/40 font-sans">|</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-300" />
            <span>{horaAtual || '00:00:00'}</span>
          </div>
        </div>

        {/* 5. Indicador verde acompanhado somente da palavra Ativo */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 px-1 py-0.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span>Ativo</span>
        </div>

        {/* Separador sutil */}
        <div className="h-4 w-[1px] bg-blue-400/20 hidden sm:block" />

        {/* 6. Nome do operador conectado */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuUsuarioAberto(!menuUsuarioAberto)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/60 hover:bg-blue-800/50 border border-blue-600/30 text-xs font-medium text-white transition-colors cursor-pointer"
            title="Opções do Operador"
          >
            <div className="w-5 h-5 rounded-full bg-blue-500/30 border border-blue-400/40 flex items-center justify-center">
              <User className="w-3 h-3 text-blue-200" />
            </div>
            <span className="font-semibold">{primeiroNome}</span>
            <ChevronDown className="w-3.5 h-3.5 text-blue-300" />
          </button>

          {/* Dropdown do Operador */}
          {menuUsuarioAberto && (
            <div className="absolute right-0 mt-1.5 w-48 bg-[#091f3c] border border-blue-800/80 rounded-xl shadow-xl py-1.5 text-xs text-slate-200 z-50">
              <div className="px-3 py-1.5 border-b border-blue-800/40">
                <p className="font-bold text-white truncate">{operadorNome}</p>
                <p className="text-[10px] text-blue-300">{filialNome}</p>
              </div>
              {aoTrocarUsuario && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuUsuarioAberto(false);
                    aoTrocarUsuario();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-800/40 text-blue-100 flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Trocar Operador</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Separador sutil */}
        <div className="h-4 w-[1px] bg-blue-400/20 hidden sm:block" />

        {/* 7. Ícone de tela cheia */}
        <button
          type="button"
          onClick={toggleFullScreen}
          className="p-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-800/50 border border-blue-600/30 text-blue-200 hover:text-white transition-colors cursor-pointer"
          title={isFullScreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia'}
          aria-label="Alternar Tela Cheia"
        >
          {isFullScreen ? (
            <Minimize2 className="w-4 h-4 text-blue-300" />
          ) : (
            <Maximize2 className="w-4 h-4 text-blue-300" />
          )}
        </button>

        {/* 8. Ícone de interrogação (?) */}
        {aoAbrirAtalhos && (
          <button
            type="button"
            onClick={aoAbrirAtalhos}
            className="p-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-800/50 border border-blue-600/30 text-blue-200 hover:text-white transition-colors cursor-pointer"
            title="Atalhos do Teclado e Ajuda (F11)"
            aria-label="Atalhos do Teclado (F11)"
          >
            <HelpCircle className="w-4 h-4 text-blue-300" />
          </button>
        )}

        {/* 9. Menu hambúrguer no extremo direito */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAberto(!menuAberto)}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              menuAberto
                ? 'bg-blue-600 border-blue-400 text-white shadow-xs'
                : 'bg-blue-950/60 hover:bg-blue-800/50 border-blue-600/30 text-white'
            }`}
            aria-label="Abrir Menu do Painel de Venda"
            title="Menu do Painel de Venda"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>

          {/* Menu Hambúrguer Flutuante */}
          <PainelVendaMenu
            aberto={menuAberto}
            aoFechar={() => setMenuAberto(false)}
            aoSelecionarOpcao={handleOpcaoMenu}
            contadorPreVendas={contadorPreVendas}
            opcaoAtiva={abaAtiva}
          />
        </div>
      </div>
    </header>
  );
};
