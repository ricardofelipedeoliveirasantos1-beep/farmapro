import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { DemoCatalogService } from '../services/demoCatalogService.js';
import { DemoPreSalesService } from '../services/demoPreSalesService.js';
import { PreVendasApiService } from '../services/preVendasApiService.js';
import { MedicamentoDemonstrativo } from '../services/demoCatalogData.js';
import {
  CartItemBalcao,
  CartTotals,
  CustomerInfo,
  PreVendaDemo,
  SearchMode,
  VendedorResponsavel,
} from '../types/balcao.js';

import { PainelVendaHeader } from '../components/balcao/PainelVendaHeader.js';
import { OpcaoMenuPainelVenda } from '../components/balcao/PainelVendaMenu.js';
import { CadastrarClienteView } from '../components/balcao/CadastrarClienteView.js';
import { HistoricoComprasView } from '../components/balcao/HistoricoComprasView.js';
import { RelatorioVendasDiaView } from '../components/balcao/RelatorioVendasDiaView.js';
import { TrocaDevolucaoView } from '../components/balcao/TrocaDevolucaoView.js';
import { PesquisaReceitaView } from '../components/balcao/PesquisaReceitaView.js';

import { ProductSearch } from '../components/balcao/ProductSearch.js';
import { ProductResultsTable } from '../components/balcao/ProductResultsTable.js';
import { PinnedProductDetails } from '../components/balcao/PinnedProductDetails.js';
import { InterchangeableSuggestions } from '../components/balcao/InterchangeableSuggestions.js';
import { BalcaoEmptySearchState } from '../components/balcao/BalcaoEmptySearchState.js';
import { AttendanceCart } from '../components/balcao/AttendanceCart.js';
import { CustomerModal } from '../components/balcao/CustomerModal.js';
import { DiscountModal } from '../components/balcao/DiscountModal.js';
import { PreSalesModal } from '../components/balcao/PreSalesModal.js';
import { BalcaoOptionsModal } from '../components/balcao/BalcaoOptionsModal.js';
import { ComprovantePreVendaModal } from '../components/balcao/ComprovantePreVendaModal.js';
import { IdentificarVendedorModal } from '../components/balcao/IdentificarVendedorModal.js';
import { ConfirmarExclusaoModal } from '../components/balcao/ConfirmarExclusaoModal.js';
import { BalcaoFooterShortcuts } from '../components/balcao/BalcaoFooterShortcuts.js';

interface BalcaoConsultaScreenProps {
  aoVoltarPortal?: () => void;
  aoAbrirMenu?: () => void;
  aoTrocarUsuario?: () => void;
  aoSair?: () => void;
}

