import React from 'react';
import { Modal, Botao, Badge } from '@farmapro/ui';
import {
  Building2,
  Monitor,
  Printer,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

interface ConfiguracoesOperacionaisModalProps {
  aberto: boolean;
  aoFechar: () => void;
  aoTrocarFilial?: () => void;
}

export const ConfiguracoesOperacionaisModal: React.FC<ConfiguracoesOperacionaisModalProps> = ({
  aberto,
  aoFechar,
  aoTrocarFilial,
}) => {
  const { empresaAtiva, filialAtiva, usuario, cargoAtual, origemPin } = useAuth();

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Configurações Operacionais Essenciais"
      descricao="Parâmetros locais de estação, filial, terminal e contingência"
    >
      <div className="space-y-4 py-2 text-slate-800 text-xs">
        {/* Identificação da Estação e Filial */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
              <Building2 className="w-4 h-4 text-blue-600" />
              Filial em Atividade
            </span>
            <Badge variante="sucesso" tamanho="sm">
              Conectada
            </Badge>
          </div>
          <div className="text-slate-900 font-extrabold text-sm">
            {filialAtiva?.nome || 'Unidade Matriz — Centro'}
          </div>
          <div className="text-[11px] text-slate-500">
            Empresa: <strong>{empresaAtiva?.nomeFantasia || 'FarmaPro Farmácia Matriz'}</strong> (CNPJ: 11.222.333/0001-44)
          </div>
          {aoTrocarFilial && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  aoFechar();
                  aoTrocarFilial();
                }}
                className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Trocar Filial / Empresa Autorizada
              </button>
            </div>
          )}
        </div>

        {/* Informações do Terminal PDV e Balcão */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
            <Monitor className="w-4 h-4 text-blue-600" />
            Parâmetros do Terminal Local
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Identificação do Caixa:</span>
              <strong className="text-slate-800">PDV 01 — Caixa Balcão</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Posição Balcão:</span>
              <strong className="text-slate-800">Balcão 02 (Atendimento)</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Série Fiscal Terminal:</span>
              <strong className="text-slate-800 font-mono">TERM-01 / NFC-e</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Modo Operacional:</span>
              <strong className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Sincronizado
              </strong>
            </div>
          </div>
        </div>

        {/* Dispositivos de Impressão e Leitura */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
            <Printer className="w-4 h-4 text-blue-600" />
            Periféricos e Impressão
          </span>
          <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
            <div>
              <span className="text-slate-800 font-bold block">Impressora Térmica Não Fiscal (80mm)</span>
              <span className="text-slate-500">Impressão rápida de comandas PV e cupons de conferência</span>
            </div>
            <Badge variante="sucesso" tamanho="sm">
              Pronta
            </Badge>
          </div>
        </div>

        {/* Informações de Sessão */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Sessão Operacional Autenticada</span>
          </div>
          <p className="text-blue-800">
            Operador conectado: <strong>{usuario?.nome || 'Operador'}</strong> ({cargoAtual?.nome || 'Colaborador'})
            {origemPin && ' • Login rápido por PIN de terminal ativo'}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Botao variante="primario" tamanho="sm" onClick={aoFechar}>
            Fechar Configurações
          </Botao>
        </div>
      </div>
    </Modal>
  );
};
