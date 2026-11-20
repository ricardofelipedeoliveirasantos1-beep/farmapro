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
  Alerta,
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
  LayoutDashboard,
  Palette,
  FileCode,
  Pill,
  ShoppingCart,
  Boxes,
  Shield,
  Search,
  CheckCircle2,
  Database,
  Smartphone,
  Eye,
  RefreshCw,
  Users,
  ShieldCheck,
  Building2,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext.js';
import { FuncionariosPage } from './pages/FuncionariosPage.js';
import { CargosPermissoesPage } from './pages/CargosPermissoesPage.js';
import { LoginModal } from './pages/LoginModal.js';
import { SelecionarTenantModal } from './pages/SelecionarTenantModal.js';

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

type AbaAtiva =
  | 'visao-geral'
  | 'funcionarios'
  | 'cargos-permissoes'
  | 'design-system'
  | 'contratos'
  | 'catalogo-demo';

export const App: React.FC = () => {
  const {
    usuario,
    empresaAtiva,
    filialAtiva,
    cargoAtual,
    origemPin,
    logout,
  } = useAuth();

  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('funcionarios');
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [modalTenantAberto, setModalTenantAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [botaoCarregando, setBotaoCarregando] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');

  const simularAcaoCarregamento = () => {
    setBotaoCarregando(true);
    setTimeout(() => setBotaoCarregando(false), 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Cabeçalho do SaaS FarmaPro */}
      <Cabecalho
        nomeFarmacia={empresaAtiva?.nomeFantasia || 'Farmácia FarmaPro — Matriz'}
        nomeFilial={filialAtiva?.nome || 'Unidade 01 (Centro)'}
        nomeOperador={usuario?.nome || 'Carlos Proprietário'}
        cargoOperador={cargoAtual?.nome || 'Proprietário Geral'}
        ambienteDemonstracao={true}
      />

      {/* Barra de Ações Rápidas de Sessão e Tenant */}
      <div className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Contexto Multiempresa Ativo:</span>
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

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* Barra Lateral de Navegação */}
        <aside className="w-full lg:w-64 shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
            <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Módulos — Etapa 05 (Acessos)
            </p>
            <nav className="space-y-1">
              <button
                onClick={() => setAbaAtiva('funcionarios')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                  abaAtiva === 'funcionarios'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Colaboradores & PIN</span>
                </span>
                <Badge variante="sucesso" tamanho="sm">Ativo</Badge>
              </button>

              <button
                onClick={() => setAbaAtiva('cargos-permissoes')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                  abaAtiva === 'cargos-permissoes'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Cargos & Permissões</span>
                </span>
                <Badge variante="sucesso" tamanho="sm">Ativo</Badge>
              </button>
            </nav>

            <p className="px-3 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Fundação & Demonstração
            </p>
            <nav className="space-y-1">
              <button
                onClick={() => setAbaAtiva('visao-geral')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                  abaAtiva === 'visao-geral'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-blue-600" />
                <span>Visão Geral da Fundação</span>
              </button>

              <button
                onClick={() => setAbaAtiva('design-system')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                  abaAtiva === 'design-system'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Palette className="w-4 h-4 text-blue-600" />
                <span>Design System (Light)</span>
              </button>

              <button
                onClick={() => setAbaAtiva('contratos')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                  abaAtiva === 'contratos'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <FileCode className="w-4 h-4 text-blue-600" />
                <span>Contratos & Tipos</span>
              </button>

              <button
                onClick={() => setAbaAtiva('catalogo-demo')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                  abaAtiva === 'catalogo-demo'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Pill className="w-4 h-4 text-blue-600" />
                <span>Catálogo Demonstrativo</span>
              </button>
            </nav>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Próximas Etapas
              </p>
              <div className="space-y-1 text-slate-400">
                <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="w-3.5 h-3.5" /> PDV Balcão
                  </span>
                  <Badge variante="neutro" tamanho="sm">Etapa 06</Badge>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                  <span className="flex items-center gap-2">
                    <Boxes className="w-3.5 h-3.5" /> Estoque & Lotes
                  </span>
                  <Badge variante="neutro" tamanho="sm">Etapa 07</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Card de Informação Técnica de Segurança */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Shield className="w-4 h-4 text-blue-700" />
              <span>Segurança da Etapa 05</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-800">
              Autenticação real com senhas protegidas por <strong>Argon2id</strong>, tokens <strong>JWT assinados</strong> e isolamento multiempresa estrito sem cabeçalhos temporários.
            </p>
          </div>
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 space-y-6">
          {/* Banner de Apresentação da Etapa 05 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    FarmaPro — Autenticação, Empresas, Filiais e Permissões
                  </h1>
                  <Badge variante="sucesso" tamanho="sm">Etapa 05 Pronta</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Ambiente multiempresa ativo: gestão de colaboradores, atribuição de filiais, matriz de permissões atômicas (sem cargo Estoquista), login Argon2id e PIN de PDV.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Botao
                  variante="outline"
                  tamanho="sm"
                  onClick={() => setModalAberto(true)}
                  iconeEsquerda={<Eye className="w-3.5 h-3.5" />}
                >
                  Modal Demonstrativo
                </Botao>
                <Botao
                  variante="primario"
                  tamanho="sm"
                  carregando={botaoCarregando}
                  onClick={simularAcaoCarregamento}
                  iconeEsquerda={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Simular Verificação
                </Botao>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] text-slate-500 block">Criptografia de Senhas</span>
                <span className="text-xs font-semibold text-slate-800">Argon2id (19 MiB)</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Sessões & Tokens</span>
                <span className="text-xs font-semibold text-slate-800">JWT + Refresh Token</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Terminal PDV</span>
                <span className="text-xs font-semibold text-slate-800">PIN 6 Dígitos (Bloqueio Sensível)</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Estoque</span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Permissões Atômicas
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ABA: COLABORADORES & ACESSOS (ETAPA 05) */}
          {/* ========================================================================= */}
          {abaAtiva === 'funcionarios' && <FuncionariosPage />}

          {/* ========================================================================= */}
          {/* ABA: CARGOS & MATRIZ DE PERMISSÕES (ETAPA 05) */}
          {/* ========================================================================= */}
          {abaAtiva === 'cargos-permissoes' && <CargosPermissoesPage />}

          {/* ========================================================================= */}
          {/* ABA: VISÃO GERAL */}
          {/* ========================================================================= */}
          {abaAtiva === 'visao-geral' && (
            <div className="space-y-6">
              <Alerta
                tipo="info"
                titulo="Ambiente de Fundação e Demonstração Técnica"
              >
                Esta tela demonstra os blocos construtivos e a padronização do FarmaPro. Todas as operações utilizam dados fictícios de demonstração.
              </Alerta>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardConteudo className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <CardTitulo>Isolamento Multiempresa</CardTitulo>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Projetado para segregação completa por <code>empresa_id</code> e <code>filial_id</code>, apoiado por Row-Level Security (RLS) no PostgreSQL.
                    </p>
                  </CardConteudo>
                </Card>

                <Card>
                  <CardConteudo className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <CardTitulo>Precisão Financeira Segura</CardTitulo>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Valores monetários operados estritamente em centavos inteiros (BRL), prevenindo erros de arredondamento em cupons fiscais e relatórios.
                    </p>
                  </CardConteudo>
                </Card>

                <Card>
                  <CardConteudo className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <CardTitulo>Pronto para Windows & Offline</CardTitulo>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Estrutura de contratos preparada para integração com Tauri (Windows) e SQLite local para contingência em caso de queda de internet.
                    </p>
                  </CardConteudo>
                </Card>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA: DESIGN SYSTEM */}
          {/* ========================================================================= */}
          {abaAtiva === 'design-system' && (
            <div className="space-y-6">
              <Card>
                <CardCabecalho>
                  <div>
                    <CardTitulo>Componentes Atômicos (@farmapro/ui)</CardTitulo>
                    <CardDescricao>Visualização e teste dos componentes em conformidade com o Design System</CardDescricao>
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
          {/* ABA: CONTRATOS & TIPOS */}
          {/* ========================================================================= */}
          {abaAtiva === 'contratos' && (
            <div className="space-y-6">
              <Card>
                <CardCabecalho>
                  <div>
                    <CardTitulo>Contratos Compartilhados (@farmapro/shared)</CardTitulo>
                    <CardDescricao>Entidades de domínio e tipos estritos do ecossistema FarmaPro</CardDescricao>
                  </div>
                </CardCabecalho>
                <CardConteudo>
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto">
                    <pre>{`// Exemplo de ContextoTenant derivado do JWT
export interface ContextoTenant {
  empresaId: string;
  filialId: string;
  usuarioId: string;
}

// Payload do Access Token JWT Seguro
export interface PayloadAccessToken {
  sub: string;
  nome: string;
  email: string;
  empresaId?: string;
  filialId?: string;
  papelEmpresa?: 'PROPRIETARIO' | 'ADMINISTRADOR' | 'COLABORADOR';
  cargoNome?: string;
  nivelAcesso?: 'ADMIN' | 'GERENTE' | 'FARMACEUTICO' | 'OPERADOR_CAIXA' | 'ATENDENTE';
  permissoes?: string[];
  origemPin?: boolean;
}`}</pre>
                  </div>
                </CardConteudo>
              </Card>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA: CATÁLOGO DEMONSTRATIVO */}
          {/* ========================================================================= */}
          {abaAtiva === 'catalogo-demo' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
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
        </main>
      </div>

      {/* Modal de Autenticação / Login */}
      <LoginModal
        aberto={modalLoginAberto}
        aoFechar={() => setModalLoginAberto(false)}
      />

      {/* Modal de Seleção de Empresa / Filial (Tenant Context) */}
      <SelecionarTenantModal
        aberto={modalTenantAberto}
        aoFechar={() => setModalTenantAberto(false)}
      />

      {/* Modal Interativo Demonstrativo */}
      <Modal
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        titulo="Modal Demonstrativo do Design System"
        descricao="Componente de diálogo acessível, com foco protegido e fechamento por tecla ESC."
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Este modal exemplifica a aplicação do padrão visual <strong>Light Mode</strong> com desfoque de fundo, bordas sutis e tipografia padronizada em conformidade com as diretrizes do FarmaPro.
          </p>
        </div>
      </Modal>

      {/* Rodapé do Sistema */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FarmaPro © 2026 — Plataforma SaaS de Gestão Farmacêutica</span>
          <span className="text-[11px] text-slate-400">
            Etapa 05: Autenticação Real, Empresas, Filiais e Controle de Permissões
          </span>
        </div>
      </footer>
    </div>
  );
};
