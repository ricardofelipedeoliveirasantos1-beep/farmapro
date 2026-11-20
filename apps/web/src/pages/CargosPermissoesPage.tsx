import React, { useState } from 'react';
import {
  Card,
  CardCabecalho,
  CardTitulo,
  CardDescricao,
  CardConteudo,
  Botao,
  Badge,
  CampoTexto,
  Modal,
  Alerta,
} from '@farmapro/ui';
import { useAuth } from '../contexts/AuthContext.js';
import {
  Shield,
  ShieldCheck,
  Plus,
  Check,
  Layers,
  Boxes,
  ShoppingCart,
  Users,
  DollarSign,
  Ticket,
} from 'lucide-react';

interface CargoItem {
  id: string;
  nome: string;
  descricao: string;
  nivelAcesso: 'ADMIN' | 'GERENTE' | 'FARMACEUTICO' | 'OPERADOR_CAIXA' | 'ATENDENTE';
  permissoes: string[];
}

interface PermissaoCatalogoItem {
  id: string;
  modulo: string;
  nome: string;
  descricao: string;
}

const CATALOGO_PERMISSOES: PermissaoCatalogoItem[] = [
  // PDV / Caixa
  { id: 'pdv:acesso', modulo: 'PDV', nome: 'Acesso ao PDV', descricao: 'Permite abrir e operar terminal de vendas' },
  { id: 'pdv:vender', modulo: 'PDV', nome: 'Registrar Vendas', descricao: 'Permite lançar itens e finalizar cupons' },
  { id: 'pdv:aplicar_desconto', modulo: 'PDV', nome: 'Aplicar Desconto', descricao: 'Permite aplicar descontos manuais' },
  { id: 'pdv:cancelar_item', modulo: 'PDV', nome: 'Cancelar Item', descricao: 'Permite cancelar itens individuais antes de fechar' },
  { id: 'pdv:cancelar_venda', modulo: 'PDV', nome: 'Cancelar Venda', descricao: 'Permite cancelar venda integralmente' },
  { id: 'pdv:sangria', modulo: 'PDV', nome: 'Sangria de Caixa', descricao: 'Permite retirada de valores da gaveta' },
  { id: 'pdv:suprimento', modulo: 'PDV', nome: 'Suprimento de Caixa', descricao: 'Permite reforço de troco inicial' },
  { id: 'pdv:fechar_caixa', modulo: 'PDV', nome: 'Fechar Caixa', descricao: 'Permite encerrar turno com conferência cega' },

  // Vouchers
  { id: 'vouchers:emitir', modulo: 'VOUCHERS', nome: 'Emitir Vouchers', descricao: 'Permite emitir voucher no cancelamento de venda' },
  { id: 'vouchers:consultar', modulo: 'VOUCHERS', nome: 'Consultar Vouchers', descricao: 'Permite consultar saldo e status de vouchers' },
  { id: 'vouchers:autorizar_cancelamento', modulo: 'VOUCHERS', nome: 'Autorizar Cancelamento', descricao: 'Alçada superior para autorizar cancelamento' },

  // Estoque
  { id: 'estoque:visualizar', modulo: 'ESTOQUE', nome: 'Visualizar Estoque', descricao: 'Consulta de saldos físicos e disponíveis' },
  { id: 'estoque:cadastrar_produto', modulo: 'ESTOQUE', nome: 'Cadastrar Produtos', descricao: 'Cadastrar novos itens no catálogo' },
  { id: 'estoque:editar_produto', modulo: 'ESTOQUE', nome: 'Editar Produtos', descricao: 'Alterar descrições e configurações' },
  { id: 'estoque:entrada_mercadoria', modulo: 'ESTOQUE', nome: 'Entrada de Mercadorias', descricao: 'Dar entrada por nota fiscal ou XML' },
  { id: 'estoque:movimentar', modulo: 'ESTOQUE', nome: 'Movimentar Estoque', descricao: 'Registrar perdas, saídas e avarias' },
  { id: 'estoque:ajuste_manual', modulo: 'ESTOQUE', nome: 'Ajuste Manual de Inventário', descricao: 'Correção autorizada de divergências' },
  { id: 'estoque:inventario', modulo: 'ESTOQUE', nome: 'Contagem de Inventário', descricao: 'Participar de contagens periódicas' },
  { id: 'estoque:transferir_filiais', modulo: 'ESTOQUE', nome: 'Transferência entre Filiais', descricao: 'Solicitar ou expedir transferências' },
  { id: 'estoque:gerenciar_lotes', modulo: 'ESTOQUE', nome: 'Gestão de Lotes & Validade', descricao: 'Controle FEFO e quarentena' },
  { id: 'estoque:medicamentos_controlados', modulo: 'ESTOQUE', nome: 'Controle SNGPC / Portaria 344', descricao: 'Movimentar controlados e antibióticos' },

  // Clientes
  { id: 'clientes:visualizar', modulo: 'CLIENTES', nome: 'Visualizar Clientes', descricao: 'Consultar cadastro e histórico de compras' },
  { id: 'clientes:gerenciar', modulo: 'CLIENTES', nome: 'Gerenciar Clientes', descricao: 'Cadastrar e atualizar dados de clientes' },

  // Compras
  { id: 'compras:visualizar', modulo: 'COMPRAS', nome: 'Visualizar Compras', descricao: 'Consultar cotações e pedidos de compras' },
  { id: 'compras:emitir_pedido', modulo: 'COMPRAS', nome: 'Emitir Pedido de Compra', descricao: 'Enviar pedidos aos distribuidores' },
  { id: 'compras:dar_entrada_nfe', modulo: 'COMPRAS', nome: 'Importação de NF-e', descricao: 'Manifestação e importação automática' },

  // Financeiro
  { id: 'financeiro:visualizar', modulo: 'FINANCEIRO', nome: 'Visualizar Financeiro', descricao: 'Consultar fluxo de caixa e relatórios' },
  { id: 'financeiro:contas_pagar', modulo: 'FINANCEIRO', nome: 'Contas a Pagar', descricao: 'Agendar e baixar contas de fornecedores' },
  { id: 'financeiro:contas_receber', modulo: 'FINANCEIRO', nome: 'Contas a Receber', descricao: 'Conciliação de cartões e convênios' },
  { id: 'financeiro:dre', modulo: 'FINANCEIRO', nome: 'DRE e Demonstrativos', descricao: 'Relatórios de fechamento contábil' },

  // Administração
  { id: 'usuarios:gerenciar', modulo: 'ADMIN', nome: 'Gerenciar Colaboradores', descricao: 'Cadastrar, editar e bloquear colaboradores' },
  { id: 'cargos:gerenciar', modulo: 'ADMIN', nome: 'Gerenciar Cargos e Permissões', descricao: 'Configurar perfis de acesso' },
  { id: 'filiais:gerenciar', modulo: 'ADMIN', nome: 'Gerenciar Filiais', descricao: 'Configurações de estabelecimentos' },
  { id: 'auditoria:visualizar_logs', modulo: 'ADMIN', nome: 'Visualizar Auditoria', descricao: 'Inspecionar logs de ações no sistema' },
  { id: 'configuracoes:gerenciar', modulo: 'ADMIN', nome: 'Configurações Globais', descricao: 'Planos e integrações fiscais' },
];

