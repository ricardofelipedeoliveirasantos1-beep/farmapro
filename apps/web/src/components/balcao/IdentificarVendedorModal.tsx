import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Lock,
  Hash,
} from 'lucide-react';
import { VendedoresService, ResultadoValidacaoVendedor } from '../../services/vendedoresService.js';
import { VendedorResponsavel } from '../../types/balcao.js';

interface IdentificarVendedorModalProps {
  aberto: boolean;
  matriculaInicial?: string;
  acao?: 'SALVAR' | 'IMPRIMIR';
  aoConfirmar: (vendedor: VendedorResponsavel) => void;
  aoFechar: () => void;
}

export const IdentificarVendedorModal: React.FC<IdentificarVendedorModalProps> = ({
  aberto,
  matriculaInicial = '',
  acao = 'SALVAR',
  aoConfirmar,
  aoFechar,
}) => {
  const [matricula, setMatricula] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [resultado, setResultado] = useState<ResultadoValidacaoVendedor | null>(null);
  const [etapa, setEtapa] = useState<'INPUT' | 'CONFIRMACAO'>('INPUT');

  const inputMatriculaRef = useRef<HTMLInputElement>(null);
  const inputSenhaRef = useRef<HTMLInputElement>(null);
  const btnConfirmarRef = useRef<HTMLButtonElement>(null);

  // Inicializa estado e foca ao abrir
  useEffect(() => {
    if (aberto) {
      // Aceita matrícula numérica inicial (preservando zeros à esquerda se fornecido)
      const inicialLimpa = (matriculaInicial || '').replace(/\D/g, '');
      setMatricula(inicialLimpa);
      setSenha('');
      setResultado(null);
      setEtapa('INPUT');

      setTimeout(() => {
        if (inputMatriculaRef.current) {
          inputMatriculaRef.current.focus();
          if (inicialLimpa) {
            inputMatriculaRef.current.select();
          }
        }
      }, 50);
    }
  }, [aberto, matriculaInicial]);

  if (!aberto) return null;

  // Validação estrita: somente dígitos numéricos
  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apenasNumeros = e.target.value.replace(/\D/g, '');
    setMatricula(apenasNumeros);
    setResultado(null);
    setEtapa('INPUT');
  };

  const handleSenhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apenasDigitos = e.target.value.replace(/\D/g, '').slice(0, 6);
    setSenha(apenasDigitos);
    setResultado(null);
  };

  // 1º ENTER: Valida matrícula e senha e consulta o vendedor
  const handleValidarPrimeiraEtapa = () => {
    const matLimpa = matricula.trim();
    if (!matLimpa) {
      setResultado({
        valido: false,
        mensagemErro: 'Informe a matrícula numérica do vendedor (ex: 01, 02).',
      });
      inputMatriculaRef.current?.focus();
      return;
    }

    if (!senha) {
      setResultado({
        valido: false,
        mensagemErro: 'Informe a senha de 6 dígitos do vendedor.',
      });
      inputSenhaRef.current?.focus();
      return;
    }

    const res = VendedoresService.consultarVendedor(matLimpa, senha);
    setResultado(res);

    if (res.valido && res.vendedor) {
      setEtapa('CONFIRMACAO');
      setTimeout(() => {
        btnConfirmarRef.current?.focus();
      }, 50);
    } else {
      setEtapa('INPUT');
    }
  };

  // 2º ENTER: Confirmação final do vendedor identificado
  const handleConfirmarFinal = () => {
    if (etapa === 'CONFIRMACAO' && resultado?.valido && resultado.vendedor) {
      aoConfirmar(resultado.vendedor);
    } else {
      handleValidarPrimeiraEtapa();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (etapa === 'CONFIRMACAO') {
        handleConfirmarFinal();
      } else {
        handleValidarPrimeiraEtapa();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      aoFechar();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-identificar-vendedor-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden text-slate-800">
        {/* Cabeçalho Simplificado */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="modal-identificar-vendedor-titulo" className="font-black text-sm uppercase tracking-wide">
                IDENTIFICAÇÃO DO VENDEDOR
              </h3>
              <p className="text-[11px] text-blue-100 font-medium">
                {acao === 'IMPRIMIR'
                  ? 'Informe sua matrícula para salvar e imprimir a pré-venda'
                  : 'Informe sua matrícula para registrar a pré-venda no balcão'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Cancelar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Campo Matrícula */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Matrícula do Vendedor
            </label>
            <div className="relative flex items-center">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={inputMatriculaRef}
                type="text"
                inputMode="numeric"
                value={matricula}
                onChange={handleMatriculaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ex: 01, 02, 03, 04"
                maxLength={8}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Aceita somente números (ex: 01, 02, 03, 04).
            </p>
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Senha de Atendimento (6 dígitos)
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={inputSenhaRef}
                type="password"
                inputMode="numeric"
                value={senha}
                onChange={handleSenhaChange}
                onKeyDown={handleKeyDown}
                placeholder="••••••"
                maxLength={6}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all tracking-widest"
                autoComplete="off"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Senha de demonstração para testes: <strong>123456</strong>
            </p>
          </div>

          {/* Feedback: Vendedor Identificado ou Erro */}
          {resultado && (
            <div className="pt-1">
              {resultado.valido && resultado.vendedor ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-emerald-950 space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 font-black text-xs text-emerald-800 uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>VENDEDOR IDENTIFICADO</span>
                  </div>
                  <div className="pt-1 border-t border-emerald-200 mt-1">
                    <div className="text-sm font-black text-slate-900">
                      {resultado.vendedor.nome}
                    </div>
                    <div className="text-[11px] text-emerald-800 flex items-center gap-2 mt-0.5 font-mono">
                      <span>Matrícula: <strong>{resultado.vendedor.matricula}</strong></span>
                      <span>•</span>
                      <span>{resultado.vendedor.cargoNome}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-emerald-700 font-semibold pt-1">
                    Pressione <strong>Enter</strong> novamente para confirmar e emitir a pré-venda.
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-900 flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-red-800">
                      Identificação Recusada
                    </div>
                    <div className="text-[11px] text-red-700 leading-tight">
                      {resultado.mensagemErro}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com Botão Principal */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={aoFechar}
            className="px-3 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cancelar (ESC)
          </button>

          <button
            ref={btnConfirmarRef}
            type="button"
            onClick={handleConfirmarFinal}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
              etapa === 'CONFIRMACAO' && resultado?.valido
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 active:scale-98'
                : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98'
            }`}
          >
            <span>CONFIRMAR E FINALIZAR PRÉ-VENDA</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
