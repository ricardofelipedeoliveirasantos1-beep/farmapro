import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Coins,
  ShoppingCart,
  Store,
  Tag,
  ShieldCheck,
  Printer,
  RefreshCw,
  Info,
} from 'lucide-react';
import { VendasCaixaService, ResumoVendasDia } from '../../services/vendasCaixaService.js';
import { formatarCentavosParaReal } from '@farmapro/shared';

interface RelatorioVendasDiaViewProps {
  dataInicial?: string; // YYYY-MM-DD
  aoVoltarPreVenda?: () => void;
}

export const RelatorioVendasDiaView: React.FC<RelatorioVendasDiaViewProps> = ({
  dataInicial = '2026-11-22',
  aoVoltarPreVenda: _aoVoltarPreVenda,
}) => {
  const [dataSelecionada, setDataSelecionada] = useState<string>(dataInicial);
  const [atualizando, setAtualizando] = useState<boolean>(false);

  // Carrega os dados consolidados do Caixa para a data selecionada
  const resumo: ResumoVendasDia = useMemo(() => {
    return VendasCaixaService.obterRelatorioVendasDia(dataSelecionada);
  }, [dataSelecionada, atualizando]);

  const handleAtualizar = () => {
    setAtualizando(true);
    setTimeout(() => {
      setAtualizando(false);
    }, 250);
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 select-none font-sans space-y-6">
      {/* 1. CABEÇALHO DO MÓDULO DE RELATÓRIO */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                Relatório de Vendas do Dia
              </h2>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Caixa Fechado
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Vendas finalizadas no PDV/Caixa com segregação por categoria de medicamento e itens
            </p>
          </div>
        </div>

        {/* Controles de Data e Ações */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Data:</span>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={handleAtualizar}
            title="Atualizar dados"
            className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${atualizando ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleImprimir}
            title="Imprimir relatório"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* 2. OS 3 CARDS SUPERIORES CONFORME IMAGEM DE REFERÊNCIA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total de Vendas (R$ 4.528,90) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-4 relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Coins className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block uppercase tracking-wide">
              Total de Vendas
            </span>
            <span className="text-2xl font-black text-slate-800 tracking-tight">
              {formatarCentavosParaReal(resumo.totalVendasCentavos)}
            </span>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-blue-600" />
        </div>

        {/* Card 2: Quantidade de Vendas (86) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-4 relative overflow-hidden group hover:border-sky-300 transition-all">
          <div className="w-12 h-12 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block uppercase tracking-wide">
              Quantidade de Vendas
            </span>
            <span className="text-2xl font-black text-slate-800 tracking-tight">
              {resumo.quantidadeVendas}
            </span>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-sky-500" />
        </div>

        {/* Card 3: Itens Vendidos (312) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-4 relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Store className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block uppercase tracking-wide">
              Itens Vendidos
            </span>
            <span className="text-2xl font-black text-slate-800 tracking-tight">
              {resumo.quantidadeItensTotal}
            </span>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-indigo-600" />
        </div>
      </div>

      {/* 3. TABELA DE VENDAS POR CATEGORIA (CAIXA) CONFORME IMAGEM DE REFERÊNCIA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Sub-cabeçalho da Tabela */}
        <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Vendas por Categoria (Caixa)
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            {resumo.categorias.length} categorias cadastradas
          </span>
        </div>

        {/* Tabela Formatada */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-5">Categoria</th>
                <th className="py-2.5 px-5 text-center">Qtd. Itens</th>
                <th className="py-2.5 px-5 text-center">% Volume</th>
                <th className="py-2.5 px-5 text-right">Valor em Vendas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resumo.categorias.map((cat, index) => {
                // Cálculo de cores dos cards de categoria conforme imagem oficial
                const getRowStyle = (nome: string) => {
                  switch (nome) {
                    case 'Genéricos':
                      return {
                        barColor: 'bg-emerald-500',
                        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      };
                    case 'Éticos':
                      return {
                        barColor: 'bg-blue-500',
                        badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
                      };
                    case 'Similar':
                      return {
                        barColor: 'bg-purple-500',
                        badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
                      };
                    case 'Perfumaria':
                      return {
                        barColor: 'bg-rose-500',
                        badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
                      };
                    case 'OTC (MIP)':
                      return {
                        barColor: 'bg-cyan-500',
                        badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
                      };
                    default:
                      return {
                        barColor: 'bg-slate-400',
                        badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
                      };
                  }
                };

                const style = getRowStyle(cat.nome);

                return (
                  <tr
                    key={index}
                    className="hover:bg-blue-50/30 transition-colors font-medium text-slate-700"
                  >
                    {/* Categoria com Barra Colorida à Esquerda */}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${style.barColor} shrink-0`} />
                        <span className="font-bold text-slate-800">{cat.nome}</span>
                      </div>
                    </td>

                    {/* Quantidade de Itens */}
                    <td className="py-3 px-5 text-center font-bold text-slate-800">
                      {cat.quantidadeItens}
                    </td>

                    {/* Percentual */}
                    <td className="py-3 px-5 text-center text-slate-500 font-semibold">
                      {cat.percentual.toFixed(1)}%
                    </td>

                    {/* Valor em Vendas com Badge */}
                    <td className="py-3 px-5 text-right">
                      <span
                        className={`inline-block font-black px-2.5 py-1 rounded-lg border text-xs ${style.badgeBg}`}
                      >
                        {formatarCentavosParaReal(cat.valorCentavos)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* RODAPÉ OFICIAL EM AZUL CONFORME IMAGEM DE REFERÊNCIA */}
            <tfoot>
              <tr className="bg-[#104482] text-white font-bold text-xs">
                <td className="py-3 px-5 tracking-wide uppercase">Total Geral (Caixa)</td>
                <td className="py-3 px-5 text-center font-black text-sm">
                  {resumo.quantidadeItensTotal}
                </td>
                <td className="py-3 px-5 text-center font-black text-xs text-blue-200">
                  100%
                </td>
                <td className="py-3 px-5 text-right font-black text-sm text-white">
                  {formatarCentavosParaReal(resumo.totalVendasCentavos)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. AVISO DE CONFORMIDADE COM REGRAS DE NEGÓCIO */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-blue-950">
            Regra Oficial de Reconciliação do Caixa:
          </span>
          <p className="text-blue-800/90 leading-relaxed mt-0.5">
            Este relatório computa exclusivamente transações concluídas e autenticadas pelo módulo do Caixa (PDV). Pré-vendas em aberto, comandas não pagas ou vendas canceladas são rigorosamente descartadas dos totalizadores.
          </p>
        </div>
      </div>
    </div>
  );
};
