import React from 'react';
import { Modal, Botao, Badge } from '@farmapro/ui';
import {
  Layers,
  Plus,
} from 'lucide-react';
import { ConsultaProdutoBalcao, formatarCentavosParaReal } from '@farmapro/shared';

interface FichaMedicamentoModalProps {
  produto: ConsultaProdutoBalcao | null;
  aberto: boolean;
  aoFechar: () => void;
  aoAdicionarAoOrcamento: (produto: ConsultaProdutoBalcao) => void;
}

export const FichaMedicamentoModal: React.FC<FichaMedicamentoModalProps> = ({
  produto,
  aberto,
  aoFechar,
  aoAdicionarAoOrcamento,
}) => {
  if (!produto) return null;

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Ficha Completa • ${produto.nomeComercial}`}
      descricao={`${produto.fabricante} • ${produto.apresentacao}`}
    >
      <div className="space-y-4 py-2 text-slate-800 text-xs">
        {/* Bloco de Cabeçalho com Preço e Estoque */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-emerald-800 font-bold block uppercase tracking-wider">
              Preço de Venda da Filial
            </span>
            <span className="text-2xl font-black text-emerald-950">
              {formatarCentavosParaReal(produto.precoVendaCentavos)}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="bg-white px-3 py-2 rounded-lg border border-emerald-200">
              <span className="text-slate-500 block text-[10px]">Estoque Disponível</span>
              <strong className="text-emerald-900 text-sm">{produto.estoqueTotal} unidades</strong>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg border border-emerald-200">
              <span className="text-slate-500 block text-[10px]">Classificação</span>
              <span className="font-bold text-slate-800 text-xs">
                {produto.tipoProduto === 'MEDICAMENTO_GENERICO' ? 'Genérico (Lei 9.787)' : 'Referência'}
              </span>
            </div>
          </div>
        </div>

        {/* Detalhes Técnicos e Farmacêuticos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="font-bold text-slate-700 block">Identificação Farmacêutica</span>
            <div className="space-y-1 text-[11px]">
              <div>
                <span className="text-slate-500">Princípio Ativo (DCB): </span>
                <strong className="text-slate-800">{produto.principioAtivo || produto.nomeGenerico || 'Não informado'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Apresentação: </span>
                <span className="text-slate-800">{produto.apresentacao}</span>
              </div>
              <div>
                <span className="text-slate-500">Laboratório Fabricante: </span>
                <span className="text-slate-800">{produto.fabricante}</span>
              </div>
              <div>
                <span className="text-slate-500">Código de Barras (EAN): </span>
                <code className="font-mono text-slate-700 font-bold">{produto.codigoBarras}</code>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="font-bold text-slate-700 block">Exigência Regulatória (ANVISA)</span>
            <div className="space-y-1 text-[11px]">
              <div>
                <span className="text-slate-500">Tipo de Receita: </span>
                <strong className="text-slate-800">{produto.classificacaoReceita}</strong>
              </div>
              <div>
                <span className="text-slate-500">Dispensação: </span>
                <span className="text-slate-800">
                  {produto.classificacaoReceita === 'ISENTO'
                    ? 'Medicamento Isento de Prescrição (MIP)'
                    : 'Exige retenção ou conferência da receita médica'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Armazenamento: </span>
                <span className="text-slate-800">Conservar em temperatura ambiente (15°C a 30°C)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lotes e Validades (Rastreabilidade FEFO) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Layers className="w-4 h-4 text-emerald-600" />
              Lotes Cadastrados na Filial (Conferência FEFO)
            </span>
            {produto.loteFefo && (
              <Badge variante="sucesso" tamanho="sm">
                Próximo FEFO: Lote {produto.loteFefo.numeroLote}
              </Badge>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-[11px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="px-3 py-2">Lote</th>
                  <th className="px-3 py-2">Validade</th>
                  <th className="px-3 py-2">Dias Restantes</th>
                  <th className="px-3 py-2">Saldo em Estoque</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produto.lotesValidos && produto.lotesValidos.length > 0 ? (
                  produto.lotesValidos.map((lote) => {
                    const eFefo = produto.loteFefo?.id === lote.id;
                    const dias = (lote as any).diasAteVencimento;
                    return (
                      <tr key={lote.id} className={eFefo ? 'bg-emerald-50/50 font-medium' : ''}>
                        <td className="px-3 py-2 font-mono font-bold text-slate-800">
                          {lote.numeroLote}
                          {eFefo && (
                            <span className="ml-1.5 text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded">
                              FEFO
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{lote.dataValidade}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {dias ? `${dias} dias` : 'Válido'}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">{lote.quantidadeDisponivel} un</td>
                        <td className="px-3 py-2">
                          <span className="text-emerald-700 font-bold">Ativo</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                      Nenhum lote específico detalhado no cadastro desta filial.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <Botao variante="outline" tamanho="sm" onClick={aoFechar}>
            Fechar
          </Botao>
          <Botao
            variante="primario"
            tamanho="sm"
            iconeEsquerda={<Plus className="w-4 h-4" />}
            onClick={() => {
              aoAdicionarAoOrcamento(produto);
              aoFechar();
            }}
          >
            Adicionar ao Orçamento
          </Botao>
        </div>
      </div>
    </Modal>
  );
};
