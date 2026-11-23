import React from 'react';
import {
  Heart,
  Users,
  ShieldCheck,
  Award,
} from 'lucide-react';

interface BalcaoEmptySearchStateProps {
  aoSelecionarSugestao?: (termo: string) => void;
}

export const BalcaoEmptySearchState: React.FC<BalcaoEmptySearchStateProps> = () => {
  return (
    <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between items-center p-6 sm:p-8 md:p-10 text-center select-none overflow-hidden">
      {/* 1. ÁREA INSTITUCIONAL PRINCIPAL (CENTRALIZADA VERTICAL E HORIZONTALMENTE) */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto relative w-full max-w-xl">
        {/* Glow / Halo de Bem-Estar e Saúde */}
        <div className="absolute -inset-10 bg-gradient-to-r from-blue-500/15 via-emerald-400/20 to-teal-500/15 rounded-full blur-3xl opacity-80 pointer-events-none" />

        {/* Logo FarmaPro Oficial Aumentada Significativamente (Destaque Principal) */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-3xl bg-white p-4 sm:p-5 flex items-center justify-center shadow-xl shadow-blue-900/10 border border-slate-200/80 mb-5 sm:mb-6">
          <img
            src="/logo-farmapro-emblema.png"
            alt="FarmaPro • Saúde da Família"
            className="w-full h-full object-contain select-none drop-shadow-xs"
          />
        </div>

        {/* Título: FarmaPro • Saúde da Família */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            Farma<span className="text-blue-600">Pro</span>
          </h1>
          <span className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-600 tracking-tight leading-tight">
            • Saúde da Família
          </span>
        </div>

        {/* Selo Exclusivo: Cuidado Integral & Bem-Estar (Selo BALCÃO PDV Removido) */}
        <div className="mt-3.5 flex items-center justify-center">
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
            <Award className="w-3.5 h-3.5 text-emerald-600" /> Cuidado Integral & Bem-Estar
          </span>
        </div>

        {/* Frase Institucional */}
        <p className="text-xs sm:text-sm md:text-base font-medium text-slate-600 mt-3 sm:mt-4 max-w-lg leading-relaxed">
          &ldquo;Cuidando com carinho, economia e confiança farmacêutica de todas as gerações da sua família.&rdquo;
        </p>
      </div>

      {/* 2. PILARES DE CUIDADO FAMILIAR (ALINHADOS NA PARTE INFERIOR DO PAINEL) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 max-w-2xl w-full mt-auto pt-3 shrink-0">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 text-left shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800">Cuidado para Toda Idade</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Crianças, adultos e idosos</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 text-left shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800">Economia Inteligente</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Genéricos até 85% off</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 text-left shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800">Atenção Farmacêutica</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Intercambialidade segura</p>
          </div>
        </div>
      </div>
    </div>
  );
};
