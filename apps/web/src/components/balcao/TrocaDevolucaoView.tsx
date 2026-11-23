import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Search,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface TrocaDevolucaoViewProps {
  aoVoltarPreVenda?: () => void;
}

export const TrocaDevolucaoView: React.FC<TrocaDevolucaoViewProps> = ({
  aoVoltarPreVenda: _aoVoltarPreVenda,
}) => {
  const [subAba, setSubAba] = useState<'troca' | 'devolucao' | 'consulta'>('troca');
  const [numeroVenda, setNumeroVenda] = useState<string>('V-10587');
  const [motivo, setMotivo] = useState<string>('defeito_embalagem');
  const [observacoes, setObservacoes] = useState<string>('');
  const [sucesso, setSucesso] = useState<string | null>(null);

  const handleProcessar = (e: React.FormEvent) => {
    e.preventDefault();
    setSucesso(
      subAba === 'troca'
        ? `Solicitação de Troca para a venda ${numeroVenda} registrada com sucesso!`
        : `Solicitação de Devolução para a venda ${numeroVenda} registrada com sucesso!`
    );
    setTimeout(() => {
      setSucesso(null);
    }, 4000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 select-none font-sans space-y-6">
      {/* 1. CABEÇALHO COM SUB-ABAS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-xs">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Troca e Devolução de Mercadorias
            </h2>
            <p className="text-xs text-slate-500">
              Operações de estorno, substituição de produto ou consulta de cupons fiscais
            </p>
          </div>
        </div>

        {/* Sub-abas de seleção */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setSubAba('troca');
              setSucesso(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subAba === 'troca'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Troca
          </button>
          <button
            type="button"
            onClick={() => {
              setSubAba('devolucao');
              setSucesso(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subAba === 'devolucao'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Devolução
          </button>
          <button
            type="button"
            onClick={() => {
              setSubAba('consulta');
              setSucesso(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subAba === 'consulta'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Consulta
          </button>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO */}
      {sucesso && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{sucesso}</span>
        </div>
      )}

      {/* 2. FORMULÁRIO DE TROCA / DEVOLUÇÃO */}
      {subAba !== 'consulta' ? (
        <form onSubmit={handleProcessar} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Dados da Venda Original
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Número do Cupom / Venda do Caixa (ex: V-10587) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={numeroVenda}
                  onChange={(e) => setNumeroVenda(e.target.value.toUpperCase())}
                  placeholder="Ex: V-10587"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo da Operação *
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="defeito_embalagem">Embalagem violada ou danificada</option>
                <option value="medicamento_incorreto">Medicamento divergente da receita</option>
                <option value="desistencia_cliente">Desistência do cliente (lacrado)</option>
                <option value="validade_curta">Data de validade curta/inadequada</option>
                <option value="reacao_adversa">Notificação de evento adverso</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observações Operacionais
              </label>
              <textarea
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes adicionais, lote do medicamento substituído ou justificativa farmacêutica..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirmar {subAba === 'troca' ? 'Troca' : 'Devolução'}</span>
              </button>
            </div>
          </div>

          {/* LADO DIREITO: REGRAS ANVISA DE DEVOLUÇÃO */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Diretrizes ANVISA
            </h4>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">•</span>
                Medicamentos controlados (Portaria 344/98) não são passíveis de troca após saída do balcão, salvo laudo técnico.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">•</span>
                Produtos termolábeis (geladeira) necessitam de conferência de cadeia fria antes do estorno.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">•</span>
                O cupom fiscal original ou CPF cadastrado no momento da venda é obrigatório.
              </li>
            </ul>
          </div>
        </form>
      ) : (
        /* VISÃO DE CONSULTA */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Digite o número da venda, CPF do cliente ou código do produto..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white"
            />
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              <span>Buscar</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Data/Hora</th>
                  <th className="py-2.5 px-3">Protocolo</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Venda Original</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">22/11/2026 14:10</td>
                  <td className="py-2.5 px-3 font-mono font-bold">TR-9821</td>
                  <td className="py-2.5 px-3">Troca de Apresentação</td>
                  <td className="py-2.5 px-3 font-mono">V-10587</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                      Concluída
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
