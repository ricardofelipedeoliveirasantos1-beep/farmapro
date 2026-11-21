import React from 'react';
import {
  Botao,
  Badge,
} from '@farmapro/ui';
import {
  ShoppingCart,
  Pill,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Building2,
  User,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

interface PortalOperacionalScreenProps {
  aoNavegarCaixa: () => void;
  aoNavegarBalcao: () => void;
  aoAbrirLogin: () => void;
}

export const PortalOperacionalScreen: React.FC<PortalOperacionalScreenProps> = ({
  aoNavegarCaixa,
  aoNavegarBalcao,
  aoAbrirLogin,
}) => {
  const { usuario, filialAtiva, cargoAtual, logout, temPermissao } = useAuth();

  const podeAcessarCaixa = temPermissao('pdv:acesso');
  const podeAcessarBalcao =
    temPermissao('balcao:consultar') ||
    temPermissao('pre_venda:criar') ||
    temPermissao('pre_venda:consultar') ||
    temPermissao('pdv:acesso');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between select-none">
      {/* Topo do Portal */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
              +
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-900 tracking-tight">FarmaPro</span>
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                  SaaS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Portal de Acesso Operacional • Gestão Farmacêutica Inteligente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            {filialAtiva && (
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800">{filialAtiva.nome}</span>
              </div>
            )}

            {usuario ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-900 px-3 py-1.5 rounded-lg border border-blue-200">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-bold">{usuario.nome}</span>
                  <span className="text-[11px] text-blue-600">({cargoAtual?.nome || 'Colaborador'})</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 font-medium transition-colors border border-transparent hover:border-red-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <Botao variante="primario" tamanho="sm" onClick={aoAbrirLogin}>
                Identificar Colaborador
              </Botao>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-6xl mx-auto px-6 py-10 w-full flex-1 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Separação Operacional Independente
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Selecione a sua Estação de Trabalho
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            As operações de <strong>Caixa / PDV</strong> e <strong>Balcão de Atendimento</strong> são
            independentes. Escolha a interface apropriada para a sua função operacional no turno.
          </p>
        </div>

        {/* Grade com os Dois Terminais Operacionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* Card 1: ACESSAR CAIXA / PDV */}
          <div
            className={`group bg-white rounded-2xl border-2 transition-all p-6 flex flex-col justify-between shadow-xs ${
              podeAcessarCaixa
                ? 'border-blue-500 hover:border-blue-600 hover:shadow-md cursor-pointer'
                : 'border-slate-200 opacity-80 cursor-not-allowed bg-slate-50/50'
            }`}
            onClick={() => {
              if (podeAcessarCaixa) aoNavegarCaixa();
            }}
          >
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                {podeAcessarCaixa ? (
                  <Badge variante="sucesso" tamanho="sm">
                    Autorizado
                  </Badge>
                ) : (
                  <Badge variante="perigo" tamanho="sm">
                    Bloqueado
                  </Badge>
                )}
              </div>

              <h2 className="text-2xl font-black text-slate-900 mb-2">
                ACESSAR CAIXA / PDV
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Terminal exclusivo para operadores de caixa. Realize a conferência de comandas do balcão,
                leitura de códigos de barras (EAN), registro de pagamentos (PIX, Cartão, Dinheiro, Voucher),
                cálculo dinâmico de troco e emissão de cupons.
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>Conferência direta da pré-venda (comandas <strong>PV-XXXX</strong>)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>Cálculo automático de troco em tempo real</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>Baixa de estoque e auditoria contábil</span>
                </div>
              </div>
            </div>

            <div>
              {podeAcessarCaixa ? (
                <button
                  type="button"
                  onClick={aoNavegarCaixa}
                  className="w-full py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <span>Abrir Frente de Caixa (PDV)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-full py-3.5 px-4 rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-200">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Requer permissão de Operador de Caixa (pdv:acesso)</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: ACESSAR BALCÃO / CONSULTA */}
          <div
            className={`group bg-white rounded-2xl border-2 transition-all p-6 flex flex-col justify-between shadow-xs ${
              podeAcessarBalcao
                ? 'border-emerald-500 hover:border-emerald-600 hover:shadow-md cursor-pointer'
                : 'border-slate-200 opacity-80 cursor-not-allowed bg-slate-50/50'
            }`}
            onClick={() => {
              if (podeAcessarBalcao) aoNavegarBalcao();
            }}
          >
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Pill className="w-7 h-7" />
                </div>
                {podeAcessarBalcao ? (
                  <Badge variante="sucesso" tamanho="sm">
                    Autorizado
                  </Badge>
                ) : (
                  <Badge variante="perigo" tamanho="sm">
                    Bloqueado
                  </Badge>
                )}
              </div>

              <h2 className="text-2xl font-black text-slate-900 mb-2">
                ACESSAR BALCÃO / CONSULTA
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Terminal exclusivo para atendentes de balcão e farmacêuticos. Consulte medicamentos,
                princípios ativos, preços e estoques por filial, identifique lotes FEFO e prepare orçamentos e
                comandas de pré-venda com código único curto.
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Pesquisa rápida por nome, princípio ativo e código de barras</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Emissão de comanda com código curto (ex: <strong>PV-1048</strong>)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span className="text-emerald-800 font-semibold">Sem movimentação financeira ou abertura de gaveta</span>
                </div>
              </div>
            </div>

            <div>
              {podeAcessarBalcao ? (
                <button
                  type="button"
                  onClick={aoNavegarBalcao}
                  className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <span>Abrir Balcão & Consulta</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-full py-3.5 px-4 rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-200">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Requer permissão de Balconista (balcao:consultar)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informações de Isolamento e Segurança */}
        <div className="mt-12 bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>Isolamento Multiempresa RLS Ativo:</strong> Nenhum registro financeiro ou de estoque é compartilhado entre empresas.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Validade padrão de comandas: 120 minutos</span>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-400">
        FarmaPro SaaS • Sistema de Gestão Farmacêutica Inteligente • Modo Light
      </footer>
    </div>
  );
};
