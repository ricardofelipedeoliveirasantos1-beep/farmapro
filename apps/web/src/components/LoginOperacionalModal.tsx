import React, { useState, useEffect, useRef } from 'react';
import { Modal, Botao } from '@farmapro/ui';
import {
  ShoppingCart,
  Pill,
  Lock,
  User,
  ArrowLeft,
  AlertCircle,
  Building2,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { VendedoresService } from '../services/vendedoresService.js';

interface LoginOperacionalModalProps {
  aberto: boolean;
  estacao: 'CAIXA' | 'BALCAO';
  aoFechar: () => void;
  aoSucesso: (dados: {
    estacao: 'CAIXA' | 'BALCAO';
    usuario: { id: string; nome: string; matricula: string; cargoNome?: string };
    filial: { id: string; nome: string };
  }) => void;
}

export const LoginOperacionalModal: React.FC<LoginOperacionalModalProps> = ({
  aberto,
  estacao,
  aoFechar,
  aoSucesso,
}) => {
  const { filialAtiva, empresaAtiva, setSessaoOperacional } = useAuth() as any;

  const [matricula, setMatricula] = useState<string>('');
  const [senhaNumerica, setSenhaNumerica] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  const inputMatriculaRef = useRef<HTMLInputElement>(null);
  const inputSenhaRef = useRef<HTMLInputElement>(null);

  // Foco inicial e reset ao abrir
  useEffect(() => {
    if (aberto) {
      setMatricula('');
      setSenhaNumerica('');
      setErro(null);
      setCarregando(false);
      setTimeout(() => {
        inputMatriculaRef.current?.focus();
      }, 50);
    }
  }, [aberto, estacao]);

  const titulo = estacao === 'CAIXA' ? 'Acesso ao PDV — Caixa' : 'Acesso ao Painel de Venda';
  const descricao =
    estacao === 'CAIXA'
      ? 'Informe sua matrícula e senha de 6 dígitos para operar o terminal de Caixa (F2)'
      : 'Informe sua matrícula e senha de 6 dígitos para atendimento no Balcão (F3)';

  // Submissão do login operacional
  const handleEntrar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const matLimpa = matricula.trim();
    const senhaLimpa = senhaNumerica.trim();

    if (!matLimpa) {
      setErro('Informe a matrícula do colaborador.');
      inputMatriculaRef.current?.focus();
      return;
    }

    if (!/^\d{6}$/.test(senhaLimpa)) {
      setErro('A senha deve conter exatamente 6 números.');
      inputSenhaRef.current?.focus();
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      try {
        const res = await fetch('/api/auth/login-operacional', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matricula: matLimpa,
            senhaNumerica: senhaLimpa,
            estacao,
            empresaId: empresaAtiva?.id,
            filialId: filialAtiva?.id,
          }),
        });

        const json = await res.json();

        if (res.ok && json.sucesso) {
          if (setSessaoOperacional) {
            setSessaoOperacional(json.dados);
          }
          aoSucesso(json.dados);
          aoFechar();
          return;
        } else if (res.status === 401 || res.status === 403) {
          throw new Error(json.mensagem || 'Falha ao autenticar.');
        }
      } catch (netErr: any) {
        if (
          netErr.message &&
          (netErr.message.includes('bloqueado') ||
            netErr.message.includes('negado') ||
            netErr.message.includes('incorret') ||
            netErr.message.includes('encontrada'))
        ) {
          throw netErr;
        }

        // Validação local segura contra os colaboradores cadastrados
        const validacao = VendedoresService.validarLoginOperacional(matLimpa, senhaLimpa, estacao);
        if (!validacao.sucesso || !validacao.dados) {
          throw new Error(validacao.mensagem || 'Falha na autenticação operacional.');
        }

        if (setSessaoOperacional) {
          setSessaoOperacional(validacao.dados);
        }

        aoSucesso(validacao.dados);
        aoFechar();
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação';
      setErro(msg);
      setCarregando(false);
      inputSenhaRef.current?.focus();
    }
  };

  // Atalhos de Teclado no Modal (Enter para submeter, Esc para voltar)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEntrar();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      aoFechar();
    }
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      descricao={descricao}
    >
      <form onSubmit={handleEntrar} onKeyDown={handleKeyDown} className="space-y-4 py-2">
        {/* Identificador Visual da Estação e Filial */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                estacao === 'CAIXA' ? 'bg-blue-600' : 'bg-emerald-600'
              }`}
            >
              {estacao === 'CAIXA' ? (
                <ShoppingCart className="w-5 h-5" />
              ) : (
                <Pill className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="font-bold text-slate-800 block text-xs">
                {estacao === 'CAIXA' ? 'Terminal de Caixa / PDV' : 'Terminal de Balcão / Consulta'}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                {filialAtiva?.nome || 'Unidade 01 — Centro (Matriz)'}
              </span>
            </div>
          </div>
          <span
            className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg border ${
              estacao === 'CAIXA'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {estacao === 'CAIXA' ? 'Atalho F2' : 'Atalho F3'}
          </span>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{erro}</span>
          </div>
        )}

        {/* Campo Matrícula */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Matrícula do Funcionário
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              ref={inputMatriculaRef}
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value.toUpperCase())}
              placeholder="Ex: OP-101, 1001, CX-01..."
              disabled={carregando}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all uppercase font-medium bg-white"
            />
          </div>
        </div>

        {/* Campo Senha de 6 Dígitos */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700">
              Senha Numérica (6 Dígitos)
            </label>
            <span className="text-[10px] text-slate-400 font-medium">
              {senhaNumerica.length}/6 dígitos
            </span>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              ref={inputSenhaRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={senhaNumerica}
              onChange={(e) => {
                const apenasNumeros = e.target.value.replace(/\D/g, '').slice(0, 6);
                setSenhaNumerica(apenasNumeros);
              }}
              placeholder="••••••"
              disabled={carregando}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none transition-all tracking-widest font-mono bg-white"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Aceita exclusivamente 6 números. Protegido com Argon2id.
          </p>
        </div>

        {/* Acesso Rápido de Demonstração */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Colaboradores Cadastrados (Clique para preencher):
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMatricula('BC-002');
                setSenhaNumerica('654321');
              }}
              className="px-2 py-0.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded text-[11px] font-medium text-slate-700 transition-colors"
            >
              BC-002 (Mariana Atendente • 654321)
            </button>
            <button
              type="button"
              onClick={() => {
                setMatricula('CX-001');
                setSenhaNumerica('123456');
              }}
              className="px-2 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded text-[11px] font-medium text-slate-700 transition-colors"
            >
              CX-001 (Carlos Silva • 123456)
            </button>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
          <Botao
            type="button"
            variante="outline"
            tamanho="sm"
            onClick={aoFechar}
            disabled={carregando}
            iconeEsquerda={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Voltar
          </Botao>
          <Botao
            type="submit"
            variante="primario"
            tamanho="sm"
            carregando={carregando}
            disabled={carregando || matricula.trim().length === 0 || senhaNumerica.length !== 6}
            iconeEsquerda={<KeyRound className="w-3.5 h-3.5" />}
          >
            {carregando ? 'Validando...' : 'Entrar na Estação'}
          </Botao>
        </div>
      </form>
    </Modal>
  );
};
