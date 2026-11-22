import React, { useRef, useEffect } from 'react';
import {
  CartItemBalcao,
  CartTotals,
  CustomerInfo,
} from '../../types/balcao.js';
import {
  Trash2,
  User,
  AlertTriangle,
  X,
} from 'lucide-react';

interface AttendanceCartProps {
  itens: CartItemBalcao[];
  totais: CartTotals;
  cliente: CustomerInfo;
  ultimoItemAdicionado: CartItemBalcao | null;
  aoRemoverItem: (idx: number) => void;
  aoLimparSacola: () => void;
  aoSalvarPreVenda: () => void;
  aoImprimirPreVenda?: () => void;
  temUltimaPreVenda?: boolean;
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
  aoLimparSacola: _aoLimparSacola,
  aoSalvarPreVenda,
  aoImprimirPreVenda,
  temUltimaPreVenda = false,
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

  const formatPriceNum = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm flex flex-col h-full overflow-hidden select-none">
      {/* 1. CABEÇALHO OFICIAL: "SACOLA / CUPOM PRÉ-VENDA" COM LINHA PONTILHADA E COLUNAS (IMAGEM 1) */}
      <div className="bg-[#fffef7] text-slate-800 shrink-0 border-b border-dashed border-amber-300">
        <div className="p-2.5 px-3 flex items-center justify-between">
          <h3 className="font-mono font-black text-xs sm:text-sm tracking-wider uppercase text-slate-900 leading-none">
            SACOLA / CUPOM PRÉ-VENDA
          </h3>

          <div
            onClick={aoAbrirCliente}
            className="flex items-center gap-1.5 bg-amber-100/60 hover:bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md text-[10px] cursor-pointer transition-colors"
            title="Alterar Identificação do Cliente (F10)"
          >
            <User className="w-3 h-3 text-amber-700 shrink-0" />
            <span className="font-bold truncate max-w-[130px]">{cliente.name}</span>
            <span className="font-mono font-bold text-[9px] bg-amber-200/80 px-1 rounded ml-0.5">F10</span>
          </div>
        </div>

        {/* Barra de Colunas do Cupom: ITEM / DESCRIÇÃO | QTD | UNIT | TOTAL (Imagem 1) */}
        <div className="bg-slate-100/90 px-3 py-1 text-[10px] font-mono font-bold text-slate-600 flex items-center justify-between border-t border-slate-200/60">
          <span className="flex-1">ITEM / DESCRIÇÃO</span>
          <div className="flex items-center gap-2 font-mono shrink-0">
            <span className="w-7 text-center">QTD</span>
            <span className="w-12 text-right">UNIT</span>
            <span className="w-14 text-right">TOTAL</span>
            <span className="w-5"></span>
          </div>
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

      {/* Destaque Sutil do Último Medicamento Adicionado (Topo) */}
      {!modoExclusao && ultimoItemAdicionado && (
        <div className="bg-emerald-50/80 border-b border-emerald-200/60 px-3 py-0.5 flex items-center justify-between text-[10px] shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-emerald-800 font-bold uppercase text-[9px] shrink-0">Último no topo:</span>
            <span className="font-bold text-emerald-950 truncate text-[10px]">
              {ultimoItemAdicionado.quantity}x {ultimoItemAdicionado.medication.descricao}
            </span>
          </div>
          <span className="font-black text-emerald-800 font-mono text-[10px] shrink-0 ml-1">
            {formatBRL(ultimoItemAdicionado.subtotal)}
          </span>
        </div>
      )}

