import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  User,
  ShoppingCart,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { ClientesService, ClienteCompleto } from '../../services/clientesService.js';
import { VendasCaixaService, VendaConcluidaCaixa } from '../../services/vendasCaixaService.js';
import { formatarCentavosParaReal } from '@farmapro/shared';

interface HistoricoComprasViewProps {
  cpfInicial?: string;
  aoIrParaCadastro?: () => void;
}

export const HistoricoComprasView: React.FC<HistoricoComprasViewProps> = ({
  cpfInicial = '123.456.789-10',
  aoIrParaCadastro,
}) => {
  const [cpfBusca, setCpfBusca] = useState<string>(cpfInicial);
  const [clienteEncontrado, setClienteEncontrado] = useState<ClienteCompleto | null>(null);
  const [historicoVendas, setHistoricoVendas] = useState<VendaConcluidaCaixa[]>([]);
  const [totalComprasReais, setTotalComprasReais] = useState<number>(0);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);

  // Executa busca inicial se já houver CPF informado (como o demonstrativo 123.456.789-10)
  useEffect(() => {
    if (cpfInicial) {
      executarConsulta(cpfInicial);
    }
  }, [cpfInicial]);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = ClientesService.aplicarMascaraCpf(e.target.value);
    setCpfBusca(formatado);
    if (erroConsulta) setErroConsulta(null);
  };

  const executarConsulta = (cpfParaConsultar: string) => {
    setErroConsulta(null);

    const limpo = ClientesService.sanitizarCpf(cpfParaConsultar);
    if (!limpo || limpo.length !== 11) {
      setErroConsulta('Informe um CPF válido com 11 dígitos para consulta.');
      setClienteEncontrado(null);
      setHistoricoVendas([]);
      setTotalComprasReais(0);
      return;
    }

    // Consulta cadastro de cliente
    const cliente = ClientesService.consultarPorCpf(limpo);
    if (!cliente) {
      setErroConsulta('Cliente não encontrado com o CPF informado. Cadastre o cliente primeiro.');
      setClienteEncontrado(null);
      setHistoricoVendas([]);
      setTotalComprasReais(0);
      return;
    }

    setClienteEncontrado(cliente);

    // Consulta histórico oficial de compras concluídas no Caixa
    const res = VendasCaixaService.consultarHistoricoComprasPorCpf(limpo);
    setHistoricoVendas(res.compras);
    setTotalComprasReais(res.totalAcumuladoReais);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executarConsulta(cpfBusca);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-200">
      {/* CARD PRINCIPAL: HISTÓRICO DE COMPRA (EXATO À IMAGEM DE REFERÊNCIA) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
        {/* Cabeçalho da Seção */}
        <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Histórico de Compra</h2>
            <p className="text-xs text-slate-500 font-medium">
              Consulta de vendas efetivamente concluídas no Caixa por CPF do cliente.
            </p>
          </div>
        </div>

        {/* 1. CAMPO DE BUSCA DE CPF (EXATO À IMAGEM DE REFERÊNCIA) */}
        <form onSubmit={handleSubmit} className="mb-6">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            CPF do Cliente
          </label>
          <div className="flex items-center gap-3 max-w-lg">
            <div className="relative flex-1">
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={cpfBusca}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength={14}
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-mono text-slate-900 outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all shrink-0 active:scale-[0.98]"
            >
              <Search className="w-4 h-4" />
              <span>Consultar</span>
            </button>
          </div>
        </form>

        {/* Mensagem de Erro / Não Encontrado */}
        {erroConsulta && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{erroConsulta}</span>
            </div>
            {aoIrParaCadastro && (
              <button
                type="button"
                onClick={aoIrParaCadastro}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0"
              >
                Cadastrar Agora
              </button>
            )}
          </div>
        )}

        {/* 2. INFORMAÇÕES DO CLIENTE (QUANDO LOCALIZADO) */}
        {clienteEncontrado && (
          <div className="space-y-6">
            <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {clienteEncontrado.nomeCompleto}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                    <span>CPF: {clienteEncontrado.cpfFormatado}</span>
                    {clienteEncontrado.dataNascimento && (
                      <>
                        <span>•</span>
                        <span>Nasc: {clienteEncontrado.dataNascimento}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{clienteEncontrado.cidade} - {clienteEncontrado.uf}</span>
                  </div>
                </div>
              </div>

              {/* Total de Compras Registrado (Destaque conforme imagem de referência) */}
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total de Compras
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight">
                  {formatarCentavosParaReal(Math.round(totalComprasReais * 100))}
                </span>
              </div>
            </div>

            {/* 3. TABELA COM AS ÚLTIMAS 5 COMPRAS FECHADAS NO CAIXA */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2 text-slate-800 text-xs font-bold">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span>Últimas 5 compras (fechadas)</span>
              </div>

              {historicoVendas.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  Este cliente ainda não possui compras concluídas no Caixa.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-4">Data / Hora</th>
                        <th className="py-2.5 px-4">Nº da Venda</th>
                        <th className="py-2.5 px-4 text-center">Qtde. Itens</th>
                        <th className="py-2.5 px-4 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {historicoVendas.map((venda, idx) => (
                        <tr
                          key={venda.id || idx}
                          className="hover:bg-blue-50/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium flex items-center gap-2">
                            <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                            <span>{venda.dataHoraFormatada}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {venda.numeroVenda}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold">
                            {venda.quantidadeItens}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {formatarCentavosParaReal(venda.totalCentavos)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
