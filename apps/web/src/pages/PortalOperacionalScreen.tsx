import React, { useEffect } from 'react';
import {
  Menu,
  Building2,
  ChevronDown,
  ArrowRight,
  Pill,
  Package,
  ClipboardList,
  Users,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

interface PortalOperacionalScreenProps {
  aoAcessarCaixa: () => void;
  aoAcessarBalcao: () => void;
  aoAbrirMenu: () => void;
  aoTrocarFilial?: () => void;
  aoSair?: () => void;
}

export const PortalOperacionalScreen: React.FC<PortalOperacionalScreenProps> = ({
  aoAcessarCaixa,
  aoAcessarBalcao,
  aoAbrirMenu,
  aoTrocarFilial,
  aoSair,
}) => {
  const { filialAtiva, logout } = useAuth();

  // Escuta global de teclas de atalho F2 (Caixa) e F3 (Balcão)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em campos de input, textarea ou select
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        aoAcessarCaixa();
      } else if (e.key === 'F3') {
        e.preventDefault();
        aoAcessarBalcao();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aoAcessarCaixa, aoAcessarBalcao]);

  const handleSair = () => {
    if (aoSair) {
      aoSair();
    } else {
      if (confirm('Deseja realmente sair do FarmaPro?')) {
        logout();
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-white select-none font-sans">
      {/* =========================================================================
          1. CABEÇALHO SUPERIOR (EXATO À REFERÊNCIA VISUAL)
          ========================================================================= */}
      <header className="relative z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-2xs">
        {/* Lado Esquerdo: Hambúrguer + Marca FarmaPro SaaS + Slogan */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={aoAbrirMenu}
            className="p-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors border border-slate-200 shadow-2xs"
            title="Abrir Menu Lateral"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Ícone da Marca FarmaPro (Quadrado Azul com Cruz Branca) */}
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
            +
          </div>

          <div>
            <div className="flex items-center gap-2 leading-none">
              <span className="text-lg font-black text-slate-900 tracking-tight">FarmaPro</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                SaaS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Gestão Farmacêutica Inteligente
            </p>
          </div>
        </div>

        {/* Lado Direito: Seletor de Filial/Unidade + Botão Sair */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Seletor da Filial Ativa */}
          <button
            type="button"
            onClick={aoTrocarFilial}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 transition-colors text-xs shadow-2xs"
            title="Selecionar Filial Operacional"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold">
              {filialAtiva?.nome || 'Unidade 01 – Centro (Matriz)'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Botão Sair (Vermelho com Seta para a Direita) */}
          <button
            type="button"
            onClick={handleSair}
            className="flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold text-xs sm:text-sm transition-colors group"
            title="Encerrar Sessão"
          >
            <span>Sair</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. ÁREA CENTRAL HERO: AMBIENTE DE FARMÁCIA + LOGOMARCA CENTRAL + SLOGAN
          ========================================================================= */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Fundo Real de Farmácia Desfocada com Iluminação Clara e Prateleiras */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden select-none bg-white">
          {/* Imagem Fotográfica Real de Farmácia com Desfoque Suave */}
          <img
            src="/fundo-farmacia.jpg"
            alt="Ambiente Farmácia Desfocado"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-85"
          />

          {/* Iluminação Clara Suave para Garantir Contraste Perfeito e Ambiente Branco */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/40 to-white/60" />

          {/* Ondas Fluidas Estilizadas em Azul e Verde no Rodapé (Exato à Referência) */}
          <div className="absolute bottom-0 left-0 right-0 h-48 sm:h-64 overflow-hidden">
            {/* Onda Azul */}
            <svg
              className="absolute bottom-0 left-0 w-full h-40 sm:h-56 text-blue-600/90"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,192L48,181.3C96,171,192,149,288,160C384,171,480,213,576,224C672,235,768,213,864,186.7C960,160,1056,128,1152,128C1248,128,1344,160,1392,176L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
            </svg>

            {/* Onda Verde Fresca no Canto Inferior Direito */}
            <svg
              className="absolute bottom-0 right-0 w-3/4 sm:w-1/2 h-32 sm:h-44 text-emerald-500"
              viewBox="0 0 720 240"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,160C120,80,240,40,360,60C480,80,600,160,720,200L720,240L0,240Z" />
            </svg>
          </div>
        </div>

        {/* Bloco Central: Emblema + Farma Pro + Slogan */}
        <div className="flex flex-col items-center justify-center text-center max-w-xl mx-auto -mt-6">
          {/* Emblema da Marca FarmaPro em Vetor SVG de Alta Fidelidade */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 mb-2 flex items-center justify-center drop-shadow-md">
            <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Swoosh Azul Suave no lado esquerdo */}
              <path
                d="M45 130 C30 100, 35 60, 65 40 C75 32, 90 28, 95 30 C80 45, 60 70, 62 105 C63 115, 67 125, 75 135 C60 138, 50 135, 45 130 Z"
                fill="#38bdf8"
                opacity="0.85"
              />

              {/* Cruz Médica Azul Estilizada com Bordas Arredondadas */}
              <g fill="#0256c4">
                {/* Braço vertical */}
                <rect x="78" y="25" width="44" height="150" rx="14" />
                {/* Braço horizontal */}
                <rect x="25" y="78" width="150" height="44" rx="14" />
              </g>

              {/* Almofariz e Pilão Farmacêutico em Branco no Centro da Cruz */}
              <g fill="#ffffff">
                {/* Tigela do Almofariz */}
                <path d="M72 96 C72 120, 82 130, 100 130 C118 130, 128 120, 128 96 L72 96 Z" />
                {/* Borda superior do Almofariz */}
                <rect x="68" y="93" width="64" height="6" rx="3" />
                {/* Base do Almofariz */}
                <rect x="88" y="128" width="24" height="4" rx="2" />
                {/* Pilão inclinado */}
                <path d="M96 74 L122 98 L116 104 L90 80 Z" rx="2" />
                {/* Cruz Azul Interna na tigela do almofariz */}
                <rect x="97" y="105" width="6" height="16" rx="1.5" fill="#0256c4" />
                <rect x="92" y="110" width="16" height="6" rx="1.5" fill="#0256c4" />
              </g>

              {/* Duas Folhas Verdes Vivas Brotam no Lado Direito */}
              <g fill="#16a34a">
                {/* Folha Principal Grande */}
                <path d="M120 100 C155 80, 175 45, 172 40 C170 65, 140 105, 122 108 Z" />
                {/* Folha Secundária Menor */}
                <path d="M122 85 C145 68, 160 48, 158 45 C154 60, 136 86, 124 88 Z" fill="#22c55e" />
              </g>
            </svg>
          </div>

          {/* Tipografia da Marca: Farma (Azul) + Pro (Verde) */}
          <div className="flex items-center justify-center tracking-tight leading-none">
            <span
              className="text-5xl sm:text-6xl font-black italic tracking-tight"
              style={{ color: '#0c2356' }}
            >
              Farma
            </span>
            <span
              className="text-5xl sm:text-6xl font-black italic tracking-tight ml-1"
              style={{ color: '#16a34a' }}
            >
              Pro
            </span>
          </div>

          {/* Traço/Swoosh Verde Suave Sublinhando Farma Pro */}
          <div className="w-48 sm:w-60 h-2 my-1 flex justify-center">
            <svg viewBox="0 0 240 12" className="w-full h-full" fill="none">
              <path
                d="M10 6 C60 12, 180 12, 230 6"
                stroke="#16a34a"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Slogan Farmacêutico em Itálico (Exato à Imagem) */}
          <p
            className="text-lg sm:text-2xl italic font-medium tracking-tight mt-1"
            style={{ color: '#0c2356' }}
          >
            Mais <span className="text-emerald-600 font-bold">saúde</span> para você e sua família
          </p>
        </div>
      </main>

      {/* =========================================================================
          3. BARRA HORIZONTAL INFERIOR ILUSTRATIVA (EXCLUSIVAMENTE VISUAL)
          Separada por divisores verticais: Medicamentos | Estoque | Pré-vendas | Clientes | Relatórios
          ========================================================================= */}
      <nav
        aria-label="Atalhos Operacionais Ilustrativos"
        className="relative z-20 pb-6 px-4 flex justify-center select-none"
      >
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 py-2.5 px-3 flex items-center justify-center max-w-4xl w-full divide-x divide-slate-200">
          {/* 1. Medicamentos */}
          <div
            className="flex-1 flex items-center justify-center gap-2 sm:gap-2.5 px-3 py-2 text-slate-800 cursor-default"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Pill className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-tight">Medicamentos</span>
          </div>

          {/* 2. Estoque */}
          <div
            className="flex-1 flex items-center justify-center gap-2 sm:gap-2.5 px-3 py-2 text-slate-800 cursor-default"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-tight">Estoque</span>
          </div>

          {/* 3. Pré-vendas */}
          <div
            className="flex-1 flex items-center justify-center gap-2 sm:gap-2.5 px-3 py-2 text-slate-800 cursor-default"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-tight">Pré-vendas</span>
          </div>

          {/* 4. Clientes */}
          <div
            className="flex-1 flex items-center justify-center gap-2 sm:gap-2.5 px-3 py-2 text-slate-800 cursor-default"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-tight">Clientes</span>
          </div>

          {/* 5. Relatórios */}
          <div
            className="flex-1 flex items-center justify-center gap-2 sm:gap-2.5 px-3 py-2 text-slate-800 cursor-default"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-tight">Relatórios</span>
          </div>
        </div>
      </nav>
    </div>
  );
};
