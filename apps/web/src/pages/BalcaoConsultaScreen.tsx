import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { DemoCatalogService } from '../services/demoCatalogService.js';
import { DemoPreSalesService } from '../services/demoPreSalesService.js';
import { MedicamentoDemonstrativo } from '../services/demoCatalogData.js';
import {
  CartItemBalcao,
  CartTotals,
  CustomerInfo,
  PreVendaDemo,
  SearchMode,
  VendedorResponsavel,
} from '../types/balcao.js';

import { BalcaoHeader } from '../components/balcao/BalcaoHeader.js';
import { ProductSearch } from '../components/balcao/ProductSearch.js';
import { ProductResultsTable } from '../components/balcao/ProductResultsTable.js';
import { PinnedProductDetails } from '../components/balcao/PinnedProductDetails.js';
import { InterchangeableSuggestions } from '../components/balcao/InterchangeableSuggestions.js';
import { AttendanceCart } from '../components/balcao/AttendanceCart.js';
import { CustomerModal } from '../components/balcao/CustomerModal.js';
import { DiscountModal } from '../components/balcao/DiscountModal.js';
import { PreSalesModal } from '../components/balcao/PreSalesModal.js';
import { BalcaoOptionsModal } from '../components/balcao/BalcaoOptionsModal.js';
import { ComprovantePreVendaModal } from '../components/balcao/ComprovantePreVendaModal.js';
import { IdentificarVendedorModal } from '../components/balcao/IdentificarVendedorModal.js';
import { ConfirmarExclusaoModal } from '../components/balcao/ConfirmarExclusaoModal.js';

interface BalcaoConsultaScreenProps {
  aoVoltarPortal?: () => void;
  aoAbrirMenu?: () => void;
  aoTrocarUsuario?: () => void;
  aoSair?: () => void;
}

