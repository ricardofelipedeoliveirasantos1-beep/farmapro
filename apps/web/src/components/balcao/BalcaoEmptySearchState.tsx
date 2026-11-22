import React from 'react';
import {
  Search,
  Sparkles,
  Heart,
  Users,
  ShieldCheck,
  Award,
} from 'lucide-react';

interface BalcaoEmptySearchStateProps {
  aoSelecionarSugestao: (termo: string) => void;
}

export const BalcaoEmptySearchState: React.FC<BalcaoEmptySearchStateProps> = ({
  aoSelecionarSugestao,
}) => {
  const sugestoes = [
    { termo: 'Dipirona', desc: 'Analgésico e Antipirético', tipo: 'G' },
    { termo: 'Losartana', desc: 'Anti-hipertensivo', tipo: 'G' },
    { termo: 'Amoxicilina', desc: 'Antimicrobiano', tipo: 'G' },
    { termo: 'Omeprazol', desc: 'Inibidor de Bomba de Prótons', tipo: 'G' },
    { termo: 'Dorflex', desc: 'Relaxante Muscular', tipo: 'R' },
    { termo: 'Rivotril', desc: 'Ansiolítico / Psicotrópico', tipo: 'R' },
  ];

  return (
    <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center p-4 sm:p-5 md:p-6 text-center select-none overflow-hidden">
      {/* 1. GRANDE LOGO CRIATIVA FARMAPRO SAÚDE DA FAMÍLIA (CENTRALIZADA) */}
      <div className="relative mb-3 sm:mb-4 flex flex-col items-center">
        {/* Halo / Glow de Saúde Suave e Moderno */}
        <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/15 via-emerald-400/20 to-teal-500/15 rounded-full blur-2xl opacity-80 pointer-events-none" />

        {/* Emblema Oficial FarmaPro (Imagem 3) */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-3xl bg-white p-2.5 flex items-center justify-center shadow-lg shadow-blue-900/10 border border-slate-200/80">
          <img
            src="/logo-farmapro-emblema.png"
            alt="FarmaPro"
            className="w-full h-full object-contain select-none"
          />
        </div>

        {/* Nome FarmaPro • Saúde da Família */}
        <div className="mt-3 sm:mt-4 flex flex-col items-center">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-none">
              Farma<span className="text-blue-600">Pro</span>
            </h1>
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-600 tracking-tight leading-none">
              • Saúde da Família
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs">
              <Award className="w-3 h-3 text-emerald-700" /> Cuidado Integral & Bem-Estar
            </span>
            <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Balcão PDV
            </span>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-2 max-w-lg leading-relaxed">
            &ldquo;Cuidando com carinho, economia e confiança farmacêutica de todas as gerações da sua família.&rdquo;
          </p>
        </div>
      </div>

      {/* 2. PILARES DE CUIDADO FAMILIAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-xl w-full mb-2.5 sm:mb-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-2.5 flex items-center gap-2 text-left shadow-2xs">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800">Cuidado para Toda Idade</h4>
            <p className="text-[10px] text-slate-500 truncate">Crianças, adultos e idosos</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-2.5 flex items-center gap-2 text-left shadow-2xs">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800">Economia Inteligente</h4>
            <p className="text-[10px] text-slate-500 truncate">Genéricos até 85% off</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-2.5 flex items-center gap-2 text-left shadow-2xs">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800">Atenção Farmacêutica</h4>
            <p className="text-[10px] text-slate-500 truncate">Intercambialidade segura</p>
          </div>
        </div>
      </div>

      {/* 3. CAIXA DE INSTRUÇÃO E PRONTIDÃO */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-2.5 sm:p-3 max-w-lg w-full mb-2.5 sm:mb-3 shadow-2xs">
        <div className="flex items-center justify-center gap-2 text-blue-900 font-bold text-xs sm:text-sm mb-1">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 animate-pulse" />
          <span>Aguardando pesquisa de medicamento</span>
        </div>
        <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">
          Os medicamentos permanecem ocultos até que uma busca seja realizada. Digite o{' '}
          <strong>nome comercial</strong>, <strong>princípio ativo</strong>,{' '}
          <strong>código interno</strong> ou leia o código de barras com o{' '}
          <strong>leitor EAN</strong>.
        </p>
      </div>

      {/* 4. SUGESTÕES RÁPIDAS DE PESQUISA (CLIQUE DIRETO) */}
      <div className="max-w-lg w-full">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Ou clique em uma consulta rápida de amostra:</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sugestoes.map(s => (
            <button
              key={s.termo}
              type="button"
              onClick={() => aoSelecionarSugestao(s.termo)}
              className="p-2 bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 group-hover:text-blue-700">
                  {s.termo}
                </span>
                <span
                  className={`text-[9px] font-black px-1 rounded ${
                    s.tipo === 'G'
                      ? 'bg-amber-400 text-amber-950 font-bold'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {s.tipo}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
