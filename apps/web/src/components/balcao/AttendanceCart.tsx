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
  AlertCircle,
  ArrowRight,
  AlertTriangle,
  X,
} from 'lucide-react';

interface AttendanceCartProps {
  itens: CartItemBalcao[];
  totais: CartTotals;
  cliente: CustomerInfo;
  ultimoItemAdicionado: CartItemBalcao | null;
  aoAlterarQuantidade: (idx: number, delta: number) => void;
  aoRemoverItem: (idx: number) => void;
  aoRemoverUltimoItem?: () => void;
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
  aoAlterarQuantidade,
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
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col h-full max-h-[calc(100vh-100px)] overflow-hidden select-none">
      {/* Topo da Sacola (Sem número PV durante a montagem) */}
      <div className="p-3 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white border-b border-blue-800 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-200" />
            <div>
              <h3 className="font-black text-sm tracking-tight leading-none">
                Sacola de Atendimento
              </h3>
              <span className="text-[10px] text-blue-200 font-medium">
                Comanda de Balcão para o Caixa
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
              {totais.distinctItems} {totais.distinctItems === 1 ? 'item' : 'itens'}
            </span>
            <span className="bg-emerald-500/80 text-white text-[11px] font-black px-2 py-0.5 rounded-md">
              {totais.totalVolumes} {totais.totalVolumes === 1 ? 'vol' : 'vols'}
            </span>
          </div>
        </div>

        {/* Card do Cliente / Convênio */}
        <div
          onClick={aoAbrirCliente}
          className="mt-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg p-1.5 px-2 flex items-center justify-between cursor-pointer transition-colors group"
          title="Alterar Identificação do Cliente (F10)"
        >
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-3.5 h-3.5 text-blue-200 shrink-0" />
            <div className="truncate">
              <span className="text-xs font-bold block truncate leading-tight">
                {cliente.name}
              </span>
              <span className="text-[10px] text-blue-150 block truncate">
                {cliente.convenio} {cliente.cpf ? `• CPF: ${cliente.cpf}` : ''}
              </span>
            </div>
          </div>

          <span className="text-[10px] bg-white/20 group-hover:bg-white text-white group-hover:text-blue-900 font-bold px-1.5 py-0.5 rounded transition-colors shrink-0 font-mono">
            F10
          </span>
        </div>
      </div>

