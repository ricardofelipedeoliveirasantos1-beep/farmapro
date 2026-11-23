import React, { useRef, useEffect } from 'react';
import {
  CartItemBalcao,
  CartTotals,
  CustomerInfo,
  PreVendaDemo,
} from '../../types/balcao.js';
import {
  ShoppingCart,
  User,
  Trash2,
  ShoppingBag,
  Layers,
  Coins,
  FileText,
  Printer,
  AlertTriangle,
  X,
  Edit3,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface AttendanceCartProps {
  itens: CartItemBalcao[];
  totais: CartTotals;
  cliente: CustomerInfo;
  preVendaEmEdicao?: PreVendaDemo | null;
  aoDescartarEdicaoPreVenda?: () => void;
  aoRemoverItem?: (idx: number) => void;
  aoLimparSacola?: () => void;
  aoSalvarPreVenda: () => void;
  aoImprimirPreVenda: () => void;
  temUltimaPreVenda?: boolean;
  aoAbrirCliente: () => void;
  aoAbrirDesconto?: () => void;
  aoAlterarQuantidade?: (idx: number, novaQtd: number) => void;
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
  preVendaEmEdicao = null,
  aoDescartarEdicaoPreVenda,
  aoSalvarPreVenda,
  aoImprimirPreVenda,
  temUltimaPreVenda = false,
  aoAbrirCliente,
  aoAlterarQuantidade,
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

  // Regra de Rolagem Automática: A partir de 12 produtos distintos (>= 12), habilita rolagem vertical
  const deveHabilitarRolagem = itens.length >= 12;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-full overflow-hidden select-none w-full font-sans">
      {/* 1. TOPO DA SACOLA: "SACOLA / CUPOM PRÉ-VENDA" OU "SACOLA / PRÉ-VENDA (EM EDIÇÃO)" */}
      <div className="px-3 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-[#0a448d] stroke-[2.2] shrink-0" />
          <h3 className="font-black text-xs sm:text-sm tracking-wide uppercase text-slate-900 leading-none">
            {preVendaEmEdicao ? 'SACOLA / PRÉ-VENDA (EM EDIÇÃO)' : 'SACOLA / CUPOM PRÉ-VENDA'}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {preVendaEmEdicao && (
            <>
              {/* Badge Azul: Código da Pré-venda */}
              <span className="font-mono font-bold text-xs bg-[#e8f0fe] text-[#0c5fd1] px-2.5 py-1 rounded-lg border border-[#c2d7fa] shadow-2xs">
                {preVendaEmEdicao.code}
              </span>

              {/* Badge Âmbar: Em Edição */}
              <span className="font-bold text-xs bg-[#fef7e0] text-[#b06000] border border-[#fce8b2] px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#b06000]" />
                Em edição
              </span>
            </>
          )}

          {/* Identificação do Cliente em Cápsula Azul Moderna (F10) */}
          <button
            type="button"
            onClick={aoAbrirCliente}
            className="flex items-center gap-1.5 bg-[#0a448d] hover:bg-[#08356e] text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-98"
            title="Alterar Identificação do Cliente (F10)"
          >
            <User className="w-3.5 h-3.5 text-white/90 shrink-0" />
            <span className="truncate max-w-[130px] font-medium uppercase tracking-tight">{cliente.name}</span>
            <span className="font-mono font-bold text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded border border-white/25 leading-none">
              F10
            </span>
          </button>
        </div>
      </div>

      {/* Banner Oficial: Pré-Venda em Edição Ativa (Conforme Imagem 2 de Referência) */}
      {preVendaEmEdicao && (
        <div className="bg-[#fff8e1] border border-[#ffe082] rounded-xl p-2.5 px-3.5 mx-3 mt-2.5 mb-1 flex items-center justify-between text-xs shadow-2xs shrink-0 select-none animate-in slide-in-from-top duration-150">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <Edit3 className="w-4 h-4 text-amber-800 shrink-0" />
            </div>
            <div className="truncate">
              <div className="font-black text-slate-900 text-xs sm:text-[13px] truncate">
                Editando Pré-venda: <strong className="font-mono">{preVendaEmEdicao.code}</strong> – {cliente.name}
              </div>
              <div className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                Altere quantidades, adicione ou remova produtos. Ao salvar (F2), a pré-venda será atualizada.
              </div>
            </div>
          </div>
          {aoDescartarEdicaoPreVenda && (
            <button
              type="button"
              onClick={aoDescartarEdicaoPreVenda}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-300 rounded-lg text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer active:scale-98"
              title="Descartar edição e voltar ao atendimento limpo"
            >
              <X className="w-3.5 h-3.5 text-red-600" />
              <span>Descartar Edição</span>
            </button>
          )}
        </div>
      )}

      {/* 2. CABEÇALHO AZUL-MARINHO FIXO DA TABELA COM COLUNAS DEDICADAS (FASE 1) */}
      <div className="bg-[#0a448d] px-3 py-2 text-white font-bold text-[11px] sm:text-xs flex items-center justify-between shadow-xs shrink-0 select-none">
        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
          <span className="w-10 text-center uppercase tracking-wide shrink-0">ITEM</span>
          <span className="flex-1 uppercase tracking-wide">DESCRIÇÃO</span>
        </div>
        <div className="flex items-center gap-2 font-mono shrink-0">
          <span className="w-14 text-center uppercase tracking-wide">QTD</span>
          <span className="w-16 text-right uppercase tracking-wide">UNIT</span>
          <span className="w-20 text-right uppercase tracking-wide">TOTAL</span>
          <span className="w-7 text-center"></span>
        </div>
      </div>

      {/* Faixa Informativa: Modo de Cancelar/Exclusão (F8) Ativo */}
      {modoExclusao && (
        <div className="bg-red-600 text-white px-3 py-1.5 flex items-center justify-between text-xs animate-in slide-in-from-top duration-200 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
            <div className="truncate">
              <strong className="text-[10px] font-black uppercase tracking-wider block leading-tight">
                SELECIONE O ITEM PARA CANCELAR (F8)
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

      {/* 3. LISTA DE ITENS NA SACOLA:
          - Até 11 produtos: exibição normal sem rolagem.
          - A partir de 12 produtos: rolagem vertical habilitada somente nesta lista.
          - Coluna ITEM com espaço próprio (#N) evitando aperto do nome.
          - Coluna DESCRIÇÃO com nome em negrito maiúsculo + cód. interno e EAN.
          - Colunas QTD e TOTAL com cartões azul-claro de altura uniforme e proporção ideal.
          - Coluna UNIT perfeitamente alinhada.
          - Ícone de lixeira discreto em vermelho. */}
      <div
        className={`flex-1 min-h-0 p-2 sm:p-2.5 space-y-1.5 divide-y divide-slate-100 ${
          deveHabilitarRolagem ? 'overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200' : 'overflow-hidden'
        }`}
      >
        {itens.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center text-slate-400 p-4">
            <ShoppingCart className="w-12 h-12 text-slate-300 mb-2 stroke-[1.5]" />
            <p className="font-bold text-sm text-slate-600">A sacola está vazia</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
              Pesquise o medicamento, defina a quantidade e adicione à sacola.
            </p>
          </div>
        ) : (
          itens.map((item, idx) => {
            const isFocadoExclusao = modoExclusao && indiceItemExclusao === idx;
            const numeroExibicao = item.numeroSequencial ?? (itens.length - idx);

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
                    ? 'p-1.5 bg-red-50/90 border border-red-500 shadow-2xs ring-1 ring-red-200'
                    : modoExclusao
                    ? 'p-1 hover:bg-slate-50 cursor-pointer border border-transparent'
                    : 'p-1 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between gap-1 leading-tight">
                  {/* Coluna ITEM + Coluna DESCRIÇÃO */}
                  <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
                    {/* Espaço próprio para identificação numérica do ITEM */}
                    <span
                      className={`w-10 text-center text-[11px] font-mono font-bold px-1 py-0.5 rounded-md shrink-0 mt-0.5 ${
                        isFocadoExclusao
                          ? 'bg-red-600 text-white'
                          : 'bg-[#e8f1fc] text-[#0a4b9c] border border-blue-200/50'
                      }`}
                    >
                      #{numeroExibicao}
                    </span>

                    {/* Espaço amplo para a DESCRIÇÃO */}
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-bold text-xs sm:text-[13px] text-slate-900 leading-snug break-words uppercase"
                        title={item.medication.descricao}
                      >
                        {item.medication.descricao}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 leading-none">
                        <span>Cód. interno: <strong className="text-slate-600 font-semibold">{item.medication.codigoInterno}</strong></span>
                        <span>|</span>
                        <span>EAN: <strong className="text-slate-600 font-semibold">{item.medication.ean}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: QTD, UNIT, TOTAL, AÇÃO */}
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    {/* QTD: Campo interativo com digitação direta e botões de incremento/decremento conforme Imagem 2 */}
                    <div className="w-14 relative flex items-center shrink-0">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={item.quantity}
                        onChange={(e) => {
                          const apenasNum = e.target.value.replace(/\D/g, '');
                          if (apenasNum) {
                            const val = parseInt(apenasNum, 10);
                            if (val >= 1) {
                              aoAlterarQuantidade?.(idx, val);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (isNaN(val) || val < 1) {
                            aoAlterarQuantidade?.(idx, 1);
                          }
                        }}
                        className="w-full h-7 bg-white text-slate-900 border border-slate-300 rounded-lg text-center font-bold font-mono text-xs sm:text-[13px] focus:outline-none focus:border-[#0c5fd1] focus:ring-1 focus:ring-blue-300 py-0.5 pl-1 pr-4 shadow-2xs transition-colors"
                        title="Clique para digitar a quantidade"
                      />
                      <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center gap-0.5 pointer-events-auto">
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => aoAlterarQuantidade?.(idx, item.quantity + 1)}
                          className="text-slate-400 hover:text-[#0c5fd1] p-0.5 hover:bg-slate-100 rounded cursor-pointer leading-none"
                          title="Aumentar (+1)"
                        >
                          <ChevronUp className="w-2.5 h-2.5 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => aoAlterarQuantidade?.(idx, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                          className="text-slate-400 hover:text-[#0c5fd1] p-0.5 hover:bg-slate-100 rounded cursor-pointer leading-none disabled:opacity-25 disabled:cursor-not-allowed"
                          title="Diminuir (-1)"
                        >
                          <ChevronDown className="w-2.5 h-2.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>

                    {/* UNIT: Alinhado verticalmente abaixo do cabeçalho UNIT */}
                    <span className="w-16 text-right text-slate-700 font-bold text-xs sm:text-[13px]">
                      {formatPriceNum(item.unitPrice)}
                    </span>

                    {/* TOTAL: Cartão azul-claro com proporção e altura uniforme */}
                    <span className="w-20 text-right bg-[#e8f1fc] text-[#0a2540] border border-blue-200/60 font-black text-xs sm:text-sm py-1 px-2 rounded-lg shadow-2xs">
                      {formatPriceNum(item.subtotal)}
                    </span>

                    {/* AÇÃO: Lixeira discreta em vermelho */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        if (aoConfirmarExclusaoItem) {
                          aoConfirmarExclusaoItem(idx);
                        }
                      }}
                      className={`w-7 p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex justify-center items-center ${
                        isFocadoExclusao
                          ? 'text-red-700 bg-red-100 hover:bg-red-200 font-bold'
                          : 'text-red-500 hover:text-red-700 bg-red-50/50 hover:bg-red-100 border border-red-100/60'
                      }`}
                      title="Cancelar item (F8)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Badge Contextual no Modo F8 */}
                {isFocadoExclusao && (
                  <div className="mt-1 flex items-center justify-between bg-red-100 text-red-900 px-2 py-0.5 rounded text-[9px] font-bold">
                    <span>Item Selecionado para Cancelamento</span>
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

      {/* 4. RODAPÉ FIXO DA SACOLA (FASE 2):
          - Única faixa horizontal azul-marinho: ITENS: X | VOLUMES: Y | TOTAL: R$ Z
          - Botões F2 (Salvar em Azul) e F3 (Imprimir em Verde)
          - 100% fixo sem se deslocar durante a rolagem de itens. */}
      <div className="p-3 bg-white border-t border-slate-200/80 space-y-2.5 shrink-0 select-none">
        {/* Faixa Única Horizontal Azul-Marinho de Resumo (Exata à Imagem 1) */}
        <div className="bg-[#0a448d] rounded-xl p-2.5 px-4 text-white flex items-center justify-between shadow-md">
          {/* ITENS */}
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-200 shrink-0" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-100">
              ITENS: <strong className="text-white font-black font-mono text-sm sm:text-base ml-1">{totais.distinctItems}</strong>
            </span>
          </div>

          <span className="text-white/40 text-sm font-light select-none">|</span>

          {/* VOLUMES */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-200 shrink-0" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-100">
              VOLUMES: <strong className="text-white font-black font-mono text-sm sm:text-base ml-1">{totais.totalVolumes}</strong>
            </span>
          </div>

          <span className="text-white/40 text-sm font-light select-none">|</span>

          {/* TOTAL */}
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-100">
              TOTAL: <strong className="text-white font-black italic tracking-tight font-sans text-base sm:text-lg ml-1">{formatBRL(totais.totalLiquido)}</strong>
            </span>
          </div>
        </div>

        {/* Botões Principais: SALVAR PRÉ-VENDA (F2) e IMPRIMIR PRÉ-VENDA (F3) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={aoSalvarPreVenda}
            disabled={itens.length === 0}
            className={`py-3 px-3 rounded-xl font-black text-xs sm:text-sm text-center shadow-md transition-all flex items-center justify-center gap-2 ${
              itens.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-[#0c5fd1] hover:bg-[#0a4ea8] text-white cursor-pointer active:scale-98 shadow-blue-200/50'
            }`}
            title={
              preVendaEmEdicao
                ? `Atualizar alterações na pré-venda ${preVendaEmEdicao.code} (F2)`
                : 'Salvar pré-venda e gerar comanda (F2)'
            }
          >
            <FileText className="w-4 h-4 text-white shrink-0" />
            <span>{preVendaEmEdicao ? 'ATUALIZAR PRÉ-VENDA (F2)' : 'SALVAR PRÉ-VENDA (F2)'}</span>
          </button>

          <button
            type="button"
            onClick={aoImprimirPreVenda}
            disabled={itens.length === 0 && !temUltimaPreVenda}
            className={`py-3 px-3 rounded-xl font-black text-xs sm:text-sm text-center shadow-md transition-all flex items-center justify-center gap-2 ${
              itens.length === 0 && !temUltimaPreVenda
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-[#128a43] hover:bg-[#0e7036] text-white cursor-pointer active:scale-98 shadow-emerald-200/50'
            }`}
            title="Imprimir pré-venda salva (F3)"
          >
            <Printer className="w-4 h-4 text-white shrink-0" />
            <span>IMPRIMIR PRÉ-VENDA (F3)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