export const BalcaoConsultaScreen: React.FC<BalcaoConsultaScreenProps> = ({
  aoVoltarPortal: _aoVoltarPortal,
  aoTrocarUsuario,
  aoSair,
}) => {
  const { usuario, filialAtiva } = useAuth();

  // Módulo / Aba Ativa do Painel de Venda (Separação estrita dos módulos conforme solicitação)
  const [abaAtiva, setAbaAtiva] = useState<OpcaoMenuPainelVenda>('pre-venda');

  // Estados de Pesquisa
  const [termoBusca, setTermoBusca] = useState<string>('');
  const modoBusca: SearchMode = 'NAME';
  const [indiceSelecionado, setIndiceSelecionado] = useState<number>(0);
  const inputBuscaRef = useRef<HTMLInputElement>(null);

  // Estados do Medicamento Fixado e Sugestões Intercambiáveis
  const [medicamentoFixado, setMedicamentoFixado] = useState<MedicamentoDemonstrativo | null>(null);
  const [indiceFocadoSugestao, setIndiceFocadoSugestao] = useState<number>(-1);

  // Estados da Sacola de Atendimento
  const [sacola, setSacola] = useState<CartItemBalcao[]>([]);
  const [descontoGlobal, setDescontoGlobal] = useState<number>(0);

  // Estados do Modo de Exclusão Interativo (F8)
  const [modoExclusaoSacola, setModoExclusaoSacola] = useState<boolean>(false);
  const [indiceItemExclusao, setIndiceItemExclusao] = useState<number>(0);
  const [itemExclusaoConfirmando, setItemExclusaoConfirmando] = useState<CartItemBalcao | null>(null);

  // Identificação do Cliente
  const [cliente, setCliente] = useState<CustomerInfo>({
    name: 'CONSUMIDOR FINAL',
    cpf: '',
    convenio: 'À VISTA / PARTICULAR',
  });

  // Estados dos Modais Operacionais
  const [modalClienteAberto, setModalClienteAberto] = useState<boolean>(false);
  const [modalDescontoAberto, setModalDescontoAberto] = useState<boolean>(false);
  const [modalPreVendasAberto, setModalPreVendasAberto] = useState<boolean>(false);
  const [modalOpcoesAberto, setModalOpcoesAberto] = useState<boolean>(false);
  const [modalVendedorAberto, setModalVendedorAberto] = useState<boolean>(false);
  const [comandaConcluida, setComandaConcluida] = useState<PreVendaDemo | null>(null);

  // Memória da última pré-venda salva e controle de debounce no F2
  const [ultimaPreVendaCriada, setUltimaPreVendaCriada] = useState<PreVendaDemo | null>(null);
  const [preVendaEmEdicao, setPreVendaEmEdicao] = useState<PreVendaDemo | null>(null);
  const [acaoVendedorPendente, setAcaoVendedorPendente] = useState<'SALVAR' | 'IMPRIMIR'>('SALVAR');
  const salvandoPreVendaRef = useRef<boolean>(false);

  // Fila de Pré-vendas
  const [listaPreVendas, setListaPreVendas] = useState<PreVendaDemo[]>(() =>
    DemoPreSalesService.getPreVendas(),
  );

  // Extração do multiplicador de quantidade (ex: 3*ome -> mult: 3, query: ome)
  const { multiplier, query: queryLimpa } = useMemo(
    () => DemoCatalogService.extractMultiplier(termoBusca),
    [termoBusca],
  );

  // Medicamentos ocultos até que uma busca seja realizada (conforme solicitação do proprietário)
  const temBuscaAtiva = queryLimpa.trim().length > 0;

  // Filtragem dos medicamentos demonstrativos apenas quando houver busca ativa
  const medicamentosFiltrados = useMemo(
    () => {
      if (!temBuscaAtiva) return [];
      return DemoCatalogService.filterMedications(queryLimpa, modoBusca, false);
    },
    [temBuscaAtiva, queryLimpa, modoBusca],
  );

  // Sugestões Intercambiáveis calculadas para o produto fixado
  const sugestoesIntercambiaveis = useMemo(() => {
    if (!medicamentoFixado) return [];
    return DemoCatalogService.buildOrderedThreeSuggestions(medicamentoFixado);
  }, [medicamentoFixado]);

  // Cálculos dos Totalizadores da Sacola
  const totaisSacola: CartTotals = useMemo(() => {
    let subtotalBruto = 0;
    let totalVolumes = 0;

    for (const item of sacola) {
      subtotalBruto += item.subtotal;
      totalVolumes += item.quantity;
    }

    const totalDesconto = Math.min(descontoGlobal, subtotalBruto);
    const totalLiquido = Math.max(0, subtotalBruto - totalDesconto);

    return {
      distinctItems: sacola.length,
      totalVolumes,
      subtotalBruto,
      discountTotal: totalDesconto,
      totalLiquido,
    };
  }, [sacola, descontoGlobal]);

  // Foco inicial no campo de busca ao montar
  useEffect(() => {
    inputBuscaRef.current?.focus();
  }, []);

  // Ajusta o índice selecionado quando a lista de busca mudar
  useEffect(() => {
    setIndiceSelecionado(0);
  }, [medicamentosFiltrados.length, termoBusca]);

  // Helper para verificar se há algum modal aberto
  const isAnyModalOpen = useCallback(() => {
    return (
      modalClienteAberto ||
      modalDescontoAberto ||
      modalPreVendasAberto ||
      modalOpcoesAberto ||
      modalVendedorAberto ||
      itemExclusaoConfirmando !== null ||
      comandaConcluida !== null
    );
  }, [
    modalClienteAberto,
    modalDescontoAberto,
    modalPreVendasAberto,
    modalOpcoesAberto,
    modalVendedorAberto,
    itemExclusaoConfirmando,
    comandaConcluida,
  ]);

  // Fixar medicamento
  const handleFixarMedicamento = (med: MedicamentoDemonstrativo) => {
    setModoExclusaoSacola(false);
    setMedicamentoFixado(med);
    setIndiceFocadoSugestao(-1);
  };

  // Destravar medicamento e retornar imediatamente à pesquisa preservando o texto e posição (Seção 5)
  const handleDestravarMedicamento = () => {
    setMedicamentoFixado(null);
    setIndiceFocadoSugestao(-1);
    setTimeout(() => {
      if (inputBuscaRef.current) {
        inputBuscaRef.current.focus();
        const len = inputBuscaRef.current.value.length;
        inputBuscaRef.current.setSelectionRange(len, len);
      }
    }, 40);
  };

  // Adicionar produto à sacola (2º Enter ou clique)
  const handleAdicionarProdutoSacola = (med: MedicamentoDemonstrativo, qtd = multiplier) => {
    const quantidadeValida = Math.max(1, qtd);

    setSacola(prev => {
      const idxExistente = prev.findIndex(item => item.medication.id === med.id);
      let novoItem: CartItemBalcao;

      if (idxExistente >= 0) {
        const itemExistente = prev[idxExistente]!;
        const novaQtd = itemExistente.quantity + quantidadeValida;
        const subtotal = Math.max(0, novaQtd * itemExistente.unitPrice - itemExistente.discount);
        novoItem = {
          ...itemExistente,
          quantity: novaQtd,
          subtotal,
        };
        // Reposiciona o medicamento existente no topo da sacola
        const outrosItens = prev.filter((_, i) => i !== idxExistente);
        const listaAtualizada = [novoItem, ...outrosItens];
        return listaAtualizada.map((item, index) => ({
          ...item,
          numeroSequencial: listaAtualizada.length - index,
        }));
      } else {
        // Novo produto distinto recebe o próximo número sequencial de inclusão (#N no topo até #1 na base)
        novoItem = {
          medication: med,
          quantity: quantidadeValida,
          unitPrice: med.preco,
          discount: 0,
          subtotal: med.preco * quantidadeValida,
          numeroSequencial: prev.length + 1,
        };
        const listaAtualizada = [novoItem, ...prev];
        return listaAtualizada.map((item, index) => ({
          ...item,
          numeroSequencial: listaAtualizada.length - index,
        }));
      }
    });

    setMedicamentoFixado(null);
    setTermoBusca('');
    setModoExclusaoSacola(false);
    setTimeout(() => {
      inputBuscaRef.current?.focus();
    }, 50);
  };

  // Alterar diretamente a quantidade de um item na sacola (coluna QTD)
  const handleAlterarQuantidadeSacola = (idx: number, novaQtd: number) => {
    setSacola(prev => {
      if (idx < 0 || idx >= prev.length) return prev;
      const itemAtual = prev[idx];
      if (!itemAtual) return prev;

      // Validação de número inteiro positivo (mínimo 1 unidade)
      const qtdValida = Math.max(1, Math.floor(novaQtd));

      // Validação de estoque disponível no cadastro demonstrativo
      let qtdFinal = qtdValida;
      if (itemAtual.medication.saldo && qtdValida > itemAtual.medication.saldo) {
        alert(
          `Aviso: A quantidade informada (${qtdValida}) supera o saldo em estoque (${itemAtual.medication.saldo} un). Ajustado para o saldo máximo.`
        );
        qtdFinal = itemAtual.medication.saldo;
      }

      // Preservação rigorosa dos descontos unitários e cálculo imediato do novo subtotal
      const novoSubtotal = Math.max(0, qtdFinal * itemAtual.unitPrice - (itemAtual.discount || 0));

      const atualizado: CartItemBalcao = {
        ...itemAtual,
        quantity: qtdFinal,
        subtotal: novoSubtotal,
      };

      const novaSacola = [...prev];
      novaSacola[idx] = atualizado;
      return novaSacola;
    });
  };

  // Iniciar exclusão de item por índice
  const handleAbrirConfirmarExclusao = (idx: number) => {
    const item = sacola[idx];
    if (item) {
      setIndiceItemExclusao(idx);
      setItemExclusaoConfirmando(item);
    }
  };

  // Confirmação SIM no modal de exclusão
  const handleConfirmarExclusaoItem = () => {
    if (itemExclusaoConfirmando) {
      setSacola(prev => {
        const filtrada = prev.filter((_, i) => i !== indiceItemExclusao);
        // Re-estabelece a ordem da numeração sequencial contínua (#N até #1 sem lacunas)
        return filtrada.map((item, index) => ({
          ...item,
          numeroSequencial: filtrada.length - index,
        }));
      });
      setItemExclusaoConfirmando(null);
      setModoExclusaoSacola(false);
      setTimeout(() => {
        inputBuscaRef.current?.focus();
      }, 50);
    }
  };

  // Cancelamento NÃO / ESC no modal de exclusão
  const handleCancelarExclusaoItem = () => {
    setItemExclusaoConfirmando(null);
    inputBuscaRef.current?.focus();
  };

  // Alternar modo de exclusão (F8)
  const handleAtivarModoExclusao = () => {
    if (sacola.length === 0) {
      alert('A sacola está vazia. Não há produtos para selecionar ou excluir.');
      return;
    }
    setModoExclusaoSacola(prev => {
      const proximo = !prev;
      if (proximo) {
        setIndiceItemExclusao(0);
      }
      return proximo;
    });
  };

  // Iniciar criação de pré-venda (F2): valida sacola e abre modal simplificado de identificação do vendedor
  const handleIniciarSalvarPreVenda = () => {
    if (salvandoPreVendaRef.current) return;
    if (sacola.length === 0) {
      alert('A sacola está vazia. Não é possível criar uma pré-venda sem itens.');
      return;
    }
    setAcaoVendedorPendente('SALVAR');
    setModoExclusaoSacola(false);
    setModalVendedorAberto(true);
  };

  // Imprimir Pré-venda (F3) — Imprime exclusivamente a comanda já salva, sem duplicar registros (Seção 8)
  const handleImprimirPreVenda = () => {
    if (comandaConcluida) {
      window.print();
      return;
    }

    const preVendaAlvo = ultimaPreVendaCriada || (listaPreVendas.length > 0 ? listaPreVendas[0] : null);
    if (preVendaAlvo) {
      setComandaConcluida(preVendaAlvo);
      setTimeout(() => {
        window.print();
      }, 150);
    } else {
      alert('Nenhuma pré-venda salva para imprimir. Inicie o salvamento utilizando F2.');
    }
  };

  // Confirmação final após validação do vendedor (2º Enter no modal)
  const handleConfirmarVendedorPreVenda = (vendedor: VendedorResponsavel) => {
    if (salvandoPreVendaRef.current) return;
    salvandoPreVendaRef.current = true;

    try {
      setModalVendedorAberto(false);

      let preVendaFinal: PreVendaDemo | null = null;

      if (preVendaEmEdicao) {
        // Atualiza rigorosamente o mesmo registro de pré-venda preservando seu número original (ex: PV-000156)
        preVendaFinal = DemoPreSalesService.updatePreVenda(
          preVendaEmEdicao.id,
          sacola,
          totaisSacola,
          cliente,
          {
            matricula: vendedor.matricula,
            nome: vendedor.nome,
          },
          {
            id: usuario?.id,
            nome: usuario?.nome ? `${usuario.nome} (${usuario.matricula || 'Balcão'})` : 'Operador Balcão',
          },
        );
        // Persistência assíncrona oficial no PostgreSQL via API
        PreVendasApiService.atualizarPreVenda(
          preVendaEmEdicao.id,
          sacola,
          totaisSacola,
          cliente,
          { matricula: vendedor.matricula, nome: vendedor.nome },
          { id: usuario?.id, nome: usuario?.nome ? `${usuario.nome} (${usuario.matricula || 'Balcão'})` : 'Operador Balcão' },
        ).catch(() => {});
        setPreVendaEmEdicao(null);
      } else {
        // Cria nova pré-venda gerando novo número sequencial (ex: PV-000157)
        preVendaFinal = DemoPreSalesService.savePreVenda(
          sacola,
          totaisSacola,
          cliente,
          {
            matricula: vendedor.matricula,
            nome: vendedor.nome,
          },
          {
            id: usuario?.id,
            nome: usuario?.nome ? `${usuario.nome} (${usuario.matricula || 'Balcão'})` : 'Operador Balcão',
          },
        );
        // Persistência assíncrona oficial no PostgreSQL via API
        PreVendasApiService.salvarPreVenda(
          sacola,
          totaisSacola,
          cliente,
          { matricula: vendedor.matricula, nome: vendedor.nome },
          { id: usuario?.id, nome: usuario?.nome ? `${usuario.nome} (${usuario.matricula || 'Balcão'})` : 'Operador Balcão' },
        ).catch(() => {});
      }

      setUltimaPreVendaCriada(preVendaFinal);
      setComandaConcluida(preVendaFinal);
      setListaPreVendas(DemoPreSalesService.getPreVendas());
      setSacola([]);
      setDescontoGlobal(0);
      setModoExclusaoSacola(false);
      setCliente({ name: 'Consumidor Final', cpf: '', convenio: 'NENHUM' });

      // Conclui a operação e inicia automaticamente a impressão da pré-venda (Seção 7)
      setTimeout(() => {
        window.print();
      }, 250);
    } finally {
      setTimeout(() => {
        salvandoPreVendaRef.current = false;
        setAcaoVendedorPendente('SALVAR');
      }, 600);
    }
  };

  // Carregar Pré-venda selecionada na Sacola para Edição
  const handleCarregarPreVendaNaSacola = (pv: PreVendaDemo) => {
    DemoPreSalesService.setPreVendaStatus(pv.id, 'IN_EDIT');
    setSacola(
      pv.items.map((it, idx) => ({
        ...it,
        numeroSequencial: pv.items.length - idx,
      })),
    );
    setCliente({ ...pv.customer });
    setDescontoGlobal(pv.discount || 0);
    setPreVendaEmEdicao(pv);
    setAbaAtiva('pre-venda');
    setModalPreVendasAberto(false);
    setTimeout(() => {
      inputBuscaRef.current?.focus();
    }, 50);
  };

  // Descartar Edição e voltar a sacola limpa
  const handleDescartarEdicaoPreVenda = () => {
    if (preVendaEmEdicao) {
      DemoPreSalesService.setPreVendaStatus(preVendaEmEdicao.id, 'PENDING_CASHIER');
      setPreVendaEmEdicao(null);
    }
    setSacola([]);
    setDescontoGlobal(0);
    setModoExclusaoSacola(false);
    setCliente({ name: 'Consumidor Final', cpf: '', convenio: 'NENHUM' });
    setTimeout(() => {
      inputBuscaRef.current?.focus();
    }, 50);
  };

  // Alternância de Tela Cheia Global (F11)
  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Cancelar ou Excluir pré-venda da fila
  const handleCancelarPreVenda = (id: string) => {
    DemoPreSalesService.deletePreVenda(id);
    setListaPreVendas(DemoPreSalesService.getPreVendas());
  };

  // Event Listener Global de Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 0. Tecla ESC em abas secundárias retorna diretamente para a Pré-venda / Balcão
      if (abaAtiva !== 'pre-venda') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setAbaAtiva('pre-venda');
          setTimeout(() => inputBuscaRef.current?.focus(), 50);
        }
        return;
      }

      // 1. Atalho Ctrl+D / Cmd+D para Desconto
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setModoExclusaoSacola(false);
        setModalDescontoAberto(true);
        return;
      }

      // 2. Tecla ESC: Cancelar ou fechar operação atual
      if (e.key === 'Escape') {
        e.preventDefault();
        if (itemExclusaoConfirmando !== null) {
          setItemExclusaoConfirmando(null);
          return;
        }
        if (isAnyModalOpen()) {
          setModalClienteAberto(false);
          setModalDescontoAberto(false);
          setModalPreVendasAberto(false);
          setModalOpcoesAberto(false);
          setModalVendedorAberto(false);
          setComandaConcluida(null);
          inputBuscaRef.current?.focus();
        } else if (modoExclusaoSacola) {
          setModoExclusaoSacola(false);
          inputBuscaRef.current?.focus();
        } else if (medicamentoFixado !== null) {
          handleDestravarMedicamento();
        } else if (termoBusca) {
          setTermoBusca('');
          inputBuscaRef.current?.focus();
        }
        return;
      }

      // 3. F1: Focar pesquisa
      if (e.key === 'F1') {
        e.preventDefault();
        setModoExclusaoSacola(false);
        setModalClienteAberto(false);
        setModalDescontoAberto(false);
        setModalPreVendasAberto(false);
        setModalOpcoesAberto(false);
        setModalVendedorAberto(false);
        inputBuscaRef.current?.focus();
        return;
      }

      // 4. F2: Salvar Pré-Venda
      if (e.key === 'F2') {
        e.preventDefault();
        handleIniciarSalvarPreVenda();
        return;
      }

      // 5. F3: Imprimir Pré-Venda
      if (e.key === 'F3') {
        e.preventDefault();
        handleImprimirPreVenda();
        return;
      }

      // 6. F4: Abrir fila e histórico de pré-vendas
      if (e.key === 'F4') {
        e.preventDefault();
        setModoExclusaoSacola(false);
        setModalPreVendasAberto(true);
        return;
      }

      // 7. F8: Selecionar e excluir produto da sacola
      if (e.key === 'F8') {
        e.preventDefault();
        handleAtivarModoExclusao();
        return;
      }

      // 8. F10: Identificar Cliente
      if (e.key === 'F10') {
        e.preventDefault();
        setModoExclusaoSacola(false);
        setModalClienteAberto(true);
        return;
      }

      // 9. F11: Ativar / Desativar Tela Cheia (FASE 5)
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullScreen();
        return;
      }

      // 10. Ações de Teclado sem nenhum modal aberto
      if (!isAnyModalOpen()) {
        // Se estiver no Modo de Exclusão Interativo (F8)
        if (modoExclusaoSacola) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (sacola.length > 0) {
              setIndiceItemExclusao(prev => (prev < sacola.length - 1 ? prev + 1 : 0));
            }
            return;
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (sacola.length > 0) {
              setIndiceItemExclusao(prev => (prev > 0 ? prev - 1 : sacola.length - 1));
            }
            return;
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (sacola[indiceItemExclusao]) {
              handleAbrirConfirmarExclusao(indiceItemExclusao);
            }
            return;
          }
        }

        // Navegação Padrão na Pesquisa e Fixação de Medicamentos
        if (medicamentoFixado === null) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (medicamentosFiltrados.length > 0) {
              setIndiceSelecionado(prev =>
                prev < medicamentosFiltrados.length - 1 ? prev + 1 : prev,
              );
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (medicamentosFiltrados.length > 0) {
              setIndiceSelecionado(prev => (prev > 0 ? prev - 1 : 0));
            }
          } else if (e.key === 'Enter') {
            // 1º ENTER: Fixar o medicamento selecionado na tabela
            const selecionado = medicamentosFiltrados[indiceSelecionado];
            if (selecionado) {
              e.preventDefault();
              handleFixarMedicamento(selecionado);
            }
          }
        } else {
          // Quando já há um produto fixado
          if (e.key === 'Enter') {
            // 2º ENTER: Confirma a inclusão do produto fixado na sacola
            e.preventDefault();
            handleAdicionarProdutoSacola(medicamentoFixado, multiplier);
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            // Setas esquerda/direita alternam entre as sugestões intercambiáveis (R/S/G)
            if (sugestoesIntercambiaveis.length > 0) {
              e.preventDefault();
              const delta = e.key === 'ArrowRight' ? 1 : -1;
              const novoIndice =
                indiceFocadoSugestao === -1
                  ? 0
                  : (indiceFocadoSugestao + delta + sugestoesIntercambiaveis.length) %
                    sugestoesIntercambiaveis.length;
              setIndiceFocadoSugestao(novoIndice);
              const novaSug = sugestoesIntercambiaveis[novoIndice];
              if (novaSug) {
                setMedicamentoFixado(novaSug);
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    abaAtiva,
    medicamentoFixado,
    medicamentosFiltrados,
    indiceSelecionado,
    indiceFocadoSugestao,
    sugestoesIntercambiaveis,
    multiplier,
    sacola,
    termoBusca,
    modoExclusaoSacola,
    indiceItemExclusao,
    itemExclusaoConfirmando,
    comandaConcluida,
    ultimaPreVendaCriada,
    listaPreVendas,
    isAnyModalOpen,
  ]);

  return (
    <div className="h-screen max-h-screen bg-slate-100/70 flex flex-col font-sans select-none text-slate-800 overflow-hidden">
      {/* 1. Barra Superior Oficial com Logo FarmaPro, Unidade 01, Data/Hora, Ativo, Operador, Tela Cheia, Ajuda e Menu Hambúrguer */}
      <PainelVendaHeader
        operadorNome={usuario?.nome || 'Mariana'}
        filialNome={filialAtiva?.nome || 'Unidade 01'}
        contadorPreVendas={listaPreVendas.filter(pv => pv.status === 'PENDING_CASHIER').length}
        abaAtiva={abaAtiva}
        aoSelecionarOpcaoMenu={(opcao) => {
          if (opcao === 'sair') {
            if (aoSair) aoSair();
          } else if (opcao === 'pre-venda') {
            setModalPreVendasAberto(true);
          } else {
            setAbaAtiva(opcao);
          }
        }}
        aoAbrirAtalhos={() => setModalOpcoesAberto(true)}
        aoTrocarUsuario={aoTrocarUsuario}
        aoSair={aoSair}
      />

      {/* 2. Área Central de Conteúdo por Módulo (Sem barra horizontal secundária) */}
      {abaAtiva === 'pre-venda' ? (
        <main className="flex-1 p-2 sm:p-2.5 max-w-full w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-2.5 min-h-0 overflow-hidden">
          {/* Lado Esquerdo: Pesquisa, Ficha Técnica Completa ou Tabela de Resultados (7 colunas) */}
          <section className="lg:col-span-7 flex flex-col min-w-0 h-full overflow-hidden space-y-2">
          {/* Caixa de Pesquisa Full-Width (Preserva exatamente o texto digitado) */}
          <ProductSearch
            termoBusca={termoBusca}
            aoMudarBusca={val => setTermoBusca(val)}
            aoLimparBusca={() => {
              setTermoBusca('');
              inputBuscaRef.current?.focus();
            }}
            multiplicadorPendente={multiplier}
            inputRef={inputBuscaRef}
            totalResultados={medicamentosFiltrados.length}
          />

          {/* Transição entre Ficha Completa, Logo FarmaPro (Sem Busca) e Tabela de Resultados (Com Busca) */}
          {medicamentoFixado ? (
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden animate-in fade-in duration-150">
              {/* Ficha Completa com Fotografia e Dados Técnicos (Exato à Imagem 2) */}
              <PinnedProductDetails
                medicamento={medicamentoFixado}
                aoDestravar={handleDestravarMedicamento}
                aoConfirmarSacola={qtd =>
                  handleAdicionarProdutoSacola(medicamentoFixado, qtd)
                }
                quantidadeInicial={multiplier > 0 ? multiplier : 1}
              />

              {/* Sugestões Intercambiáveis (R -> S -> G) com Altura Reduzida (Exato à Imagem 2) */}
              <InterchangeableSuggestions
                sugestoes={sugestoesIntercambiaveis}
                medicamentoFixado={medicamentoFixado}
                aoSelecionarSugestao={sug => handleFixarMedicamento(sug)}
                indiceFocadoSugestao={indiceFocadoSugestao}
              />
            </div>
          ) : !temBuscaAtiva ? (
            /* Espaço Central Oculto sem Pesquisa: Logo FarmaPro e Instruções de Atendimento */
            <BalcaoEmptySearchState
              aoSelecionarSugestao={termo => {
                setTermoBusca(termo);
                setTimeout(() => {
                  inputBuscaRef.current?.focus();
                }, 30);
              }}
            />
          ) : (
            /* Tabela de Resultados da Pesquisa com Rolagem Vertical Interna Própria */
            <ProductResultsTable
              medicamentos={medicamentosFiltrados}
              indiceSelecionado={indiceSelecionado}
              aoSelecionarIndice={idx => setIndiceSelecionado(idx)}
              aoFixarMedicamento={med => handleFixarMedicamento(med)}
              medicamentoFixadoId={null}
            />
          )}
        </section>

        {/* Lado Direito: Sacola de Atendimento / Pré-Venda com Espaço Lateral Otimizado (5 colunas) */}
        <aside className="lg:col-span-5 flex flex-col min-w-0 h-full overflow-hidden">
          <AttendanceCart
            itens={sacola}
            totais={totaisSacola}
            cliente={cliente}
            preVendaEmEdicao={preVendaEmEdicao}
            aoDescartarEdicaoPreVenda={handleDescartarEdicaoPreVenda}
            aoRemoverItem={handleAbrirConfirmarExclusao}
            aoAlterarQuantidade={handleAlterarQuantidadeSacola}
            aoLimparSacola={() => {
              if (confirm('Deseja limpar todos os itens da sacola?')) {
                setSacola([]);
                setDescontoGlobal(0);
                setModoExclusaoSacola(false);
              }
            }}
            aoSalvarPreVenda={handleIniciarSalvarPreVenda}
            aoImprimirPreVenda={handleImprimirPreVenda}
            temUltimaPreVenda={!!ultimaPreVendaCriada || !!comandaConcluida}
            aoAbrirCliente={() => setModalClienteAberto(true)}
            aoAbrirDesconto={() => setModalDescontoAberto(true)}
            modoExclusao={modoExclusaoSacola}
            indiceItemExclusao={indiceItemExclusao}
            aoAlternarModoExclusao={handleAtivarModoExclusao}
            aoSelecionarIndiceExclusao={idx => setIndiceItemExclusao(idx)}
            aoConfirmarExclusaoItem={handleAbrirConfirmarExclusao}
          />
        </aside>
      </main>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-100/70 p-3 sm:p-5">
          {/* Botão de Retorno Rápido ao Balcão / Pré-venda */}
          <div className="max-w-6xl mx-auto mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setAbaAtiva('pre-venda');
                setTimeout(() => inputBuscaRef.current?.focus(), 50);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-blue-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <kbd className="bg-slate-100 text-slate-600 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-300">
                ESC
              </kbd>
              <span>Voltar ao Balcão / Pré-Venda</span>
            </button>
          </div>

          {abaAtiva === 'cadastrar-cliente' && (
            <CadastrarClienteView
              aoClienteCadastrado={(c) => {
                setCliente({
                  name: `${c.nome} ${c.sobrenome}`,
                  cpf: c.cpfFormatado,
                  convenio: 'PARTICULAR',
                });
                setAbaAtiva('pre-venda');
                setTimeout(() => inputBuscaRef.current?.focus(), 50);
              }}
              aoVoltarPreVenda={() => {
                setAbaAtiva('pre-venda');
                setTimeout(() => inputBuscaRef.current?.focus(), 50);
              }}
            />
          )}

          {abaAtiva === 'historico-compra' && (
            <HistoricoComprasView
              cpfInicial={cliente.cpf || '123.456.789-10'}
              aoIrParaCadastro={() => setAbaAtiva('cadastrar-cliente')}
            />
          )}

          {abaAtiva === 'relatorios' && (
            <RelatorioVendasDiaView
              aoVoltarPreVenda={() => {
                setAbaAtiva('pre-venda');
                setTimeout(() => inputBuscaRef.current?.focus(), 50);
              }}
            />
          )}

          {(abaAtiva === 'troca' || abaAtiva === 'devolucao' || abaAtiva === 'consulta-troca') && (
            <TrocaDevolucaoView
              aoVoltarPreVenda={() => {
                setAbaAtiva('pre-venda');
                setTimeout(() => inputBuscaRef.current?.focus(), 50);
              }}
            />
          )}

          {abaAtiva === 'pesquisa-receita' && (
            <PesquisaReceitaView
              aoVoltarPreVenda={() => {
                setAbaAtiva('pre-venda');
                setTimeout(() => inputBuscaRef.current?.focus(), 50);
              }}
            />
          )}
        </div>
      )}

      {/* 3. Barra Inferior Oficial Fixa (Identidade Cromática Azul Idêntica à Barra Superior) */}
      <BalcaoFooterShortcuts isEdicaoAtiva={!!preVendaEmEdicao} />

      {/* 3. Modais Operacionais Independentes */}
      <IdentificarVendedorModal
        aberto={modalVendedorAberto}
        acao={acaoVendedorPendente}
        matriculaInicial={usuario?.matricula || ''}
        aoConfirmar={handleConfirmarVendedorPreVenda}
        aoFechar={() => {
          setModalVendedorAberto(false);
          setAcaoVendedorPendente('SALVAR');
          inputBuscaRef.current?.focus();
        }}
      />

      <ConfirmarExclusaoModal
        aberto={itemExclusaoConfirmando !== null}
        item={itemExclusaoConfirmando}
        aoConfirmar={handleConfirmarExclusaoItem}
        aoCancelar={handleCancelarExclusaoItem}
      />

      <CustomerModal
        aberto={modalClienteAberto}
        clienteAtual={cliente}
        aoSalvar={novoCliente => setCliente(novoCliente)}
        aoFechar={() => {
          setModalClienteAberto(false);
          inputBuscaRef.current?.focus();
        }}
      />

      <DiscountModal
        aberto={modalDescontoAberto}
        subtotalBruto={totaisSacola.subtotalBruto}
        descontoAtual={descontoGlobal}
        aoAplicarDesconto={val => setDescontoGlobal(val)}
        aoFechar={() => {
          setModalDescontoAberto(false);
          inputBuscaRef.current?.focus();
        }}
      />

      <PreSalesModal
        aberto={modalPreVendasAberto}
        preVendas={listaPreVendas}
        temSacolaAtiva={sacola.length > 0}
        aoCarregarPreVendaNaSacola={handleCarregarPreVendaNaSacola}
        aoCancelarPreVenda={handleCancelarPreVenda}
        aoExcluirPreVenda={(id) => {
          DemoPreSalesService.deletePreVenda(id);
          PreVendasApiService.excluirPreVenda(id).catch(() => {});
          setListaPreVendas(DemoPreSalesService.getPreVendas());
        }}
        aoImprimirPreVenda={pv => {
          setModalPreVendasAberto(false);
          setComandaConcluida(pv);
          setTimeout(() => {
            window.print();
          }, 150);
        }}
        aoFechar={() => {
          setModalPreVendasAberto(false);
          inputBuscaRef.current?.focus();
        }}
      />

      <BalcaoOptionsModal
        aberto={modalOpcoesAberto}
        aoReiniciarDadosDemo={() => {
          DemoPreSalesService.resetStore();
          setListaPreVendas(DemoPreSalesService.getPreVendas());
          setSacola([]);
          setDescontoGlobal(0);
          setMedicamentoFixado(null);
          setTermoBusca('');
          setModoExclusaoSacola(false);
        }}
        aoFechar={() => {
          setModalOpcoesAberto(false);
          inputBuscaRef.current?.focus();
        }}
      />

      <ComprovantePreVendaModal
        preVenda={comandaConcluida}
        aoFechar={() => {
          setComandaConcluida(null);
          inputBuscaRef.current?.focus();
        }}
      />
    </div>
  );
};
