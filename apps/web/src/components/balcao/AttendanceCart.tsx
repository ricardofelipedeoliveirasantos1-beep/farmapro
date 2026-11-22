import React, { useRef, useEffect } from 'react';
import {
  CartItemBalcao,
  CartTotals,
  CustomerInfo,
} from '../../types/balcao.js';
import {
  ShoppingCart,
  Trash2,
  User,
  Save,
  Tag,
  AlertTriangle,
  X,
  ArrowRight,
} from 'lucide-react';

interface AttendanceCartProps {
  itens: CartItemBalcao[];
  totais: CartTotals;
  cliente: CustomerInfo;
  ultimoItemAdicionado: CartItemBalcao | null;
  aoRemoverItem: (idx: number) => void;
  aoLimparSacola: () => void;
  aoSalvarPreVenda: () => void;
  aoAbrirCliente: () => void;
  aoAbrirDesconto: () => void;
  modoExclusao?: boolean;
  indiceItemExclusao?: number;
  aoAlternarModoExclusao?: () => void;
  aoSelecionarIndiceExclusao?: (idx: number) => void;
  aoConfirmarExclusaoItem?: (idx: number) => void;
}

export const AttendanceCart: React.FC<AttendanceCartProps> = ({
  itens,
  totais,
  cliente,
  ultimoItemAdicionado,
  aoLimparSacola,
  aoSalvarPreVenda,
  aoAbrirCliente,
  aoAbrirDesconto,
  modoExclusao = false,
  indiceItemExclusao = 0,
  aoAlternarModoExclusao,
  aoSelecionarIndiceExclusao,
  aoConfirmarExclusaoItem,
}) => {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Rolagem automática para acompanhar a seleção no modo F8
  useEffect(() => {
    if (modoExclusao && itemRefs.current[indiceItemExclusao]) {
      itemRefs.current[indiceItemExclusao]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [modoExclusao, indiceItemExclusao]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col h-full overflow-hidden select-none">
      {/* Topo da Sacola (Sem número PV durante a montagem) */}
      <div className="p-2.5 px-3 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white border-b border-blue-800 shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-200" />
            <div>
              <h3 className="font-black text-xs sm:text-sm tracking-tight leading-none">
                Sacola de Atendimento
              </h3>
              <span className="text-[9px] text-blue-200 font-medium">
                Conferência de Balcão para o Caixa
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="bg-white/20 text-white font-bold px-2 py-0.5 rounded">
              {totais.distinctItems} {totais.distinctItems === 1 ? 'item' : 'itens'}
            </span>
            <span className="bg-emerald-500/80 text-white font-black px-2 py-0.5 rounded">
              {totais.totalVolumes} {totais.totalVolumes === 1 ? 'vol' : 'vols'}
            </span>
          </div>
        </div>

        {/* Card Compacto do Cliente / Convênio */}
        <div
          onClick={aoAbrirCliente}
          className="bg-white/10 hover:bg-white/20 border border-white/15 rounded-md p-1 px-2 flex items-center justify-between cursor-pointer transition-colors group"
          title="Alterar Identificação do Cliente (F10)"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="w-3 h-3 text-blue-200 shrink-0" />
            <div className="truncate text-[11px] leading-tight">
              <span className="font-bold">{cliente.name}</span>
              <span className="text-[9px] text-blue-200 ml-1.5">
                {cliente.convenio} {cliente.cpf ? `• CPF: ${cliente.cpf}` : ''}
              </span>
            </div>
          </div>

          <span className="text-[9px] bg-white/20 group-hover:bg-white text-white group-hover:text-blue-900 font-bold px-1 py-0.2 rounded font-mono shrink-0">
            F10
          </span>
        </div>
      </div>

      {/* Faixa Informativa: Modo de Exclusão (F8) Ativo */}
      {modoExclusao && (
        <div className="bg-red-600 text-white px-3 py-1 flex items-center justify-between text-xs animate-in slide-in-from-top duration-200 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
            <div className="truncate">
              <strong className="text-[10px] font-black uppercase tracking-wider block leading-tight">
                SELECIONE O ITEM PARA EXCLUIR
              </strong>
              <span className="text-[9px] text-red-100 block truncate">
                Setas ↑/↓ selecionam • Enter confirma • ESC cancela
              </span>
            </div>
          </div>
          {aoAlternarModoExclusao && (
            <button
              type="button"
              onClick={aoAlternarModoExclusao}
              className="p-0.5 hover:bg-white/20 rounded text-white/90 hover:text-white transition-colors cursor-pointer"
              title="Cancelar modo de exclusão (ESC)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Destaque do Último Medicamento Adicionado (Topo) */}
      {!modoExclusao && ultimoItemAdicionado && (
        <div className="bg-emerald-50 border-b border-emerald-200/80 px-2.5 py-1 flex items-center justify-between text-xs animate-in fade-in duration-200 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-ping" />
            <div className="truncate">
              <span className="text-[9px] text-emerald-800 font-bold uppercase block leading-none">
                Último adicionado (Topo):
              </span>
              <span className="font-bold text-emerald-950 truncate block text-[10px]">
                {ultimoItemAdicionado.quantity}x {ultimoItemAdicionado.medication.descricao}
              </span>
            </div>
          </div>
          <span className="font-black text-emerald-800 font-mono text-[11px] shrink-0">
            {formatBRL(ultimoItemAdicionado.subtotal)}
          </span>
        </div>
      )}

      {/* LISTA DE ITENS NA SACOLA:
          Comporta visualmente até 12 produtos distintos antes de ativar a rolagem vertical interna.
          A rolagem vertical é ativada suavemente a partir do 13º produto distinto. */}
      <div className="flex-1 overflow-y-auto max-h-[500px] min-h-[220px] p-1.5 space-y-1 divide-y divide-slate-100">
        {itens.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400 p-4">
            <ShoppingCart className="w-8 h-8 text-slate-300 mb-1.5 stroke-[1.5]" />
            <p className="font-bold text-xs text-slate-600">A sacola está vazia</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Pesquise o medicamento, defina a quantidade e tecle Enter para incluir.
            </p>
          </div>
        ) : (
          itens.map((item, idx) => {
            const isFocadoExclusao = modoExclusao && indiceItemExclusao === idx;

            return (
              <div
                key={`${item.medication.id}-${idx}`}
                ref={el => (itemRefs.current[idx] = el)}
                onClick={() => {
                  if (modoExclusao) {
                    aoSelecionarIndiceExclusao?.(idx);
                  }
                }}
                className={`pt-1 first:pt-0 rounded-lg transition-all ${
                  isFocadoExclusao
                    ? 'p-1.5 bg-red-50/90 border-2 border-red-500 shadow-sm ring-1 ring-red-200'
                    : modoExclusao
                    ? 'p-1 hover:bg-slate-50 cursor-pointer border border-transparent'
                    : 'p-1 hover:bg-slate-50/70'
                }`}
              >
                {/* PRIMEIRA LINHA: Sequencial, Nome Completo (Sem reticências, com quebra natural) e Lixeira */}
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-start gap-1.5 flex-1 min-w-0">
                    <span
                      className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded shrink-0 mt-0.5 ${
                        isFocadoExclusao
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-[11px] sm:text-xs text-slate-900 leading-tight break-words">
                      {item.medication.descricao}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      if (aoConfirmarExclusaoItem) {
                        aoConfirmarExclusaoItem(idx);
                      }
                    }}
                    className={`p-1 rounded transition-colors shrink-0 cursor-pointer ${
                      isFocadoExclusao
                        ? 'text-red-700 bg-red-100 hover:bg-red-200 font-bold'
                        : 'text-slate-300 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title="Excluir este item da sacola"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* SEGUNDA LINHA: Exclusivamente Conferência (Sem controles + e -)
                    Cód. interno, EAN, Quantidade, Unitário e Total da Linha */}
                <div className="mt-0.5 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono pl-4 leading-tight">
                  <div className="flex items-center gap-1 text-slate-600">
                    <span>Cód. interno: <strong className="text-slate-800">{item.medication.codigoInterno}</strong></span>
                    <span>|</span>
                    <span>EAN: <strong className="text-slate-800">{item.medication.ean}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-700 ml-auto">
                    <span className="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.2 rounded">
                      Qtd.: {item.quantity}
                    </span>
                    <span>|</span>
                    <span>Unit.: {formatBRL(item.unitPrice)}</span>
                    <span>|</span>
                    <span className="font-black text-slate-900 text-[11px]">
                      Total: {formatBRL(item.subtotal)}
                    </span>
                  </div>
                </div>

                {/* Badge Contextual no Modo F8 */}
                {isFocadoExclusao && (
                  <div className="mt-1 flex items-center justify-between bg-red-100 text-red-900 px-2 py-0.5 rounded text-[9px] font-bold">
                    <span>Item Selecionado para Exclusão</span>
                    <span className="bg-red-600 text-white px-1.5 py-0.2 rounded uppercase tracking-wide">
                      Tecle Enter
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* TOTALIZADORES E AÇÕES (Fixos no rodapé da sacola, fora da área de rolagem) */}
      <div className="p-2.5 px-3 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
        <div className="space-y-0.5 text-xs text-slate-600">
          <div className="flex justify-between items-center text-[10px]">
            <span>Itens: <strong>{totais.distinctItems}</strong> | Volumes: <strong>{totais.totalVolumes}</strong></span>
            <span className="font-mono font-semibold">Subtotal: {formatBRL(totais.subtotalBruto)}</span>
          </div>

          <div className="flex justify-between items-center text-[10px]">
            <button
              type="button"
              onClick={aoAbrirDesconto}
              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              title="Aplicar desconto (Ctrl+D)"
            >
              <Tag className="w-3 h-3" />
              <span>Desconto (Ctrl+D):</span>
            </button>
            <span className="font-mono font-bold text-red-600">
              - {formatBRL(totais.discountTotal)}
            </span>
          </div>

          <div className="pt-1 border-t border-slate-200 flex justify-between items-baseline">
            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
              Total da Pré-Venda:
            </span>
            <span className="text-lg font-black text-emerald-700 font-mono">
              {formatBRL(totais.totalLiquido)}
            </span>
          </div>
        </div>

        {/* Botão de Salvar Pré-Venda (F2) */}
        <button
          type="button"
          onClick={aoSalvarPreVenda}
          disabled={itens.length === 0}
          className={`w-full py-2 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
            itens.length === 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white cursor-pointer shadow-emerald-200'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>SALVAR PRÉ-VENDA (F2)</span>
          <ArrowRight className="w-4 h-4 ml-auto" />
        </button>

        {/* Botões Auxiliares */}
        <div className="flex items-center gap-2 pt-0.5 text-[10px]">
          <button
            type="button"
            onClick={aoAlternarModoExclusao}
            disabled={itens.length === 0}
            className={`flex-1 py-1 px-2 border rounded-lg font-bold transition-colors text-center cursor-pointer ${
              modoExclusao
                ? 'bg-red-600 text-white border-red-700 shadow-2xs'
                : 'border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-600'
            }`}
            title="Selecionar e excluir produto da sacola (F8)"
          >
            <span className="flex items-center justify-center gap-1">
              <Trash2 className="w-3 h-3" />
              <span>{modoExclusao ? 'Cancelar Exclusão (ESC)' : 'Excluir Item (F8)'}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={aoLimparSacola}
            disabled={itens.length === 0}
            className="py-1 px-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 text-slate-500 rounded-lg font-semibold transition-colors cursor-pointer"
            title="Limpar todos os itens da sacola"
          >
            Limpar
          </button>
        </div>

        {/* Legenda Operacional Discreta */}
        <p className="text-[9px] text-slate-400 text-center leading-tight">
          Ambiente de Balcão • Comanda enviada para conferência no Caixa PDV
        </p>
      </div>
    </div>
  );
};