      {/* Faixa Informativa: Modo de Exclusão (F8) Ativo */}
      {modoExclusao && (
        <div className="bg-red-600 text-white px-3 py-1.5 flex items-center justify-between text-xs animate-in slide-in-from-top duration-200 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
            <div className="truncate">
              <strong className="text-[11px] font-black uppercase tracking-wider block leading-tight">
                SELECIONE O ITEM PARA EXCLUIR
              </strong>
              <span className="text-[10px] text-red-100 block truncate">
                Navegue com as setas ↑ / ↓ e tecle Enter para confirmar
              </span>
            </div>
          </div>
          {aoAlternarModoExclusao && (
            <button
              type="button"
              onClick={aoAlternarModoExclusao}
              className="p-1 hover:bg-white/20 rounded text-white/90 hover:text-white transition-colors"
              title="Cancelar modo de exclusão (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Destaque do Último Medicamento Adicionado (apenas se não estiver no modo exclusão) */}
      {!modoExclusao && ultimoItemAdicionado && (
        <div className="bg-emerald-50 border-b border-emerald-200/80 px-3 py-1.5 flex items-center justify-between text-xs animate-in fade-in duration-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-ping" />
            <div className="truncate">
              <span className="text-[9px] text-emerald-800 font-bold uppercase block leading-none">
                Último adicionado (Topo da Sacola):
              </span>
              <span className="font-bold text-emerald-950 truncate block text-[11px]">
                {ultimoItemAdicionado.quantity}x {ultimoItemAdicionado.medication.descricao}
              </span>
            </div>
          </div>
          <span className="font-black text-emerald-800 font-mono text-xs shrink-0">
            {formatBRL(ultimoItemAdicionado.subtotal)}
          </span>
        </div>
      )}

      {/* Lista de Itens na Sacola (Acomoda visualmente até 12 produtos antes de ativar barra de rolagem) */}
      <div className="flex-1 overflow-y-auto max-h-[580px] p-2 space-y-1.5 divide-y divide-slate-100">
        {itens.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400 p-4">
            <ShoppingCart className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
            <p className="font-bold text-xs text-slate-600">A sacola está vazia</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pesquise o produto e tecle Enter duas vezes para incluir na comanda.
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
                className={`pt-1.5 first:pt-0 rounded-lg transition-all ${
                  isFocadoExclusao
                    ? 'p-2 bg-red-50/90 border-2 border-red-500 shadow-md ring-2 ring-red-200'
                    : modoExclusao
                    ? 'p-1.5 hover:bg-slate-50 cursor-pointer border border-transparent'
                    : 'p-1 hover:bg-slate-50/60'
                }`}
              >
                {/* PRIMEIRA LINHA: Número Sequencial, Nome Completo (Sem cortes ou reticências) e Lixeira */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-start gap-1.5 flex-1 min-w-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                        isFocadoExclusao
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-xs text-slate-900 leading-snug break-words">
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
                    className={`p-1 rounded transition-colors shrink-0 ${
                      isFocadoExclusao
                        ? 'text-red-700 bg-red-100 hover:bg-red-200 font-bold'
                        : 'text-slate-300 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title="Excluir este item da sacola"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* SEGUNDA LINHA: Código Interno, EAN Completo, Quantidade, Valor Unitário e Valor Total Multiplicado */}
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-600 font-medium pl-6">
                  {/* Códigos Interno e EAN */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                    <span>
                      Cód. interno: <strong className="text-slate-700 font-bold">{item.medication.codigoInterno}</strong>
                    </span>
                    <span>|</span>
                    <span>
                      EAN: <strong className="text-slate-700 font-bold">{item.medication.ean}</strong>
                    </span>
                  </div>

                  {/* Quantidade compacta, Unitário e Total */}
                  <div className="flex items-center gap-2 ml-auto">
                    {/* Controles compactos de alteração de quantidade */}
                    <div className="flex items-center border border-slate-200 rounded bg-slate-50 overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          aoAlterarQuantidade(idx, -1);
                        }}
                        className="px-1.5 py-0.5 hover:bg-slate-200 text-slate-600 font-bold transition-colors"
                        title="Diminuir quantidade"
                      >
                        -
                      </button>
                      <span className="px-1.5 py-0.5 font-bold font-mono text-[11px] text-slate-800 bg-white">
                        Qtd.: {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          aoAlterarQuantidade(idx, 1);
                        }}
                        className="px-1.5 py-0.5 hover:bg-slate-200 text-slate-600 font-bold transition-colors"
                        title="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">
                      Unitário: {formatBRL(item.unitPrice)}
                    </span>
                    <span className="font-mono font-black text-slate-900 text-xs">
                      Total: {formatBRL(item.subtotal)}
                    </span>
                  </div>
                </div>

                {/* Badge Contextual no Modo F8 */}
                {isFocadoExclusao && (
                  <div className="mt-1.5 flex items-center justify-between bg-red-100 text-red-900 px-2 py-0.5 rounded text-[10px] font-bold">
                    <span>Item Selecionado para Exclusão</span>
                    <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">
                      Tecle Enter
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Totalizadores e Ações (Fixos no rodapé da sacola) */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
        <div className="space-y-1 text-xs text-slate-600">
          <div className="flex justify-between items-center text-[11px]">
            <span>Itens: <strong>{totais.distinctItems}</strong> | Volumes: <strong>{totais.totalVolumes}</strong></span>
            <span className="font-mono font-semibold">Subtotal: {formatBRL(totais.subtotalBruto)}</span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
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

          <div className="pt-1 border-t border-slate-200/80 flex justify-between items-baseline">
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
          className={`w-full py-2.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
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
        <div className="flex items-center gap-2 pt-0.5 text-[11px]">
          <button
            type="button"
            onClick={aoAlternarModoExclusao}
            disabled={itens.length === 0}
            className={`flex-1 py-1 px-2 border rounded-lg font-semibold transition-colors text-center ${
              modoExclusao
                ? 'bg-red-600 text-white border-red-700 shadow-2xs font-bold'
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
            className="py-1 px-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 text-slate-500 rounded-lg font-semibold transition-colors"
            title="Limpar todos os itens da sacola"
          >
            Limpar
          </button>
        </div>

        {/* Alerta de Isolamento de Balcão */}
        <div className="bg-blue-50/70 border border-blue-200/60 rounded-lg p-1.5 text-[9px] text-blue-900/80 leading-relaxed flex items-start gap-1">
          <AlertCircle className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Ambiente Exclusivo de Balcão:</strong> Salvar gera a comanda para pagamento no
            Caixa PDV. Recebimento financeiro e baixa fiscal não são realizados nesta tela.
          </span>
        </div>
      </div>
    </div>
  );
};
