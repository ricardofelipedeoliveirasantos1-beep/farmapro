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
  validarCnpj,
  Fornecedor,
  SolicitacaoCompra,
  SolicitacaoCompraItem,
  PedidoCompra,
  PedidoCompraItem,
  PedidoCompraHistorico,
  PrioridadeSolicitacao,
  StatusSolicitacaoCompra,
  StatusPedidoCompra,
} from '@farmapro/shared';
import {
  Truck,
  CheckCircle2,
  Plus,
  Search,
  FileText,
  Layers,
  Lock,
  Unlock,
  Send,
  Check,
  Ban,
  Clock,
  DollarSign,
  Store,
  Eye,
  FileCheck2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

// ==============================================================================
// Dados Demonstrativos Iniciais (Isolamento Multiempresa)
// ==============================================================================

const FORNECEDORES_INICIAIS: Fornecedor[] = [
  {
    id: 'forn-001',
    empresaId: '11111111-1111-4111-a111-111111111111',
    razaoSocial: 'Distribuidora Farmacêutica Central Ltda',
    nomeFantasia: 'Central Medicamentos & Hospitalar',
    cnpj: '11222333000181',
    inscricaoEstadual: '123.456.789.110',
    email: 'vendas@centralmedicamentos.com.br',
    telefone: '(11) 3210-9000',
    contatoPrincipal: {
      nome: 'Roberto Alves',
      cargo: 'Gerente Comercial',
      telefone: '(11) 98888-1111',
      email: 'roberto@centralmedicamentos.com.br',
    },
    cidade: 'São Paulo',
    uf: 'SP',
    condicoesComerciais: 'Faturamento 28/42 dias — Boleto bancário. Pedido mínimo R$ 500,00.',
    prazoEntregaDias: 2,
    dadosBancarios: {
      banco: '341 - Itaú Unibanco',
      agencia: '1234',
      conta: '56789-0',
      chavePix: '11222333000181',
      tipoChavePix: 'CNPJ',
    },
    status: 'ATIVO',
    criadoEm: '2026-01-10T10:00:00Z',
    atualizadoEm: '2026-02-01T15:00:00Z',
    desativadoParaFiliais: [],
  },
  {
    id: 'forn-002',
    empresaId: '11111111-1111-4111-a111-111111111111',
    razaoSocial: 'Laboratórios Químicos Nacional S/A',
    nomeFantasia: 'LabQuímica Genéricos',
    cnpj: '44555666000181',
    inscricaoEstadual: '987.654.321.000',
    email: 'pedidos@labquimica.com.br',
    telefone: '(19) 3888-2200',
    contatoPrincipal: {
      nome: 'Fernanda Lima',
      cargo: 'Executiva de Contas',
      telefone: '(19) 99123-4567',
      email: 'fernanda@labquimica.com.br',
    },
    cidade: 'Campinas',
    uf: 'SP',
    condicoesComerciais: 'À vista com 5% de desconto ou 30 dias direto.',
    prazoEntregaDias: 4,
    dadosBancarios: {
      banco: '237 - Bradesco',
      agencia: '4321',
      conta: '98765-4',
      chavePix: 'pedidos@labquimica.com.br',
      tipoChavePix: 'EMAIL',
    },
    status: 'ATIVO',
    criadoEm: '2026-01-15T11:00:00Z',
    atualizadoEm: '2026-02-10T09:30:00Z',
    desativadoParaFiliais: ['11111111-bbbb-4111-a111-bbbbbbbbbbbb'],
  },
  {
    id: 'forn-003',
    empresaId: '11111111-1111-4111-a111-111111111111',
    razaoSocial: 'Sul Distribuidora de Cosméticos e Higiene Ltda',
    nomeFantasia: 'SulCosméticos Perfumaria',
    cnpj: '77888999000181',
    inscricaoEstadual: '456.789.123.444',
    email: 'contato@sulcosmeticos.com.br',
    telefone: '(41) 3344-5566',
    contatoPrincipal: {
      nome: 'Carlos Eduardo',
      cargo: 'Representante',
      telefone: '(41) 98765-4321',
      email: 'carlos@sulcosmeticos.com.br',
    },
    cidade: 'Curitiba',
    uf: 'PR',
    condicoesComerciais: 'Pagamento antecipado com PIX.',
    prazoEntregaDias: 5,
    status: 'BLOQUEADO',
    motivoBloqueio: 'Bloqueio preventivo por atraso reiterado nas entregas programadas.',
    criadoEm: '2026-01-20T14:00:00Z',
    atualizadoEm: '2026-02-15T16:00:00Z',
    desativadoParaFiliais: [],
  },
  {
    id: 'forn-004',
    empresaId: '11111111-1111-4111-a111-111111111111',
    razaoSocial: 'BioFarma Suplementos Nutricionais Ltda',
    nomeFantasia: 'BioFarma Nutrição',
    cnpj: '99888777000100',
    inscricaoEstadual: '333.222.111.000',
    email: 'novos@biofarmanutri.com.br',
    telefone: '(31) 3456-7890',
    cidade: 'Belo Horizonte',
    uf: 'MG',
    condicoesComerciais: 'Primeiro pedido faturado para 15 dias.',
    prazoEntregaDias: 3,
    status: 'PENDENTE_APROVACAO',
    criadoEm: '2026-02-18T10:00:00Z',
    atualizadoEm: '2026-02-18T10:00:00Z',
    desativadoParaFiliais: [],
  },
];

const SOLICITACOES_INICIAIS: SolicitacaoCompra[] = [
  {
    id: 'sol-001',
    empresaId: '11111111-1111-4111-a111-111111111111',
    filialId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
    nomeFilial: 'Filial 01 — Matriz Centro',
    numeroSequencial: 101,
    solicitadoPorId: 'usr-002',
    nomeSolicitante: 'Mariana Silva (Farmacêutica)',
    justificativaGeral: 'Estoque de amoxicilina e analgésicos atingiu ponto crítico de reposição.',
    prioridade: 'ALTA',
    status: 'PENDENTE_APROVACAO',
    criadoEm: '2026-02-18T08:30:00Z',
    atualizadoEm: '2026-02-18T08:30:00Z',
    itens: [
      {
        id: 'item-sol-1',
        empresaId: '11111111-1111-4111-a111-111111111111',
        solicitacaoId: 'sol-001',
        produtoId: 'prod-001',
        nomeProduto: 'Amoxicilina + Clavulanato 500/125mg',
        codigoBarras: '7891234567890',
        quantidadeSolicitada: 40,
        justificativaItem: 'Previsão de demanda para 3 semanas.',
      },
      {
        id: 'item-sol-2',
        empresaId: '11111111-1111-4111-a111-111111111111',
        solicitacaoId: 'sol-001',
        produtoId: 'prod-002',
        nomeProduto: 'Dipirona Monoidratada 500mg/mL 20mL',
        codigoBarras: '7899876543210',
        quantidadeSolicitada: 60,
      },
    ],
  },
  {
    id: 'sol-002',
    empresaId: '11111111-1111-4111-a111-111111111111',
    filialId: '11111111-bbbb-4111-a111-bbbbbbbbbbbb',
    nomeFilial: 'Filial 02 — Bairro Norte',
    numeroSequencial: 102,
    solicitadoPorId: 'usr-003',
    nomeSolicitante: 'Carlos Souza (Gerente Operacional)',
    justificativaGeral: 'Reposição quinzenal de anti-hipertensivos e analgésicos.',
    prioridade: 'MEDIA',
    status: 'APROVADA_TOTAL',
    aprovadoPorId: 'usr-001',
    dataDecisao: '2026-02-18T11:00:00Z',
    justificativaDecisao: 'Aprovado conforme histórico de vendas do bairro Norte.',
    criadoEm: '2026-02-17T14:20:00Z',
    atualizadoEm: '2026-02-18T11:00:00Z',
    itens: [
      {
        id: 'item-sol-3',
        empresaId: '11111111-1111-4111-a111-111111111111',
        solicitacaoId: 'sol-002',
        produtoId: 'prod-003',
        nomeProduto: 'Losartana Potássica 50mg Cx 30 comp',
        codigoBarras: '7896541230987',
        quantidadeSolicitada: 50,
        quantidadeAprovada: 50,
      },
    ],
  },
];

const PEDIDOS_INICIAIS: PedidoCompra[] = [
  {
    id: 'pc-001',
    empresaId: '11111111-1111-4111-a111-111111111111',
    fornecedorId: 'forn-001',
    razaoSocialFornecedor: 'Distribuidora Farmacêutica Central Ltda',
    nomeFantasiaFornecedor: 'Central Medicamentos & Hospitalar',
    numeroPedido: 'PC-2026-0001',
    numeroSequencial: 1,
    filialDestinoPrincipalId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
    destinadoMultiplasFiliais: false,
    status: 'CONFIRMADO_FORNECEDOR',
    valorSubtotalCentavos: 185000,
    valorDescontoCentavos: 5000,
    valorFreteCentavos: 0,
    valorTotalCentavos: 180000,
    condicoesPagamento: 'Boleto 28 dias',
    prazoEntregaPrevisto: '2026-02-22',
    observacoes: 'Entrega pela manhã na doca central.',
    criadoPorId: 'usr-001',
    nomeCriador: 'Carlos Proprietário',
    dataAprovacao: '2026-02-15T10:00:00Z',
    dataEnvio: '2026-02-15T14:30:00Z',
    dataConfirmacao: '2026-02-16T09:15:00Z',
    criadoEm: '2026-02-15T09:00:00Z',
    atualizadoEm: '2026-02-16T09:15:00Z',
    itens: [
      {
        id: 'item-pc-1',
        empresaId: '11111111-1111-4111-a111-111111111111',
        pedidoId: 'pc-001',
        produtoId: 'prod-001',
        nomeProduto: 'Amoxicilina + Clavulanato 500/125mg',
        filialDestinoId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
        nomeFilialDestino: 'Filial 01 — Matriz Centro',
        quantidadePedida: 50,
        quantidadeEntregue: 0,
        valorUnitarioCentavos: 2850,
        descontoCentavos: 0,
        valorTotalCentavos: 142500,
      },
      {
        id: 'item-pc-2',
        empresaId: '11111111-1111-4111-a111-111111111111',
        pedidoId: 'pc-001',
        produtoId: 'prod-002',
        nomeProduto: 'Dipirona Monoidratada 500mg/mL 20mL',
        filialDestinoId: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
        nomeFilialDestino: 'Filial 01 — Matriz Centro',
        quantidadePedida: 100,
        quantidadeEntregue: 0,
        valorUnitarioCentavos: 425,
        descontoCentavos: 5000,
        valorTotalCentavos: 37500,
      },
    ],
    historico: [
      {
        id: 'hist-1',
        empresaId: '11111111-1111-4111-a111-111111111111',
        pedidoId: 'pc-001',
        statusNovo: 'RASCUNHO',
        usuarioId: 'usr-001',
        nomeUsuario: 'Carlos Proprietário',
        motivoAlteracao: 'Criação inicial do pedido de compra.',
        dataRegistro: '2026-02-15T09:00:00Z',
      },
      {
        id: 'hist-2',
        empresaId: '11111111-1111-4111-a111-111111111111',
        pedidoId: 'pc-001',
        statusAnterior: 'RASCUNHO',
        statusNovo: 'APROVADO',
        usuarioId: 'usr-001',
        nomeUsuario: 'Carlos Proprietário',
        motivoAlteracao: 'Aprovado pelo gestor de compras.',
        dataRegistro: '2026-02-15T10:00:00Z',
      },
      {
        id: 'hist-3',
        empresaId: '11111111-1111-4111-a111-111111111111',
        pedidoId: 'pc-001',
        statusAnterior: 'APROVADO',
        statusNovo: 'ENVIADO_FORNECEDOR',
        usuarioId: 'usr-001',
        nomeUsuario: 'Carlos Proprietário',
        motivoAlteracao: 'Espelho de pedido enviado por e-mail para o representante.',
        dataRegistro: '2026-02-15T14:30:00Z',
      },
      {
        id: 'hist-4',
        empresaId: '11111111-1111-4111-a111-111111111111',
        pedidoId: 'pc-001',
        statusAnterior: 'ENVIADO_FORNECEDOR',
        statusNovo: 'CONFIRMADO_FORNECEDOR',
        usuarioId: 'usr-001',
        nomeUsuario: 'Carlos Proprietário',
        motivoAlteracao: 'Fornecedor confirmou aceite e faturamento.',
        dataRegistro: '2026-02-16T09:15:00Z',
      },
    ],
  },
];

// ==============================================================================
// Componente Principal: Painel de Compras e Fornecedores
// ==============================================================================

export const PainelComprasPage: React.FC = () => {
  const { usuario, empresaAtiva, filialAtiva } = useAuth();

  // Estados de Navegação e Filtros
  const [abaAtiva, setAbaAtiva] = useState<'fornecedores' | 'solicitacoes' | 'pedidos'>('fornecedores');
  const [termoBuscaFornecedor, setTermoBuscaFornecedor] = useState('');
  const [filtroStatusFornecedor, setFiltroStatusFornecedor] = useState<string>('TODOS');
  const [filtroStatusSolicitacao, setFiltroStatusSolicitacao] = useState<string>('TODOS');
  const [filtroStatusPedido, setFiltroStatusPedido] = useState<string>('TODOS');

  // Dados em Memória
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(FORNECEDORES_INICIAIS);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCompra[]>(SOLICITACOES_INICIAIS);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>(PEDIDOS_INICIAIS);

  // Alerta Feedback
  const [alertaFeedback, setAlertaFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'aviso';
    mensagem: string;
  } | null>(null);

  // Modais de Fornecedor
  const [modalNovoFornecedorAberto, setModalNovoFornecedorAberto] = useState(false);
  const [novoCnpj, setNovoCnpj] = useState('');
  const [novaRazaoSocial, setNovaRazaoSocial] = useState('');
  const [novoNomeFantasia, setNovoNomeFantasia] = useState('');
  const [novaInscricaoEstadual, setNovaInscricaoEstadual] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoPrazoDias, setNovoPrazoDias] = useState('3');
  const [novasCondicoes, setNovasCondicoes] = useState('Boleto 28 dias');

  // Modal Detalhes / Ação Fornecedor
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);
  const [modalBloqueioAberto, setModalBloqueioAberto] = useState(false);
  const [motivoBloqueioInput, setMotivoBloqueioInput] = useState('');

  // Modais de Solicitação
  const [modalNovaSolicitacaoAberto, setModalNovaSolicitacaoAberto] = useState(false);
  const [solicitacaoJustificativa, setSolicitacaoJustificativa] = useState('');
  const [solicitacaoPrioridade, setSolicitacaoPrioridade] = useState<PrioridadeSolicitacao>('MEDIA');
  const [solicitacaoQtdProd1, setSolicitacaoQtdProd1] = useState('20');
  const [solicitacaoQtdProd2, setSolicitacaoQtdProd2] = useState('15');

  // Modal Analisar Solicitação
  const [solicitacaoEmAnalise, setSolicitacaoEmAnalise] = useState<SolicitacaoCompra | null>(null);
  const [justificativaDecisaoInput, setJustificativaDecisaoInput] = useState('');
  const [qtdAprovadaAjuste, setQtdAprovadaAjuste] = useState<Record<string, number>>({});

  // Modal Consolidação
  const [modalConsolidarAberto, setModalConsolidarAberto] = useState(false);
  const [solicitacoesSelecionadasIds, setSolicitacoesSelecionadasIds] = useState<string[]>([]);
  const [fornecedorConsolidadoId, setFornecedorConsolidadoId] = useState('');

  // Modal Pedido de Compra Detalhes / Transição
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoCompra | null>(null);
  const [modalCancelarPedidoAberto, setModalCancelarPedidoAberto] = useState(false);
  const [motivoCancelamentoPedido, setMotivoCancelamentoPedido] = useState('');

  // ==============================================================================
  // Cálculos de Indicadores de Compras (KPIs)
  // ==============================================================================

  const totalFornecedoresAtivos = fornecedores.filter(f => f.status === 'ATIVO').length;
  const totalFornecedoresBloqueados = fornecedores.filter(f => f.status === 'BLOQUEADO').length;
  const totalFornecedoresPendentes = fornecedores.filter(f => f.status === 'PENDENTE_APROVACAO').length;
  const totalSolicitacoesPendentes = solicitacoes.filter(s => s.status === 'PENDENTE_APROVACAO').length;
  const totalPedidosAbertos = pedidos.filter(
    p => p.status !== 'CONCLUIDO' && p.status !== 'CANCELADO'
  ).length;
  const valorTotalPedidosMesCentavos = pedidos
    .filter(p => p.status !== 'CANCELADO')
    .reduce((acc, p) => acc + p.valorTotalCentavos, 0);

  // ==============================================================================
  // Ações de Fornecedores
  // ==============================================================================

  const handleSalvarFornecedor = () => {
    const cnpjLimpo = novoCnpj.replace(/\D/g, '');
    if (!validarCnpj(cnpjLimpo)) {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'CNPJ inválido de acordo com a validação matemática de dígitos verificadores.',
      });
      return;
    }

    if (!novaRazaoSocial.trim() || !novoNomeFantasia.trim()) {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'Razão Social e Nome Fantasia são campos obrigatórios.',
      });
      return;
    }

    // Verifica duplicidade dentro da empresa
    const existe = fornecedores.some(
      f => f.cnpj === cnpjLimpo && f.empresaId === empresaAtiva?.id
    );
    if (existe) {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'Já existe um fornecedor cadastrado com este CNPJ nesta empresa.',
      });
      return;
    }

    const novo: Fornecedor = {
      id: `forn-${Date.now()}`,
      empresaId: empresaAtiva?.id || '11111111-1111-4111-a111-111111111111',
      razaoSocial: novaRazaoSocial.trim(),
      nomeFantasia: novoNomeFantasia.trim(),
      cnpj: cnpjLimpo,
      inscricaoEstadual: novaInscricaoEstadual.trim() || undefined,
      email: novoEmail.trim() || undefined,
      telefone: novoTelefone.trim() || undefined,
      prazoEntregaDias: Number(novoPrazoDias) || 3,
      condicoesComerciais: novasCondicoes.trim(),
      status: 'ATIVO',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      desativadoParaFiliais: [],
    };

    setFornecedores(prev => [novo, ...prev]);
    setModalNovoFornecedorAberto(false);
    setNovoCnpj('');
    setNovaRazaoSocial('');
    setNovoNomeFantasia('');
    setNovaInscricaoEstadual('');
    setNovoEmail('');
    setNovoTelefone('');
    setAlertaFeedback({
      tipo: 'sucesso',
      mensagem: `Fornecedor "${novo.nomeFantasia}" cadastrado com sucesso!`,
    });
  };

  const handleAlternarBloqueioFornecedor = (fornecedor: Fornecedor) => {
    if (fornecedor.status === 'BLOQUEADO') {
      // Desbloquear
      setFornecedores(prev =>
        prev.map(f =>
          f.id === fornecedor.id
            ? { ...f, status: 'ATIVO', motivoBloqueio: undefined, atualizadoEm: new Date().toISOString() }
            : f
        )
      );
      setAlertaFeedback({
        tipo: 'sucesso',
        mensagem: `Fornecedor "${fornecedor.nomeFantasia}" desbloqueado com sucesso.`,
      });
    } else {
      // Exigir justificativa
      setFornecedorSelecionado(fornecedor);
      setMotivoBloqueioInput('');
      setModalBloqueioAberto(true);
    }
  };

  const handleConfirmarBloqueio = () => {
    if (!fornecedorSelecionado) return;
    if (motivoBloqueioInput.trim().length < 5) {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'O motivo do bloqueio deve conter no mínimo 5 caracteres.',
      });
      return;
    }

    setFornecedores(prev =>
      prev.map(f =>
        f.id === fornecedorSelecionado.id
          ? {
              ...f,
              status: 'BLOQUEADO',
              motivoBloqueio: motivoBloqueioInput.trim(),
              bloqueadoPorId: usuario?.id,
              dataBloqueio: new Date().toISOString(),
              atualizadoEm: new Date().toISOString(),
            }
          : f
      )
    );

    setModalBloqueioAberto(false);
    setFornecedorSelecionado(null);
    setAlertaFeedback({
      tipo: 'aviso',
      mensagem: `Fornecedor "${fornecedorSelecionado.nomeFantasia}" foi BLOQUEADO globalmente. Novos pedidos estão impedidos.`,
    });
  };

  const handleAlternarDesativacaoFilial = (fornecedor: Fornecedor) => {
    const filialIdAtual = filialAtiva?.id || '11111111-aaaa-4111-a111-aaaaaaaaaaaa';
    const jaDesativado = (fornecedor.desativadoParaFiliais || []).includes(filialIdAtual);

    setFornecedores(prev =>
      prev.map(f => {
        if (f.id !== fornecedor.id) return f;
        const lista = f.desativadoParaFiliais || [];
        const novaLista = jaDesativado
          ? lista.filter(id => id !== filialIdAtual)
          : [...lista, filialIdAtual];
        return {
          ...f,
          desativadoParaFiliais: novaLista,
          atualizadoEm: new Date().toISOString(),
        };
      })
    );

    setAlertaFeedback({
      tipo: 'sucesso',
      mensagem: jaDesativado
        ? `Fornecedor "${fornecedor.nomeFantasia}" foi reativado para a ${filialAtiva?.nome || 'filial atual'}.`
        : `Fornecedor "${fornecedor.nomeFantasia}" desativado pontualmente para a ${filialAtiva?.nome || 'filial atual'}. As outras filiais continuam com acesso.`,
    });
  };

  const handleAprovarFornecedorPendente = (fornecedor: Fornecedor) => {
    setFornecedores(prev =>
      prev.map(f =>
        f.id === fornecedor.id
          ? {
              ...f,
              status: 'ATIVO',
              aprovadoPorId: usuario?.id,
              dataAprovacao: new Date().toISOString(),
              atualizadoEm: new Date().toISOString(),
            }
          : f
      )
    );
    setAlertaFeedback({
      tipo: 'sucesso',
      mensagem: `Fornecedor "${fornecedor.nomeFantasia}" aprovado pela administração central!`,
    });
  };

  // ==============================================================================
  // Ações de Solicitações de Compra
  // ==============================================================================

  const handleCriarSolicitacao = () => {
    if (solicitacaoJustificativa.trim().length < 5) {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'A justificativa geral da solicitação é obrigatória (mínimo 5 caracteres).',
      });
      return;
    }

    const qtd1 = Number(solicitacaoQtdProd1) || 0;
    const qtd2 = Number(solicitacaoQtdProd2) || 0;
    if (qtd1 <= 0 && qtd2 <= 0) {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'Informe uma quantidade válida para ao menos um dos produtos.',
      });
      return;
    }

    const itens: SolicitacaoCompraItem[] = [];
    if (qtd1 > 0) {
      itens.push({
        id: `item-sol-${Date.now()}-1`,
        empresaId: empresaAtiva?.id || '11111111-1111-4111-a111-111111111111',
        solicitacaoId: `sol-${Date.now()}`,
        produtoId: 'prod-001',
        nomeProduto: 'Amoxicilina + Clavulanato 500/125mg',
        codigoBarras: '7891234567890',
        quantidadeSolicitada: qtd1,
      });
    }
    if (qtd2 > 0) {
      itens.push({
        id: `item-sol-${Date.now()}-2`,
        empresaId: empresaAtiva?.id || '11111111-1111-4111-a111-111111111111',
        solicitacaoId: `sol-${Date.now()}`,
        produtoId: 'prod-002',
        nomeProduto: 'Dipirona Monoidratada 500mg/mL 20mL',
        codigoBarras: '7899876543210',
        quantidadeSolicitada: qtd2,
      });
    }

    const nova: SolicitacaoCompra = {
      id: `sol-${Date.now()}`,
      empresaId: empresaAtiva?.id || '11111111-1111-4111-a111-111111111111',
      filialId: filialAtiva?.id || '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
      nomeFilial: filialAtiva?.nome || 'Filial 01 — Matriz Centro',
      numeroSequencial: 100 + solicitacoes.length + 1,
      solicitadoPorId: usuario?.id || 'usr-001',
      nomeSolicitante: usuario?.nome || 'Operador Responsável',
      justificativaGeral: solicitacaoJustificativa.trim(),
      prioridade: solicitacaoPrioridade,
      status: 'PENDENTE_APROVACAO',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      itens,
    };

    setSolicitacoes(prev => [nova, ...prev]);
    setModalNovaSolicitacaoAberto(false);
    setSolicitacaoJustificativa('');
    setAlertaFeedback({
      tipo: 'sucesso',
      mensagem: `Solicitação #${nova.numeroSequencial} registrada e encaminhada para aprovação central.`,
    });
  };

  const handleAbrirAnaliseSolicitacao = (sol: SolicitacaoCompra) => {
    setSolicitacaoEmAnalise(sol);
    setJustificativaDecisaoInput('');
    const mapQtd: Record<string, number> = {};
    sol.itens.forEach(it => {
      mapQtd[it.id] = it.quantidadeAprovada !== undefined ? it.quantidadeAprovada : it.quantidadeSolicitada;
    });
    setQtdAprovadaAjuste(mapQtd);
  };

  const handleDecidirSolicitacao = (decisao: 'APROVAR_TOTAL' | 'APROVAR_PARCIAL' | 'REJEITAR') => {
    if (!solicitacaoEmAnalise) return;

    if (decisao === 'REJEITAR' && justificativaDecisaoInput.trim().length < 5) {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'A rejeição de solicitação exige justificativa formal com no mínimo 5 caracteres.',
      });
      return;
    }

    const novoStatus: StatusSolicitacaoCompra =
      decisao === 'APROVAR_TOTAL'
        ? 'APROVADA_TOTAL'
        : decisao === 'APROVAR_PARCIAL'
        ? 'APROVADA_PARCIAL'
        : 'REJEITADA';

    const novosItens = solicitacaoEmAnalise.itens.map(it => {
      if (decisao === 'REJEITAR') {
        return { ...it, quantidadeAprovada: 0 };
      }
      if (decisao === 'APROVAR_TOTAL') {
        return { ...it, quantidadeAprovada: it.quantidadeSolicitada };
      }
      return { ...it, quantidadeAprovada: qtdAprovadaAjuste[it.id] ?? it.quantidadeSolicitada };
    });

    setSolicitacoes(prev =>
      prev.map(s =>
        s.id === solicitacaoEmAnalise.id
          ? {
              ...s,
              status: novoStatus,
              aprovadoPorId: usuario?.id,
              dataDecisao: new Date().toISOString(),
              justificativaDecisao: justificativaDecisaoInput.trim() || undefined,
              atualizadoEm: new Date().toISOString(),
              itens: novosItens,
            }
          : s
      )
    );

    setSolicitacaoEmAnalise(null);
    setAlertaFeedback({
      tipo: 'sucesso',
      mensagem: `Solicitação #${solicitacaoEmAnalise.numeroSequencial} processada como ${novoStatus}.`,
    });
  };

  // ==============================================================================
  // Ações de Consolidação e Pedidos de Compra
  // ==============================================================================

  const handleConsolidarSolicitacoes = () => {
    if (solicitacoesSelecionadasIds.length === 0) {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'Selecione ao menos uma solicitação aprovada para consolidação.',
      });
      return;
    }

    if (!fornecedorConsolidadoId) {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'Selecione o fornecedor ativo responsável pelo fornecimento consolidado.',
      });
      return;
    }

    const fornecedor = fornecedores.find(f => f.id === fornecedorConsolidadoId);
    if (!fornecedor || fornecedor.status === 'BLOQUEADO') {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'Fornecedor inválido ou bloqueado para novos pedidos.',
      });
      return;
    }

    // Coleta todos os itens das solicitações selecionadas
    const sols = solicitacoes.filter(s => solicitacoesSelecionadasIds.includes(s.id));
    const itensPedido: PedidoCompraItem[] = [];
    let subtotal = 0;

    sols.forEach(s => {
      s.itens.forEach(it => {
        const qtd = it.quantidadeAprovada !== undefined ? it.quantidadeAprovada : it.quantidadeSolicitada;
        if (qtd > 0) {
          // Preço unitário demonstrativo em centavos
          const valorUnitario = it.produtoId === 'prod-001' ? 2850 : it.produtoId === 'prod-002' ? 425 : 680;
          const totalItem = qtd * valorUnitario;
          subtotal += totalItem;

          itensPedido.push({
            id: `item-pc-cons-${Date.now()}-${itensPedido.length}`,
            empresaId: s.empresaId,
            pedidoId: `pc-cons-${Date.now()}`,
            produtoId: it.produtoId,
            nomeProduto: it.nomeProduto,
            codigoBarras: it.codigoBarras,
            filialDestinoId: s.filialId,
            nomeFilialDestino: s.nomeFilial,
            quantidadePedida: qtd,
            quantidadeEntregue: 0,
            valorUnitarioCentavos: valorUnitario,
            descontoCentavos: 0,
            valorTotalCentavos: totalItem,
            solicitacaoItemId: it.id,
          });
        }
      });
    });

    const numeroSequencial = pedidos.length + 1;
    const numeroPedido = `PC-2026-${String(numeroSequencial).padStart(4, '0')}`;

    const novoPedido: PedidoCompra = {
      id: `pc-cons-${Date.now()}`,
      empresaId: empresaAtiva?.id || '11111111-1111-4111-a111-111111111111',
      fornecedorId: fornecedor.id,
      razaoSocialFornecedor: fornecedor.razaoSocial,
      nomeFantasiaFornecedor: fornecedor.nomeFantasia,
      numeroPedido,
      numeroSequencial,
      destinadoMultiplasFiliais: true,
      status: 'RASCUNHO',
      valorSubtotalCentavos: subtotal,
      valorDescontoCentavos: 0,
      valorFreteCentavos: 0,
      valorTotalCentavos: subtotal,
      condicoesPagamento: fornecedor.condicoesComerciais || 'Boleto 28 dias',
      criadoPorId: usuario?.id || 'usr-001',
      nomeCriador: usuario?.nome || 'Administrador Central',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      itens: itensPedido,
      historico: [
        {
          id: `hist-${Date.now()}`,
          empresaId: empresaAtiva?.id || '11111111-1111-4111-a111-111111111111',
          pedidoId: `pc-cons-${Date.now()}`,
          statusNovo: 'RASCUNHO',
          usuarioId: usuario?.id || 'usr-001',
          nomeUsuario: usuario?.nome || 'Administrador Central',
          motivoAlteracao: `Consolidação de ${sols.length} solicitações de filiais em um único pedido.`,
          dataRegistro: new Date().toISOString(),
        },
      ],
    };

    // Marca as solicitações como CONSOLIDADA
    setSolicitacoes(prev =>
      prev.map(s =>
        solicitacoesSelecionadasIds.includes(s.id)
          ? {
              ...s,
              status: 'CONSOLIDADA',
              pedidoCompraConsolidadoId: novoPedido.id,
              atualizadoEm: new Date().toISOString(),
            }
          : s
      )
    );

    setPedidos(prev => [novoPedido, ...prev]);
    setModalConsolidarAberto(false);
    setSolicitacoesSelecionadasIds([]);
    setFornecedorConsolidadoId('');
    setAlertaFeedback({
      tipo: 'sucesso',
      mensagem: `Pedido de Compra Consolidado ${novoPedido.numeroPedido} criado com ${itensPedido.length} itens distribuídos entre as filiais!`,
    });
    setAbaAtiva('pedidos');
  };

  const handleAvancarCicloPedido = (pedido: PedidoCompra, proximoStatus: StatusPedidoCompra) => {
    // Validações do ciclo estrito
    if (proximoStatus === 'CONCLUIDO') {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'O pedido não pode ser concluído diretamente na Etapa 08. A conclusão exige conferência física e recebimento de mercadorias (Etapa 09).',
      });
      return;
    }

    const agora = new Date().toISOString();
    const histItem: PedidoCompraHistorico = {
      id: `hist-${Date.now()}`,
      empresaId: pedido.empresaId,
      pedidoId: pedido.id,
      statusAnterior: pedido.status,
      statusNovo: proximoStatus,
      usuarioId: usuario?.id || 'usr-001',
      nomeUsuario: usuario?.nome || 'Operador Responsável',
      motivoAlteracao: `Transição operacional de status para ${proximoStatus}.`,
      dataRegistro: agora,
    };

    setPedidos(prev =>
      prev.map(p => {
        if (p.id !== pedido.id) return p;
        return {
          ...p,
          status: proximoStatus,
          dataAprovacao: proximoStatus === 'APROVADO' ? agora : p.dataAprovacao,
          dataEnvio: proximoStatus === 'ENVIADO_FORNECEDOR' ? agora : p.dataEnvio,
          dataConfirmacao: proximoStatus === 'CONFIRMADO_FORNECEDOR' ? agora : p.dataConfirmacao,
          atualizadoEm: agora,
          historico: [...(p.historico || []), histItem],
        };
      })
    );

    if (pedidoSelecionado?.id === pedido.id) {
      setPedidoSelecionado(prev =>
        prev
          ? {
              ...prev,
              status: proximoStatus,
              historico: [...(prev.historico || []), histItem],
            }
          : null
      );
    }

    setAlertaFeedback({
      tipo: 'sucesso',
      mensagem: `Pedido ${pedido.numeroPedido} atualizado para status "${proximoStatus}". Estoque físico inalterado.`,
    });
  };

  const handleCancelarPedido = () => {
    if (!pedidoSelecionado) return;
    if (motivoCancelamentoPedido.trim().length < 5) {
      setAlertaFeedback({
        tipo: 'erro',
        mensagem: 'O cancelamento de pedido de compra exige justificativa formal (mínimo 5 caracteres).',
      });
      return;
    }

    const agora = new Date().toISOString();
    const histItem: PedidoCompraHistorico = {
      id: `hist-${Date.now()}`,
      empresaId: pedidoSelecionado.empresaId,
      pedidoId: pedidoSelecionado.id,
      statusAnterior: pedidoSelecionado.status,
      statusNovo: 'CANCELADO',
      usuarioId: usuario?.id || 'usr-001',
      nomeUsuario: usuario?.nome || 'Operador Responsável',
      motivoAlteracao: `Cancelamento: ${motivoCancelamentoPedido.trim()}`,
      dataRegistro: agora,
    };

    setPedidos(prev =>
      prev.map(p => {
        if (p.id !== pedidoSelecionado.id) return p;
        return {
          ...p,
          status: 'CANCELADO',
          canceladoPorId: usuario?.id,
          dataCancelamento: agora,
          motivoCancelamento: motivoCancelamentoPedido.trim(),
          atualizadoEm: agora,
          historico: [...(p.historico || []), histItem],
        };
      })
    );

    setModalCancelarPedidoAberto(false);
    setPedidoSelecionado(null);
    setMotivoCancelamentoPedido('');
    setAlertaFeedback({
      tipo: 'aviso',
      mensagem: `Pedido de compra cancelado formalmente com registro de auditoria.`,
    });
  };

  // ==============================================================================
  // Listas Filtradas
  // ==============================================================================

  const fornecedoresFiltrados = fornecedores.filter(f => {
    if (filtroStatusFornecedor !== 'TODOS' && f.status !== filtroStatusFornecedor) return false;
    if (!termoBuscaFornecedor) return true;
    const termo = termoBuscaFornecedor.toLowerCase();
    return (
      f.razaoSocial.toLowerCase().includes(termo) ||
      f.nomeFantasia.toLowerCase().includes(termo) ||
      f.cnpj.includes(termo)
    );
  });

  const solicitacoesFiltradas = solicitacoes.filter(s => {
    if (filtroStatusSolicitacao !== 'TODOS' && s.status !== filtroStatusSolicitacao) return false;
    return true;
  });

  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroStatusPedido !== 'TODOS' && p.status !== filtroStatusPedido) return false;
    return true;
  });

  const filialAtualId = filialAtiva?.id || '11111111-aaaa-4111-a111-aaaaaaaaaaaa';

  return (
    <div className="space-y-6">
      {/* Aviso de Garantia Operacional e Rastreabilidade */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-950">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-blue-900">
            FarmaPro Compras & Suprimentos — Gestão Centralizada de Fornecedores e Ordens de Compra
          </p>
          <p className="text-blue-800">
            <strong>Garantia de Não-Alteração de Estoque:</strong> A emissão, aprovação e confirmação de pedidos de compra <strong>NÃO</strong> alteram o estoque físico nem os saldos das filiais. O saldo físico somente será modificado na conferência de recebimento (Etapa 09).
          </p>
        </div>
      </div>

      {/* Alerta de Feedback Temporário */}
      {alertaFeedback && (
        <Alerta
          tipo={alertaFeedback.tipo}
          titulo={
            alertaFeedback.tipo === 'sucesso'
              ? 'Operação Concluída'
              : alertaFeedback.tipo === 'erro'
              ? 'Atenção / Erro de Validação'
              : 'Aviso Importante'
          }
          aoFechar={() => setAlertaFeedback(null)}
        >
          {alertaFeedback.mensagem}
        </Alerta>
      )}

      {/* Cards Indicadores de Compras (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Fornecedores Homologados</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalFornecedoresAtivos}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {totalFornecedoresBloqueados} bloqueado(s) • {totalFornecedoresPendentes} pendente(s)
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Solicitações de Compra</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{totalSolicitacoesPendentes}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Aguardando análise central</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Pedidos em Andamento</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{totalPedidosAbertos}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Ordens de compra emitidas</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Comprometido em Pedidos</p>
              <h3 className="text-xl font-bold text-emerald-700 mt-1">
                {formatarCentavosParaReal(valorTotalPedidosMesCentavos)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Valores exatos em centavos</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Navegação entre Abas do Módulo */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAbaAtiva('fornecedores')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              abaAtiva === 'fornecedores'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Store className="w-4 h-4" />
            Catálogo de Fornecedores ({fornecedores.length})
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('solicitacoes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              abaAtiva === 'solicitacoes'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Solicitações de Compra ({solicitacoes.length})
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('pedidos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              abaAtiva === 'pedidos'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-4 h-4" />
            Pedidos de Compra ({pedidos.length})
          </button>
        </div>

        {/* Ações Primárias da Aba Ativa */}
        <div className="flex items-center gap-2">
          {abaAtiva === 'fornecedores' && (
            <Botao
              variante="primario"
              tamanho="sm"
              iconeEsquerda={<Plus className="w-4 h-4" />}
              onClick={() => setModalNovoFornecedorAberto(true)}
            >
              Novo Fornecedor
            </Botao>
          )}

          {abaAtiva === 'solicitacoes' && (
            <>
              <Botao
                variante="outline"
                tamanho="sm"
                iconeEsquerda={<Layers className="w-4 h-4" />}
                onClick={() => {
                  setSolicitacoesSelecionadasIds(
                    solicitacoes
                      .filter(s => s.status === 'APROVADA_TOTAL' || s.status === 'APROVADA_PARCIAL')
                      .map(s => s.id)
                  );
                  setModalConsolidarAberto(true);
                }}
              >
                Consolidar Aprovadas em Pedido
              </Botao>
              <Botao
                variante="primario"
                tamanho="sm"
                iconeEsquerda={<Plus className="w-4 h-4" />}
                onClick={() => setModalNovaSolicitacaoAberto(true)}
              >
                Nova Solicitação de Filial
              </Botao>
            </>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: CATÁLOGO DE FORNECEDORES (CENTRALIZADO) */}
      {/* ==================================================================== */}
      {abaAtiva === 'fornecedores' && (
        <div className="space-y-4">
          {/* Barra de Filtro e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por Razão Social, Fantasia ou CNPJ..."
                value={termoBuscaFornecedor}
                onChange={e => setTermoBuscaFornecedor(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Situação:</span>
              <select
                value={filtroStatusFornecedor}
                onChange={e => setFiltroStatusFornecedor(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
              >
                <option value="TODOS">Todos os Fornecedores</option>
                <option value="ATIVO">Somente Ativos</option>
                <option value="BLOQUEADO">Bloqueados</option>
                <option value="PENDENTE_APROVACAO">Pendentes de Aprovação</option>
              </select>
            </div>
          </div>

          {/* Tabela de Fornecedores */}
          <Card>
            <TabelaContainer>
              <TabelaCabecalho>
                <TabelaLinha>
                  <TabelaColuna>Fornecedor / Razão Social</TabelaColuna>
                  <TabelaColuna>CNPJ / IE</TabelaColuna>
                  <TabelaColuna>Contato Comercial</TabelaColuna>
                  <TabelaColuna>Prazo / Condições</TabelaColuna>
                  <TabelaColuna>Situação</TabelaColuna>
                  <TabelaColuna>Disponibilidade Filial Atual</TabelaColuna>
                  <TabelaColuna>Ações</TabelaColuna>
                </TabelaLinha>
              </TabelaCabecalho>
              <TabelaCorpo>
                {fornecedoresFiltrados.length === 0 ? (
                  <TabelaLinha>
                    <TabelaCelula colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                      Nenhum fornecedor encontrado para os filtros selecionados.
                    </TabelaCelula>
                  </TabelaLinha>
                ) : (
                  fornecedoresFiltrados.map(forn => {
                    const desativadoNestaFilial = (forn.desativadoParaFiliais || []).includes(filialAtualId);

                    return (
                      <TabelaLinha key={forn.id}>
                        <TabelaCelula>
                          <div className="font-semibold text-slate-900">{forn.nomeFantasia}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{forn.razaoSocial}</div>
                        </TabelaCelula>

                        <TabelaCelula>
                          <div className="font-mono text-xs text-slate-800">
                            {forn.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                          </div>
                          {forn.inscricaoEstadual && (
                            <div className="text-[10px] text-slate-400">IE: {forn.inscricaoEstadual}</div>
                          )}
                        </TabelaCelula>

                        <TabelaCelula>
                          <div className="text-xs text-slate-800">
                            {forn.contatoPrincipal?.nome || forn.telefone || '—'}
                          </div>
                          <div className="text-[11px] text-slate-500">{forn.email || '—'}</div>
                        </TabelaCelula>

                        <TabelaCelula>
                          <div className="text-xs font-medium text-slate-800">{forn.prazoEntregaDias} dias úteis</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            {forn.condicoesComerciais || 'Padrão'}
                          </div>
                        </TabelaCelula>

                        <TabelaCelula>
                          {forn.status === 'ATIVO' && (
                            <Badge variante="sucesso">Ativo</Badge>
                          )}
                          {forn.status === 'BLOQUEADO' && (
                            <Badge variante="perigo">Bloqueado</Badge>
                          )}
                          {forn.status === 'PENDENTE_APROVACAO' && (
                            <Badge variante="aviso">Pendente Aprovação</Badge>
                          )}
                          {forn.status === 'INATIVO' && (
                            <Badge variante="neutro">Inativo</Badge>
                          )}
                        </TabelaCelula>

                        <TabelaCelula>
                          {desativadoNestaFilial ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <Ban className="w-3 h-3" /> Desativado nesta Filial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Check className="w-3 h-3" /> Habilitado
                            </span>
                          )}
                        </TabelaCelula>

                        <TabelaCelula>
                          <div className="flex items-center gap-1.5">
                            {forn.status === 'PENDENTE_APROVACAO' ? (
                              <button
                                type="button"
                                title="Aprovar fornecedor centralmente"
                                onClick={() => handleAprovarFornecedorPendente(forn)}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" /> Aprovar
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  title={forn.status === 'BLOQUEADO' ? 'Desbloquear fornecedor' : 'Bloquear fornecedor globalmente'}
                                  onClick={() => handleAlternarBloqueioFornecedor(forn)}
                                  className={`p-1.5 rounded-lg border text-xs ${
                                    forn.status === 'BLOQUEADO'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  }`}
                                >
                                  {forn.status === 'BLOQUEADO' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                  type="button"
                                  title={desativadoNestaFilial ? 'Reativar fornecedor para esta filial' : 'Desativar fornecedor pontualmente para esta filial'}
                                  onClick={() => handleAlternarDesativacaoFilial(forn)}
                                  className={`p-1.5 rounded-lg border text-xs ${
                                    desativadoNestaFilial
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <Store className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </TabelaCelula>
                      </TabelaLinha>
                    );
                  })
                )}
              </TabelaCorpo>
            </TabelaContainer>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: SOLICITAÇÕES DE COMPRA POR FILIAL */}
      {/* ==================================================================== */}
      {abaAtiva === 'solicitacoes' && (
        <div className="space-y-4">
          {/* Filtros de Solicitação */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Situação:</span>
              <select
                value={filtroStatusSolicitacao}
                onChange={e => setFiltroStatusSolicitacao(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
              >
                <option value="TODOS">Todas as Solicitações</option>
                <option value="PENDENTE_APROVACAO">Pendentes de Aprovação</option>
                <option value="APROVADA_TOTAL">Aprovadas Totalmente</option>
                <option value="APROVADA_PARCIAL">Aprovadas Parcialmente</option>
                <option value="CONSOLIDADA">Consolidadas em Pedido</option>
                <option value="REJEITADA">Rejeitadas</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Solicitações por filial consolidam necessidades antes da cotação formal.
            </div>
          </div>

          {/* Tabela de Solicitações */}
          <Card>
            <TabelaContainer>
              <TabelaCabecalho>
                <TabelaLinha>
                  <TabelaColuna>ID / Sequencial</TabelaColuna>
                  <TabelaColuna>Filial Solicitante</TabelaColuna>
                  <TabelaColuna>Itens Solicitados</TabelaColuna>
                  <TabelaColuna>Prioridade</TabelaColuna>
                  <TabelaColuna>Justificativa Geral</TabelaColuna>
                  <TabelaColuna>Situação</TabelaColuna>
                  <TabelaColuna>Ações</TabelaColuna>
                </TabelaLinha>
              </TabelaCabecalho>
              <TabelaCorpo>
                {solicitacoesFiltradas.length === 0 ? (
                  <TabelaLinha>
                    <TabelaCelula colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                      Nenhuma solicitação de compra cadastrada.
                    </TabelaCelula>
                  </TabelaLinha>
                ) : (
                  solicitacoesFiltradas.map(sol => (
                    <TabelaLinha key={sol.id}>
                      <TabelaCelula>
                        <div className="font-bold text-slate-900">#{sol.numeroSequencial}</div>
                        <div className="text-[10px] text-slate-400">{formatarDataBR(sol.criadoEm)}</div>
                      </TabelaCelula>

                      <TabelaCelula>
                        <div className="font-medium text-slate-800">{sol.nomeFilial || 'Filial'}</div>
                        <div className="text-[10px] text-slate-500">{sol.nomeSolicitante || 'Operador'}</div>
                      </TabelaCelula>

                      <TabelaCelula>
                        <div className="space-y-1">
                          {sol.itens.map(it => (
                            <div key={it.id} className="text-xs text-slate-800 flex items-center justify-between gap-2">
                              <span className="truncate max-w-[200px]">{it.nomeProduto}</span>
                              <span className="font-semibold text-slate-700 shrink-0">
                                {it.quantidadeSolicitada} un
                                {it.quantidadeAprovada !== undefined && it.quantidadeAprovada !== it.quantidadeSolicitada && (
                                  <span className="text-blue-600 ml-1">({it.quantidadeAprovada} aprov.)</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TabelaCelula>

                      <TabelaCelula>
                        {sol.prioridade === 'URGENTE' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Urgente
                          </span>
                        )}
                        {sol.prioridade === 'ALTA' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Alta
                          </span>
                        )}
                        {sol.prioridade === 'MEDIA' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Média
                          </span>
                        )}
                        {sol.prioridade === 'BAIXA' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Baixa
                          </span>
                        )}
                      </TabelaCelula>

                      <TabelaCelula>
                        <div className="text-xs text-slate-700 line-clamp-2 max-w-xs">{sol.justificativaGeral}</div>
                        {sol.justificativaDecisao && (
                          <div className="text-[10px] text-blue-700 mt-1 italic">
                            Decisão: {sol.justificativaDecisao}
                          </div>
                        )}
                      </TabelaCelula>

                      <TabelaCelula>
                        {sol.status === 'PENDENTE_APROVACAO' && (
                          <Badge variante="aviso">Pendente</Badge>
                        )}
                        {sol.status === 'APROVADA_TOTAL' && (
                          <Badge variante="sucesso">Aprovada Total</Badge>
                        )}
                        {sol.status === 'APROVADA_PARCIAL' && (
                          <Badge variante="neutro">Aprovada Parcial</Badge>
                        )}
                        {sol.status === 'CONSOLIDADA' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            <Layers className="w-3 h-3" /> Consolidada
                          </span>
                        )}
                        {sol.status === 'REJEITADA' && (
                          <Badge variante="perigo">Rejeitada</Badge>
                        )}
                      </TabelaCelula>

                      <TabelaCelula>
                        {sol.status === 'PENDENTE_APROVACAO' && (
                          <button
                            type="button"
                            onClick={() => handleAbrirAnaliseSolicitacao(sol)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <FileCheck2 className="w-3 h-3" /> Analisar
                          </button>
                        )}
                      </TabelaCelula>
                    </TabelaLinha>
                  ))
                )}
              </TabelaCorpo>
            </TabelaContainer>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 3: PEDIDOS DE COMPRA CENTRALIZADOS */}
      {/* ==================================================================== */}
      {abaAtiva === 'pedidos' && (
        <div className="space-y-4">
          {/* Filtros de Pedidos */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Situação da Ordem:</span>
              <select
                value={filtroStatusPedido}
                onChange={e => setFiltroStatusPedido(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
              >
                <option value="TODOS">Todos os Pedidos</option>
                <option value="RASCUNHO">Rascunho</option>
                <option value="APROVADO">Aprovados</option>
                <option value="ENVIADO_FORNECEDOR">Enviados ao Fornecedor</option>
                <option value="CONFIRMADO_FORNECEDOR">Confirmados pelo Fornecedor</option>
                <option value="CANCELADO">Cancelados</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Ciclo estrito de estados com histórico auditado em centavos.
            </div>
          </div>

          {/* Tabela de Pedidos */}
          <Card>
            <TabelaContainer>
              <TabelaCabecalho>
                <TabelaLinha>
                  <TabelaColuna>Número / Emissão</TabelaColuna>
                  <TabelaColuna>Fornecedor</TabelaColuna>
                  <TabelaColuna>Destino</TabelaColuna>
                  <TabelaColuna>Itens</TabelaColuna>
                  <TabelaColuna>Valor Total</TabelaColuna>
                  <TabelaColuna>Situação</TabelaColuna>
                  <TabelaColuna>Ações</TabelaColuna>
                </TabelaLinha>
              </TabelaCabecalho>
              <TabelaCorpo>
                {pedidosFiltrados.length === 0 ? (
                  <TabelaLinha>
                    <TabelaCelula colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                      Nenhum pedido de compra encontrado.
                    </TabelaCelula>
                  </TabelaLinha>
                ) : (
                  pedidosFiltrados.map(ped => (
                    <TabelaLinha key={ped.id}>
                      <TabelaCelula>
                        <div className="font-bold text-slate-900">{ped.numeroPedido}</div>
                        <div className="text-[10px] text-slate-400">{formatarDataBR(ped.criadoEm)}</div>
                      </TabelaCelula>

                      <TabelaCelula>
                        <div className="font-semibold text-slate-800">{ped.nomeFantasiaFornecedor || 'Fornecedor'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{ped.condicoesPagamento}</div>
                      </TabelaCelula>

                      <TabelaCelula>
                        {ped.destinadoMultiplasFiliais ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            <Layers className="w-3 h-3" /> Múltiplas Filiais
                          </span>
                        ) : (
                          <span className="text-xs text-slate-700 font-medium">Filial Central</span>
                        )}
                      </TabelaCelula>

                      <TabelaCelula>
                        <div className="text-xs font-semibold text-slate-800">
                          {ped.itens.length} {ped.itens.length === 1 ? 'item' : 'itens'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {ped.itens.reduce((acc, it) => acc + it.quantidadePedida, 0)} unidades
                        </div>
                      </TabelaCelula>

                      <TabelaCelula>
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {formatarCentavosParaReal(ped.valorTotalCentavos)}
                        </div>
                        {ped.valorDescontoCentavos > 0 && (
                          <div className="text-[10px] text-emerald-600">
                            Desc: -{formatarCentavosParaReal(ped.valorDescontoCentavos)}
                          </div>
                        )}
                      </TabelaCelula>

                      <TabelaCelula>
                        {ped.status === 'RASCUNHO' && (
                          <Badge variante="neutro">Rascunho</Badge>
                        )}
                        {ped.status === 'PENDENTE_APROVACAO' && (
                          <Badge variante="aviso">Pendente Aprovação</Badge>
                        )}
                        {ped.status === 'APROVADO' && (
                          <Badge variante="sucesso">Aprovado</Badge>
                        )}
                        {ped.status === 'ENVIADO_FORNECEDOR' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <Send className="w-3 h-3" /> Enviado
                          </span>
                        )}
                        {ped.status === 'CONFIRMADO_FORNECEDOR' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Confirmado
                          </span>
                        )}
                        {ped.status === 'CANCELADO' && (
                          <Badge variante="perigo">Cancelado</Badge>
                        )}
                      </TabelaCelula>

                      <TabelaCelula>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPedidoSelecionado(ped)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs"
                            title="Ver detalhes e auditoria"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {ped.status === 'RASCUNHO' && (
                            <button
                              type="button"
                              onClick={() => handleAvancarCicloPedido(ped, 'APROVADO')}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold"
                            >
                              Aprovar
                            </button>
                          )}

                          {ped.status === 'APROVADO' && (
                            <button
                              type="button"
                              onClick={() => handleAvancarCicloPedido(ped, 'ENVIADO_FORNECEDOR')}
                              className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> Enviar
                            </button>
                          )}

                          {ped.status === 'ENVIADO_FORNECEDOR' && (
                            <button
                              type="button"
                              onClick={() => handleAvancarCicloPedido(ped, 'CONFIRMADO_FORNECEDOR')}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Confirmar
                            </button>
                          )}
                        </div>
                      </TabelaCelula>
                    </TabelaLinha>
                  ))
                )}
              </TabelaCorpo>
            </TabelaContainer>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: NOVO FORNECEDOR */}
      {/* ==================================================================== */}
      <Modal
        aberto={modalNovoFornecedorAberto}
        aoFechar={() => setModalNovoFornecedorAberto(false)}
        titulo="Cadastrar Novo Fornecedor"
        descricao="Cadastro central compartilhado entre todas as filiais da empresa."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CNPJ (14 dígitos) *
              </label>
              <input
                type="text"
                placeholder="00.000.000/0000-00"
                value={novoCnpj}
                onChange={e => setNovoCnpj(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inscrição Estadual (IE)
              </label>
              <input
                type="text"
                placeholder="Isento ou número estadual"
                value={novaInscricaoEstadual}
                onChange={e => setNovaInscricaoEstadual(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Razão Social *
            </label>
            <input
              type="text"
              placeholder="Razão social completa registrada na Receita Federal"
              value={novaRazaoSocial}
              onChange={e => setNovaRazaoSocial(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome Fantasia *
            </label>
            <input
              type="text"
              placeholder="Nome comercial conhecido"
              value={novoNomeFantasia}
              onChange={e => setNovoNomeFantasia(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Comercial
              </label>
              <input
                type="email"
                placeholder="pedidos@fornecedor.com.br"
                value={novoEmail}
                onChange={e => setNovoEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone
              </label>
              <input
                type="text"
                placeholder="(00) 0000-0000"
                value={novoTelefone}
                onChange={e => setNovoTelefone(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prazo Médio de Entrega (dias)
              </label>
              <input
                type="number"
                min="1"
                value={novoPrazoDias}
                onChange={e => setNovoPrazoDias(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Condições Comerciais
              </label>
              <input
                type="text"
                placeholder="Ex: Faturamento 28 dias"
                value={novasCondicoes}
                onChange={e => setNovasCondicoes(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Botao variante="outline" tamanho="sm" onClick={() => setModalNovoFornecedorAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" tamanho="sm" onClick={handleSalvarFornecedor}>
              Cadastrar Fornecedor
            </Botao>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL: BLOQUEIO COM JUSTIFICATIVA OBRIGATÓRIA */}
      {/* ==================================================================== */}
      <Modal
        aberto={modalBloqueioAberto}
        aoFechar={() => setModalBloqueioAberto(false)}
        titulo={`Bloquear Fornecedor — ${fornecedorSelecionado?.nomeFantasia}`}
        descricao="O bloqueio global impede novos pedidos de compra para qualquer filial da empresa."
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
            Pedidos já confirmados ou em trânsito não serão cancelados automaticamente pelo bloqueio.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Justificativa Formal de Bloqueio (obrigatória, mínimo 5 caracteres) *
            </label>
            <textarea
              rows={3}
              value={motivoBloqueioInput}
              onChange={e => setMotivoBloqueioInput(e.target.value)}
              placeholder="Descreva o motivo do bloqueio comercial ou sanitário..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Botao variante="outline" tamanho="sm" onClick={() => setModalBloqueioAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" tamanho="sm" onClick={handleConfirmarBloqueio}>
              Confirmar Bloqueio Global
            </Botao>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL: NOVA SOLICITAÇÃO DE FILIAL */}
      {/* ==================================================================== */}
      <Modal
        aberto={modalNovaSolicitacaoAberto}
        aoFechar={() => setModalNovaSolicitacaoAberto(false)}
        titulo="Nova Solicitação de Compra por Filial"
        descricao={`Filial Solicitante: ${filialAtiva?.nome || 'Filial 01 — Matriz Centro'}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Prioridade da Reposição *
            </label>
            <select
              value={solicitacaoPrioridade}
              onChange={e => setSolicitacaoPrioridade(e.target.value as PrioridadeSolicitacao)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
            >
              <option value="BAIXA">Baixa — Reposição de rotina</option>
              <option value="MEDIA">Média — Demanda regular</option>
              <option value="ALTA">Alta — Ponto crítico de reposição atingido</option>
              <option value="URGENTE">Urgente — Ruptura iminente de produto essencial</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Justificativa Geral da Necessidade (mínimo 5 caracteres) *
            </label>
            <textarea
              rows={2}
              value={solicitacaoJustificativa}
              onChange={e => setSolicitacaoJustificativa(e.target.value)}
              placeholder="Explique o motivo da reposição solicitada pela filial..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50">
            <p className="text-xs font-bold text-slate-800">Itens e Quantidades Sugeridas:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Amoxicilina + Clavulanato 500/125mg
                </label>
                <input
                  type="number"
                  min="0"
                  value={solicitacaoQtdProd1}
                  onChange={e => setSolicitacaoQtdProd1(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Dipirona Monoidratada 500mg/mL 20mL
                </label>
                <input
                  type="number"
                  min="0"
                  value={solicitacaoQtdProd2}
                  onChange={e => setSolicitacaoQtdProd2(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Botao variante="outline" tamanho="sm" onClick={() => setModalNovaSolicitacaoAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" tamanho="sm" onClick={handleCriarSolicitacao}>
              Enviar Solicitação
            </Botao>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL: ANÁLISE CENTRALIZADA DE SOLICITAÇÃO */}
      {/* ==================================================================== */}
      {solicitacaoEmAnalise && (
        <Modal
          aberto={true}
          aoFechar={() => setSolicitacaoEmAnalise(null)}
          titulo={`Analisar Solicitação #${solicitacaoEmAnalise.numeroSequencial}`}
          descricao={`Solicitado por ${solicitacaoEmAnalise.nomeSolicitante} (${solicitacaoEmAnalise.nomeFilial})`}
        >
          <div className="space-y-4">
            <div className="text-xs bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
              <p>
                <strong>Prioridade:</strong> {solicitacaoEmAnalise.prioridade}
              </p>
              <p>
                <strong>Justificativa da Filial:</strong> {solicitacaoEmAnalise.justificativaGeral}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800 mb-2">
                Ajuste de Quantidades Aprovadas (Para Aprovação Parcial):
              </p>
              <div className="space-y-2">
                {solicitacaoEmAnalise.itens.map(it => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-3 text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{it.nomeProduto}</span>
                      <div className="text-[10px] text-slate-400">Solicitado: {it.quantidadeSolicitada} un</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Aprovar:</span>
                      <input
                        type="number"
                        min="0"
                        max={it.quantidadeSolicitada}
                        value={qtdAprovadaAjuste[it.id] ?? it.quantidadeSolicitada}
                        onChange={e =>
                          setQtdAprovadaAjuste(prev => ({
                            ...prev,
                            [it.id]: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-20 text-xs px-2 py-1 border border-slate-200 rounded-md text-right font-bold text-blue-700"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Justificativa da Decisão (Obrigatória se Rejeitado)
              </label>
              <textarea
                rows={2}
                value={justificativaDecisaoInput}
                onChange={e => setJustificativaDecisaoInput(e.target.value)}
                placeholder="Parecer do responsável central pelo suprimento..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Botao
                variante="perigo"
                tamanho="sm"
                onClick={() => handleDecidirSolicitacao('REJEITAR')}
              >
                Rejeitar Solicitação
              </Botao>
              <Botao
                variante="outline"
                tamanho="sm"
                onClick={() => handleDecidirSolicitacao('APROVAR_PARCIAL')}
              >
                Aprovar Parcial
              </Botao>
              <Botao
                variante="primario"
                tamanho="sm"
                onClick={() => handleDecidirSolicitacao('APROVAR_TOTAL')}
              >
                Aprovar Total
              </Botao>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* MODAL: CONSOLIDAÇÃO DE SOLICITAÇÕES EM PEDIDO */}
      {/* ==================================================================== */}
      <Modal
        aberto={modalConsolidarAberto}
        aoFechar={() => setModalConsolidarAberto(false)}
        titulo="Consolidação de Solicitações em Pedido de Compra"
        descricao="Agrupa solicitações aprovadas de diferentes filiais para obter melhor poder de negociação e escala."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Selecione o Fornecedor Homologado *
            </label>
            <select
              value={fornecedorConsolidadoId}
              onChange={e => setFornecedorConsolidadoId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value="">Selecione um fornecedor ativo...</option>
              {fornecedores
                .filter(f => f.status === 'ATIVO')
                .map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nomeFantasia} — Prazo {f.prazoEntregaDias}d ({f.condicoesComerciais || 'Padrão'})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800 mb-2">Solicitações Aprovadas Disponíveis:</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {solicitacoes
                .filter(s => s.status === 'APROVADA_TOTAL' || s.status === 'APROVADA_PARCIAL')
                .map(s => {
                  const selecionada = solicitacoesSelecionadasIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        selecionada
                          ? 'bg-blue-50 border-blue-200 text-blue-950 font-medium'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selecionada}
                        onChange={e => {
                          if (e.target.checked) {
                            setSolicitacoesSelecionadasIds(prev => [...prev, s.id]);
                          } else {
                            setSolicitacoesSelecionadasIds(prev => prev.filter(id => id !== s.id));
                          }
                        }}
                        className="mt-0.5 rounded-sm text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">
                            #{s.numeroSequencial} — {s.nomeFilial}
                          </span>
                          <span className="text-[10px] text-slate-500">{s.itens.length} produtos</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{s.justificativaGeral}</p>
                      </div>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Botao variante="outline" tamanho="sm" onClick={() => setModalConsolidarAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              tamanho="sm"
              iconeEsquerda={<Layers className="w-4 h-4" />}
              onClick={handleConsolidarSolicitacoes}
            >
              Gerar Pedido Consolidado
            </Botao>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL: DETALHES DO PEDIDO & AUDITORIA DE HISTÓRICO */}
      {/* ==================================================================== */}
      {pedidoSelecionado && (
        <Modal
          aberto={true}
          aoFechar={() => setPedidoSelecionado(null)}
          titulo={`Pedido de Compra ${pedidoSelecionado.numeroPedido}`}
          descricao={`Fornecedor: ${pedidoSelecionado.nomeFantasiaFornecedor || pedidoSelecionado.razaoSocialFornecedor}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Informações Gerais do Pedido */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Situação</span>
                <span className="font-bold text-slate-800">{pedidoSelecionado.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Subtotal</span>
                <span className="font-mono text-slate-800">
                  {formatarCentavosParaReal(pedidoSelecionado.valorSubtotalCentavos)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Desconto</span>
                <span className="font-mono text-emerald-600">
                  -{formatarCentavosParaReal(pedidoSelecionado.valorDescontoCentavos)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Líquido</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatarCentavosParaReal(pedidoSelecionado.valorTotalCentavos)}
                </span>
              </div>
            </div>

            {/* Lista de Itens do Pedido */}
            <div>
              <p className="text-xs font-bold text-slate-800 mb-2">Itens e Rateio por Filial:</p>
              <div className="space-y-2">
                {pedidoSelecionado.itens.map(it => (
                  <div
                    key={it.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{it.nomeProduto}</div>
                      <div className="text-[10px] text-slate-400">
                        Destino: {it.nomeFilialDestino || 'Matriz'} • {it.quantidadePedida} un x{' '}
                        {formatarCentavosParaReal(it.valorUnitarioCentavos)}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900">
                      {formatarCentavosParaReal(it.valorTotalCentavos)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linha do Tempo / Histórico de Auditoria */}
            <div>
              <p className="text-xs font-bold text-slate-800 mb-2">Histórico de Auditoria do Pedido:</p>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                {(pedidoSelecionado.historico || []).length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">Nenhum evento registrado.</div>
                ) : (
                  pedidoSelecionado.historico!.map(h => (
                    <div key={h.id} className="p-3 text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {h.statusNovo} {h.statusAnterior && <span className="text-slate-400 font-normal">← {h.statusAnterior}</span>}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatarDataHoraBR(h.dataRegistro)}</span>
                      </div>
                      <p className="text-slate-600">{h.motivoAlteracao}</p>
                      <p className="text-[10px] text-slate-400">Registrado por: {h.nomeUsuario || 'Operador'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ações de Transição de Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              {pedidoSelecionado.status !== 'CANCELADO' && (
                <Botao
                  variante="perigo"
                  tamanho="sm"
                  onClick={() => setModalCancelarPedidoAberto(true)}
                >
                  Cancelar Pedido
                </Botao>
              )}

              <div className="flex items-center gap-2 ml-auto">
                {pedidoSelecionado.status === 'RASCUNHO' && (
                  <Botao
                    variante="primario"
                    tamanho="sm"
                    onClick={() => handleAvancarCicloPedido(pedidoSelecionado, 'APROVADO')}
                  >
                    Aprovar Pedido
                  </Botao>
                )}

                {pedidoSelecionado.status === 'APROVADO' && (
                  <Botao
                    variante="primario"
                    tamanho="sm"
                    iconeEsquerda={<Send className="w-4 h-4" />}
                    onClick={() => handleAvancarCicloPedido(pedidoSelecionado, 'ENVIADO_FORNECEDOR')}
                  >
                    Marcar como Enviado
                  </Botao>
                )}

                {pedidoSelecionado.status === 'ENVIADO_FORNECEDOR' && (
                  <Botao
                    variante="primario"
                    tamanho="sm"
                    iconeEsquerda={<Check className="w-4 h-4" />}
                    onClick={() => handleAvancarCicloPedido(pedidoSelecionado, 'CONFIRMADO_FORNECEDOR')}
                  >
                    Confirmar Aceite Fornecedor
                  </Botao>
                )}

                <Botao variante="outline" tamanho="sm" onClick={() => setPedidoSelecionado(null)}>
                  Fechar
                </Botao>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* MODAL: CANCELAMENTO DE PEDIDO DE COMPRA COM AUDITORIA */}
      {/* ==================================================================== */}
      <Modal
        aberto={modalCancelarPedidoAberto}
        aoFechar={() => setModalCancelarPedidoAberto(false)}
        titulo={`Cancelar Pedido ${pedidoSelecionado?.numeroPedido}`}
        descricao="O cancelamento exige justificativa formal para fins de auditoria de compras."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Justificativa de Cancelamento (mínimo 5 caracteres) *
            </label>
            <textarea
              rows={3}
              value={motivoCancelamentoPedido}
              onChange={e => setMotivoCancelamentoPedido(e.target.value)}
              placeholder="Descreva detalhadamente a razão do cancelamento da ordem de compra..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Botao variante="outline" tamanho="sm" onClick={() => setModalCancelarPedidoAberto(false)}>
              Voltar
            </Botao>
            <Botao variante="perigo" tamanho="sm" onClick={handleCancelarPedido}>
              Confirmar Cancelamento Formal
            </Botao>
          </div>
        </div>
      </Modal>
    </div>
  );
};
