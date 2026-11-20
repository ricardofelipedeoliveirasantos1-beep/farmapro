import React, { useState } from 'react';
import {
  Card,
  CardCabecalho,
  CardTitulo,
  CardDescricao,
  CardConteudo,
  Botao,
  CampoTexto,
  Badge,
  Alerta,
  Modal,
  TabelaContainer,
  TabelaCabecalho,
  TabelaCorpo,
  TabelaLinha,
  TabelaColuna,
  TabelaCelula,
} from '@farmapro/ui';
import {
  formatarCentavosParaReal,
  formatarDataHoraBR,
  Venda,
} from '@farmapro/shared';
import {
  Receipt,
  Search,
  Eye,
  Ban,
  Ticket,
  AlertOctagon,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

// Vendas Demonstrativas com histórico completo
const VENDAS_DEMONSTRATIVAS_INICIAIS: Venda[] = [
  {
    id: 'venda-demo-001',
    empresaId: '11111111-1111-4111-a111-111111111111',
    filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
    caixaSessaoId: 'sessao-caixa-demo-01',
    dispositivoId: 'HW-CAIXA-01',
    numeroCupom: 'CUP-982341',
    serieCaixa: 'CX-01',
    operadorId: 'aaaaaaaa-2222-4000-8000-000000000002',
    dataHora: new Date(Date.now() - 3600000 * 2).toISOString(),
    subtotalCentavos: 4490,
    descontoTotalCentavos: 0,
    totalCentavos: 4490,
    trocoCentavos: 510,
    status: 'CONCLUIDA',
    sincronizadoComNuvem: true,
    itens: [
      {
        id: 'vi-001',
        produtoId: 'prod-001',
        codigoBarras: '7891111111111',
        nomeProduto: 'Amoxicilina + Clavulanato 500mg',
        apresentacao: '500mg/125mg — Cx 21 comprimidos',
        quantidade: 1,
        precoUnitarioCentavos: 4490,
        descontoCentavos: 0,
        subtotalCentavos: 4490,
      },
    ],
    pagamentos: [
      {
        id: 'vp-001',
        formaPagamento: 'DINHEIRO',
        valorCentavos: 5000,
      },
    ],
  },
  {
    id: 'venda-demo-002',
    empresaId: '11111111-1111-4111-a111-111111111111',
    filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
    caixaSessaoId: 'sessao-caixa-demo-01',
    dispositivoId: 'HW-CAIXA-01',
    numeroCupom: 'CUP-982342',
    serieCaixa: 'CX-01',
    operadorId: 'aaaaaaaa-2222-4000-8000-000000000002',
    dataHora: new Date(Date.now() - 3600000 * 4).toISOString(),
    subtotalCentavos: 10470,
    descontoTotalCentavos: 500,
    totalCentavos: 9970,
    trocoCentavos: 0,
    status: 'CONCLUIDA',
    sincronizadoComNuvem: true,
    itens: [
      {
        id: 'vi-002',
        produtoId: 'prod-002',
        codigoBarras: '7892222222222',
        nomeProduto: 'Dipirona Monoidratada Gotas',
        apresentacao: 'Frasco 20mL',
        quantidade: 2,
        precoUnitarioCentavos: 890,
        descontoCentavos: 0,
        subtotalCentavos: 1780,
      },
      {
        id: 'vi-003',
        produtoId: 'prod-001',
        codigoBarras: '7891111111111',
        nomeProduto: 'Amoxicilina + Clavulanato 500mg',
        apresentacao: 'Cx 21 comp',
        quantidade: 2,
        precoUnitarioCentavos: 4490,
        descontoCentavos: 500,
        subtotalCentavos: 8480,
      },
    ],
    pagamentos: [
      {
        id: 'vp-002',
        formaPagamento: 'CARTAO_CREDITO',
        valorCentavos: 9970,
        parcelas: 2,
        bandeiraCartao: 'VISA',
      },
    ],
  },
  {
    id: 'venda-demo-003',
    empresaId: '11111111-1111-4111-a111-111111111111',
    filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
    caixaSessaoId: 'sessao-caixa-demo-01',
    dispositivoId: 'HW-CAIXA-01',
    numeroCupom: 'CUP-982340',
    serieCaixa: 'CX-01',
    operadorId: 'aaaaaaaa-2222-4000-8000-000000000002',
    dataHora: new Date(Date.now() - 3600000 * 6).toISOString(),
    subtotalCentavos: 3380,
    descontoTotalCentavos: 0,
    totalCentavos: 3380,
    trocoCentavos: 0,
    status: 'CANCELADA',
    motivoCancelamento: 'Desistência do cliente antes da retirada do medicamento',
    canceladoEm: new Date(Date.now() - 3600000 * 5).toISOString(),
    voucherGeradoId: 'vch-demo-001',
    sincronizadoComNuvem: true,
    itens: [
      {
        id: 'vi-004',
        produtoId: 'prod-004',
        codigoBarras: '7894444444444',
        nomeProduto: 'Omeprazol 20mg Cápsulas',
        apresentacao: 'Cx 28 cápsulas',
        quantidade: 2,
        precoUnitarioCentavos: 1690,
        descontoCentavos: 0,
        subtotalCentavos: 3380,
      },
    ],
    pagamentos: [
      {
        id: 'vp-003',
        formaPagamento: 'PIX',
        valorCentavos: 3380,
      },
    ],
  },
];

export const HistoricoVendasPage: React.FC = () => {
  const { temPermissao, usuario } = useAuth();

  const [vendas, setVendas] = useState<Venda[]>(VENDAS_DEMONSTRATIVAS_INICIAIS);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');
  const [termoBusca, setTermoBusca] = useState<string>('');

  // Modais
  const [vendaDetalhe, setVendaDetalhe] = useState<Venda | null>(null);
  const [vendaParaCancelar, setVendaParaCancelar] = useState<Venda | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState<string>('');
  const [emitirVoucher, setEmitirVoucher] = useState<boolean>(true);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const vendasFiltradas = vendas.filter(v => {
    if (filtroStatus !== 'TODAS' && v.status !== filtroStatus) return false;
    if (termoBusca.trim()) {
      const t = termoBusca.toLowerCase().trim();
      return (
        v.numeroCupom.toLowerCase().includes(t) ||
        v.itens.some(it => it.nomeProduto.toLowerCase().includes(t))
      );
    }
    return true;
  });

  const abrirCancelamento = (venda: Venda) => {
    setMensagemErro(null);
    setMensagemSucesso(null);

    if (!temPermissao('pdv:cancelar_venda')) {
      setMensagemErro('Você não possui a permissão requerida "pdv:cancelar_venda" para cancelar vendas.');
      return;
    }

    if (venda.status === 'CANCELADA') {
      setMensagemErro('Esta venda já se encontra cancelada.');
      return;
    }

    setVendaParaCancelar(venda);
    setMotivoCancelamento('');
    setEmitirVoucher(true);
  };

  const confirmarCancelamento = () => {
    if (!vendaParaCancelar) return;

    if (!motivoCancelamento.trim() || motivoCancelamento.trim().length < 5) {
      setMensagemErro('Informe uma justificativa detalhada para autorizar o cancelamento da venda.');
      return;
    }

    const voucherCodigo = emitirVoucher
      ? `VCH-2026-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      : undefined;

    setVendas(
      vendas.map(v =>
        v.id === vendaParaCancelar.id
          ? {
              ...v,
              status: 'CANCELADA',
              motivoCancelamento: motivoCancelamento.trim(),
              canceladoPorId: usuario?.id || 'op-demo',
              canceladoEm: new Date().toISOString(),
              voucherGeradoId: voucherCodigo,
            }
          : v,
      ),
    );

    setVendaParaCancelar(null);
    setMensagemSucesso(
      voucherCodigo
        ? `Venda cancelada com sucesso. Estoque estornado e Voucher gerado: ${voucherCodigo} (${formatarCentavosParaReal(
            vendaParaCancelar.totalCentavos,
          )}).`
        : 'Venda cancelada com sucesso. O estoque dos itens foi estornado automaticamente.',
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Histórico de Vendas & Cancelamentos
            </h1>
            <Badge variante="sucesso" tamanho="sm">Auditoria Ativa</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Consulta de cupons fiscais emitidos, detalhamento de itens, estorno de estoque e emissão de vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold"
          >
            <option value="TODAS">Todos os Status</option>
            <option value="CONCLUIDA">Apenas Concluídas</option>
            <option value="CANCELADA">Apenas Canceladas</option>
          </select>
        </div>
      </div>

      {mensagemSucesso && (
        <Alerta tipo="sucesso" titulo="Operação Autorizada">
          {mensagemSucesso}
        </Alerta>
      )}

      {mensagemErro && (
        <Alerta tipo="erro" titulo="Atenção">
          {mensagemErro}
        </Alerta>
      )}

      {/* Tabela de Vendas */}
      <Card>
        <CardCabecalho className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitulo className="text-sm">Vendas Realizadas na Filial</CardTitulo>
            <CardDescricao>Mostrando {vendasFiltradas.length} transações registradas</CardDescricao>
          </div>
          <div className="w-full sm:w-72">
            <CampoTexto
              placeholder="Buscar por cupom ou produto..."
              value={termoBusca}
              onChange={e => setTermoBusca(e.target.value)}
              iconeEsquerda={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </CardCabecalho>
        <CardConteudo>
          {vendasFiltradas.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhuma venda encontrada com os filtros aplicados.
            </div>
          ) : (
            <TabelaContainer>
              <TabelaCabecalho>
                <TabelaLinha>
                  <TabelaColuna>Cupom / Data</TabelaColuna>
                  <TabelaColuna>Itens</TabelaColuna>
                  <TabelaColuna>Forma(s) de Pagamento</TabelaColuna>
                  <TabelaColuna className="text-right">Valor Total</TabelaColuna>
                  <TabelaColuna>Situação</TabelaColuna>
                  <TabelaColuna className="text-center">Ações</TabelaColuna>
                </TabelaLinha>
              </TabelaCabecalho>
              <TabelaCorpo>
                {vendasFiltradas.map(venda => (
                  <TabelaLinha key={venda.id}>
                    <TabelaCelula>
                      <span className="font-mono font-bold text-slate-900 block text-xs">
                        {venda.numeroCupom}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatarDataHoraBR(venda.dataHora)}
                      </span>
                    </TabelaCelula>

                    <TabelaCelula className="text-xs text-slate-700">
                      {venda.itens.map((it, idx) => (
                        <div key={idx} className="truncate max-w-[220px]">
                          {it.quantidade}x {it.nomeProduto}
                        </div>
                      ))}
                    </TabelaCelula>

                    <TabelaCelula className="text-xs text-slate-600">
                      <div className="flex flex-wrap gap-1">
                        {venda.pagamentos.map((p, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold"
                          >
                            {p.formaPagamento}
                          </span>
                        ))}
                      </div>
                    </TabelaCelula>

                    <TabelaCelula className="text-right font-mono font-bold text-xs text-slate-900">
                      {formatarCentavosParaReal(venda.totalCentavos)}
                    </TabelaCelula>

                    <TabelaCelula>
                      <Badge
                        variante={venda.status === 'CONCLUIDA' ? 'sucesso' : 'perigo'}
                        tamanho="sm"
                        ponto
                      >
                        {venda.status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada'}
                      </Badge>
                    </TabelaCelula>

                    <TabelaCelula className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Botao
                          variante="outline"
                          tamanho="sm"
                          onClick={() => setVendaDetalhe(venda)}
                          iconeEsquerda={<Eye className="w-3.5 h-3.5" />}
                        >
                          Ver
                        </Botao>

                        {venda.status === 'CONCLUIDA' && temPermissao('pdv:cancelar_venda') && (
                          <Botao
                            variante="perigo"
                            tamanho="sm"
                            onClick={() => abrirCancelamento(venda)}
                            iconeEsquerda={<Ban className="w-3.5 h-3.5" />}
                          >
                            Cancelar
                          </Botao>
                        )}
                      </div>
                    </TabelaCelula>
                  </TabelaLinha>
                ))}
              </TabelaCorpo>
            </TabelaContainer>
          )}
        </CardConteudo>
      </Card>

      {/* Modal de Detalhes da Venda */}
      {vendaDetalhe && (
        <Modal
          aberto={!!vendaDetalhe}
          aoFechar={() => setVendaDetalhe(null)}
          titulo={`Detalhes da Venda ${vendaDetalhe.numeroCupom}`}
          descricao={`Emitida em ${formatarDataHoraBR(vendaDetalhe.dataHora)} • Terminal ${vendaDetalhe.serieCaixa}`}
        >
          <div className="space-y-4 text-xs">
            {vendaDetalhe.status === 'CANCELADA' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  Venda Cancelada
                </span>
                <p>Motivo: {vendaDetalhe.motivoCancelamento}</p>
                {vendaDetalhe.voucherGeradoId && (
                  <p className="font-mono text-emerald-800 font-bold">
                    Voucher emitido para o cliente: {vendaDetalhe.voucherGeradoId}
                  </p>
                )}
              </div>
            )}

            <div>
              <span className="font-bold text-slate-800 block mb-2">Itens Vendidos:</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {vendaDetalhe.itens.map((it, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-900 block">{it.nomeProduto}</span>
                      <span className="text-[11px] text-slate-500">
                        {it.quantidade} un × {formatarCentavosParaReal(it.precoUnitarioCentavos)}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {formatarCentavosParaReal(it.subtotalCentavos)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-2">Pagamentos:</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {vendaDetalhe.pagamentos.map((p, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800">{p.formaPagamento}</span>
                      {p.bandeiraCartao && (
                        <span className="text-slate-500 ml-1">({p.bandeiraCartao})</span>
                      )}
                      {p.parcelas && p.parcelas > 1 && (
                        <span className="text-slate-500 ml-1">({p.parcelas}x)</span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {formatarCentavosParaReal(p.valorCentavos)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">
                  {formatarCentavosParaReal(vendaDetalhe.subtotalCentavos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Desconto Total:</span>
                <span className="font-mono font-semibold text-emerald-600">
                  - {formatarCentavosParaReal(vendaDetalhe.descontoTotalCentavos)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200">
                <span>Total Líquido:</span>
                <span className="font-mono text-blue-700">
                  {formatarCentavosParaReal(vendaDetalhe.totalCentavos)}
                </span>
              </div>
              {vendaDetalhe.trocoCentavos > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Troco Devolvido:</span>
                  <span className="font-mono">
                    {formatarCentavosParaReal(vendaDetalhe.trocoCentavos)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Botao variante="outline" onClick={() => setVendaDetalhe(null)}>
                Fechar
              </Botao>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Cancelamento de Venda */}
      {vendaParaCancelar && (
        <Modal
          aberto={!!vendaParaCancelar}
          aoFechar={() => setVendaParaCancelar(null)}
          titulo="Autorizar Cancelamento de Venda"
          descricao={`Cupom: ${vendaParaCancelar.numeroCupom} • Valor: ${formatarCentavosParaReal(
            vendaParaCancelar.totalCentavos,
          )}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-700" />
                Estorno de Estoque Automático
              </span>
              <p className="text-[11px] leading-relaxed">
                Ao cancelar esta venda, todos os itens serão devolvidos imediatamente ao estoque físico e
                aos seus respectivos lotes de rastreabilidade (livro-razão contábil).
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Justificativa Obrigatória do Cancelamento:
              </label>
              <CampoTexto
                placeholder="Ex: Desistência do cliente / Erro na quantidade registrada / Troca"
                value={motivoCancelamento}
                onChange={e => setMotivoCancelamento(e.target.value)}
              />
            </div>

            {temPermissao('vouchers:emitir') && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={emitirVoucher}
                    onChange={e => setEmitirVoucher(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-blue-600" />
                    Emitir Voucher de Troca/Cancelamento para o Cliente
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  Gera um código único de voucher no valor integral de{' '}
                  <strong className="text-slate-900">
                    {formatarCentavosParaReal(vendaParaCancelar.totalCentavos)}
                  </strong>{' '}
                  para uso exclusivo nesta farmácia em compras futuras.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Botao variante="outline" onClick={() => setVendaParaCancelar(null)}>
                Voltar
              </Botao>
              <Botao
                variante="perigo"
                onClick={confirmarCancelamento}
                iconeEsquerda={<Ban className="w-4 h-4" />}
              >
                Confirmar Cancelamento
              </Botao>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
