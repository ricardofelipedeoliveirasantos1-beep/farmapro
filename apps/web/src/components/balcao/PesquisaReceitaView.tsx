import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
} from 'lucide-react';

interface PesquisaReceitaViewProps {
  aoVoltarPreVenda?: () => void;
}

export const PesquisaReceitaView: React.FC<PesquisaReceitaViewProps> = ({
  aoVoltarPreVenda: _aoVoltarPreVenda,
}) => {
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [tipoReceita, setTipoReceita] = useState<string>('todas');

  // Amostra de receitas validadas para consulta imediata no balcão
  const receitasExemplo = [
    {
      id: 'RX-2026-8941',
      paciente: 'João Carlos da Silva',
      cpf: '123.456.789-10',
      medico: 'Dr. Roberto Mendonça - CRM/PR 32415',
      dataEmissao: '18/11/2026',
      validade: '18/12/2026',
      tipo: 'Branca Especial (Controle Especial C1)',
      status: 'DISPONIVEL',
      medicamentos: [
        { nome: 'Rivotril 2mg 30 comprimidos', posologia: '1 comprimido à noite' },
      ],
    },
    {
      id: 'RX-2026-7812',
      paciente: 'Mariana Duarte Souza',
      cpf: '234.567.890-12',
      medico: 'Dra. Carla Pinheiro - CRM/PR 28941',
      dataEmissao: '20/11/2026',
      validade: '30/11/2026',
      tipo: 'Antimicrobiano (2 Vias)',
      status: 'DISPONIVEL',
      medicamentos: [
        { nome: 'Amoxicilina + Clavulanato 875mg', posologia: '1 comprimido de 12/12h por 7 dias' },
      ],
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 select-none font-sans space-y-6">
      {/* 1. CABEÇALHO DA PESQUISA DE RECEITAS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-xs">
            <span className="text-base font-black italic tracking-tighter">Rx</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Pesquisa de Receita Médica (Rx)
            </h2>
            <p className="text-xs text-slate-500">
              Consulta de prescrições digitais, controle especial (Portaria 344/98) e antimicrobianos
            </p>
          </div>
        </div>

        {/* Badge do SNGPC / Validador */}
        <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 self-start md:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          SNGPC Integrado
        </span>
      </div>

      {/* 2. BARRA DE BUSCA E FILTROS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Digite o código da receita (SNCM/RNDS), CPF do paciente ou CRM do médico..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={tipoReceita}
              onChange={(e) => setTipoReceita(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="todas">Todas as prescrições</option>
              <option value="controle">Portaria 344/98 (Controle Especial)</option>
              <option value="antimicrobiano">Antimicrobianos (RDC 20/2011)</option>
              <option value="comum">Receituário Simples</option>
            </select>

            <button
              type="button"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0"
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* 3. RESULTADOS DA PESQUISA DE RECEITAS */}
      <div className="space-y-4">
        {receitasExemplo.map((rx) => (
          <div
            key={rx.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3 hover:border-blue-300 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                  {rx.id}
                </span>
                <span className="text-xs font-bold text-slate-800">{rx.tipo}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 self-start sm:self-auto">
                Disponível para Dispensação
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-600">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Paciente</span>
                <span className="font-semibold text-slate-800">{rx.paciente}</span>
                <span className="block text-[11px] text-slate-500">CPF: {rx.cpf}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Prescritor</span>
                <span className="font-semibold text-slate-800">{rx.medico}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Validade da Receita</span>
                <span className="font-semibold text-slate-800">{rx.validade}</span>
                <span className="block text-[11px] text-slate-500">Emitida em {rx.dataEmissao}</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-1">Medicamento Prescrito:</span>
              {rx.medicamentos.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{m.nome}</span>
                  <span className="text-slate-500 italic">{m.posologia}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
