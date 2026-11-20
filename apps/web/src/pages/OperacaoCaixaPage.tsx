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
  CaixaMovimentacao,
  ResumoCaixa,
} from '@farmapro/shared';
import {
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  UserCheck,
  Lock,
  Unlock,
  History,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

export const OperacaoCaixaPage: React.FC = () => {
  const { temPermissao, usuario, empresaAtiva, filialAtiva } = useAuth();

  // Estado da Sessão Atual de Caixa (Mock reativo integrado)
  const [caixaAberto, setCaixaAberto] = useState<boolean>(true);
  const [resumoCaixa, setResumoCaixa] = useState<ResumoCaixa>({
    caixaSessaoId: 'sessao-caixa-demo-01',
    empresaId: empresaAtiva?.id || 'emp-demo',
    filialId: filialAtiva?.id || 'fil-demo',
    dispositivoId: 'HW-CAIXA-01',
    operadorAberturaId: usuario?.id || 'op-demo',
    operadorAtualId: usuario?.id || 'op-demo',
    status: 'ABERTO',
    abertoEm: new Date().toISOString(),
    saldoInicialCentavos: 10000, // R$ 100,00
    totalVendasDinheiroCentavos: 18450, // R$ 184,50
    totalVendasPixCentavos: 9480, // R$ 94,80
    totalVendasCartaoDebitoCentavos: 8900,
    totalVendasCartaoCreditoCentavos: 14500,
    totalVendasVoucherCentavos: 5000,
    totalSuprimentosCentavos: 5000, // R$ 50,00
    totalSangriasCentavos: 3000, // R$ 30,00
    totalTrocoDevolvidoCentavos: 1550, // R$ 15,50
    saldoGavetaDinheiroEsperadoCentavos: 28900, // 100 + 50 - 30 + (184.50 - 15.50) = R$ 289,00
    quantidadeVendasConcluidas: 8,
    quantidadeVendasCanceladas: 1,
  });

  const [movimentacoes, setMovimentacoes] = useState<CaixaMovimentacao[]>([
    {
      id: 'mov-001',
      empresaId: empresaAtiva?.id || 'emp-demo',
      filialId: filialAtiva?.id || 'fil-demo',
      caixaSessaoId: 'sessao-caixa-demo-01',
      tipoMovimentacao: 'SUPRIMENTO',
      valorCentavos: 5000,
      motivo: 'Reforço de moedas para troco matutino',
      usuarioId: usuario?.id || 'op-demo',
      criadoEm: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'mov-002',
      empresaId: empresaAtiva?.id || 'emp-demo',
      filialId: filialAtiva?.id || 'fil-demo',
      caixaSessaoId: 'sessao-caixa-demo-01',
      tipoMovimentacao: 'SANGRIA',
      valorCentavos: 3000,
      motivo: 'Recolhimento preventivo de segurança para cofre',
      usuarioId: usuario?.id || 'op-demo',
      criadoEm: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);

  // Modais de Ação
  const [modalAberturaAberto, setModalAberturaAberto] = useState(false);
  const [modalSuprimentoAberto, setModalSuprimentoAberto] = useState(false);
  const [modalSangriaAberto, setModalSangriaAberto] = useState(false);
  const [modalTrocaOperadorAberto, setModalTrocaOperadorAberto] = useState(false);
  const [modalFechamentoAberto, setModalFechamentoAberto] = useState(false);

  // Estados de Formulário
  const [valorAberturaReais, setValorAberturaReais] = useState('100.00');
  const [valorMovimentacaoReais, setValorMovimentacaoReais] = useState('');
  const [motivoMovimentacao, setMotivoMovimentacao] = useState('');
  const [saldoDeclaradoFechamentoReais, setSaldoDeclaradoFechamentoReais] = useState('');
  const [justificativaFechamento, setJustificativaFechamento] = useState('');
  const [novoOperadorNome, setNovoOperadorNome] = useState('Roberto Atendente');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Executar Abertura de Caixa
  const handleAbrirCaixa = () => {
    const centavos = Math.round(parseFloat(valorAberturaReais || '0') * 100);
    if (centavos < 0) {
      setMensagemErro('O saldo de abertura não pode ser negativo.');
      return;
    }

    setResumoCaixa({
      caixaSessaoId: `sessao-${Date.now()}`,
      empresaId: empresaAtiva?.id || 'emp-demo',
      filialId: filialAtiva?.id || 'fil-demo',
      dispositivoId: 'HW-CAIXA-01',
      operadorAberturaId: usuario?.id || 'op-demo',
      operadorAtualId: usuario?.id || 'op-demo',
      status: 'ABERTO',
      abertoEm: new Date().toISOString(),
      saldoInicialCentavos: centavos,
      totalVendasDinheiroCentavos: 0,
      totalVendasPixCentavos: 0,
      totalVendasCartaoDebitoCentavos: 0,
      totalVendasCartaoCreditoCentavos: 0,
      totalVendasVoucherCentavos: 0,
      totalSuprimentosCentavos: 0,
      totalSangriasCentavos: 0,
      totalTrocoDevolvidoCentavos: 0,
      saldoGavetaDinheiroEsperadoCentavos: centavos,
      quantidadeVendasConcluidas: 0,
      quantidadeVendasCanceladas: 0,
    });

    setMovimentacoes([]);
    setCaixaAberto(true);
    setModalAberturaAberto(false);
    setMensagemSucesso('Sessão de caixa aberta com sucesso.');
  };

  // Registrar Suprimento
  const handleSuprimento = () => {
    setMensagemErro(null);
    const centavos = Math.round(parseFloat(valorMovimentacaoReais || '0') * 100);
    if (centavos <= 0 || !motivoMovimentacao.trim()) {
      setMensagemErro('Informe um valor válido e a justificativa para o suprimento.');
      return;
    }

    const novaMov: CaixaMovimentacao = {
      id: `mov-${Date.now()}`,
      empresaId: empresaAtiva?.id || 'emp-demo',
      filialId: filialAtiva?.id || 'fil-demo',
      caixaSessaoId: resumoCaixa.caixaSessaoId,
      tipoMovimentacao: 'SUPRIMENTO',
      valorCentavos: centavos,
      motivo: motivoMovimentacao.trim(),
      usuarioId: usuario?.id || 'op-demo',
      criadoEm: new Date().toISOString(),
    };

    setMovimentacoes([novaMov, ...movimentacoes]);
    setResumoCaixa({
      ...resumoCaixa,
      totalSuprimentosCentavos: resumoCaixa.totalSuprimentosCentavos + centavos,
      saldoGavetaDinheiroEsperadoCentavos: resumoCaixa.saldoGavetaDinheiroEsperadoCentavos + centavos,
    });

    setValorMovimentacaoReais('');
    setMotivoMovimentacao('');
    setModalSuprimentoAberto(false);
    setMensagemSucesso('Suprimento de troco registrado com sucesso.');
  };

  // Registrar Sangria
  const handleSangria = () => {
    setMensagemErro(null);
    const centavos = Math.round(parseFloat(valorMovimentacaoReais || '0') * 100);
    if (centavos <= 0 || !motivoMovimentacao.trim()) {
      setMensagemErro('Informe um valor válido e a justificativa para a sangria.');
      return;
    }

    // Validação estrita: saldo físico na gaveta
    if (centavos > resumoCaixa.saldoGavetaDinheiroEsperadoCentavos) {
      setMensagemErro(
        `Saldo insuficiente em dinheiro na gaveta. Saldo disponível: ${formatarCentavosParaReal(
          resumoCaixa.saldoGavetaDinheiroEsperadoCentavos,
        )}.`,
      );
      return;
    }

    const novaMov: CaixaMovimentacao = {
      id: `mov-${Date.now()}`,
      empresaId: empresaAtiva?.id || 'emp-demo',
      filialId: filialAtiva?.id || 'fil-demo',
      caixaSessaoId: resumoCaixa.caixaSessaoId,
      tipoMovimentacao: 'SANGRIA',
      valorCentavos: centavos,
      motivo: motivoMovimentacao.trim(),
      usuarioId: usuario?.id || 'op-demo',
      criadoEm: new Date().toISOString(),
    };

    setMovimentacoes([novaMov, ...movimentacoes]);
    setResumoCaixa({
      ...resumoCaixa,
      totalSangriasCentavos: resumoCaixa.totalSangriasCentavos + centavos,
      saldoGavetaDinheiroEsperadoCentavos: resumoCaixa.saldoGavetaDinheiroEsperadoCentavos - centavos,
    });

    setValorMovimentacaoReais('');
    setMotivoMovimentacao('');
    setModalSangriaAberto(false);
    setMensagemSucesso('Sangria de caixa realizada e auditada com sucesso.');
  };

  // Troca de Operador (Handover)
  const handleTrocaOperador = () => {
    setModalTrocaOperadorAberto(false);
    setMensagemSucesso(`Troca de operador realizada com sucesso. Novo operador ativo: ${novoOperadorNome}.`);
  };

  // Fechar Caixa
  const handleFecharCaixa = () => {
    setMensagemErro(null);
    const centavosDeclarados = Math.round(parseFloat(saldoDeclaradoFechamentoReais || '0') * 100);
    const diferenca = centavosDeclarados - resumoCaixa.saldoGavetaDinheiroEsperadoCentavos;

    // Regra mandatória: justificativa obrigatória se houver divergência
    if (diferenca !== 0 && (!justificativaFechamento || justificativaFechamento.trim().length < 5)) {
      setMensagemErro(
        `Divergência apurada (${formatarCentavosParaReal(
          diferenca,
        )}). É obrigatório preencher a justificativa da diferença para fechar o caixa.`,
      );
      return;
    }

    setResumoCaixa({
      ...resumoCaixa,
      status: 'FECHADO',
      fechadoEm: new Date().toISOString(),
    });

    setCaixaAberto(false);
    setModalFechamentoAberto(false);
    setMensagemSucesso('Sessão de caixa encerrada e conferida com sucesso.');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo de Caixa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Coins className="w-5 h-5 text-blue-600" />
              Operação de Caixa & Controle de Turno
            </h1>
            <Badge variante={caixaAberto ? 'sucesso' : 'neutro'} tamanho="sm">
              {caixaAberto ? 'Caixa Aberto' : 'Caixa Fechado'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Terminal: <strong>CX-01</strong> • Filial: <strong>{filialAtiva?.nome}</strong> • Operador:{' '}
            <strong>{usuario?.nome || 'Operador Caixa'}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {caixaAberto ? (
            <>
              {temPermissao('pdv:suprimento') && (
                <Botao
                  variante="outline"
                  tamanho="sm"
                  onClick={() => setModalSuprimentoAberto(true)}
                  iconeEsquerda={<ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />}
                >
                  Suprimento
                </Botao>
              )}

              {temPermissao('pdv:sangria') && (
                <Botao
                  variante="outline"
                  tamanho="sm"
                  onClick={() => setModalSangriaAberto(true)}
                  iconeEsquerda={<ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />}
                >
                  Sangria
                </Botao>
              )}

              <Botao
                variante="outline"
                tamanho="sm"
                onClick={() => setModalTrocaOperadorAberto(true)}
                iconeEsquerda={<UserCheck className="w-3.5 h-3.5 text-blue-600" />}
              >
                Trocar Operador
              </Botao>

              {temPermissao('pdv:fechar_caixa') && (
                <Botao
                  variante="perigo"
                  tamanho="sm"
                  onClick={() => {
                    setSaldoDeclaradoFechamentoReais('');
                    setJustificativaFechamento('');
                    setModalFechamentoAberto(true);
                  }}
                  iconeEsquerda={<Lock className="w-3.5 h-3.5" />}
                >
                  Fechar Caixa
                </Botao>
              )}
            </>
          ) : (
            <Botao
              variante="primario"
              tamanho="md"
              onClick={() => setModalAberturaAberto(true)}
              iconeEsquerda={<Unlock className="w-4 h-4" />}
            >
              Abrir Nova Sessão de Caixa
            </Botao>
          )}
        </div>
      </div>

      {mensagemSucesso && (
        <Alerta tipo="sucesso" titulo="Operação Concluída">
          {mensagemSucesso}
        </Alerta>
      )}

      {mensagemErro && (
        <Alerta tipo="erro" titulo="Atenção">
          {mensagemErro}
        </Alerta>
      )}

      {/* Cards de Apuração Financeira (Bordas arredondadas e formato retangular estrito) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Saldo em Dinheiro na Gaveta Física */}
        <Card className="border-blue-200 bg-blue-50/40">
          <CardConteudo className="space-y-1.5 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
              Dinheiro na Gaveta Física
            </span>
            <div className="text-2xl font-extrabold text-blue-900 font-mono">
              {formatarCentavosParaReal(resumoCaixa.saldoGavetaDinheiroEsperadoCentavos)}
            </div>
            <p className="text-[10px] text-blue-600">
              Saldo Inicial + Suprimentos - Sangrias + Vendas em Dinheiro Líquido
            </p>
          </CardConteudo>
        </Card>

        {/* Card Vendas PIX */}
        <Card>
          <CardConteudo className="space-y-1.5 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Vendas PIX
            </span>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {formatarCentavosParaReal(resumoCaixa.totalVendasPixCentavos)}
            </div>
            <p className="text-[10px] text-slate-400">Não afeta a gaveta física de dinheiro</p>
          </CardConteudo>
        </Card>

        {/* Card Vendas Cartões */}
        <Card>
          <CardConteudo className="space-y-1.5 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Cartões (Déb./Créd.)
            </span>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {formatarCentavosParaReal(
                resumoCaixa.totalVendasCartaoDebitoCentavos +
                  resumoCaixa.totalVendasCartaoCreditoCentavos,
              )}
            </div>
            <p className="text-[10px] text-slate-400">Conciliação eletrônica de adquirente</p>
          </CardConteudo>
        </Card>

        {/* Card Vouchers Resgatados */}
        <Card>
          <CardConteudo className="space-y-1.5 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Vouchers Resgatados
            </span>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {formatarCentavosParaReal(resumoCaixa.totalVendasVoucherCentavos)}
            </div>
            <p className="text-[10px] text-slate-400">Compensação contábil interna FarmaPro</p>
          </CardConteudo>
        </Card>
      </div>

      {/* Detalhamento do Turno & Histórico de Movimentações */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Resumo Consolidado (5 Colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardCabecalho>
              <CardTitulo className="text-sm">Auditoria e Métricas da Sessão</CardTitulo>
              <CardDescricao>Valores conciliados desde o início do turno</CardDescricao>
            </CardCabecalho>
            <CardConteudo className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Saldo Inicial (Abertura):</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatarCentavosParaReal(resumoCaixa.saldoInicialCentavos)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Vendas em Dinheiro (Bruto):</span>
                <span className="font-mono font-semibold text-emerald-600">
                  + {formatarCentavosParaReal(resumoCaixa.totalVendasDinheiroCentavos)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Trocos Devolvidos aos Clientes:</span>
                <span className="font-mono font-semibold text-red-500">
                  - {formatarCentavosParaReal(resumoCaixa.totalTrocoDevolvidoCentavos)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Suprimentos de Gaveta:</span>
                <span className="font-mono font-semibold text-emerald-600">
                  + {formatarCentavosParaReal(resumoCaixa.totalSuprimentosCentavos)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Sangrias de Caixa:</span>
                <span className="font-mono font-semibold text-amber-600">
                  - {formatarCentavosParaReal(resumoCaixa.totalSangriasCentavos)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t border-slate-200 font-bold text-sm">
                <span className="text-slate-900">Dinheiro Físico Esperado:</span>
                <span className="font-mono text-blue-700">
                  {formatarCentavosParaReal(resumoCaixa.saldoGavetaDinheiroEsperadoCentavos)}
                </span>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                <div>Cupons Concluídos: <strong>{resumoCaixa.quantidadeVendasConcluidas}</strong></div>
                <div>Cupons Cancelados: <strong>{resumoCaixa.quantidadeVendasCanceladas}</strong></div>
                <div>Horário de Abertura: {formatarDataHoraBR(resumoCaixa.abertoEm)}</div>
              </div>
            </CardConteudo>
          </Card>
        </div>

        {/* Painel Direito: Movimentações de Suprimento e Sangria (7 Colunas) */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardCabecalho className="flex items-center justify-between">
              <div>
                <CardTitulo className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  Movimentações de Numerário (Gaveta)
                </CardTitulo>
                <CardDescricao>Trilha de auditoria das entradas e retiradas manuais</CardDescricao>
              </div>
            </CardCabecalho>
            <CardConteudo>
              {movimentacoes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma movimentação avulsa registrada nesta sessão.
                </div>
              ) : (
                <TabelaContainer>
                  <TabelaCabecalho>
                    <TabelaLinha>
                      <TabelaColuna>Horário</TabelaColuna>
                      <TabelaColuna>Tipo</TabelaColuna>
                      <TabelaColuna>Motivo / Justificativa</TabelaColuna>
                      <TabelaColuna className="text-right">Valor</TabelaColuna>
                    </TabelaLinha>
                  </TabelaCabecalho>
                  <TabelaCorpo>
                    {movimentacoes.map(m => (
                      <TabelaLinha key={m.id}>
                        <TabelaCelula className="text-xs text-slate-500 font-mono">
                          {formatarDataHoraBR(m.criadoEm).split(' ')[1]}
                        </TabelaCelula>
                        <TabelaCelula>
                          <Badge
                            variante={m.tipoMovimentacao === 'SUPRIMENTO' ? 'sucesso' : 'aviso'}
                            tamanho="sm"
                          >
                            {m.tipoMovimentacao}
                          </Badge>
                        </TabelaCelula>
                        <TabelaCelula className="text-xs text-slate-700">
                          {m.motivo}
                        </TabelaCelula>
                        <TabelaCelula className="text-right font-mono font-bold text-xs">
                          <span
                            className={
                              m.tipoMovimentacao === 'SUPRIMENTO'
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }
                          >
                            {m.tipoMovimentacao === 'SUPRIMENTO' ? '+' : '-'}
                            {formatarCentavosParaReal(m.valorCentavos)}
                          </span>
                        </TabelaCelula>
                      </TabelaLinha>
                    ))}
                  </TabelaCorpo>
                </TabelaContainer>
              )}
            </CardConteudo>
          </Card>
        </div>
      </div>

      {/* Modal de Abertura de Caixa */}
      <Modal
        aberto={modalAberturaAberto}
        aoFechar={() => setModalAberturaAberto(false)}
        titulo="Abertura de Turno de Caixa"
        descricao="Defina o saldo inicial em dinheiro físico para troco na gaveta."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Saldo Inicial em Espécie (R$):
            </label>
            <CampoTexto
              type="number"
              value={valorAberturaReais}
              onChange={e => setValorAberturaReais(e.target.value)}
              placeholder="100.00"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="outline" onClick={() => setModalAberturaAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={handleAbrirCaixa}>
              Confirmar Abertura
            </Botao>
          </div>
        </div>
      </Modal>

      {/* Modal de Suprimento */}
      <Modal
        aberto={modalSuprimentoAberto}
        aoFechar={() => setModalSuprimentoAberto(false)}
        titulo="Suprimento de Caixa (Entrada de Troco)"
        descricao="Adicione numerário em dinheiro à gaveta com justificativa registrada."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Valor da Entrada (R$):
            </label>
            <CampoTexto
              type="number"
              placeholder="Ex: 50.00"
              value={valorMovimentacaoReais}
              onChange={e => setValorMovimentacaoReais(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Motivo do Suprimento:
            </label>
            <CampoTexto
              placeholder="Ex: Reforço de troco / moedas"
              value={motivoMovimentacao}
              onChange={e => setMotivoMovimentacao(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="outline" onClick={() => setModalSuprimentoAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={handleSuprimento}>
              Registrar Suprimento
            </Botao>
          </div>
        </div>
      </Modal>

      {/* Modal de Sangria */}
      <Modal
        aberto={modalSangriaAberto}
        aoFechar={() => setModalSangriaAberto(false)}
        titulo="Sangria de Caixa (Retirada de Dinheiro)"
        descricao="Retirada preventiva de numerário da gaveta para segurança."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Valor da Retirada (R$):
            </label>
            <CampoTexto
              type="number"
              placeholder="Ex: 100.00"
              value={valorMovimentacaoReais}
              onChange={e => setValorMovimentacaoReais(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Destino / Motivo da Sangria:
            </label>
            <CampoTexto
              placeholder="Ex: Envio ao cofre da filial / excesso de numerário"
              value={motivoMovimentacao}
              onChange={e => setMotivoMovimentacao(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="outline" onClick={() => setModalSangriaAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={handleSangria}>
              Confirmar Sangria
            </Botao>
          </div>
        </div>
      </Modal>

      {/* Modal de Troca de Operador (Handover) */}
      <Modal
        aberto={modalTrocaOperadorAberto}
        aoFechar={() => setModalTrocaOperadorAberto(false)}
        titulo="Troca de Operador (Handover)"
        descricao="Transfira a operação do terminal sem encerrar a sessão de vendas do PDV."
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
            A troca de operador registra o encerramento do turno individual e inicia a responsabilidade do novo operador com auditoria imutável.
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Selecione o Novo Operador:
            </label>
            <select
              value={novoOperadorNome}
              onChange={e => setNovoOperadorNome(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900"
            >
              <option value="Roberto Atendente">Roberto Atendente (Turno Tarde)</option>
              <option value="Mariana Caixa">Mariana Caixa</option>
              <option value="Carlos Proprietário">Carlos Proprietário (Gerência)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="outline" onClick={() => setModalTrocaOperadorAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={handleTrocaOperador}>
              Confirmar Troca de Operador
            </Botao>
          </div>
        </div>
      </Modal>

      {/* Modal de Fechamento de Caixa com Fechamento Cego */}
      <Modal
        aberto={modalFechamentoAberto}
        aoFechar={() => setModalFechamentoAberto(false)}
        titulo="Fechamento de Sessão de Caixa"
        descricao="Conferência cega: informe o valor total apurado fisicamente na gaveta."
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
            <span className="font-bold block text-slate-900">Procedimento de Fechamento Cego:</span>
            <span>
              Realize a contagem física das cédulas e moedas presentes na gaveta e digite o valor abaixo.
              O sistema confrontará com o saldo esperado e exigirá justificativa caso exista qualquer divergência.
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Valor Físico Contado na Gaveta (R$):
            </label>
            <CampoTexto
              type="number"
              placeholder="Ex: 289.00"
              value={saldoDeclaradoFechamentoReais}
              onChange={e => setSaldoDeclaradoFechamentoReais(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Justificativa (Obrigatória se houver divergência):
            </label>
            <CampoTexto
              placeholder="Explique eventuais quebras ou diferenças de caixa..."
              value={justificativaFechamento}
              onChange={e => setJustificativaFechamento(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="outline" onClick={() => setModalFechamentoAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={handleFecharCaixa}>
              Encerrar Turno de Caixa
            </Botao>
          </div>
        </div>
      </Modal>
    </div>
  );
};
