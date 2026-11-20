import React from 'react';
import { Pill, Building2, User, ShieldCheck } from 'lucide-react';
import { Badge } from './Badge';

export interface CabecalhoProps {
  nomeFarmacia?: string;
  nomeFilial?: string;
  nomeOperador?: string;
  cargoOperador?: string;
  ambienteDemonstracao?: boolean;
}

export const Cabecalho: React.FC<CabecalhoProps> = ({
  nomeFarmacia = 'FarmaPro Demonstração',
  nomeFilial = 'Filial 01 — Matriz Centro',
  nomeOperador = 'Dr. Carlos Silva',
  cargoOperador = 'Farmacêutico Responsável',
  ambienteDemonstracao = true,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Identidade FarmaPro */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm ring-4 ring-blue-500/10">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">FarmaPro</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                SaaS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Gestão Farmacêutica Inteligente</p>
          </div>
        </div>

        {/* Contexto Multiempresa & Filial */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-900">{nomeFarmacia}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600">{nomeFilial}</span>
        </div>

        {/* Ações, Usuário e Tag de Demonstração */}
        <div className="flex items-center gap-3">
          {ambienteDemonstracao && (
            <Badge variante="aviso" tamanho="sm" ponto>
              Ambiente de Demonstração
            </Badge>
          )}

          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden lg:block text-left">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-900">{nomeOperador}</span>
                <span title="Acesso Autorizado">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                </span>
              </div>
              <p className="text-[10px] text-slate-500">{cargoOperador}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

