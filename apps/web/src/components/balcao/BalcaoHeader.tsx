import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  Clock,
  Calendar,
  Building2,
  User,
  ClipboardList,
  HelpCircle,
  LogOut,
} from 'lucide-react';

interface BalcaoHeaderProps {
  operadorNome: string;
  filialNome: string;
  contadorPreVendas: number;
  aoAbrirPreVendas: () => void;
  aoAbrirOpcoes: () => void;
  aoVoltarPortal?: () => void;
}

export const BalcaoHeader: React.FC<BalcaoHeaderProps> = ({
  operadorNome,
  filialNome,
  contadorPreVendas,
  aoAbrirPreVendas,
  aoAbrirOpcoes,
  aoVoltarPortal,
}) => {
  const [horaAtual, setHoraAtual] = useState<string>('');
  const [dataAtual, setDataAtual] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setHoraAtual(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
      setDataAtual(
        now.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullScreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullScreen(false)).catch(() => {});
      }
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs select-none">
      {/* Lado Esquerdo: Marca FarmaPro + Identificação de Balcão */}
      <div className="flex items-center gap-3">
        {aoVoltarPortal && (
          <button
            type="button"
            onClick={aoVoltarPortal}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors"
            title="Voltar ao Portal de Acesso"
          >
            <LogOut className="w-4 h-4 rotate-180" />
          </button>
        )}

        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-2xs">
          +
        </div>

        <div>
          <div className="flex items-center gap-2 leading-none">
            <span className="text-base font-black text-slate-900 tracking-tight">FarmaPro</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
              BALCÃO
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Atendimento Ativo
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
            Terminal de Consulta & Pré-Venda de Medicamentos
          </span>
        </div>
      </div>

      {/* Centro: Filial e Operador */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-700">{filialNome}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md">
          <User className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-slate-500">Atendente:</span>
          <span className="font-bold text-slate-800">{operadorNome}</span>
        </div>
      </div>

      {/* Lado Direito: Pré-vendas F4 + Relógio + Tela Cheia + Ajuda F11 */}
      <div className="flex items-center gap-2.5 text-xs">
        {/* Botão Fila de Pré-vendas (F4) */}
        <button
          type="button"
          onClick={aoAbrirPreVendas}
          className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-bold transition-all shadow-2xs group"
          title="Consultar Pré-Vendas Emitidas (F4)"
        >
          <ClipboardList className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          <span>Pré-vendas (F4)</span>
          <span className="bg-blue-600 text-white text-[11px] font-black px-1.5 py-0.2 rounded-full min-w-[20px] text-center">
            {contadorPreVendas}
          </span>
        </button>

        {/* Data e Hora */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1 bg-slate-100/70 border border-slate-200 rounded-lg text-slate-600 font-mono text-[11px]">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{dataAtual}</span>
          </div>
          <div className="flex items-center gap-1 font-bold text-slate-800">
            <Clock className="w-3 h-3 text-blue-500" />
            <span>{horaAtual}</span>
          </div>
        </div>

        {/* Tela Cheia */}
        <button
          type="button"
          onClick={toggleFullScreen}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title={isFullScreen ? 'Sair da Tela Cheia' : 'Entrar em Tela Cheia'}
        >
          {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Ajuda / Opções de Atendimento (F11) */}
        <button
          type="button"
          onClick={aoAbrirOpcoes}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
          title="Opções de Atendimento e Atalhos (F11)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
