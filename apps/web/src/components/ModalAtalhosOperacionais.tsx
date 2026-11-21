import React, { useState } from 'react';
import { Modal, Botao, Badge } from '@farmapro/ui';
import {
  Search,
  Tag,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { formatarCentavosParaReal } from '@farmapro/shared';

export type TipoAtalhoOperacional =
  | 'medicamentos'
  | 'estoque'
  | 'prevendas'
  | 'clientes'
  | 'relatorios'
  | null;

interface ModalAtalhosOperacionaisProps {
  tipo: TipoAtalhoOperacional;
  aoFechar: () => void;
  aoAcessarCaixa: () => void;
  aoAcessarBalcao: () => void;
}

export const ModalAtalhosOperacionais: React.FC<ModalAtalhosOperacionaisProps> = ({
  tipo,
  aoFechar,
  aoAcessarCaixa,
  aoAcessarBalcao,
}) => {
  const [busca, setBusca] = useState('');

  if (!tipo) return null;

  // 1. MODAL: MEDICAMENTOS
  if (tipo === 'medicamentos') {
    const listaExemplo = [
      {
        id: '1',
        nome: 'Dipirona Monoidratada 500 mg/mL',
        laboratorio: 'Medley • Gotas 20 mL',
        preco: 890,
        estoque: 142,
        tipo: 'Genérico',
      },
      {
        id: '2',
        nome: 'Losartana Potássica 50 mg',
        laboratorio: 'Aché • Cx c/ 30 comp',
        preco: 1350,
        estoque: 88,
        tipo: 'Genérico',
      },
      {
        id: '3',
        nome: 'Paracetamol 750 mg',
        laboratorio: 'Neo Química • Cx c/ 20 comp',
        preco: 1290,
        estoque: 64,
        tipo: 'Genérico',
      },
      {
        id: '4',
        nome: 'Omeprazol 20 mg',
        laboratorio: 'Eurofarma • Cx c/ 28 cáps',
        preco: 2890,
        estoque: 35,
        tipo: 'Referência',
      },
    ];

    const filtrados = listaExemplo.filter(
      (m) =>
        m.nome.toLowerCase().includes(busca.toLowerCase()) ||
        m.laboratorio.toLowerCase().includes(busca.toLowerCase())
    );

    return (
      <Modal
        aberto={true}
        aoFechar={aoFechar}
        titulo="Consulta Rápida de Medicamentos"
        descricao="Consulte preços, apresentações e estoques disponíveis na filial"
      >
        <div className="space-y-4 py-2 text-xs text-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome, princípio ativo ou laboratório..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto rounded-xl border border-slate-200">
            {filtrados.map((item) => (
              <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.nome}</span>
                    <Badge variante="info" tamanho="sm">{item.tipo}</Badge>
                  </div>
                  <span className="text-[11px] text-slate-500">{item.laboratorio}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-sm text-slate-900 block">
                    {formatarCentavosParaReal(item.preco)}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {item.estoque} em estoque
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-500 text-[11px]">Para orçamento completo e emissão de comanda:</span>
            <button
              type="button"
              onClick={() => {
                aoFechar();
                aoAcessarBalcao();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-2xs"
            >
              <Tag className="w-4 h-4" />
              <span>Abrir no Balcão (F3)</span>
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // 2. MODAL: ESTOQUE
  if (tipo === 'estoque') {
    return (
      <Modal
        aberto={true}
        aoFechar={aoFechar}
        titulo="Painel de Estoque Operacional"
        descricao="Indicadores de disponibilidade física e conformidade sanitária FEFO"
      >
        <div className="space-y-4 py-2 text-xs text-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-slate-500 text-[11px] block">Total Cadastrado</span>
              <strong className="text-xl font-black text-blue-900">4.820</strong>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-slate-500 text-[11px] block">Estoque Baixo</span>
              <strong className="text-xl font-black text-amber-900">18</strong>
            </div>
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
              <span className="text-slate-500 text-[11px] block">Sem Estoque</span>
              <strong className="text-xl font-black text-red-900">7</strong>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-slate-500 text-[11px] block">Lotes FEFO OK</span>
              <strong className="text-xl font-black text-emerald-900">100%</strong>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Critério FEFO Ativo: Primeiro a Vencer, Primeiro a Sair</span>
            </div>
            <p className="text-slate-500">
              Todos os lotes dispensados na filial obedecem à conferência automática de validade mais próxima.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Botao variante="secundario" onClick={aoFechar}>Fechar</Botao>
          </div>
        </div>
      </Modal>
    );
  }

  // 3. MODAL: PRÉ-VENDAS
  if (tipo === 'prevendas') {
    const comandas = [
      {
        codigo: 'PV-1048',
        cliente: 'João da Silva',
        atendente: 'Carlos Silva (Balcão 02)',
        itens: 4,
        total: 6220,
        tempo: 'Há 4 min',
      },
      {
        codigo: 'PV-1047',
        cliente: 'Maria Oliveira Santos',
        atendente: 'Ana Paula (Balcão 01)',
        itens: 2,
        total: 3450,
        tempo: 'Há 12 min',
      },
      {
        codigo: 'PV-1046',
        cliente: 'Consumidor Final',
        atendente: 'Carlos Silva (Balcão 02)',
        itens: 1,
        total: 1890,
        tempo: 'Há 28 min',
      },
    ];

    return (
      <Modal
        aberto={true}
        aoFechar={aoFechar}
        titulo="Comandas de Pré-venda do Balcão"
        descricao="Comandas ativas aguardando pagamento e recebimento no Caixa"
      >
        <div className="space-y-4 py-2 text-xs text-slate-800">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {comandas.map((c) => (
              <div
                key={c.codigo}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 transition-all flex items-center justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {c.codigo}
                    </span>
                    <span className="font-bold text-slate-900">{c.cliente}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {c.atendente} • {c.itens} {c.itens === 1 ? 'item' : 'itens'} • {c.tempo}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-emerald-900 block">
                    {formatarCentavosParaReal(c.total)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      aoFechar();
                      aoAcessarCaixa();
                    }}
                    className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1 justify-end mt-0.5"
                  >
                    <span>Faturar (F2)</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-500 text-[11px]">As comandas expiram após 120 minutos.</span>
            <Botao variante="secundario" onClick={aoFechar}>Fechar</Botao>
          </div>
        </div>
      </Modal>
    );
  }

  // 4. MODAL: CLIENTES
  if (tipo === 'clientes') {
    return (
      <Modal
        aberto={true}
        aoFechar={aoFechar}
        titulo="Consulta de Clientes e Convênios"
        descricao="Busque cadastros, histórico e limites de crédito em farmácia"
      >
        <div className="space-y-4 py-2 text-xs text-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Digite o CPF ou nome do cliente..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm block">João da Silva</span>
                <span className="text-[11px] text-slate-500">CPF: 123.456.789-00 • Telefone: (11) 98765-4321</span>
              </div>
              <Badge variante="sucesso" tamanho="sm">Ativo</Badge>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-600 border-t border-slate-200/80 pt-2">
              <div><strong>Convênio:</strong> Farmácia Popular / Saúde Caixa</div>
              <div><strong>Desconto Cadastrado:</strong> 15% em Genéricos</div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Botao variante="secundario" onClick={aoFechar}>Fechar</Botao>
          </div>
        </div>
      </Modal>
    );
  }

  // 5. MODAL: RELATÓRIOS
  if (tipo === 'relatorios') {
    return (
      <Modal
        aberto={true}
        aoFechar={aoFechar}
        titulo="Relatório Operacional do Dia"
        descricao="Resumo de movimento financeiro e cupons emitidos no turno"
      >
        <div className="space-y-4 py-2 text-xs text-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <span className="text-emerald-800 text-[11px] font-bold block">Faturamento Hoje</span>
              <strong className="text-2xl font-black text-emerald-950">R$ 4.280,50</strong>
            </div>
            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-center">
              <span className="text-blue-800 text-[11px] font-bold block">Cupons Faturados</span>
              <strong className="text-2xl font-black text-blue-950">68</strong>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-600 text-[11px] font-bold block">Ticket Médio</span>
              <strong className="text-2xl font-black text-slate-900">R$ 62,94</strong>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-3 space-y-2">
            <span className="font-bold text-slate-700 block">Distribuição por Meio de Pagamento</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">PIX</span>
                <strong>42% (R$ 1.797)</strong>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Cartão Crédito</span>
                <strong>33% (R$ 1.412)</strong>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Cartão Débito</span>
                <strong>15% (R$ 642)</strong>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Dinheiro</span>
                <strong>10% (R$ 429)</strong>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Botao variante="secundario" onClick={aoFechar}>Fechar</Botao>
          </div>
        </div>
      </Modal>
    );
  }

  return null;
};