const CARGOS_INICIAIS: CargoItem[] = [
  {
    id: 'c-001',
    nome: 'Proprietário Geral',
    descricao: 'Acesso irrestrito a todos os módulos e configurações da empresa',
    nivelAcesso: 'ADMIN',
    permissoes: CATALOGO_PERMISSOES.map(p => p.id),
  },
  {
    id: 'c-002',
    nome: 'Farmacêutico Responsável Técnico (RT)',
    descricao: 'Gestão técnica de medicamentos controlados, SNGPC, dispensação e balcão',
    nivelAcesso: 'FARMACEUTICO',
    permissoes: [
      'pdv:acesso', 'pdv:vender', 'pdv:aplicar_desconto', 'pdv:cancelar_item',
      'vouchers:emitir', 'vouchers:consultar',
      'estoque:visualizar', 'estoque:medicamentos_controlados', 'estoque:gerenciar_lotes',
      'clientes:visualizar', 'clientes:gerenciar',
    ],
  },
  {
    id: 'c-003',
    nome: 'Gerente Operacional',
    descricao: 'Supervisão de vendas, sangrias e estoque operacional (Sem gestão de funcionários)',
    nivelAcesso: 'GERENTE',
    permissoes: [
      'pdv:acesso', 'pdv:vender', 'pdv:aplicar_desconto', 'pdv:cancelar_item', 'pdv:cancelar_venda',
      'pdv:sangria', 'pdv:suprimento', 'pdv:fechar_caixa',
      'vouchers:emitir', 'vouchers:consultar', 'vouchers:autorizar_cancelamento',
      'estoque:visualizar', 'estoque:ajuste_manual', 'estoque:inventario', 'estoque:entrada_mercadoria',
      'clientes:visualizar', 'compras:visualizar',
    ],
  },
  {
    id: 'c-004',
    nome: 'Atendente Balcão',
    descricao: 'Atendimento inicial, busca de medicamentos e registro de pré-vendas',
    nivelAcesso: 'ATENDENTE',
    permissoes: [
      'pdv:acesso', 'pdv:vender', 'vouchers:consultar',
      'estoque:visualizar', 'clientes:visualizar',
    ],
  },
  {
    id: 'c-005',
    nome: 'Operador de Caixa',
    descricao: 'Operação de terminal PDV, recebimento de pagamentos e fechamento de caixa',
    nivelAcesso: 'OPERADOR_CAIXA',
    permissoes: [
      'pdv:acesso', 'pdv:vender', 'pdv:sangria', 'pdv:fechar_caixa',
      'vouchers:consultar', 'clientes:visualizar',
    ],
  },
];

