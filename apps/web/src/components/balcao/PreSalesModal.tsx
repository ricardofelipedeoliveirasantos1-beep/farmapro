import React, { useState } from 'react';
import { PreVendaDemo } from '../../types/balcao.js';
import {
  ClipboardList,
  X,
  Clock,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Copy,
} from 'lucide-react';

interface PreSalesModalProps {
  aberto: boolean;
  preVendas: PreVendaDemo[];
  aoCancelarPreVenda: (id: string) => void;
  aoFechar: () => void;
}

export const PreSalesModal: React.FC<PreSalesModalProps> = ({
  aberto,
  preVendas,
  aoCancelarPreVenda,
  aoFechar,
}) => {
  const [preVendaSelecionada, setPreVendaSelecionada] = useState<PreVendaDemo | null>(null);
  const [copiado, setCopiado] = useState<string>('');

  if (!aberto) return null;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleCopiarCodigo = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiado(code);
      setTimeout(() => setCopiado(''), 2000);
    }).catch(() => {});
  };

  const getStatusBadge = (status: PreVendaDemo['status']) => {
    switch (status) {
      case 'PENDING_CASHIER':
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Aguardando Caixa
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paga no Caixa
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
            <XCircle className="w-3 h-3 text-slate-500" /> Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-800">
        {/* Topo do Modal */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-5 h-5 text-blue-200" />
            <div>
              <h3 className="font-black text-base tracking-tight leading-none">
                Fila & Histórico de Pré-Vendas (F4)
              </h3>
              <span className="text-[11px] text-blue-200 font-medium">
                Comandas emitidas pelo balcão para conferência no Caixa
              </span>
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

        {/* Conteúdo: Lista de Comandas e Detalhes */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs">
          {/* Lado Esquerdo: Fila de Comandas */}
          <div className="overflow-y-auto p-3 space-y-2 max-h-[60vh]">
            <h4 className="font-bold text-slate-500 text-[11px] uppercase tracking-wider mb-2">
              Comandas Recentes ({preVendas.length})
            </h4>

            {preVendas.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Nenhuma pré-venda gerada no momento.</p>
              </div>
            ) : (
              preVendas.map(pv => {
                const isSelected = preVendaSelecionada?.id === pv.id;

                return (
                  <div
                    key={pv.id}
                    onClick={() => setPreVendaSelecionada(pv)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 shadow-2xs'
                        : 'bg-slate-50/60 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm font-mono text-slate-900">
                          {pv.code}
                        </span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleCopiarCodigo(pv.code);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title="Copiar número da comanda"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {copiado === pv.code && (
                          <span className="text-[10px] text-emerald-600 font-bold">Copiado!</span>
                        )}
                      </div>

                      {getStatusBadge(pv.status)}
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold truncate max-w-[140px]">
                        {pv.customer.name}
                      </span>
                      <span className="font-black font-mono text-slate-900">
                        {formatBRL(pv.total)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>Vendedor: <strong>{pv.vendedorNome || pv.attendantName}</strong></span>
                      <span>{new Date(pv.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Lado Direito: Detalhes da Comanda Selecionada */}
          <div className="overflow-y-auto p-4 flex flex-col justify-between max-h-[60vh]">
            {preVendaSelecionada ? (
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Comanda de Balcão
                    </span>
                    <span className="text-xl font-black font-mono text-slate-900">
                      {preVendaSelecionada.code}
                    </span>
                  </div>

                  {getStatusBadge(preVendaSelecionada.status)}
                </div>

                {/* Cliente */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Cliente / Convênio
                  </span>
                  <span className="font-bold text-slate-800 block text-xs">
                    {preVendaSelecionada.customer.name}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {preVendaSelecionada.customer.convenio}
                  </span>
                </div>

                {/* Vendedor Responsável */}
                <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200">
                  <span className="text-[10px] text-blue-800 font-bold uppercase block">
                    Vendedor Responsável
                  </span>
                  <span className="font-bold text-slate-900 block text-xs">
                    {preVendaSelecionada.vendedorNome || preVendaSelecionada.attendantName}
                  </span>
                  <span className="text-[11px] text-blue-700 block">
                    Matrícula: {preVendaSelecionada.vendedorMatricula || 'N/A'}
                  </span>
                  {preVendaSelecionada.criadoPorNome && preVendaSelecionada.criadoPorNome !== preVendaSelecionada.vendedorNome && (
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Registrado no terminal por: {preVendaSelecionada.criadoPorNome}
                    </span>
                  )}
                </div>

                {/* Lista de Itens */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                    Itens ({preVendaSelecionada.items.length})
                  </span>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg p-2 bg-white">
                    {preVendaSelecionada.items.map((it, idx) => (
                      <div key={idx} className="py-1 text-xs flex justify-between items-center">
                        <span className="font-medium text-slate-800 truncate mr-2">
                          {it.quantity}x {it.medication.descricao}
                        </span>
                        <span className="font-mono font-bold text-slate-900 shrink-0">
                          {formatBRL(it.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totais */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>{formatBRL(preVendaSelecionada.subtotal)}</span>
                  </div>
                  {preVendaSelecionada.discount > 0 && (
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>Desconto:</span>
                      <span>- {formatBRL(preVendaSelecionada.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-slate-900 text-sm pt-1 border-t border-slate-200">
                    <span>Total:</span>
                    <span className="text-emerald-700">{formatBRL(preVendaSelecionada.total)}</span>
                  </div>
                </div>

                {/* Ações da Pré-venda */}
                {preVendaSelecionada.status === 'PENDING_CASHIER' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja realmente cancelar a comanda ${preVendaSelecionada.code}?`)) {
                          aoCancelarPreVenda(preVendaSelecionada.id);
                          setPreVendaSelecionada(prev => (prev ? { ...prev, status: 'CANCELLED' } : null));
                        }
                      }}
                      className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancelar Comanda (Liberar Atendimento)</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                <ClipboardList className="w-8 h-8 mb-2 text-slate-300" />
                <p>Selecione uma comanda à esquerda para visualizar os produtos e detalhes.</p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Apresente o código <strong>PV-...</strong> ao cliente para conferência no Caixa PDV.
          </span>
          <button
            type="button"
            onClick={aoFechar}
            className="px-4 py-1.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors"
          >
            Fechar (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