export const BalcaoConsultaScreen: React.FC<BalcaoConsultaScreenProps> = ({
  aoVoltarPortal,
  aoTrocarUsuario,
  aoSair,
}) => {
  const { usuario, filialAtiva } = useAuth();

  // Estados de Pesquisa
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [modoBusca, setModoBusca] = useState<SearchMode>('NAME');
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

  // Filtragem dos 56 medicamentos demonstrativos (filtro de estoque removido)
  const medicamentosFiltrados = useMemo(
    () => DemoCatalogService.filterMedications(queryLimpa, modoBusca, false),
    [queryLimpa, modoBusca],
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

  // Destravar medicamento
  const handleDestravarMedicamento = () => {
    setMedicamentoFixado(null);
    setIndiceFocadoSugestao(-1);
    inputBuscaRef.current?.focus();
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
          numeroSequencial: itemExistente.numeroSequencial, // Preserva a identificação original de inclusão (Seção 3)
        };
        // Reposiciona o medicamento existente no topo da sacola
        const outrosItens = prev.filter((_, i) => i !== idxExistente);
        return [novoItem, ...outrosItens];
      } else {
        // Novo produto distinto recebe o próximo número sequencial de inclusão (Seção 3)
        const maxSeq = prev.reduce((max, it) => Math.max(max, it.numeroSequencial || 0), 0);
        novoItem = {
          medication: med,
          quantity: quantidadeValida,
          unitPrice: med.preco,
          discount: 0,
          subtotal: med.preco * quantidadeValida,
          numeroSequencial: maxSeq + 1,
        };
        return [novoItem, ...prev];
      }
    });

    setMedicamentoFixado(null);
    setTermoBusca('');
    setModoExclusaoSacola(false);
    setTimeout(() => {
      inputBuscaRef.current?.focus();
    }, 50);
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
      setSacola(prev => prev.filter((_, i) => i !== indiceItemExclusao));
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

      const novaPreVenda = DemoPreSalesService.savePreVenda(
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

      setUltimaPreVendaCriada(novaPreVenda);
      setComandaConcluida(novaPreVenda);
      setListaPreVendas(DemoPreSalesService.getPreVendas());
      setSacola([]);
      setDescontoGlobal(0);
      setModoExclusaoSacola(false);

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

  // Cancelar pré-venda da fila
  const handleCancelarPreVenda = (id: string) => {
    DemoPreSalesService.cancelPreVenda(id);
    setListaPreVendas(DemoPreSalesService.getPreVendas());
  };

  // Alternar modo de pesquisa via clique no botão
  const handleAlternarModo = () => {
    const modos: SearchMode[] = ['NAME', 'PRINCIPIO', 'EAN', 'CODE'];
    const idx = modos.indexOf(modoBusca);
    const prox = modos[(idx + 1) % modos.length]!;
    setModoBusca(prox);
  };

  // Event Listener Global de Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

      // 9. F11: Opções de atendimento e atalhos
      if (e.key === 'F11') {
        e.preventDefault();
        setModoExclusaoSacola(false);
        setModalOpcoesAberto(true);
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
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans select-none text-slate-800">
      {/* 1. Cabeçalho Superior do Balcão */}
      <BalcaoHeader
        operadorNome={usuario ? `${usuario.nome} (${usuario.matricula || 'Balcão'})` : 'Operador Não Identificado'}
        filialNome={filialAtiva?.nome || 'Unidade 01 – Centro (Matriz)'}
        contadorPreVendas={listaPreVendas.filter(pv => pv.status === 'PENDING_CASHIER').length}
        aoAbrirPreVendas={() => setModalPreVendasAberto(true)}
        aoAbrirOpcoes={() => setModalOpcoesAberto(true)}
        aoVoltarPortal={aoVoltarPortal}
        aoTrocarUsuario={aoTrocarUsuario}
        aoSair={aoSair}
      />

      {/* 2. Área Principal de Trabalho (Grid 2 Colunas com Largura da Sacola Maximizada: 7 colunas Busca vs 5 colunas Sacola) */}
      <main className="flex-1 p-2.5 sm:p-3 max-w-full w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Lado Esquerdo: Pesquisa, Ficha Técnica do Fixado, Sugestões e Tabela de Resultados (7 colunas) */}
        <section className="lg:col-span-7 flex flex-col space-y-2.5 min-w-0">
          {/* Caixa de Pesquisa e Filtros */}
          <ProductSearch
            termoBusca={termoBusca}
            aoMudarBusca={val => setTermoBusca(val)}
            aoLimparBusca={() => {
              setTermoBusca('');
              inputBuscaRef.current?.focus();
            }}
            modoBusca={modoBusca}
            aoAlternarModo={handleAlternarModo}
            multiplicadorPendente={multiplier}
            inputRef={inputBuscaRef}
            totalResultados={medicamentosFiltrados.length}
          />

          {/* Ficha Técnica do Medicamento Fixado (Aparece ao teclar o 1º Enter) */}
          {medicamentoFixado && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <PinnedProductDetails
                medicamento={medicamentoFixado}
                aoDestravar={handleDestravarMedicamento}
                aoConfirmarSacola={qtd =>
                  handleAdicionarProdutoSacola(medicamentoFixado, qtd)
                }
                quantidadeInicial={multiplier > 0 ? multiplier : 1}
              />

              {/* Sugestões Intercambiáveis (R -> S -> G) */}
              <InterchangeableSuggestions
                sugestoes={sugestoesIntercambiaveis}
                medicamentoFixado={medicamentoFixado}
                aoSelecionarSugestao={sug => handleFixarMedicamento(sug)}
                indiceFocadoSugestao={indiceFocadoSugestao}
              />
            </div>
          )}

          {/* Tabela de Resultados da Pesquisa */}
          <ProductResultsTable
            medicamentos={medicamentosFiltrados}
            indiceSelecionado={indiceSelecionado}
            aoSelecionarIndice={idx => setIndiceSelecionado(idx)}
            aoFixarMedicamento={med => handleFixarMedicamento(med)}
            medicamentoFixadoId={medicamentoFixado?.id ?? null}
          />
        </section>

        {/* Lado Direito: Sacola de Atendimento / Pré-Venda com Espaço Lateral Otimizado (5 colunas) */}
        <aside className="lg:col-span-5 flex flex-col min-w-0 sticky top-2 h-[calc(100vh-76px)]">
          <AttendanceCart
            itens={sacola}
            totais={totaisSacola}
            cliente={cliente}
            aoRemoverItem={handleAbrirConfirmarExclusao}
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
        aoCancelarPreVenda={handleCancelarPreVenda}
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
