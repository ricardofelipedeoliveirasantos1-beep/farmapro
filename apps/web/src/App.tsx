import React, { useState } from 'react';
import {
  Cabecalho,
  Botao,
  CampoTexto,
  Card,
  CardCabecalho,
  CardTitulo,
  CardDescricao,
  CardConteudo,
  Badge,
  TabelaContainer,
  TabelaCabecalho,
  TabelaCorpo,
  TabelaLinha,
  TabelaColuna,
  TabelaCelula,
  Modal,
} from '@farmapro/ui';
import {
  formatarCentavosParaReal,
  formatarDataBR,
  Produto,
} from '@farmapro/shared';
import {
  Search,
  CheckCircle2,
  Database,
  Smartphone,
  Eye,
  RefreshCw,
  Building2,
  KeyRound,
  LogOut,
  ShoppingCart,
  Coins,
  Receipt,
  Users,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext.js';
import { FuncionariosPage } from './pages/FuncionariosPage.js';
import { CargosPermissoesPage } from './pages/CargosPermissoesPage.js';
import { PdvBalcaoPage } from './pages/PdvBalcaoPage.js';
import { OperacaoCaixaPage } from './pages/OperacaoCaixaPage.js';
import { HistoricoVendasPage } from './pages/HistoricoVendasPage.js';
import { PainelEstoquePage } from './pages/PainelEstoquePage.js';
import { PainelComprasPage } from './pages/PainelComprasPage.js';
import { PainelRecebimentoPage } from './pages/PainelRecebimentoPage.js';
import { LoginModal } from './pages/LoginModal.js';
import { SelecionarTenantModal } from './pages/SelecionarTenantModal.js';
import { MenuLateral, ModuloNavegacao } from './components/MenuLateral.js';

// Produtos demonstrativos com tipagem estrita
const produtosDemonstrativos: (Partial<Produto> & {
  loteDemonstrativo: string;
  validadeDemonstrativa: string;
  statusLote: 'sucesso' | 'aviso' | 'perigo';
})[] = [
  {
    id: 'prod-001',
    codigoBarras: '7891234567890',
    nomeComercial: 'Amoxicilina + Clavulanato',
    apresentacao: '500mg/125mg — Cx 21 comprimidos revestidos',
    fabricante: 'Laboratório Farmacêutico Nacional',
    tipo: 'MEDICAMENTO_GENERICO',
    classificacaoReceita: 'RECEITA_BRANCA_CONTROLE_ESPECIAL',
    precoCustoCentavos: 2850,
    precoVendaCentavos: 4490,
    estoqueAtual: 34,
    estoqueMinimo: 10,
    status: 'ATIVO',
    loteDemonstrativo: 'AMX-2026-B1',
    validadeDemonstrativa: '2027-10-15',
    statusLote: 'sucesso',
  },
  {
    id: 'prod-002',
    codigoBarras: '7899876543210',
    nomeComercial: 'Dipirona Monoidratada',
    apresentacao: '500mg/mL — Frasco conta-gotas 20mL',
    fabricante: 'MedSimilares Brasil',
    tipo: 'MEDICAMENTO_GENERICO',
    classificacaoReceita: 'ISENTO',
    precoCustoCentavos: 420,
    precoVendaCentavos: 890,
    estoqueAtual: 88,
    estoqueMinimo: 20,
    status: 'ATIVO',
    loteDemonstrativo: 'DIP-2026-X9',
    validadeDemonstrativa: '2028-02-28',
    statusLote: 'sucesso',
  },
  {
    id: 'prod-003',
    codigoBarras: '7896541230987',
    nomeComercial: 'Losartana Potássica',
    apresentacao: '50mg — Cx 30 comprimidos',
    fabricante: 'CardioFarma SA',
    tipo: 'MEDICAMENTO_GENERICO',
    classificacaoReceita: 'RECEITA_BRANCA_SIMPLES',
    precoCustoCentavos: 680,
    precoVendaCentavos: 1350,
    estoqueAtual: 6,
    estoqueMinimo: 15,
    status: 'ATIVO',
    loteDemonstrativo: 'LOS-2025-Q4',
    validadeDemonstrativa: '2026-03-10',
    statusLote: 'aviso',
  },
  {
    id: 'prod-004',
    codigoBarras: '7893214569874',
    nomeComercial: 'Protetor Solar Facial FPS 60',
    apresentacao: 'Toque Seco Oil-Free — Bisnaga 50g',
    fabricante: 'DermoCosméticos Brasil',
    tipo: 'PERFUMARIA',
    classificacaoReceita: 'ISENTO',
    precoCustoCentavos: 3800,
    precoVendaCentavos: 6990,
    estoqueAtual: 19,
    estoqueMinimo: 5,
    status: 'ATIVO',
    loteDemonstrativo: 'PRT-2025-Z1',
    validadeDemonstrativa: '2028-11-30',
    statusLote: 'sucesso',
  },
];

export const App: React.FC = () => {
  const {
    usuario,
    empresaAtiva,
    filialAtiva,
    cargoAtual,
    origemPin,
    logout,
  } = useAuth();

  // Navegação Global FarmaPro (Padrão Light com Menu Hambúrguer)
  const [moduloAtivo, setModuloAtivo] = useState<ModuloNavegacao>('pdv-balcao');
  const [menuAbertoMobile, setMenuAbertoMobile] = useState<boolean>(false);
  const [recolhidoDesktop, setRecolhidoDesktop] = useState<boolean>(false);

  // Modais de Sessão e Demonstração
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [modalTenantAberto, setModalTenantAberto] = useState(false);
  const [modalDemoAberto, setModalDemoAberto] = useState(false);
  const [botaoCarregando, setBotaoCarregando] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');

  const simularAcaoCarregamento = () => {
    setBotaoCarregando(true);
    setTimeout(() => setBotaoCarregando(false), 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Cabeçalho do SaaS FarmaPro com Gatilho Hambúrguer */}
      <Cabecalho
        nomeFarmacia={empresaAtiva?.nomeFantasia || 'Farmácia FarmaPro — Matriz'}
        nomeFilial={filialAtiva?.nome || 'Unidade 01 (Centro)'}
        nomeOperador={usuario?.nome || 'Carlos Proprietário'}
        cargoOperador={cargoAtual?.nome || 'Proprietário Geral'}
        ambienteDemonstracao={true}
        onAlternarMenu={() => setMenuAbertoMobile(prev => !prev)}
        menuAberto={menuAbertoMobile}
      />

      {/* Barra de Ações Rápidas de Sessão e Tenant */}
      <div className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Contexto Multiempresa:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              {empresaAtiva?.nomeFantasia} ({filialAtiva?.codigoFilial})
            </span>
            {origemPin && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <Smartphone className="w-3 h-3" />
                PDV PIN Ativo (Origem Restrita)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Botao
              variante="outline"
              tamanho="sm"
              iconeEsquerda={<Building2 className="w-3.5 h-3.5" />}
              onClick={() => setModalTenantAberto(true)}
            >
              Trocar Farmácia / Filial
            </Botao>

            <Botao
              variante="outline"
              tamanho="sm"
              iconeEsquerda={<KeyRound className="w-3.5 h-3.5" />}
              onClick={() => setModalLoginAberto(true)}
            >
              Trocar Operador / Login
            </Botao>

            <Botao
              variante="secundario"
              tamanho="sm"
              iconeEsquerda={<LogOut className="w-3.5 h-3.5" />}
              onClick={logout}
            >
              Sair
            </Botao>
          </div>
        </div>
      </div>

      {/* Corpo da Aplicação com Menu Lateral e Área Principal de Conteúdo */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* Menu Lateral de Navegação (Recolhível no Desktop / Gaveta no Mobile) */}
        <MenuLateral
          moduloAtivo={moduloAtivo}
          aoSelecionarModulo={mod => setModuloAtivo(mod)}
          abertoMobile={menuAbertoMobile}
          aoFecharMobile={() => setMenuAbertoMobile(false)}
          recolhidoDesktop={recolhidoDesktop}
          aoAlternarRecolhidoDesktop={() => setRecolhidoDesktop(prev => !prev)}
        />

        {/* Conteúdo Principal Dinâmico por Módulo */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* ========================================================================= */}
          {/* MÓDULO: PDV BALCÃO (ETAPA 06) */}
          {/* ========================================================================= */}
          {moduloAtivo === 'pdv-balcao' && <PdvBalcaoPage />}

          {/* ========================================================================= */}
          {/* MÓDULO: OPERAÇÃO DE CAIXA (ETAPA 06) */}
          {/* ========================================================================= */}
          {moduloAtivo === 'operacao-caixa' && <OperacaoCaixaPage />}

          {/* ========================================================================= */}
          {/* MÓDULO: HISTÓRICO DE VENDAS & CANCELAMENTOS (ETAPA 06) */}
          {/* ========================================================================= */}
          {moduloAtivo === 'historico-vendas' && <HistoricoVendasPage />}

          {/* ========================================================================= */}
          {/* MÓDULO: GESTÃO DE ESTOQUE, LOTES, FEFO & INVENTÁRIO (ETAPA 07) */}
          {/* ========================================================================= */}
          {moduloAtivo === 'estoque-lotes' && <PainelEstoquePage />}

          {/* ========================================================================= */}
          {/* MÓDULO: FORNECEDORES, SOLICITAÇÕES E PEDIDOS DE COMPRA (ETAPA 08) */}
          {/* ========================================================================= */}
          {moduloAtivo === 'compras-pedidos' && <PainelComprasPage />}

          {/* ========================================================================= */}
          {/* MÓDULO: RECEBIMENTO DE MERCADORIAS & XML NF-E (ETAPA 09) */}
          {/* ========================================================================= */}
          {moduloAtivo === 'recebimento-nfe' && <PainelRecebimentoPage />}

          {/* ========================================================================= */}
          {/* MÓDULO: COLABORADORES & PIN (ETAPA 05) */}
          {/* ========================================================================= */}
          {moduloAtivo === 'funcionarios' && <FuncionariosPage />}

          {/* ========================================================================= */}
          {/* MÓDULO: CARGOS & PERMISSÕES (ETAPA 05) */}
          {/* ========================================================================= */}
          {moduloAtivo === 'cargos-permissoes' && <CargosPermissoesPage />}

          {/* ========================================================================= */}
          {/* MÓDULO: CATÁLOGO DEMONSTRATIVO */}
          {/* ========================================================================= */}
          {moduloAtivo === 'catalogo-demo' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <CampoTexto
                  placeholder="Buscar produto por nome, código de barras ou fabricante..."
                  value={termoBusca}
                  onChange={e => setTermoBusca(e.target.value)}
                  iconeEsquerda={<Search className="w-4 h-4 text-slate-400" />}
                />
              </div>

              <TabelaContainer>
                <TabelaCabecalho>
                  <TabelaLinha>
                    <TabelaColuna>Medicamento / Produto</TabelaColuna>
                    <TabelaColuna>Lote & Validade</TabelaColuna>
                    <TabelaColuna>Estoque</TabelaColuna>
                    <TabelaColuna>Preço Venda</TabelaColuna>
                    <TabelaColuna>Situação</TabelaColuna>
                  </TabelaLinha>
                </TabelaCabecalho>
                <TabelaCorpo>
                  {produtosDemonstrativos.map(item => (
                    <TabelaLinha key={item.id}>
                      <TabelaCelula>
                        <div>
                          <span className="font-semibold text-slate-900 block">{item.nomeComercial}</span>
                          <span className="text-xs text-slate-500">{item.apresentacao}</span>
                        </div>
                      </TabelaCelula>
                      <TabelaCelula>
                        <span className="font-mono text-xs text-slate-800 block">{item.loteDemonstrativo}</span>
                        <span className="text-[11px] text-slate-500">
                          Vence: {formatarDataBR(item.validadeDemonstrativa)}
                        </span>
                      </TabelaCelula>
                      <TabelaCelula>
                        <span className="font-semibold text-slate-900">{item.estoqueAtual}</span>
                        <span className="text-xs text-slate-400"> un</span>
                      </TabelaCelula>
                      <TabelaCelula>
                        <span className="font-bold text-slate-900">
                          {formatarCentavosParaReal(item.precoVendaCentavos || 0)}
                        </span>
                      </TabelaCelula>
                      <TabelaCelula>
                        <Badge variante={item.statusLote} tamanho="sm" ponto>
                          {item.statusLote === 'sucesso' ? 'Normal' : 'Atenção Validade'}
                        </Badge>
                      </TabelaCelula>
                    </TabelaLinha>
                  ))}
                </TabelaCorpo>
              </TabelaContainer>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MÓDULO: VISÃO GERAL DA FUNDAÇÃO */}
          {/* ========================================================================= */}
          {moduloAtivo === 'visao-geral' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        FarmaPro — Plataforma SaaS de Gestão Farmacêutica
                      </h1>
                      <Badge variante="sucesso" tamanho="sm">Etapa 08 Concluída</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      PostgreSQL, RLS multiempresa, PDV Balcão, Gestão de Estoque, Lotes e FEFO, Fornecedores Centralizados, Solicitações por Filial e Pedidos de Compra Auditados.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Botao
                      variante="outline"
                      tamanho="sm"
                      onClick={() => setModalDemoAberto(true)}
                      iconeEsquerda={<Eye className="w-3.5 h-3.5" />}
                    >
                      Ver Diretrizes
                    </Botao>
                    <Botao
                      variante="primario"
                      tamanho="sm"
                      carregando={botaoCarregando}
                      onClick={simularAcaoCarregamento}
                      iconeEsquerda={<RefreshCw className="w-3.5 h-3.5" />}
                    >
                      Verificar Status
                    </Botao>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Frente de Caixa</span>
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3 text-blue-600" /> PDV Balcão Ativo
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Operação de Caixa</span>
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                      <Coins className="w-3 h-3 text-emerald-600" /> Fechamento Cego
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Cancelamentos</span>
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                      <Receipt className="w-3 h-3 text-purple-600" /> Vouchers Únicos
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Permissões</span>
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                      <Users className="w-3 h-3 text-amber-600" /> Granular / Sem Estoquista
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardConteudo className="space-y-2 p-5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <CardTitulo className="text-sm">Isolamento Multiempresa</CardTitulo>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Segregação completa por <code>empresa_id</code> e <code>filial_id</code>, apoiado por Row-Level Security (RLS) e locks transacionais no PostgreSQL.
                    </p>
                  </CardConteudo>
                </Card>

                <Card>
                  <CardConteudo className="space-y-2 p-5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <CardTitulo className="text-sm">Precisão Financeira</CardTitulo>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Valores monetários estritamente em centavos inteiros (BRL), prevenindo erros de arredondamento em cupons, gaveta de caixa e relatórios contábeis.
                    </p>
                  </CardConteudo>
                </Card>

                <Card>
                  <CardConteudo className="space-y-2 p-5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <CardTitulo className="text-sm">Conformidade Sanitária</CardTitulo>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Bloqueio compulsório de medicamentos vencidos ou interditados pela ANVISA no momento exato do registro no leitor de código de barras.
                    </p>
                  </CardConteudo>
                </Card>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MÓDULO: DESIGN SYSTEM */}
          {/* ========================================================================= */}
          {moduloAtivo === 'design-system' && (
            <div className="space-y-6">
              <Card>
                <CardCabecalho>
                  <div>
                    <CardTitulo>Componentes Atômicos (@farmapro/ui)</CardTitulo>
                    <CardDescricao>Padrão visual exclusivamente Light Mode com cards retangulares e cantos arredondados</CardDescricao>
                  </div>
                </CardCabecalho>
                <CardConteudo className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Botões</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <Botao variante="primario">Primário</Botao>
                      <Botao variante="secundario">Secundário</Botao>
                      <Botao variante="outline">Outline</Botao>
                      <Botao variante="perigo">Perigo</Botao>
                      <Botao variante="primario" carregando>Carregando</Botao>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Badges</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variante="sucesso" ponto>Ativo / Sucesso</Badge>
                      <Badge variante="aviso" ponto>Atenção</Badge>
                      <Badge variante="perigo" ponto>Bloqueado</Badge>
                      <Badge variante="info" ponto>Informativo</Badge>
                      <Badge variante="neutro">Neutro</Badge>
                    </div>
                  </div>
                </CardConteudo>
              </Card>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MÓDULO: CONTRATOS & TIPOS */}
          {/* ========================================================================= */}
          {moduloAtivo === 'contratos' && (
            <div className="space-y-6">
              <Card>
                <CardCabecalho>
                  <div>
                    <CardTitulo>Contratos Compartilhados (@farmapro/shared)</CardTitulo>
                    <CardDescricao>Entidades de domínio e tipos estritos do ecossistema FarmaPro</CardDescricao>
                  </div>
                </CardCabecalho>
                <CardConteudo>
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto">
                    <pre>{`// Tipagem de Sessão de Caixa e Venda
export interface CaixaSessao {
  id: string;
  empresaId: string;
  filialId: string;
  dispositivoId: string;
  operadorAberturaId: string;
  saldoInicialCentavos: number;
  saldoFechamentoDeclaradoCentavos?: number;
  saldoFechamentoApuradoCentavos?: number;
  diferencaFechamentoCentavos?: number;
  justificativaDiferenca?: string;
  status: 'ABERTO' | 'FECHADO' | 'EM_CONFERENCIA';
}

export interface Venda {
  id: string;
  numeroCupom: string;
  subtotalCentavos: number;
  descontoTotalCentavos: number;
  totalCentavos: number;
  trocoCentavos: number;
  status: 'CONCLUIDA' | 'CANCELADA';
}`}</pre>
                  </div>
                </CardConteudo>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Modal de Autenticação / Login */}
      <LoginModal
        aberto={modalLoginAberto}
        aoFechar={() => setModalLoginAberto(false)}
      />

      {/* Modal de Seleção de Empresa / Filial */}
      <SelecionarTenantModal
        aberto={modalTenantAberto}
        aoFechar={() => setModalTenantAberto(false)}
      />

      {/* Modal Informativo */}
      <Modal
        aberto={modalDemoAberto}
        aoFechar={() => setModalDemoAberto(false)}
        titulo="Diretrizes do SaaS FarmaPro"
        descricao="Padrões globais de segurança, auditoria e operação."
      >
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            • <strong>Padrão Visual:</strong> Exclusivamente Light Mode, menu hambúrguer no lado esquerdo com gaveta no celular e recolhível no desktop, cards retangulares com cantos arredondados.
          </p>
          <p>
            • <strong>Conformidade Sanitária:</strong> Bloqueio estrito de medicamentos vencidos ou em quarentena.
          </p>
          <p>
            • <strong>Integridade Financeira:</strong> Precisão em centavos inteiros, troco exclusivo para pagamentos em espécie e fechamento cego com justificativa obrigatória.
          </p>
        </div>
      </Modal>

      {/* Rodapé do Sistema */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FarmaPro © 2026 — Plataforma SaaS de Gestão Farmacêutica</span>
          <span className="text-[11px] text-slate-400">
            Etapa 09: Recebimento de Mercadorias e Importação de XML de NF-e
          </span>
        </div>
      </footer>
    </div>
  );
};