export const CargosPermissoesPage: React.FC = () => {
  const { origemPin } = useAuth();
  const [cargos, setCargos] = useState<CargoItem[]>(CARGOS_INICIAIS);
  const [cargoSelecionado, setCargoSelecionado] = useState<CargoItem>(CARGOS_INICIAIS[1]!);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [nomeNovoCargo, setNomeNovoCargo] = useState('');
  const [descNovoCargo, setDescNovoCargo] = useState('');
  const [nivelNovoCargo, setNivelNovoCargo] = useState<CargoItem['nivelAcesso']>('ATENDENTE');
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<string[]>(['estoque:visualizar']);
  const [erroCriacao, setErroCriacao] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const modulosUnicos = Array.from(new Set(CATALOGO_PERMISSOES.map(p => p.modulo)));

  const alternarPermissao = (id: string) => {
    setPermissoesSelecionadas(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const salvarNovoCargo = (e: React.FormEvent) => {
    e.preventDefault();
    setErroCriacao(null);

    const nomeLimpo = nomeNovoCargo.trim();
    if (!nomeLimpo) {
      setErroCriacao('Informe o nome do cargo.');
      return;
    }

    // REGRA DE ARQUITETURA OBRIGATÓRIA: Bloqueio do cargo exclusivo "Estoquista"
    if (/^estoquista$/i.test(nomeLimpo)) {
      setErroCriacao(
        'O cargo predefinido "Estoquista" foi descontinuado na arquitetura do FarmaPro. ' +
        'As permissões de estoque devem ser atribuídas a cargos funcionais (Gerente, Farmacêutico, Balconista, etc.).'
      );
      return;
    }

    const novo: CargoItem = {
      id: `cargo-${Date.now()}`,
      nome: nomeLimpo,
      descricao: descNovoCargo || 'Cargo funcional personalizado da farmácia',
      nivelAcesso: nivelNovoCargo,
      permissoes: permissoesSelecionadas,
    };

    setCargos(prev => [...prev, novo]);
    setCargoSelecionado(novo);
    setModalNovoAberto(false);
    setNomeNovoCargo('');
    setDescNovoCargo('');
    setPermissoesSelecionadas(['estoque:visualizar']);
    setSucessoMsg(`Cargo "${novo.nome}" cadastrado com sucesso.`);
    setTimeout(() => setSucessoMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Diretriz de Arquitetura */}
      <Alerta
        tipo="info"
        titulo="Diretriz de Arquitetura: Permissões de Estoque Descentralizadas"
      >
        O FarmaPro não adota o cargo predefinido 'Estoquista'. Todas as atividades de estoque (consulta, entrada, ajustes, controle de lotes, SNGPC) são permissões atômicas configuráveis pelo proprietário e atribuíveis a qualquer colaborador.
      </Alerta>

      {sucessoMsg && (
        <Alerta
          tipo="sucesso"
          titulo="Sucesso"
        >
          {sucessoMsg}
        </Alerta>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Lista de Cargos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Cargos Cadastrados
            </h3>
            <Botao
              variante="primario"
              tamanho="sm"
              iconeEsquerda={<Plus className="w-3.5 h-3.5" />}
              disabled={origemPin}
              onClick={() => setModalNovoAberto(true)}
            >
              Novo Cargo
            </Botao>
          </div>

          <div className="space-y-2">
            {cargos.map(c => {
              const eAtivo = cargoSelecionado.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCargoSelecionado(c)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    eAtivo
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-slate-900">{c.nome}</span>
                    <Badge variante={c.nivelAcesso === 'ADMIN' ? 'perigo' : c.nivelAcesso === 'GERENTE' ? 'aviso' : 'info'}>
                      {c.nivelAcesso}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{c.descricao}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.permissoes.length} permissões atômicas ativas</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna 2 e 3: Matriz de Permissões do Cargo Selecionado */}
        <div className="lg:col-span-2">
          <Card>
            <CardCabecalho>
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitulo>Matriz de Permissões: {cargoSelecionado.nome}</CardTitulo>
                    <Badge variante="neutro">{cargoSelecionado.nivelAcesso}</Badge>
                  </div>
                  <CardDescricao>{cargoSelecionado.descricao}</CardDescricao>
                </div>
              </div>
            </CardCabecalho>

            <CardConteudo>
              <div className="space-y-6">
                {modulosUnicos.map(modulo => {
                  const permsDoModulo = CATALOGO_PERMISSOES.filter(p => p.modulo === modulo);
                  const iconModulo =
                    modulo === 'PDV' ? <ShoppingCart className="w-4 h-4 text-blue-600" /> :
                    modulo === 'VOUCHERS' ? <Ticket className="w-4 h-4 text-purple-600" /> :
                    modulo === 'ESTOQUE' ? <Boxes className="w-4 h-4 text-amber-600" /> :
                    modulo === 'CLIENTES' ? <Users className="w-4 h-4 text-emerald-600" /> :
                    modulo === 'FINANCEIRO' ? <DollarSign className="w-4 h-4 text-teal-600" /> :
                    <ShieldCheck className="w-4 h-4 text-slate-600" />;

                  return (
                    <div key={modulo} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2 font-semibold text-xs text-slate-700 uppercase tracking-wider">
                        {iconModulo}
                        <span>Módulo: {modulo}</span>
                      </div>
                      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-white">
                        {permsDoModulo.map(perm => {
                          const concedida = cargoSelecionado.permissoes.includes(perm.id);
                          return (
                            <div
                              key={perm.id}
                              className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition-colors ${
                                concedida
                                  ? 'border-emerald-200 bg-emerald-50/40 text-slate-900'
                                  : 'border-slate-100 bg-slate-50/50 text-slate-400'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                                  concedida
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-slate-300 bg-white text-transparent'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                              <div className="min-w-0">
                                <span className={`text-xs font-semibold block ${concedida ? 'text-slate-900' : 'text-slate-500'}`}>
                                  {perm.nome}
                                </span>
                                <span className="text-[11px] text-slate-500 block leading-tight">
                                  {perm.descricao}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardConteudo>
          </Card>
        </div>
      </div>

      {/* Modal de Criação de Cargo */}
      <Modal
        aberto={modalNovoAberto}
        aoFechar={() => setModalNovoAberto(false)}
        titulo="Criar Novo Cargo Funcional"
        descricao="Defina o perfil de acesso e escolha as permissões autorizadas"
      >
        <form onSubmit={salvarNovoCargo} className="space-y-4">
          {erroCriacao && (
            <Alerta
              tipo="erro"
              titulo="Atenção às Regras de Cargo"
            >
              {erroCriacao}
            </Alerta>
          )}

          <div className="grid grid-cols-2 gap-3">
            <CampoTexto
              rotulo="Nome do Cargo *"
              value={nomeNovoCargo}
              onChange={e => setNomeNovoCargo(e.target.value)}
              placeholder="Ex: Auxiliar de Dispensação"
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 tracking-wide mb-1.5">
                Nível de Acesso *
              </label>
              <select
                value={nivelNovoCargo}
                onChange={e => setNivelNovoCargo(e.target.value as CargoItem['nivelAcesso'])}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="ATENDENTE">Atendente</option>
                <option value="OPERADOR_CAIXA">Operador de Caixa</option>
                <option value="FARMACEUTICO">Farmacêutico</option>
                <option value="GERENTE">Gerente</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>

          <CampoTexto
            rotulo="Descrição do Cargo"
            value={descNovoCargo}
            onChange={e => setDescNovoCargo(e.target.value)}
            placeholder="Finalidade e escopo de atuação do cargo na farmácia"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 tracking-wide mb-2">
              Selecione as Permissões Autorizadas
            </label>
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
              {CATALOGO_PERMISSOES.map(p => {
                const selecionada = permissoesSelecionadas.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selecionada}
                      onChange={() => alternarPermissao(p.id)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <div>
                      <strong className="text-slate-800">[{p.modulo}] {p.nome}</strong>
                      <span className="text-slate-500 block">{p.descricao}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Botao type="button" variante="secundario" onClick={() => setModalNovoAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="primario">
              Salvar Cargo
            </Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
};
