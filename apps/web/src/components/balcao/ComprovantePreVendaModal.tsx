import React, { useState, useEffect } from 'react';
import { PreVendaDemo } from '../../types/balcao.js';
import { CheckCircle2, X, Printer, ArrowRight } from 'lucide-react';
import { BarcodeCode128 } from '../../utils/barcodeGenerator.js';

interface ComprovantePreVendaModalProps {
  preVenda: PreVendaDemo | null;
  aoFechar: () => void;
}

export type FormatoImpressao = '80mm' | '58mm' | 'A4';

export const ComprovantePreVendaModal: React.FC<ComprovantePreVendaModalProps> = ({
  preVenda,
  aoFechar,
}) => {
  const [formato, setFormato] = useState<FormatoImpressao>('80mm');

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleImprimir = () => {
    window.print();
  };

  useEffect(() => {
    if (!preVenda) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        handleImprimir();
      } else if (e.key === 'Escape' || e.key === 'Enter') {
        // ESC fecha o comprovante, Enter avança para Novo Atendimento
        e.preventDefault();
        aoFechar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [preVenda, aoFechar]);

  if (!preVenda) return null;

  const totalVolumes = preVenda.items.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comprovante-pv-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-2xs overflow-y-auto animate-in fade-in duration-150 print:p-0 print:bg-white print:static"
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full overflow-hidden text-slate-800 my-auto print:border-none print:shadow-none print:w-full print:m-0 ${
          formato === 'A4'
            ? 'max-w-3xl'
            : formato === '58mm'
            ? 'max-w-xs'
            : 'max-w-md'
        }`}
      >
        {/* Topo Informativo na Tela (Oculto na Impressão Física) */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-3.5 text-white text-center relative print:hidden">
          <button
            type="button"
            onClick={aoFechar}
            className="absolute right-2.5 top-2.5 p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-1 text-white">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <h3 id="comprovante-pv-titulo" className="text-base font-black tracking-tight leading-none">
            Pré-Venda Emitida com Sucesso!
          </h3>
          <p className="text-[11px] text-emerald-100 mt-1">
            Comanda gerada para encaminhamento ao Caixa PDV
          </p>

          {/* Seletor de Formato de Impressão */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-bold">
            <span className="text-emerald-150 text-[10px] mr-1">Formato de Papel:</span>
            <button
              type="button"
              onClick={() => setFormato('80mm')}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                formato === '80mm'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Térmica 80 mm
            </button>
            <button
              type="button"
              onClick={() => setFormato('58mm')}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                formato === '58mm'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Térmica 58 mm
            </button>
            <button
              type="button"
              onClick={() => setFormato('A4')}
              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                formato === 'A4'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Folha A4
            </button>
          </div>
        </div>

        {/* ÁREA OFICIAL DO COMPROVANTE (IMPRESSÃO E TELA) */}
        <div
          id="farmapro-comprovante-print"
          className={`p-4 space-y-3 text-xs bg-white text-slate-800 ${
            formato === '58mm' ? 'text-[10px] leading-tight' : ''
          }`}
        >
          {/* 1. Cabeçalho Institucional do Comprovante */}
          <div className="text-center border-b border-slate-300 pb-2.5 space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-5 h-5 rounded bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                +
              </div>
              <span className="font-black text-sm tracking-tight text-slate-900">
                FarmaPro SaaS
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
              Gestão Farmacêutica Inteligente
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Unidade 01 – Centro (Matriz) • CNPJ: 12.345.678/0001-90
            </p>
            <div className="pt-1">
              <span className="font-black text-xs uppercase bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded border border-amber-300 block">
                PRÉ-VENDA — NÃO É DOCUMENTO DE VENDA CONCLUÍDA
              </span>
            </div>
          </div>

          {/* 2. Destaque do Número PV e Código de Barras Oficial */}
          <div className="bg-slate-50 border-2 border-dashed border-blue-300 rounded-xl p-3 text-center space-y-1.5 print:border-slate-800 print:bg-transparent">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Número da Comanda / Pré-Venda
            </span>
            <span className="text-3xl font-black font-mono text-blue-800 tracking-tight block print:text-black">
              {preVenda.code}
            </span>

            {/* Código de barras Code 128 vetorial de alta nitidez */}
            <div className="pt-1 flex flex-col items-center justify-center">
              <BarcodeCode128 value={preVenda.code} height={42} showText={false} />
              <span className="text-[10px] font-mono text-slate-500 tracking-widest mt-1 block">
                *{preVenda.code}*
              </span>
            </div>
            <span className="text-[9px] text-slate-400 block">
              (Apresente ou digite este código no Caixa PDV para localizar os produtos)
            </span>
          </div>

          {/* 3. Dados do Atendimento e Vendedor Responsável */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-slate-700 text-[11px] print:bg-transparent print:border-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Cliente:</span>
              <strong className="text-slate-900 font-bold">{preVenda.customer.name}</strong>
            </div>
            {preVenda.customer.cpf && (
              <div className="flex justify-between items-center font-mono text-[10px]">
                <span className="text-slate-500">CPF:</span>
                <span>{preVenda.customer.cpf}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500">Convênio:</span>
              <span>{preVenda.customer.convenio}</span>
            </div>
            {/* Destaque do Vendedor Responsável pelo Atendimento */}
            <div className="bg-amber-50/60 print:bg-transparent border border-amber-200/80 print:border-slate-400 rounded-lg p-2 text-center my-1">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">
                Atendente / Vendedor Responsável
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 font-mono tracking-wide block mt-0.5 print:text-black">
                {preVenda.vendedorMatricula ? `[MATRÍCULA: ${preVenda.vendedorMatricula}] ` : ''}
                {preVenda.vendedorNome || preVenda.attendantName}
              </span>
            </div>
            {preVenda.criadoPorNome && preVenda.criadoPorNome !== preVenda.vendedorNome && (
              <div className="flex justify-between items-center text-[9px] text-slate-400">
                <span>Registrado no terminal por:</span>
                <span>{preVenda.criadoPorNome}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
              <span>Data/Hora Emissão:</span>
              <span>{new Date(preVenda.createdAt).toLocaleString('pt-BR')}</span>
            </div>
          </div>

          {/* 4. Lista Vertical Completa de Produtos para Conferência no Caixa */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white print:border-slate-400">
            <div className="bg-slate-100 p-2 font-bold text-[11px] text-slate-800 uppercase tracking-wider flex justify-between border-b border-slate-200">
              <span>Relação de Produtos da Comanda ({preVenda.items.length})</span>
              <span>Conferência de Balcão</span>
            </div>

            <div className="divide-y divide-slate-200 print:divide-slate-300 text-xs max-h-[420px] overflow-y-auto print:max-h-none print:overflow-visible">
              {preVenda.items.map((it, idx) => {
                const seq = it.numeroSequencial || (idx + 1);
                return (
                  <div
                    key={`${it.medication.id}-${seq}-${idx}`}
                    className="p-2.5 space-y-1.5 print:break-inside-avoid bg-white hover:bg-slate-50/50 transition-colors"
                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                  >
                    {/* Linha 1: Sequencial de Inclusão e Nome Completo */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <span className="font-mono font-black text-xs text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 print:border-slate-400 print:bg-transparent print:text-black shrink-0">
                          #{seq}
                        </span>
                        <strong className="text-slate-900 font-bold text-xs sm:text-sm leading-snug break-words">
                          {it.medication.descricao}
                        </strong>
                      </div>
                    </div>

                    {/* Bloco Vertical de Dados e Conferência (Código, EAN, Qtd e Unitário) */}
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 font-mono pl-7">
                      <div>
                        <span className="text-slate-400">Código interno: </span>
                        <strong className="text-slate-800 font-semibold">{it.medication.codigoInterno}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">EAN: </span>
                        <strong className="text-slate-800 font-semibold">{it.medication.ean}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Quantidade: </span>
                        <strong className="text-slate-900 font-bold">{it.quantity} un</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Valor unitário: </span>
                        <strong className="text-slate-800 font-semibold">{formatBRL(it.unitPrice)}</strong>
                      </div>
                    </div>

                    {/* Total da Linha em Destaque */}
                    <div className="flex justify-end items-center pt-1 border-t border-dashed border-slate-200 pl-7 text-xs font-mono">
                      <span className="text-slate-500 mr-2 text-[11px]">Total do Item:</span>
                      <strong className="font-black text-slate-950 text-sm print:text-black">
                        {formatBRL(it.subtotal)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Totalizadores Finais do Comprovante */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 font-mono text-xs print:bg-transparent print:border-slate-300">
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Produtos Distintos:</span>
              <strong className="text-slate-800">{preVenda.items.length}</strong>
            </div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Total de Unidades (Volumes):</span>
              <strong className="text-slate-800">{totalVolumes}</strong>
            </div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Subtotal Bruto:</span>
              <strong className="text-slate-800">{formatBRL(preVenda.subtotal)}</strong>
            </div>
            {preVenda.discount > 0 && (
              <div className="flex justify-between text-red-600 font-bold text-[11px]">
                <span>Desconto Aplicado:</span>
                <span>- {formatBRL(preVenda.discount)}</span>
              </div>
            )}
            <div className="pt-1.5 border-t border-slate-300 flex justify-between font-black text-sm text-slate-900">
              <span className="font-sans">Total a Pagar no Caixa:</span>
              <span className="text-emerald-700 font-mono text-base print:text-black">
                {formatBRL(preVenda.total)}
              </span>
            </div>
          </div>

          {/* 6. Identificação do Vendedor e PV no Rodapé do Comprovante */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200 text-center space-y-0.5 print:bg-transparent print:border-slate-300 font-mono text-[10px]">
            <div>
              <span className="text-slate-500">Comanda: </span>
              <strong className="text-slate-900 font-bold">{preVenda.code}</strong>
              <span className="mx-1.5">•</span>
              <span className="text-slate-500">Atendente: </span>
              <strong className="text-slate-900 font-bold">
                {preVenda.vendedorMatricula ? `[${preVenda.vendedorMatricula}] ` : ''}
                {preVenda.vendedorNome || preVenda.attendantName}
              </strong>
            </div>
          </div>

          {/* 7. Instrução Operacional de Rodapé */}
          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-center space-y-1 print:border-slate-400 print:bg-transparent">
            <p className="text-[11px] text-blue-900 font-black uppercase leading-tight print:text-black">
              Apresentar esta pré-venda no Caixa PDV para pagamento e finalização.
            </p>
            <p className="text-[9px] text-blue-700 print:text-slate-500">
              Ambiente de Balcão • Os produtos estão reservados para conferência e emissão do cupom fiscal no Caixa.
            </p>
          </div>
        </div>

        {/* 7. Barra de Ações (Oculta na Impressão Física) */}
        <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleImprimir}
            className="py-2.5 px-4 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            title="Imprimir comprovante da pré-venda (F3)"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>IMPRIMIR PRÉ-VENDA (F3)</span>
          </button>

          <button
            type="button"
            onClick={aoFechar}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            autoFocus
          >
            <span>Novo Atendimento (Enter)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