      {/* 2. LISTA DE ITENS NA SACOLA (IMAGEM 2):
          Organização compacta com colunas alinhadas: cabem 12 produtos distintos visíveis antes de ativar a rolagem.
          A rolagem vertical é ativada suavemente a partir do 13º produto distinto. */}
      <div className="flex-1 overflow-y-auto min-h-0 p-1.5 space-y-0.5 divide-y divide-slate-100">
        {itens.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400 p-4">
            <p className="font-bold text-xs text-slate-600">A sacola está vazia</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Pesquise o medicamento, informe a quantidade e tecle Enter para incluir.
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
                className={`pt-1 first:pt-0 rounded-md transition-all ${
                  isFocadoExclusao
                    ? 'p-1 bg-red-50/90 border border-red-500 shadow-2xs ring-1 ring-red-200'
                    : modoExclusao
                    ? 'p-1 hover:bg-slate-50 cursor-pointer border border-transparent'
                    : 'p-1 hover:bg-slate-50/70'
                }`}
              >
                {/* PRIMEIRA LINHA: Item/Descrição | QTD | UNIT | TOTAL | Lixeira (Alinhados às colunas) */}
                <div className="flex items-center justify-between gap-1 leading-tight">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span
                      className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded shrink-0 ${
                        isFocadoExclusao
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span
                      className="font-bold text-[11px] text-slate-900 truncate"
                      title={item.medication.descricao}
                    >
                      {item.medication.descricao}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[10px] shrink-0">
                    <span className="w-7 text-center bg-slate-100 text-slate-800 font-bold px-1 py-0.2 rounded">
                      {item.quantity}
                    </span>
                    <span className="w-12 text-right text-slate-600 font-medium">
                      {formatPriceNum(item.unitPrice)}
                    </span>
                    <span className="w-14 text-right font-black text-slate-900">
                      {formatPriceNum(item.subtotal)}
                    </span>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        if (aoConfirmarExclusaoItem) {
                          aoConfirmarExclusaoItem(idx);
                        }
                      }}
                      className={`w-5 p-0.5 rounded transition-colors shrink-0 cursor-pointer flex justify-center ${
                        isFocadoExclusao
                          ? 'text-red-700 bg-red-100 hover:bg-red-200 font-bold'
                          : 'text-slate-300 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title="Excluir este item da sacola"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* SEGUNDA LINHA: Em linha única estrita (Cód. interno + EAN), sem quebra para 3ª linha */}
                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono pl-5 leading-none mt-0.5 truncate">
                  <span>Cód. interno: <strong className="text-slate-600 font-semibold">{item.medication.codigoInterno}</strong></span>
                  <span>|</span>
                  <span>EAN: <strong className="text-slate-600 font-semibold">{item.medication.ean}</strong></span>
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

      {/* 3. PARTE FINAL FIXADA NO RODAPÉ SEM PRECISAR ROLAR PARA BAIXO (IMAGEM 3) */}
      <div className="p-2.5 px-3 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
        {/* Linha 1: Caixas de ITENS e VOLUMES (Imagem 3) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white border border-slate-200/90 rounded-xl p-2 px-3 flex items-center justify-between shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              ITENS
            </span>
            <span className="text-base font-black font-mono text-blue-900">
              {totais.distinctItems}
            </span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-2 px-3 flex items-center justify-between shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              VOLUMES
            </span>
            <span className="text-base font-black font-mono text-blue-900">
              {totais.totalVolumes}
            </span>
          </div>
        </div>

        {/* Linha 2: Banner Azul Escuro TOTAL DA SACOLA (Imagem 3) */}
        <div className="bg-[#1a365d] rounded-xl p-2.5 px-4 text-white flex items-center justify-between shadow-sm">
          <span className="text-xs font-black uppercase tracking-wider text-blue-100">
            TOTAL DA SACOLA
          </span>
          <span className="text-2xl font-black italic tracking-tight font-mono text-white">
            {formatBRL(totais.totalLiquido)}
          </span>
        </div>

        {/* Linha 3: Atalhos de Desconto e Cancelar Item (Imagem 3) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={aoAbrirDesconto}
            className="py-1.5 px-2 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-xl font-bold text-xs text-amber-800 transition-colors shadow-2xs text-center cursor-pointer"
            title="Aplicar desconto na sacola (Ctrl+D)"
          >
            Desconto (Ctrl+D)
          </button>

          <button
            type="button"
            onClick={aoAlternarModoExclusao}
            disabled={itens.length === 0}
            className={`py-1.5 px-2 bg-white border rounded-xl font-bold text-xs transition-colors shadow-2xs text-center cursor-pointer ${
              modoExclusao
                ? 'bg-red-600 text-white border-red-700'
                : 'border-slate-200 hover:bg-red-50/50 hover:border-red-300 text-red-600 disabled:opacity-50'
            }`}
            title="Selecionar e excluir produto da sacola (F8)"
          >
            {modoExclusao ? 'Cancelar (ESC)' : 'Canc. Item (F8)'}
          </button>
        </div>

        {/* Linha 4: Botões Principais Salvar Pré-Venda (F2) e Imprimir Pré-Venda (F3) (Imagem 3) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={aoSalvarPreVenda}
            disabled={itens.length === 0}
            className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm text-center shadow-sm transition-all flex items-center justify-center gap-1.5 ${
              itens.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-98'
            }`}
            title="Salvar pré-venda e gerar comanda (F2)"
          >
            Salvar (F2)
          </button>

          <button
            type="button"
            onClick={aoImprimirPreVenda}
            disabled={itens.length === 0 && !temUltimaPreVenda}
            className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm text-center shadow-sm transition-all flex items-center justify-center gap-1.5 ${
              itens.length === 0 && !temUltimaPreVenda
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer active:scale-98'
            }`}
            title="Imprimir pré-venda (F3)"
          >
            Imprimir (F3)
          </button>
        </div>
      </div>
    </div>
  );
};
