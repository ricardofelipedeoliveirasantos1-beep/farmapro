import React, { useState, useEffect } from 'react';
import { CustomerInfo } from '../../types/balcao.js';
import { User, X, Check, ShieldAlert } from 'lucide-react';

interface CustomerModalProps {
  aberto: boolean;
  clienteAtual: CustomerInfo;
  aoSalvar: (cliente: CustomerInfo) => void;
  aoFechar: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  aberto,
  clienteAtual,
  aoSalvar,
  aoFechar,
}) => {
  const [nome, setNome] = useState(clienteAtual.name);
  const [cpf, setCpf] = useState(clienteAtual.cpf);
  const [convenio, setConvenio] = useState(clienteAtual.convenio);

  useEffect(() => {
    if (aberto) {
      setNome(clienteAtual.name);
      setCpf(clienteAtual.cpf);
      setConvenio(clienteAtual.convenio);
    }
  }, [aberto, clienteAtual]);

  if (!aberto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    aoSalvar({
      name: nome.trim() || 'CONSUMIDOR FINAL',
      cpf: cpf.trim(),
      convenio: convenio.trim() || 'À VISTA / PARTICULAR',
    });
    aoFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-800">
        {/* Topo do Modal */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-blue-200" />
            <h3 className="font-black text-base tracking-tight">Identificação do Cliente (F10)</h3>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nome do Cliente / Paciente
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Maria Oliveira Santos (ou CONSUMIDOR FINAL)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              CPF (Opcional para Nota/Programa)
            </label>
            <input
              type="text"
              value={cpf}
              onChange={e => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              maxLength={14}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Convênio / Modalidade de Atendimento
            </label>
            <select
              value={convenio}
              onChange={e => setConvenio(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
            >
              <option value="À VISTA / PARTICULAR">À VISTA / PARTICULAR</option>
              <option value="FARMÁCIA POPULAR">PROGRAMA FARMÁCIA POPULAR</option>
              <option value="PBM EPHARMA">PBM EPHARMA / DESCONTO LABORATÓRIO</option>
              <option value="PBM VIDALINK">PBM VIDALINK</option>
              <option value="CONVÊNIO BRADESCO SAÚDE">CONVÊNIO BRADESCO SAÚDE</option>
              <option value="CONVÊNIO UNIMED">CONVÊNIO UNIMED</option>
              <option value="CONVÊNIO EMPRESA">CONVÊNIO EMPRESA LOCAL</option>
            </select>
          </div>

          {/* Aviso Legal de Crediário */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Regra do FarmaPro:</strong> Não é permitida a criação de crédito próprio,
              crediário ou limite de compras. O pagamento integral será realizado no Caixa PDV.
            </span>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={aoFechar}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-colors"
            >
              Cancelar (ESC)
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar (Enter)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
