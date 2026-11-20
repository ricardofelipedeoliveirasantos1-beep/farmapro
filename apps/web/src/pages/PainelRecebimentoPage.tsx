import React, { useState } from 'react';
import {
  Card,
  Botao,
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
  formatarDataBR,
  formatarDataHoraBR,
  parsearNfeXml,
  RecebimentoMercadoria,
  RecebimentoMercadoriaItem,
  RecebimentoDivergenciaHistorico,
  StatusRecebimento,
  StatusLote,
} from '@farmapro/shared';
import {
  PackageCheck,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Search,
  DollarSign,
  Layers,
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  Truck,
  FileText,
  Boxes,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

// ==============================================================================
// Exemplo de XML NF-e 4.00 Fictício para Demonstração Interativa
// ==============================================================================
const XML_DEMO_PADRAO = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35261111222333000181550010000045671000045678" versao="4.00">
      <ide>
        <nNF>4567</nNF>
        <serie>1</serie>
        <dhEmi>2026-11-20T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>11222333000181</CNPJ>
        <xNome>Distribuidora Farmacêutica Central Ltda</xNome>
        <xFant>Central Medicamentos</xFant>
      </emit>
      <dest>
        <CNPJ>11111111000191</CNPJ>
        <xNome>Farmácia FarmaPro Matriz Ltda</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>DIP-500</cProd>
          <cEAN>7891234567890</cEAN>
          <xProd>Dipirona Monoidratada 500mg/mL 20mL</xProd>
          <NCM>30049099</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>100.00</qCom>
          <vUnCom>4.50</vUnCom>
          <vProd>450.00</vProd>
          <vDesc>0.00</vDesc>
          <rastro>
            <nLote>DIP-2026-L01</nLote>
            <qLote>100.00</qLote>
            <dFab>2026-01-15</dFab>
            <dVal>2028-01-15</dVal>
          </rastro>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>AMX-500</cProd>
          <cEAN>7892222222222</cEAN>
          <xProd>Amoxicilina 500mg Cx 21 comprimidos</xProd>
          <NCM>30041011</NCM>
          <CFOP>5102</CFOP>
          <uCom>CX</uCom>
          <qCom>50.00</qCom>
          <vUnCom>12.00</vUnCom>
          <vProd>600.00</vProd>
          <vDesc>0.00</vDesc>
          <rastro>
            <nLote>AMX-2026-B02</nLote>
            <qLote>50.00</qLote>
            <dFab>2026-02-01</dFab>
            <dVal>2027-11-30</dVal>
          </rastro>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>1050.00</vProd>
          <vFrete>0.00</vFrete>
          <vDesc>0.00</vDesc>
          <vNF>1050.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

// ==============================================================================
// Dados Iniciais Demonstrativos de Pedidos de Compra Homologados
// ==============================================================================
interface PedidoAguardando {
  id: string;
  numeroPedido: string;
  fornecedorNome: string;
  cnpjFornecedor: string;
  dataPrevisaoEntrega: string;
  valorTotalCentavos: number;
  status: string;
  itens: {
    id: string;
    produtoId: string;
    nomeProduto: string;
    codigoBarras: string;
    quantidadePedida: number;
    quantidadeEntregue: number;
    valorUnitarioCentavos: number;
  }[];
}

const PEDIDOS_AGUARDANDO_INICIAIS: PedidoAguardando[] = [
  {
    id: 'ped-compra-001',
    numeroPedido: 'PED-2026-0001',
    fornecedorNome: 'Distribuidora Farmacêutica Central Ltda',
    cnpjFornecedor: '11222333000181',
    dataPrevisaoEntrega: '2026-11-22',
    valorTotalCentavos: 105000,
    status: 'CONFIRMADO_FORNECEDOR',
    itens: [
      {
        id: 'ped-item-01',
        produtoId: 'prod-dipirona',
        nomeProduto: 'Dipirona Monoidratada 500mg/mL 20mL',
        codigoBarras: '7891234567890',
        quantidadePedida: 100,
        quantidadeEntregue: 0,
        valorUnitarioCentavos: 450,
      },
      {
        id: 'ped-item-02',
        produtoId: 'prod-amoxicilina',
        nomeProduto: 'Amoxicilina 500mg Cx 21 comprimidos',
        codigoBarras: '7892222222222',
        quantidadePedida: 50,
        quantidadeEntregue: 0,
        valorUnitarioCentavos: 1200,
      },
    ],
  },
  {
    id: 'ped-compra-002',
    numeroPedido: 'PED-2026-0002',
    fornecedorNome: 'Laboratórios Químicos Nacional S/A',
    cnpjFornecedor: '44555666000181',
    dataPrevisaoEntrega: '2026-11-25',
    valorTotalCentavos: 168000,
    status: 'APROVADO',
    itens: [
      {
        id: 'ped-item-03',
        produtoId: 'prod-omeprazol',
        nomeProduto: 'Omeprazol 20mg Cx 28 caps',
        codigoBarras: '7893333333333',
        quantidadePedida: 200,
        quantidadeEntregue: 0,
        valorUnitarioCentavos: 840,
      },
    ],
  },
];

export const PainelRecebimentoPage: React.FC = () => {
  const { usuario, temPermissao } = useAuth();

  // Permissões Atômicas
  const podeImportarXml = temPermissao('recebimento:importar_xml');
  const podeConferir = temPermissao('recebimento:conferir');
  const podeRegistrarDivergencia = temPermissao('recebimento:registrar_divergencia');
  const podeAprovarDivergencia = temPermissao('recebimento:aprovar_divergencia');
  const podeConfirmar = temPermissao('recebimento:confirmar');

  // Estados de Navegação e Abas
  const [abaAtiva, setAbaAtiva] = useState<'importar' | 'conferencia' | 'historico'>('importar');

  // Estados de Importação de XML
  const [xmlTexto, setXmlTexto] = useState<string>(XML_DEMO_PADRAO);
  const [xmlImportadoPreview, setXmlImportadoPreview] = useState<any | null>(null);
  const [erroXml, setErroXml] = useState<string | null>(null);
  const [sucessoXml, setSucessoXml] = useState<string | null>(null);

  // Pedidos e Lista de Conferências
  const [pedidos, setPedidos] = useState<PedidoAguardando[]>(PEDIDOS_AGUARDANDO_INICIAIS);

  // Conferência Ativa (Sessão 3-Way Matching)
  const [conferenciaAtiva, setConferenciaAtiva] = useState<RecebimentoMercadoria | null>({
    id: 'rec-sessao-01',
    empresaId: '11111111-1111-4111-a111-111111111111',
    filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
    nomeFilial: 'Filial 01 — Centro (Matriz)',
    nfeId: 'nfe-001',
    chaveAcessoNfe: '35261111222333000181550010000045671000045678',
    numeroNfe: '4567',
    pedidoCompraId: 'ped-compra-001',
    numeroPedidoCompra: 'PED-2026-0001',
    numeroRecebimento: 'REC-2026-0001',
    numeroSequencial: 1,
    status: 'EM_CONFERENCIA',
    temDivergencia: false,
    valorTotalNfeCentavos: 105000,
    valorTotalPedidoCentavos: 105000,
    valorReconhecidoCentavos: 0,
    conferidoPorId: usuario?.id || 'usr-01',
    nomeConferente: usuario?.nome || 'Operador de Recebimento',
    dataRecebimento: new Date().toISOString(),
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    itens: [
      {
        id: 'rec-item-01',
        empresaId: '11111111-1111-4111-a111-111111111111',
        recebimentoId: 'rec-sessao-01',
        produtoId: 'prod-dipirona',
        nomeProduto: 'Dipirona Monoidratada 500mg/mL 20mL',
        codigoBarras: '7891234567890',
        filialDestinoId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
        nomeFilialDestino: 'Filial 01 — Centro (Matriz)',
        pedidoItemId: 'ped-item-01',
        quantidadePedida: 100,
        quantidadeNotaFiscal: 100,
        quantidadeRecebidaFisica: 100,
        quantidadeLiberadaVenda: 100,
        valorUnitarioPedidoCentavos: 450,
        valorUnitarioNfeCentavos: 450,
        valorUnitarioReconhecidoCentavos: 450,
        numeroLote: 'DIP-2026-L01',
        dataFabricacao: '2026-01-15',
        dataValidade: '2028-01-15',
        statusLote: 'ATIVO',
        divergenciaDetectada: 'NENHUMA',
        estoqueAtualizado: false,
        criadoEm: new Date().toISOString(),
      },
      {
        id: 'rec-item-02',
        empresaId: '11111111-1111-4111-a111-111111111111',
        recebimentoId: 'rec-sessao-01',
        produtoId: 'prod-amoxicilina',
        nomeProduto: 'Amoxicilina 500mg Cx 21 comprimidos',
        codigoBarras: '7892222222222',
        filialDestinoId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
        nomeFilialDestino: 'Filial 01 — Centro (Matriz)',
        pedidoItemId: 'ped-item-02',
        quantidadePedida: 50,
        quantidadeNotaFiscal: 50,
        quantidadeRecebidaFisica: 50,
        quantidadeLiberadaVenda: 50,
        valorUnitarioPedidoCentavos: 1200,
        valorUnitarioNfeCentavos: 1200,
        valorUnitarioReconhecidoCentavos: 1200,
        numeroLote: 'AMX-2026-B02',
        dataFabricacao: '2026-02-01',
        dataValidade: '2027-11-30',
        statusLote: 'ATIVO',
        divergenciaDetectada: 'NENHUMA',
        estoqueAtualizado: false,
        criadoEm: new Date().toISOString(),
      },
    ],
    historicoDivergencias: [],
  });

  // Lista Histórica de Recebimentos Concluídos
  const [historicoRecebimentos, setHistoricoRecebimentos] = useState<RecebimentoMercadoria[]>([
    {
      id: 'rec-hist-00',
      empresaId: '11111111-1111-4111-a111-111111111111',
      filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
      nomeFilial: 'Filial 01 — Centro (Matriz)',
      chaveAcessoNfe: '35260111222333000181550010000012341000012345',
      numeroNfe: '1234',
      numeroPedidoCompra: 'PED-2026-0000',
      numeroRecebimento: 'REC-2026-0000',
      numeroSequencial: 0,
      status: 'CONCLUIDO',
      temDivergencia: false,
      valorTotalNfeCentavos: 85000,
      valorTotalPedidoCentavos: 85000,
      valorReconhecidoCentavos: 85000,
      conferidoPorId: 'usr-01',
      nomeConferente: 'Carlos Oliveira (Farmacêutico)',
      finalizadoPorId: 'usr-01',
      nomeFinalizador: 'Carlos Oliveira (Farmacêutico)',
      dataRecebimento: '2026-11-10T14:30:00Z',
      criadoEm: '2026-11-10T14:00:00Z',
      atualizadoEm: '2026-11-10T14:45:00Z',
      itens: [],
      historicoDivergencias: [],
    },
  ]);

  // Modais
  const [modalDivergenciaAberto, setModalDivergenciaAberto] = useState(false);
  const [justificativaDivergencia, setJustificativaDivergencia] = useState('');
  const [modalAprovacaoAberto, setModalAprovacaoAberto] = useState(false);
  const [justificativaAprovacao, setJustificativaAprovacao] = useState('');
  const [decisaoAprovacao, setDecisaoAprovacao] = useState<boolean>(true);
  const [modalConfirmacaoSucesso, setModalConfirmacaoSucesso] = useState(false);

  // Feedback e Alertas
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // ==============================================================================
  // Ações de Processamento do XML
  // ==============================================================================
  const aoProcessarXml = () => {
    try {
      setErroXml(null);
      setSucessoXml(null);
      const resultado = parsearNfeXml(xmlTexto);
      setXmlImportadoPreview(resultado);
      setSucessoXml(`XML processado com sucesso! Chave de 44 dígitos: ${resultado.chaveAcesso} — Emitente: ${resultado.razaoSocialEmitente}`);
    } catch (err: any) {
      setErroXml(err.message || 'Falha na validação estrutural do arquivo XML de NF-e.');
      setXmlImportadoPreview(null);
    }
  };

  const aoCarregarXmlDemo = () => {
    setXmlTexto(XML_DEMO_PADRAO);
    setErroXml(null);
    setSucessoXml(null);
    setXmlImportadoPreview(null);
  };

  // ==============================================================================
  // Iniciar Conferência Física
  // ==============================================================================
  const aoIniciarConferencia = (ped: PedidoAguardando) => {
    if (!podeConferir) {
      setMensagemErro('Você não possui a permissão recebimento:conferir.');
      return;
    }

    const nfe = xmlImportadoPreview;
    const novaSessao: RecebimentoMercadoria = {
      id: `rec-${Date.now()}`,
      empresaId: '11111111-1111-4111-a111-111111111111',
      filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
      nomeFilial: 'Filial 01 — Centro (Matriz)',
      nfeId: nfe ? 'nfe-importada-atual' : undefined,
      chaveAcessoNfe: nfe?.chaveAcesso || '35261111222333000181550010000045671000045678',
      numeroNfe: nfe?.numeroNfe || '4567',
      pedidoCompraId: ped.id,
      numeroPedidoCompra: ped.numeroPedido,
      numeroRecebimento: `REC-2026-000${historicoRecebimentos.length + 1}`,
      numeroSequencial: historicoRecebimentos.length + 1,
      status: 'EM_CONFERENCIA',
      temDivergencia: false,
      valorTotalNfeCentavos: nfe?.valorTotalCentavos || ped.valorTotalCentavos,
      valorTotalPedidoCentavos: ped.valorTotalCentavos,
      valorReconhecidoCentavos: 0,
      conferidoPorId: usuario?.id || 'usr-01',
      nomeConferente: usuario?.nome || 'Operador de Recebimento',
      dataRecebimento: new Date().toISOString(),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      itens: ped.itens.map((it, idx) => ({
        id: `rec-item-${Date.now()}-${idx}`,
        empresaId: '11111111-1111-4111-a111-111111111111',
        recebimentoId: `rec-${Date.now()}`,
        produtoId: it.produtoId,
        nomeProduto: it.nomeProduto,
        codigoBarras: it.codigoBarras,
        filialDestinoId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
        nomeFilialDestino: 'Filial 01 — Centro (Matriz)',
        pedidoItemId: it.id,
        quantidadePedida: it.quantidadePedida,
        quantidadeNotaFiscal: it.quantidadePedida,
        quantidadeRecebidaFisica: it.quantidadePedida,
        quantidadeLiberadaVenda: it.quantidadePedida,
        valorUnitarioPedidoCentavos: it.valorUnitarioCentavos,
        valorUnitarioNfeCentavos: it.valorUnitarioCentavos,
        valorUnitarioReconhecidoCentavos: it.valorUnitarioCentavos,
        numeroLote: `LOT-${new Date().getFullYear()}-${idx + 10}`,
        dataFabricacao: '2026-01-01',
        dataValidade: '2028-01-01',
        statusLote: 'ATIVO',
        divergenciaDetectada: 'NENHUMA',
        estoqueAtualizado: false,
        criadoEm: new Date().toISOString(),
      })),
      historicoDivergencias: [],
    };

    setConferenciaAtiva(novaSessao);
    setAbaAtiva('conferencia');
    setMensagemSucesso(`Sessão de conferência física iniciada: ${novaSessao.numeroRecebimento} para o pedido ${ped.numeroPedido}`);
  };

  // ==============================================================================
  // Atualização de Linhas de Conferência Física & Verificação Sanitária
  // ==============================================================================
  const aoAlterarItemConferencia = (
    itemId: string,
    campo: keyof RecebimentoMercadoriaItem,
    valor: any
  ) => {
    if (!conferenciaAtiva) return;

    const hojeStr = new Date().toISOString().split('T')[0]!;

    const novosItens = conferenciaAtiva.itens.map((it) => {
      if (it.id !== itemId) return it;

      const atualizado: RecebimentoMercadoriaItem = { ...it, [campo]: valor };

      // Se a validade for vencida ou no passado, trava quantidade liberada para venda em ZERO
      if (campo === 'dataValidade' && valor <= hojeStr) {
        atualizado.statusLote = 'VENCIDO';
        atualizado.quantidadeLiberadaVenda = 0;
        atualizado.divergenciaDetectada = 'LOTE_VENCIDO';
      }

      // Se status for Quarentena ou Bloqueado, trava quantidade para venda em ZERO
      if (campo === 'statusLote') {
        if (valor === 'QUARENTENA' || valor === 'BLOQUEADO' || valor === 'VENCIDO') {
          atualizado.quantidadeLiberadaVenda = 0;
        } else if (it.dataValidade > hojeStr) {
          atualizado.quantidadeLiberadaVenda = it.quantidadeRecebidaFisica;
        }
      }

      // Se alterou a quantidade recebida física e status ativo
      if (campo === 'quantidadeRecebidaFisica' && atualizado.statusLote === 'ATIVO') {
        atualizado.quantidadeLiberadaVenda = Number(valor);
      }

      // Detecta divergências automáticas
      if (atualizado.quantidadePedida > 0 && atualizado.quantidadeRecebidaFisica > atualizado.quantidadePedida) {
        atualizado.divergenciaDetectada = 'QUANTIDADE_A_MAIS';
      } else if (atualizado.quantidadePedida > 0 && atualizado.quantidadeRecebidaFisica < atualizado.quantidadePedida) {
        atualizado.divergenciaDetectada = 'QUANTIDADE_A_MENOS';
      } else if (atualizado.valorUnitarioPedidoCentavos !== atualizado.valorUnitarioNfeCentavos) {
        atualizado.divergenciaDetectada = 'PRECO_DIVERGENTE';
      } else if (atualizado.dataValidade <= hojeStr) {
        atualizado.divergenciaDetectada = 'LOTE_VENCIDO';
      } else {
        atualizado.divergenciaDetectada = 'NENHUMA';
      }

      return atualizado;
    });

    const temAlgumaDivergencia = novosItens.some((i) => i.divergenciaDetectada !== 'NENHUMA');

    setConferenciaAtiva({
      ...conferenciaAtiva,
      itens: novosItens,
      temDivergencia: temAlgumaDivergencia,
      status: temAlgumaDivergencia ? 'AGUARDANDO_APROVACAO_DIVERGENCIA' : 'EM_CONFERENCIA',
    });
  };

  // ==============================================================================
  // Registro e Aprovação de Divergências
  // ==============================================================================
  const aoRegistrarDivergenciaModal = () => {
    if (!conferenciaAtiva) return;
    if (justificativaDivergencia.trim().length < 5) {
      setMensagemErro('A justificativa da divergência é obrigatória e deve ter no mínimo 5 caracteres.');
      return;
    }

    const novoHistorico: RecebimentoDivergenciaHistorico = {
      id: `div-${Date.now()}`,
      empresaId: conferenciaAtiva.empresaId,
      recebimentoId: conferenciaAtiva.id,
      tipoDivergencia: 'DIVERGENCIAS_DETECTADAS',
      status: 'REGISTRADA',
      usuarioId: usuario?.id || 'usr-01',
      nomeUsuario: usuario?.nome || 'Operador',
      justificativa: justificativaDivergencia.trim(),
      criadoEm: new Date().toISOString(),
    };

    setConferenciaAtiva({
      ...conferenciaAtiva,
      temDivergencia: true,
      status: 'AGUARDANDO_APROVACAO_DIVERGENCIA',
      justificativaDivergencia: justificativaDivergencia.trim(),
      divergenciaRegistradaPorId: usuario?.id || 'usr-01',
      nomeDivergenciaRegistrador: usuario?.nome || 'Operador',
      historicoDivergencias: [...(conferenciaAtiva.historicoDivergencias || []), novoHistorico],
    });

    setModalDivergenciaAberto(false);
    setJustificativaDivergencia('');
    setMensagemSucesso('Divergência registrada com sucesso. A sessão aguarda decisão de um gestor autorizado.');
  };

  const aoAprovarOuRejeitarDivergencia = () => {
    if (!conferenciaAtiva) return;

    // Regra de Segregação de Funções: quem registrou não pode aprovar
    if (conferenciaAtiva.divergenciaRegistradaPorId === usuario?.id) {
      setMensagemErro('Segregação de Funções: O mesmo usuário que registrou a divergência não pode aprová-la.');
      return;
    }

    if (justificativaAprovacao.trim().length < 5) {
      setMensagemErro('A justificativa de decisão sobre a divergência deve ter no mínimo 5 caracteres.');
      return;
    }

    const novoStatus: StatusRecebimento = decisaoAprovacao ? 'APROVADO' : 'REJEITADO';

    const novoHistorico: RecebimentoDivergenciaHistorico = {
      id: `div-${Date.now()}`,
      empresaId: conferenciaAtiva.empresaId,
      recebimentoId: conferenciaAtiva.id,
      tipoDivergencia: decisaoAprovacao ? 'APROVACAO_DIVERGENCIA' : 'REJEICAO_DIVERGENCIA',
      status: decisaoAprovacao ? 'APROVADA' : 'REJEITADA',
      usuarioId: usuario?.id || 'usr-02',
      nomeUsuario: usuario?.nome || 'Gestor de Compras',
      justificativa: justificativaAprovacao.trim(),
      criadoEm: new Date().toISOString(),
    };

    setConferenciaAtiva({
      ...conferenciaAtiva,
      status: novoStatus,
      divergenciaAprovadaPorId: usuario?.id || 'usr-02',
      nomeDivergenciaAprovador: usuario?.nome || 'Gestor de Compras',
      dataAprovacaoDivergencia: new Date().toISOString(),
      historicoDivergencias: [...(conferenciaAtiva.historicoDivergencias || []), novoHistorico],
    });

    setModalAprovacaoAberto(false);
    setJustificativaAprovacao('');
    setMensagemSucesso(
      decisaoAprovacao
        ? 'Divergência aprovada pelo gestor. A sessão está apta para confirmação e entrada de estoque.'
        : 'Divergência rejeitada. Mercadoria não será recebida no estoque.'
    );
  };

  // ==============================================================================
  // Confirmação e Entrada Definitiva no Estoque
  // ==============================================================================
  const aoConfirmarRecebimento = () => {
    if (!conferenciaAtiva) return;
    if (!podeConfirmar) {
      setMensagemErro('Você não possui a permissão recebimento:confirmar.');
      return;
    }

    if (conferenciaAtiva.status === 'AGUARDANDO_APROVACAO_DIVERGENCIA') {
      setMensagemErro('Recebimento possui divergências pendentes que exigem aprovação prévia.');
      return;
    }

    // Calcula valor total financeiro reconhecido para repasse ao Contas a Pagar
    const valorReconhecido = conferenciaAtiva.itens.reduce((acc, it) => {
      const vUnit = it.valorUnitarioReconhecidoCentavos || it.valorUnitarioPedidoCentavos || it.valorUnitarioNfeCentavos || 0;
      return acc + Math.round(it.quantidadeLiberadaVenda * vUnit);
    }, 0);

    const recFinalizado: RecebimentoMercadoria = {
      ...conferenciaAtiva,
      status: 'CONCLUIDO',
      valorReconhecidoCentavos: valorReconhecido,
      finalizadoPorId: usuario?.id || 'usr-01',
      nomeFinalizador: usuario?.nome || 'Operador',
      itens: conferenciaAtiva.itens.map((it) => ({
        ...it,
        estoqueAtualizado: true,
      })),
    };

    // Atualiza status do pedido de compra vinculado
    if (conferenciaAtiva.pedidoCompraId) {
      setPedidos((prev) =>
        prev.map((p) => {
          if (p.id !== conferenciaAtiva.pedidoCompraId) return p;
          const novoStatus =
            conferenciaAtiva.itens.some((it) => it.quantidadeRecebidaFisica < it.quantidadePedida)
              ? 'PARCIALMENTE_ATENDIDO'
              : 'CONCLUIDO';
          return {
            ...p,
            status: novoStatus,
            itens: p.itens.map((itPed) => {
              const recItem = conferenciaAtiva.itens.find((r) => r.pedidoItemId === itPed.id);
              return recItem
                ? { ...itPed, quantidadeEntregue: itPed.quantidadeEntregue + recItem.quantidadeRecebidaFisica }
                : itPed;
            }),
          };
        })
      );
    }

    setHistoricoRecebimentos([recFinalizado, ...historicoRecebimentos]);
    setConferenciaAtiva(null);
    setModalConfirmacaoSucesso(true);
    setAbaAtiva('historico');
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO & DIRETRIZES DA ETAPA 09 */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recebimento & XML NF-e</h1>
            <Badge variante="sucesso">Etapa 09</Badge>
            <Badge variante="info">3-Way Matching</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Conferência física, importação de XML de NF-e, rastreabilidade sanitária de lotes e integração com pedidos de compra.
          </p>
        </div>
      </div>

      {/* Alertas Globais de Sucesso / Erro */}
      {mensagemSucesso && (
        <Alerta
          tipo="sucesso"
          titulo="Operação Realizada"
          aoFechar={() => setMensagemSucesso(null)}
        >
          {mensagemSucesso}
        </Alerta>
      )}
      {mensagemErro && (
        <Alerta
          tipo="erro"
          titulo="Atenção"
          aoFechar={() => setMensagemErro(null)}
        >
          {mensagemErro}
        </Alerta>
      )}

      {/* Banner de Garantia Sanitária e Arquitetural */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-1">
          <p className="font-semibold text-sm">
            Garantia de Integridade e Isolamento Sanitário:
          </p>
          <p>
            A simples importação do arquivo XML de NF-e <strong>não altera o estoque físico</strong> e não libera produtos para venda. O estoque somente é creditado após a contagem física (3-Way Matching), validação de validade/FEFO e aprovação formal de divergências.
          </p>
          <p className="text-blue-800 text-[11px]">
            * <em>Aviso Fiscal: OFarmePro efetua a conferência interna de dados do XML. A autorização formal de uso perante a SEFAZ é realizada pelo software emissor do fornecedor.</em>
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KPIS OPERACIONAIS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border border-slate-200 shadow-sm p-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Conferências em Andamento</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {conferenciaAtiva && conferenciaAtiva.status === 'EM_CONFERENCIA' ? '1' : '0'}
            </span>
            <span className="text-xs text-slate-500">sessões ativas</span>
          </div>
        </Card>

        <Card className="rounded-xl border border-slate-200 shadow-sm p-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Divergências p/ Decisão</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {conferenciaAtiva && conferenciaAtiva.status === 'AGUARDANDO_APROVACAO_DIVERGENCIA' ? '1' : '0'}
            </span>
            <span className="text-xs text-amber-600 font-medium">segregação de funções</span>
          </div>
        </Card>

        <Card className="rounded-xl border border-slate-200 shadow-sm p-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Recebimentos Concluídos</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {historicoRecebimentos.length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">estoque integrado</span>
          </div>
        </Card>

        <Card className="rounded-xl border border-slate-200 shadow-sm p-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Reconhecido no Contas a Pagar</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatarCentavosParaReal(
                historicoRecebimentos.reduce((acc, r) => acc + (r.valorReconhecidoCentavos || 0), 0)
              )}
            </span>
            <span className="text-xs text-slate-500">base financeira</span>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. NAVEGAÇÃO ENTRE ABAS */}
      {/* ========================================================================= */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setAbaAtiva('importar')}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            abaAtiva === 'importar'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          Importar XML & Pedidos Aguardando
        </button>

        <button
          onClick={() => setAbaAtiva('conferencia')}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            abaAtiva === 'conferencia'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          Conferência Física (3-Way Matching)
          {conferenciaAtiva && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
              Ativa
            </span>
          )}
        </button>

        <button
          onClick={() => setAbaAtiva('historico')}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            abaAtiva === 'historico'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="h-4 w-4" />
          Histórico & Contas a Pagar
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: IMPORTAR XML DE NF-E & PEDIDOS AGUARDANDO */}
      {/* ========================================================================= */}
      {abaAtiva === 'importar' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bloco 1: Upload / Entrada do Arquivo XML */}
            <Card className="rounded-xl border border-slate-200 shadow-sm p-5 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <FileCode className="h-5 w-5 text-blue-600" />
                    Arquivo XML de NF-e (Layout 4.00)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cole o conteúdo XML da Nota Fiscal de entrada fornecida pelo distribuidor
                  </p>
                </div>
                <Botao variante="secundario" tamanho="sm" onClick={aoCarregarXmlDemo}>
                  Recarregar Exemplo
                </Botao>
              </div>

              <div>
                <textarea
                  value={xmlTexto}
                  onChange={(e) => setXmlTexto(e.target.value)}
                  rows={8}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                  placeholder="Cole aqui o conteúdo XML <nfeProc> ou <NFe>..."
                />
              </div>

              {erroXml && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{erroXml}</span>
                </div>
              )}

              {sucessoXml && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{sucessoXml}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Botao
                  variante="primario"
                  onClick={aoProcessarXml}
                  disabled={!podeImportarXml || !xmlTexto.trim()}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Processar & Validar Estrutura XML
                </Botao>
              </div>
            </Card>

            {/* Bloco 2: Pré-visualização Estrutural dos Dados Extraídos */}
            <Card className="rounded-xl border border-slate-200 shadow-sm p-5 bg-white space-y-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Dados Extraídos da NF-e
              </h3>

              {xmlImportadoPreview ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Chave de Acesso (44 dígitos):</span>
                      <span className="font-mono font-medium text-slate-800 break-all">
                        {xmlImportadoPreview.chaveAcesso}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Número / Série / Emissão:</span>
                      <span className="font-semibold text-slate-800">
                        NF-e {xmlImportadoPreview.numeroNfe} (Série {xmlImportadoPreview.serieNfe}) — {formatarDataBR(xmlImportadoPreview.dataEmissao)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Emitente (Fornecedor):</span>
                      <span className="font-medium text-slate-800 block">
                        {xmlImportadoPreview.razaoSocialEmitente}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        CNPJ: {xmlImportadoPreview.cnpjEmitente}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Destinatário (Farmácia):</span>
                      <span className="font-medium text-slate-800 block">
                        {xmlImportadoPreview.razaoSocialDestinatario || 'Farmácia FarmaPro Matriz Ltda'}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        CNPJ: {xmlImportadoPreview.cnpjDestinatario}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Itens no XML:</span>
                      <span className="font-bold text-slate-800">
                        {xmlImportadoPreview.itens.length} produto(s) identificado(s)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Valor Total da NF-e:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {formatarCentavosParaReal(xmlImportadoPreview.valorTotalCentavos)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                  Clique em "Processar & Validar Estrutura XML" para inspecionar os dados da nota fiscal antes da conferência.
                </div>
              )}
            </Card>
          </div>

          {/* Bloco 3: Pedidos de Compra Homologados Aguardando Recebimento */}
          <Card className="rounded-xl border border-slate-200 shadow-sm p-5 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Ordens de Compra Homologadas Prontas para Recebimento
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecione o pedido de compra correspondente para iniciar a conciliação tripla (3-Way Matching)
                </p>
              </div>
            </div>

            <TabelaContainer>
              <TabelaCabecalho>
                <TabelaColuna>Nº Pedido</TabelaColuna>
                <TabelaColuna>Fornecedor</TabelaColuna>
                <TabelaColuna>Previsão</TabelaColuna>
                <TabelaColuna>Itens</TabelaColuna>
                <TabelaColuna>Valor Total</TabelaColuna>
                <TabelaColuna>Status</TabelaColuna>
                <TabelaColuna>Ação</TabelaColuna>
              </TabelaCabecalho>
              <TabelaCorpo>
                {pedidos.map((ped) => (
                  <TabelaLinha key={ped.id}>
                    <TabelaCelula>
                      <span className="font-bold text-slate-900">{ped.numeroPedido}</span>
                    </TabelaCelula>
                    <TabelaCelula>
                      <div>
                        <span className="font-medium text-slate-800 block">{ped.fornecedorNome}</span>
                        <span className="text-[11px] text-slate-400 font-mono">CNPJ {ped.cnpjFornecedor}</span>
                      </div>
                    </TabelaCelula>
                    <TabelaCelula>
                      <span className="text-xs text-slate-600">{formatarDataBR(ped.dataPrevisaoEntrega)}</span>
                    </TabelaCelula>
                    <TabelaCelula>
                      <span className="text-xs text-slate-700">
                        {ped.itens.length} produto(s)
                      </span>
                    </TabelaCelula>
                    <TabelaCelula>
                      <span className="font-semibold text-slate-900">
                        {formatarCentavosParaReal(ped.valorTotalCentavos)}
                      </span>
                    </TabelaCelula>
                    <TabelaCelula>
                      <Badge variante={ped.status === 'CONCLUIDO' ? 'sucesso' : 'aviso'}>
                        {ped.status}
                      </Badge>
                    </TabelaCelula>
                    <TabelaCelula>
                      <Botao
                        variante="primario"
                        tamanho="sm"
                        onClick={() => aoIniciarConferencia(ped)}
                        disabled={!podeConferir || ped.status === 'CONCLUIDO'}
                      >
                        Iniciar Conferência
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Botao>
                    </TabelaCelula>
                  </TabelaLinha>
                ))}
              </TabelaCorpo>
            </TabelaContainer>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CONFERÊNCIA FÍSICA & 3-WAY MATCHING */}
      {/* ========================================================================= */}
      {abaAtiva === 'conferencia' && (
        <div className="space-y-6">
          {conferenciaAtiva ? (
            <>
              {/* Informações da Sessão Ativa */}
              <Card className="rounded-xl border border-slate-200 shadow-sm p-5 bg-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">
                        {conferenciaAtiva.numeroRecebimento}
                      </span>
                      <Badge
                        variante={
                          conferenciaAtiva.status === 'APROVADO'
                            ? 'sucesso'
                            : conferenciaAtiva.status === 'AGUARDANDO_APROVACAO_DIVERGENCIA'
                            ? 'perigo'
                            : 'aviso'
                        }
                      >
                        {conferenciaAtiva.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500">
                      Filial: <strong>{conferenciaAtiva.nomeFilial}</strong> • Conferente: <strong>{conferenciaAtiva.nomeConferente}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {conferenciaAtiva.temDivergencia && (
                      <Badge variante="perigo">Divergências Detectadas</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Pedido de Compra Homologado:</span>
                    <span className="font-semibold text-slate-800">
                      {conferenciaAtiva.numeroPedidoCompra} ({formatarCentavosParaReal(conferenciaAtiva.valorTotalPedidoCentavos)})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">NF-e Fornecedor:</span>
                    <span className="font-semibold text-slate-800">
                      Nº {conferenciaAtiva.numeroNfe} ({formatarCentavosParaReal(conferenciaAtiva.valorTotalNfeCentavos)})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Chave NF-e:</span>
                    <span className="font-mono text-slate-600 text-[10px] break-all">
                      {conferenciaAtiva.chaveAcessoNfe}
                    </span>
                  </div>
                </div>

                {/* Tabela de 3-Way Matching: Pedido x NF-e x Contagem Física */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Tabela de Conciliação 3-Way Matching e Rastreabilidade Sanitária
                  </h4>

                  <TabelaContainer>
                    <TabelaCabecalho>
                      <TabelaColuna>Produto</TabelaColuna>
                      <TabelaColuna>Qtd Pedida</TabelaColuna>
                      <TabelaColuna>Qtd NF-e</TabelaColuna>
                      <TabelaColuna>Qtd Contada</TabelaColuna>
                      <TabelaColuna>Qtd Liberada</TabelaColuna>
                      <TabelaColuna>Lote & Validade</TabelaColuna>
                      <TabelaColuna>Status Lote</TabelaColuna>
                      <TabelaColuna>Divergência</TabelaColuna>
                    </TabelaCabecalho>
                    <TabelaCorpo>
                      {conferenciaAtiva.itens.map((it) => (
                        <TabelaLinha key={it.id}>
                          <TabelaCelula>
                            <div>
                              <span className="font-semibold text-slate-900 block text-xs">
                                {it.nomeProduto}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                EAN: {it.codigoBarras || 'SEM GTIN'}
                              </span>
                            </div>
                          </TabelaCelula>

                          <TabelaCelula>
                            <span className="font-mono font-medium text-xs text-slate-700">
                              {it.quantidadePedida}
                            </span>
                          </TabelaCelula>

                          <TabelaCelula>
                            <span className="font-mono font-medium text-xs text-slate-700">
                              {it.quantidadeNotaFiscal}
                            </span>
                          </TabelaCelula>

                          <TabelaCelula>
                            <input
                              type="number"
                              min="0"
                              value={it.quantidadeRecebidaFisica}
                              onChange={(e) =>
                                aoAlterarItemConferencia(
                                  it.id,
                                  'quantidadeRecebidaFisica',
                                  Number(e.target.value)
                                )
                              }
                              className="w-20 px-2 py-1 text-xs border border-slate-200 rounded font-mono text-center focus:ring-1 focus:ring-blue-500"
                            />
                          </TabelaCelula>

                          <TabelaCelula>
                            <div className="flex flex-col items-center">
                              <span
                                className={`font-mono font-bold text-xs ${
                                  it.quantidadeLiberadaVenda === 0
                                    ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {it.quantidadeLiberadaVenda}
                              </span>
                              {it.quantidadeLiberadaVenda === 0 && (
                                <span className="text-[9px] text-red-500 font-semibold uppercase">
                                  Bloqueado Venda
                                </span>
                              )}
                            </div>
                          </TabelaCelula>

                          <TabelaCelula>
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={it.numeroLote}
                                onChange={(e) =>
                                  aoAlterarItemConferencia(it.id, 'numeroLote', e.target.value)
                                }
                                placeholder="Lote"
                                className="w-28 px-1.5 py-0.5 text-[11px] border border-slate-200 rounded font-mono"
                              />
                              <input
                                type="date"
                                value={it.dataValidade}
                                onChange={(e) =>
                                  aoAlterarItemConferencia(it.id, 'dataValidade', e.target.value)
                                }
                                className="w-28 px-1.5 py-0.5 text-[11px] border border-slate-200 rounded text-slate-700"
                              />
                            </div>
                          </TabelaCelula>

                          <TabelaCelula>
                            <select
                              value={it.statusLote}
                              onChange={(e) =>
                                aoAlterarItemConferencia(
                                  it.id,
                                  'statusLote',
                                  e.target.value as StatusLote
                                )
                              }
                              className={`text-[11px] font-semibold rounded px-2 py-1 border ${
                                it.statusLote === 'ATIVO'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : it.statusLote === 'VENCIDO'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <option value="ATIVO">ATIVO</option>
                              <option value="QUARENTENA">QUARENTENA</option>
                              <option value="BLOQUEADO">BLOQUEADO</option>
                              <option value="VENCIDO">VENCIDO</option>
                            </select>
                          </TabelaCelula>

                          <TabelaCelula>
                            {it.divergenciaDetectada !== 'NENHUMA' ? (
                              <Badge variante="perigo">{it.divergenciaDetectada}</Badge>
                            ) : (
                              <Badge variante="sucesso">OK</Badge>
                            )}
                          </TabelaCelula>
                        </TabelaLinha>
                      ))}
                    </TabelaCorpo>
                  </TabelaContainer>
                </div>

                {/* Histórico e Auditoria de Divergências */}
                {(conferenciaAtiva.historicoDivergencias || []).length > 0 && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      Trilha de Auditoria & Justificativas da Conferência
                    </h5>
                    <div className="space-y-1.5">
                      {(conferenciaAtiva.historicoDivergencias || []).map((h) => (
                        <div
                          key={h.id}
                          className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 flex items-start justify-between"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">
                              [{h.tipoDivergencia}] {h.status} por {h.nomeUsuario}:
                            </span>{' '}
                            <span>"{h.justificativa}"</span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {formatarDataHoraBR(h.criadoEm)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Barra de Ações Operacionais */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    {conferenciaAtiva.temDivergencia ? (
                      <span className="text-amber-700 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Divergências pendentes requerem justificativa ou aprovação de outro usuário.
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Conferência sem divergências. Pronta para confirmação no estoque.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {conferenciaAtiva.status === 'AGUARDANDO_APROVACAO_DIVERGENCIA' && (
                      <Botao
                        variante="perigo"
                        tamanho="sm"
                        onClick={() => setModalAprovacaoAberto(true)}
                        disabled={!podeAprovarDivergencia}
                      >
                        <ShieldCheck className="h-4 w-4 mr-1.5" />
                        Avaliar / Aprovar Divergência
                      </Botao>
                    )}

                    {conferenciaAtiva.temDivergencia &&
                      conferenciaAtiva.status === 'EM_CONFERENCIA' && (
                        <Botao
                          variante="secundario"
                          tamanho="sm"
                          onClick={() => setModalDivergenciaAberto(true)}
                          disabled={!podeRegistrarDivergencia}
                        >
                          Registrar Justificativa
                        </Botao>
                      )}

                    <Botao
                      variante="primario"
                      tamanho="sm"
                      onClick={aoConfirmarRecebimento}
                      disabled={
                        !podeConfirmar ||
                        conferenciaAtiva.status === 'AGUARDANDO_APROVACAO_DIVERGENCIA' ||
                        conferenciaAtiva.status === 'REJEITADO'
                      }
                    >
                      <PackageCheck className="h-4 w-4 mr-1.5" />
                      Confirmar Entrada no Estoque
                    </Botao>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl space-y-3">
              <PackageCheck className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-semibold text-slate-700">Nenhuma conferência física em andamento</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Vá até a aba "Importar XML & Pedidos Aguardando" e selecione um pedido de compra homologado para iniciar uma sessão de conferência física.
              </p>
              <Botao variante="primario" tamanho="sm" onClick={() => setAbaAtiva('importar')}>
                Ir para Pedidos Aguardando
              </Botao>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: HISTÓRICO & CONTAS A PAGAR */}
      {/* ========================================================================= */}
      {abaAtiva === 'historico' && (
        <div className="space-y-6">
          <Card className="rounded-xl border border-slate-200 shadow-sm p-5 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  Recebimentos Concluídos & Dados Estruturados para Contas a Pagar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reconciliação financeira: Valor da NF-e, Valor do Pedido e Valor Reconhecido para liquidação futura
                </p>
              </div>
            </div>

            <TabelaContainer>
              <TabelaCabecalho>
                <TabelaColuna>Nº Recebimento</TabelaColuna>
                <TabelaColuna>Filial</TabelaColuna>
                <TabelaColuna>Pedido Homologado</TabelaColuna>
                <TabelaColuna>NF-e Fornecedor</TabelaColuna>
                <TabelaColuna>Valor NF-e</TabelaColuna>
                <TabelaColuna>Valor Reconhecido</TabelaColuna>
                <TabelaColuna>Concluído Por</TabelaColuna>
                <TabelaColuna>Data</TabelaColuna>
                <TabelaColuna>Situação</TabelaColuna>
              </TabelaCabecalho>
              <TabelaCorpo>
                {historicoRecebimentos.map((r) => (
                  <TabelaLinha key={r.id}>
                    <TabelaCelula>
                      <span className="font-bold text-slate-900">{r.numeroRecebimento}</span>
                    </TabelaCelula>
                    <TabelaCelula>
                      <span className="text-xs text-slate-700">{r.nomeFilial}</span>
                    </TabelaCelula>
                    <TabelaCelula>
                      <span className="font-medium text-slate-800 text-xs">{r.numeroPedidoCompra}</span>
                    </TabelaCelula>
                    <TabelaCelula>
                      <div>
                        <span className="font-medium text-slate-800 block text-xs">NF-e {r.numeroNfe}</span>
                        <span className="text-[10px] text-slate-400 font-mono break-all">
                          {r.chaveAcessoNfe ? r.chaveAcessoNfe.slice(0, 16) + '...' : '-'}
                        </span>
                      </div>
                    </TabelaCelula>
                    <TabelaCelula>
                      <span className="text-xs text-slate-600">
                        {formatarCentavosParaReal(r.valorTotalNfeCentavos)}
                      </span>
                    </TabelaCelula>
                    <TabelaCelula>
                      <span className="font-bold text-purple-700 text-xs">
                        {formatarCentavosParaReal(r.valorReconhecidoCentavos)}
                      </span>
                    </TabelaCelula>
                    <TabelaCelula>
                      <span className="text-xs text-slate-700">{r.nomeFinalizador || r.nomeConferente}</span>
                    </TabelaCelula>
                    <TabelaCelula>
                      <span className="text-xs text-slate-500 font-mono">
                        {formatarDataHoraBR(r.dataRecebimento)}
                      </span>
                    </TabelaCelula>
                    <TabelaCelula>
                      <Badge variante="sucesso">{r.status}</Badge>
                    </TabelaCelula>
                  </TabelaLinha>
                ))}
              </TabelaCorpo>
            </TabelaContainer>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR JUSTIFICATIVA DE DIVERGÊNCIA */}
      {/* ========================================================================= */}
      <Modal
        aberto={modalDivergenciaAberto}
        aoFechar={() => setModalDivergenciaAberto(false)}
        titulo="Registrar Justificativa Formal de Divergência"
        descricao="Descreva a razão das divergências encontradas na conferência física (mínimo de 5 caracteres)."
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            A divergência será auditada e a sessão será colocada em <strong>AGUARDANDO_APROVACAO_DIVERGENCIA</strong>.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Justificativa Obrigatória *
            </label>
            <textarea
              value={justificativaDivergencia}
              onChange={(e) => setJustificativaDivergencia(e.target.value)}
              rows={4}
              placeholder="Ex: Fornecedor faturou item com preço reajustado sem aviso prévio..."
              className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="secundario" onClick={() => setModalDivergenciaAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={aoRegistrarDivergenciaModal}>
              Gravar Justificativa
            </Botao>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: APROVAÇÃO / REJEIÇÃO COM SEGREGAÇÃO DE FUNÇÕES */}
      {/* ========================================================================= */}
      <Modal
        aberto={modalAprovacaoAberto}
        aoFechar={() => setModalAprovacaoAberto(false)}
        titulo="Decisão do Gestor sobre a Divergência"
        descricao="Segregação de Funções: O responsável pela aprovação deve ser diferente de quem registrou a divergência."
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
            <p>
              Registrado por: <strong>{conferenciaAtiva?.nomeDivergenciaRegistrador || 'Operador'}</strong>
            </p>
            <p>
              Justificativa registrada: <em>"{conferenciaAtiva?.justificativaDivergencia}"</em>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Decisão do Gestor:
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="decisao"
                  checked={decisaoAprovacao === true}
                  onChange={() => setDecisaoAprovacao(true)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Aprovar divergência e prosseguir com recebimento
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="decisao"
                  checked={decisaoAprovacao === false}
                  onChange={() => setDecisaoAprovacao(false)}
                  className="text-red-600 focus:ring-red-500"
                />
                Rejeitar mercadoria
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parecer / Justificativa da Decisão *
            </label>
            <textarea
              value={justificativaAprovacao}
              onChange={(e) => setJustificativaAprovacao(e.target.value)}
              rows={3}
              placeholder="Ex: Diferença de preço aprovada com desconto comercial compensatório..."
              className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="secundario" onClick={() => setModalAprovacaoAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={aoAprovarOuRejeitarDivergencia}>
              Salvar Decisão
            </Botao>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: SUCESSO DE ENTRADA NO ESTOQUE */}
      {/* ========================================================================= */}
      <Modal
        aberto={modalConfirmacaoSucesso}
        aoFechar={() => setModalConfirmacaoSucesso(false)}
        titulo="Entrada no Estoque Concluída com Sucesso!"
        descricao="A mercadoria foi integrada atomicamente ao estoque físico e aos registros do livro-razão."
      >
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Os saldos dos produtos foram creditados nos estoques físicos das respectivas filiais e os novos lotes com validades sanitárias foram cadastrados na tabela <code>lotes</code> respeitando o FEFO.
          </p>
          <p className="text-xs text-slate-500">
            Os dados consolidados foram registrados para futuro repasse ao módulo financeiro de Contas a Pagar.
          </p>
          <div className="pt-2">
            <Botao variante="primario" onClick={() => setModalConfirmacaoSucesso(false)}>
              Entendido
            </Botao>
          </div>
        </div>
      </Modal>
    </div>
  );
};
