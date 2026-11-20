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
  formatarCpf,
  formatarCnpj,
  Produto,
} from '@farmapro/shared';
import {
  LayoutDashboard,
  Palette,
  FileCode,
  Pill,
  ShoppingCart,
  Boxes,
  Settings,
  Shield,
  Search,
  CheckCircle2,
  Plus,
  ArrowRight,
  Database,
  Smartphone,
  Eye,
  RefreshCw,
} from 'lucide-react';

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
    validadeDemonstrativa: '2026-03-10', // Validade próxima
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

type AbaAtiva = 'visao-geral' | 'design-system' | 'contratos' | 'catalogo-demo';

export const App: React.FC = () => {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('visao-geral');
  const [modalAberto, setModalAberto] = useState(false);
  const [botaoCarregando, setBotaoCarregando] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');

  const simularAcaoCarregamento = () => {
    setBotaoCarregando(true);
    setTimeout(() => setBotaoCarregando(false), 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Cabeçalho do SaaS */}
      <Cabecalho
        nomeFarmacia="Farmácia FarmaPro — Matriz"
        nomeFilial="Unidade 01 (Centro)"
        nomeOperador="Dr. Carlos Silva"
        cargoOperador="Farmacêutico Responsável (CRF 45.892/SP)"
        ambienteDemonstracao={true}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* Barra Lateral de Navegação */}
        <aside className="w-full lg:w-64 shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
            <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Navegação — Etapa 02
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
                Módulos Futuros (Etapas 03-08)
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
                  <Badge variante="neutro" tamanho="sm">Etapa 05</Badge>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                  <span className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5" /> Configurações
                  </span>
                  <Badge variante="neutro" tamanho="sm">Pendente</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Card de Informação Técnica */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Shield className="w-4 h-4 text-blue-700" />
              <span>Diretriz de Segurança</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-800">
              Fundação com isolamento multiempresa via <strong>Row-Level Security (RLS)</strong> no PostgreSQL e moedas calculadas estritamente em centavos inteiros.
            </p>
          </div>
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 space-y-6">
          {/* Banner de Apresentação da Etapa */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    FarmaPro — Fundação Estrutural & Design System
                  </h1>
                  <Badge variante="info" tamanho="sm">Etapa 02 Concluída</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Ambiente inicial estabelecido: monorepo com npm workspaces, contratos de tipos estritos, Design System em Light Mode e arquitetura preparada para SaaS comercial.
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
                <span className="text-[11px] text-slate-500 block">Identidade Visual</span>
                <span className="text-xs font-semibold text-slate-800">Light Mode Exclusivo</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Idioma</span>
                <span className="text-xs font-semibold text-slate-800">Português do Brasil (pt-BR)</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">TypeScript</span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Modo Strict Ativo
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Arquitetura</span>
                <span className="text-xs font-semibold text-slate-800">Multiempresa & Offline</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ABA 1: VISÃO GERAL */}
          {/* ========================================================================= */}
          {abaAtiva === 'visao-geral' && (
            <div className="space-y-6">
              <Alerta
                tipo="info"
                titulo="Ambiente de Fundação e Demonstração Técnica"
              >
                Esta tela demonstra os blocos construtivos e a padronização do FarmaPro. Nenhuma funcionalidade operacional de venda, estoque ou nota fiscal foi implementada nesta etapa para garantir a solidez da base.
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

              {/* Status dos Pacotes do Monorepo */}
              <Card>
                <CardCabecalho>
                  <div>
                    <CardTitulo>Estrutura dos Módulos do Monorepo</CardTitulo>
                    <CardDescricao>Status dos pacotes gerenciados via npm workspaces</CardDescricao>
                  </div>
                </CardCabecalho>
                <CardConteudo>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">apps/web</span>
                        <p className="text-[11px] text-slate-500">Frontend SaaS em React 18 + Vite + Tailwind CSS</p>
                      </div>
                      <Badge variante="sucesso" ponto>Inicializado e Validado</Badge>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">apps/api</span>
                        <p className="text-[11px] text-slate-500">Backend Node.js + Fastify + TypeScript (Esqueleto arquitetural)</p>
                      </div>
                      <Badge variante="sucesso" ponto>Estruturado</Badge>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">packages/shared</span>
                        <p className="text-[11px] text-slate-500">Entidades de domínio, contratos TypeScript, utilitários monetários BRL e máscaras</p>
                      </div>
                      <Badge variante="sucesso" ponto>10 Entidades Mapeadas</Badge>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">packages/ui</span>
                        <p className="text-[11px] text-slate-500">Design System padronizado exclusivamente em Light Mode com acessibilidade</p>
                      </div>
                      <Badge variante="sucesso" ponto>Componentes Atômicos Prontos</Badge>
                    </div>
                  </div>
                </CardConteudo>
              </Card>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: DESIGN SYSTEM (LIGHT MODE) */}
          {/* ========================================================================= */}
          {abaAtiva === 'design-system' && (
            <div className="space-y-6">
              {/* Botões */}
              <Card>
                <CardCabecalho>
                  <div>
                    <CardTitulo>Botões e Estados</CardTitulo>
                    <CardDescricao>Variantes de botões com suporte a carregamento e ícones</CardDescricao>
                  </div>
                </CardCabecalho>
                <CardConteudo className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Botao variante="primario">Botão Primário</Botao>
                    <Botao variante="secundario">Secundário</Botao>
                    <Botao variante="outline">Outline</Botao>
                    <Botao variante="perigo">Perigo / Exclusão</Botao>
                    <Botao variante="fantasma">Fantasma</Botao>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                    <Botao variante="primario" tamanho="sm" iconeEsquerda={<Plus className="w-3.5 h-3.5" />}>
                      Novo Produto (sm)
                    </Botao>
                    <Botao variante="primario" tamanho="md" iconeDireita={<ArrowRight className="w-4 h-4" />}>
                      Continuar Venda (md)
                    </Botao>
                    <Botao variante="outline" tamanho="lg">
                      Tamanho Grande (lg)
                    </Botao>
                    <Botao variante="primario" carregando>
                      Carregando
                    </Botao>
                    <Botao variante="primario" disabled>
                      Desabilitado
                    </Botao>
                  </div>
                </CardConteudo>
              </Card>

              {/* Campos de Formulário */}
              <Card>
                <CardCabecalho>
                  <div>
                    <CardTitulo>Campos de Formulário</CardTitulo>
                    <CardDescricao>Inputs com rótulos, dicas, validação de erro e ícones</CardDescricao>
                  </div>
                </CardCabecalho>
                <CardConteudo className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CampoTexto
                    rotulo="Código de Barras ou Nome do Medicamento"
                    placeholder="Digite o código EAN-13 ou nome comercial..."
                    iconeEsquerda={<Search className="w-4 h-4" />}
                    dica="Ex: 7891234567890 ou Amoxicilina"
                    value={termoBusca}
                    onChange={e => setTermoBusca(e.target.value)}
                  />

                  <CampoTexto
                    rotulo="Preço de Venda (BRL)"
                    placeholder="R$ 0,00"
                    dica="Armazenado internamente como centavos inteiros"
                    defaultValue="R$ 44,90"
                  />

                  <CampoTexto
                    rotulo="CPF do Cliente"
                    placeholder="000.000.000-00"
                    defaultValue="123.456.789-00"
                    dica="Formatado com máscara e validação de dígitos"
                  />

                  <CampoTexto
                    rotulo="Campo com Erro de Validação"
                    defaultValue="Valor Incorreto"
                    erro="O campo informado não cumpre os requisitos da ANVISA."
                  />
                </CardConteudo>
              </Card>

              {/* Badges e Alertas */}
              <Card>
                <CardCabecalho>
                  <div>
                    <CardTitulo>Badges de Status & Alertas de Sistema</CardTitulo>
                    <CardDescricao>Indicadores visuais para estados operacionais e avisos ao farmacêutico</CardDescricao>
                  </div>
                </CardCabecalho>
                <CardConteudo className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variante="sucesso" ponto>Em Estoque (Ativo)</Badge>
                    <Badge variante="aviso" ponto>Validade Próxima</Badge>
                    <Badge variante="perigo" ponto>Estoque Crítico</Badge>
                    <Badge variante="info" ponto>Receita Retida</Badge>
                    <Badge variante="neutro">Rascunho</Badge>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-slate-100">
                    <Alerta tipo="sucesso" titulo="Operação de Caixa Registrada">
                      Abertura de caixa da Manhã efetuada com sucesso pelo operador.
                    </Alerta>

                    <Alerta tipo="aviso" titulo="Alerta de Validade Farmacêutica">
                      O lote LOS-2025-Q4 vence em menos de 120 dias. Priorizar dispensação conforme FEFO.
                    </Alerta>

                    <Alerta tipo="erro" titulo="Ação Bloqueada por Permissão">
                      Cancelamento de cupom fiscal requer autorização do Gerente ou Farmacêutico Responsável.
                    </Alerta>
                  </div>
                </CardConteudo>
              </Card>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: CONTRATOS & ENTIDADES */}
          {/* ========================================================================= */}
          {abaAtiva === 'contratos' && (
            <div className="space-y-6">
              <Alerta tipo="info" titulo="Contratos de Domínio (@farmapro/shared)">
                Tipos estritos em TypeScript configurados para garantir integridade estrutural entre o frontend e a API.
              </Alerta>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardCabecalho>
                    <CardTitulo className="text-sm">Empresa & Filial (Multi-tenant)</CardTitulo>
                  </CardCabecalho>
                  <CardConteudo className="text-xs space-y-2 text-slate-600 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p>• Empresa: id, razaoSocial, nomeFantasia, cnpj, plano...</p>
                    <p>• Filial: id, empresaId, codigoFilial, endereco, eMatriz...</p>
                    <p>• RLS: Isolamento automático no banco PostgreSQL</p>
                  </CardConteudo>
                </Card>

                <Card>
                  <CardCabecalho>
                    <CardTitulo className="text-sm">Produto & Lote (Regulatório)</CardTitulo>
                  </CardCabecalho>
                  <CardConteudo className="text-xs space-y-2 text-slate-600 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p>• Produto: id, codigoBarras, tipo, classificacaoReceita...</p>
                    <p>• Lote: id, produtoId, filialId, numeroLote, validade...</p>
                    <p>• Preços: precoCustoCentavos, precoVendaCentavos (number)</p>
                  </CardConteudo>
                </Card>

                <Card>
                  <CardCabecalho>
                    <CardTitulo className="text-sm">Usuário, Cargo & Permissões (RBAC)</CardTitulo>
                  </CardCabecalho>
                  <CardConteudo className="text-xs space-y-2 text-slate-600 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p>• Níveis: ADMIN, GERENTE, FARMACEUTICO, OPERADOR_CAIXA</p>
                    <p>• Permissões: 20+ permissões atômicas granulares</p>
                    <p>• Responsável Técnico: crfNumero, crfUf com validação</p>
                  </CardConteudo>
                </Card>

                <Card>
                  <CardCabecalho>
                    <CardTitulo className="text-sm">Venda & Pagamento (PDV)</CardTitulo>
                  </CardCabecalho>
                  <CardConteudo className="text-xs space-y-2 text-slate-600 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p>• Venda: id, filialId, operadorId, itens[], pagamentos[]</p>
                    <p>• Formas: DINHEIRO, CARTAO_CREDITO, PIX, CREDIARIO...</p>
                    <p>• Offline-First: sincronizadoComNuvem, idOfflineLocal</p>
                  </CardConteudo>
                </Card>
              </div>

              {/* Exemplos de Formatação Segura */}
              <Card>
                <CardCabecalho>
                  <CardTitulo>Validação de Utilitários de Domínio</CardTitulo>
                </CardCabecalho>
                <CardConteudo className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Entrada: 4490 centavos</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {formatarCentavosParaReal(4490)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Data ISO: 2026-11-20</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {formatarDataBR('2026-11-20')}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">CPF Limpo: 12345678900</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {formatarCpf('12345678900')}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">CNPJ Limpo: 12345678000195</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {formatarCnpj('12345678000195')}
                    </span>
                  </div>
                </CardConteudo>
              </Card>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: CATÁLOGO DEMONSTRATIVO */}
          {/* ========================================================================= */}
          {abaAtiva === 'catalogo-demo' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Produtos e Medicamentos (Dados Simulados)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Demonstração da tabela responsiva, máscaras de moeda e tipagem de lotes.
                  </p>
                </div>
                <Badge variante="aviso" ponto>Catálogo Simulado para Testes</Badge>
              </div>

              <TabelaContainer>
                <TabelaCabecalho>
                  <tr>
                    <TabelaColuna>Medicamento / Apresentação</TabelaColuna>
                    <TabelaColuna>Código / EAN</TabelaColuna>
                    <TabelaColuna>Lote / Validade</TabelaColuna>
                    <TabelaColuna>Estoque</TabelaColuna>
                    <TabelaColuna>Preço Venda</TabelaColuna>
                    <TabelaColuna>Status</TabelaColuna>
                  </tr>
                </TabelaCabecalho>
                <TabelaCorpo>
                  {produtosDemonstrativos.map(item => (
                    <TabelaLinha key={item.id}>
                      <TabelaCelula>
                        <div className="font-medium text-slate-900">{item.nomeComercial}</div>
                        <div className="text-xs text-slate-500">{item.apresentacao}</div>
                        <span className="text-[10px] text-blue-600 font-medium">
                          {item.fabricante}
                        </span>
                      </TabelaCelula>
                      <TabelaCelula>
                        <span className="font-mono text-xs text-slate-600">{item.codigoBarras}</span>
                      </TabelaCelula>
                      <TabelaCelula>
                        <div className="text-xs font-medium text-slate-800">{item.loteDemonstrativo}</div>
                        <div className="text-[11px] text-slate-500">
                          Vence: {formatarDataBR(item.validadeDemonstrativa)}
                        </div>
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

              <div className="text-right text-[11px] text-slate-400">
                * Todos os nomes, lotes e valores exibidos acima são fictícios e gerados estritamente para homologação técnica.
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Interativo Demonstrativo */}
      <Modal
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        titulo="Modal Demonstrativo do Design System"
        descricao="Componente de diálogo acessível, com foco protegido e fechamento por tecla ESC."
        rodape={
          <>
            <Botao variante="outline" tamanho="sm" onClick={() => setModalAberto(false)}>
              Fechar
            </Botao>
            <Botao variante="primario" tamanho="sm" onClick={() => setModalAberto(false)}>
              Confirmar
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <p>
            Este modal exemplifica a aplicação do padrão visual <strong>Light Mode</strong> com desfoque de fundo, bordas sutis e tipografia padronizada em conformidade com as diretrizes do FarmaPro.
          </p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
            <strong>Dica de Usabilidade:</strong> Em telas operacionais de balcão (PDV), atalhos rápidos de teclado como <code>ESC</code> para cancelar e <code>ENTER</code> para confirmar aceleram o atendimento.
          </div>
        </div>
      </Modal>

      {/* Rodapé do Sistema */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FarmaPro © 2026 — Plataforma SaaS de Gestão Farmacêutica</span>
          <span className="text-[11px] text-slate-400">
            Etapa 02: Fundação Técnica, Padronização e Design System
          </span>
        </div>
      </footer>
    </div>
  );
};

