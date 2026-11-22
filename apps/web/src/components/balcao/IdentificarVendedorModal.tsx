import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  X,
  AlertCircle,
  CheckCircle2,
  Search,
  ArrowRight,
} from 'lucide-react';
import { VendedoresService, ResultadoValidacaoVendedor } from '../../services/vendedoresService.js';
import { VendedorResponsavel } from '../../types/balcao.js';

interface IdentificarVendedorModalProps {
  aberto: boolean;
  matriculaInicial?: string;
  aoConfirmar: (vendedor: VendedorResponsavel) => void;
  aoFechar: () => void;
}

export const IdentificarVendedorModal: React.FC<IdentificarVendedorModalProps> = ({
  aberto,
  matriculaInicial = '',
  aoConfirmar,
  aoFechar,
}) => {
  const [matricula, setMatricula] = useState<string>('');
  const [resultado, setResultado] = useState<ResultadoValidacaoVendedor | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inicializa e foca ao abrir
  useEffect(() => {
    if (aberto) {
      const inicial = matriculaInicial.trim().toUpperCase();
      setMatricula(inicial);
      if (inicial) {
        const res = VendedoresService.consultarVendedor(inicial);
        setResultado(res);
      } else {
        setResultado(null);
      }
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [aberto, matriculaInicial]);

  if (!aberto) return null;

  // Validação manual ou acionada
  const handleValidarMatricula = (valor: string) => {
    const limpo = valor.trim().toUpperCase();
    if (!limpo) {
      setResultado(null);
      return;
    }
    const res = VendedoresService.consultarVendedor(limpo);
    setResultado(res);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (resultado?.valido && resultado.vendedor) {
        aoConfirmar(resultado.vendedor);
      } else {
        handleValidarMatricula(matricula);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      aoFechar();
    }
  };

  const handleConfirmarFinal = () => {
    if (resultado?.valido && resultado.vendedor) {
      aoConfirmar(resultado.vendedor);
    } else {
      handleValidarMatricula(matricula);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-800">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight">
                Identificação do Vendedor
              </h3>
              <p className="text-[11px] text-blue-100 font-medium">
                Obrigatório para registrar a comanda de pré-venda (F5)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-4 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Matrícula do Vendedor Responsável
            </label>
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={matricula}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setMatricula(val);
                  handleValidarMatricula(val);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ex: CX-001, BC-002, 1001..."
                className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all uppercase"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => handleValidarMatricula(matricula)}
                className="absolute right-1.5 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
              >
                <Search className="w-3.5 h-3.5" />
                Buscar
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Dica: O vendedor pode ser diferente do operador logado no computador.
            </p>
          </div>

          {/* Feedback de Validação */}
          {resultado && (
            <div>
              {resultado.valido && resultado.vendedor ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Vendedor Autorizado</span>
                  </div>
                  <div className="pt-1 border-t border-emerald-200/60 mt-1">
                    <div className="text-sm font-black text-slate-900">
                      {resultado.vendedor.nome}
                    </div>
                    <div className="text-[11px] text-emerald-700 flex items-center gap-2 mt-0.5">
                      <span>Matrícula: <strong>{resultado.vendedor.matricula}</strong></span>
                      <span>•</span>
                      <span>Cargo: {resultado.vendedor.cargoNome}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-900 flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-red-800">
                      Vendedor Não Autorizado
                    </div>
                    <div className="text-[11px] text-red-700 leading-relaxed">
                      {resultado.mensagemErro}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Atalhos rápidos de demonstração */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Colaboradores Cadastrados (Clique para preencher):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setMatricula('CX-001');
                  handleValidarMatricula('CX-001');
                }}
                className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 transition-colors"
              >
                CX-001 (Carlos Silva)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatricula('BC-002');
                  handleValidarMatricula('BC-002');
                }}
                className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 transition-colors"
              >
                BC-002 (Mariana Atendente)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatricula('BC-003');
                  handleValidarMatricula('BC-003');
                }}
                className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 transition-colors"
              >
                BC-003 (Roberto Farmacêutico)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatricula('SM-003');
                  handleValidarMatricula('SM-003');
                }}
                className="px-2 py-1 bg-white hover:bg-amber-50 hover:text-amber-800 border border-slate-200 rounded-md text-[11px] font-medium text-slate-500 transition-colors"
                title="Sem permissão de vendas"
              >
                SM-003 (Juliana - Sem Permissão)
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={aoFechar}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-lg transition-colors"
          >
            Cancelar (ESC)
          </button>

          <button
            type="button"
            onClick={handleConfirmarFinal}
            disabled={!resultado?.valido}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
              resultado?.valido
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Confirmar e Emitir Pré-Venda</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
