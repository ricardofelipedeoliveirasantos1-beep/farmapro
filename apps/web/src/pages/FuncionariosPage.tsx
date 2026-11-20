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
  TabelaContainer,
  TabelaCabecalho,
  TabelaCorpo,
  TabelaLinha,
  TabelaColuna,
  TabelaCelula,
  Modal,
  Alerta,
} from '@farmapro/ui';
import { useAuth } from '../contexts/AuthContext.js';
import {
  Users,
  UserPlus,
  Search,
  Lock,
  Unlock,
  Building2,
  FileBadge,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

interface FuncionarioDemo {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  cargo: string;
  filialNome: string;
  crfNumero?: string;
  crfUf?: string;
  eResponsavelTecnico: boolean;
  temPinTerminal: boolean;
  status: 'ATIVO' | 'BLOQUEADO' | 'INATIVO';
}

const FUNCIONARIOS_INICIAIS: FuncionarioDemo[] = [
  {
    id: 'f-001',
    nome: 'Carlos Eduardo Oliveira',
    email: 'carlos@farmavida.demo',
    cpf: '111.111.111-11',
    cargo: 'Proprietário Geral',
    filialNome: 'Unidade 01 — Centro (Matriz)',
    crfNumero: '45.892',
    crfUf: 'SP',
    eResponsavelTecnico: true,
    temPinTerminal: true,
    status: 'ATIVO',
  },
  {
    id: 'f-002',
    nome: 'Mariana Silva Santos',
    email: 'mariana@farmavida.demo',
    cpf: '222.222.222-22',
    cargo: 'Atendente Balcão',
    filialNome: 'Unidade 01 — Centro (Matriz)',
    eResponsavelTecnico: false,
    temPinTerminal: true,
    status: 'ATIVO',
  },
  {
    id: 'f-003',
    nome: 'Dra. Beatriz Mendes',
    email: 'beatriz@farmavida.demo',
    cpf: '333.333.333-33',
    cargo: 'Farmacêutica Substituta',
    filialNome: 'Unidade 02 — Bairro Sul',
    crfNumero: '52.140',
    crfUf: 'SP',
    eResponsavelTecnico: false,
    temPinTerminal: false,
    status: 'ATIVO',
  },
  {
    id: 'f-004',
    nome: 'Roberto Antunes',
    email: 'roberto@farmavida.demo',
    cpf: '444.444.444-44',
    cargo: 'Operador de Caixa',
    filialNome: 'Unidade 01 — Centro (Matriz)',
    eResponsavelTecnico: false,
    temPinTerminal: true,
    status: 'BLOQUEADO',
  },
];

export const FuncionariosPage: React.FC = () => {
  const { origemPin } = useAuth();
  const [funcionarios, setFuncionarios] = useState<FuncionarioDemo[]>(FUNCIONARIOS_INICIAIS);
  const [busca, setBusca] = useState('');
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalPinAberto, setModalPinAberto] = useState(false);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<FuncionarioDemo | null>(null);
  const [pinNovo, setPinNovo] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Formulário de Cadastro
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoCpf, setNovoCpf] = useState('');
  const [novoCargo, setNovoCargo] = useState('Atendente Balcão');
  const [novoCrf, setNovoCrf] = useState('');
  const [eRt, setERt] = useState(false);

  const funcionariosFiltrados = funcionarios.filter(f =>
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    f.cpf.includes(busca) ||
    f.cargo.toLowerCase().includes(busca.toLowerCase())
  );

  const alternarStatus = (id: string) => {
    if (origemPin) return;
    setFuncionarios(prev =>
      prev.map(f => {
        if (f.id === id) {
          const novoStatus = f.status === 'ATIVO' ? 'BLOQUEADO' : 'ATIVO';
          return { ...f, status: novoStatus };
        }
        return f;
      })
    );
    setSucessoMsg('Status do colaborador atualizado com sucesso no ambiente multiempresa.');
    setTimeout(() => setSucessoMsg(null), 3000);
  };

  const salvarNovoFuncionario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome || !novoEmail || !novoCpf) return;

    const novo: FuncionarioDemo = {
      id: `f-${Date.now()}`,
      nome: novoNome,
      email: novoEmail,
      cpf: novoCpf,
      cargo: novoCargo,
      filialNome: 'Unidade 01 — Centro (Matriz)',
      crfNumero: novoCrf || undefined,
      crfUf: novoCrf ? 'SP' : undefined,
      eResponsavelTecnico: eRt,
      temPinTerminal: false,
      status: 'ATIVO',
    };

    setFuncionarios(prev => [novo, ...prev]);
    setModalNovoAberto(false);
    setNovoNome('');
    setNovoEmail('');
    setNovoCpf('');
    setNovoCrf('');
    setERt(false);
    setSucessoMsg('Colaborador cadastrado com sucesso e vinculado à filial.');
    setTimeout(() => setSucessoMsg(null), 3000);
  };

  const salvarPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcionarioSelecionado || pinNovo.length !== 6) return;

    setFuncionarios(prev =>
      prev.map(f => (f.id === funcionarioSelecionado.id ? { ...f, temPinTerminal: true } : f))
    );
    setModalPinAberto(false);
    setPinNovo('');
    setSucessoMsg(`PIN de 6 dígitos configurado e protegido por Argon2id para ${funcionarioSelecionado.nome}.`);
    setTimeout(() => setSucessoMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Origem PIN (Bloqueio de Operação Sensível) */}
      {origemPin && (
        <Alerta
          tipo="aviso"
          titulo="Modo Terminal PDV (Origem PIN Ativo)"
        >
          Você está autenticado através de PIN rápido em terminal de balcão. Operações administrativas e gestão de colaboradores são estritamente bloqueadas por razões de segurança. Efetue login com e-mail e senha para gerenciar acessos.
        </Alerta>
      )}

      {sucessoMsg && (
        <Alerta
          tipo="sucesso"
          titulo="Operação Concluída"
        >
          {sucessoMsg}
        </Alerta>
      )}

      <Card>
        <CardCabecalho>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <CardTitulo>Gestão de Colaboradores e Acessos</CardTitulo>
              </div>
              <CardDescricao>
                Controle de funcionários, atribuição de filiais, credenciais Argon2id e PIN de terminal PDV
              </CardDescricao>
            </div>
            <Botao
              variante="primario"
              iconeEsquerda={<UserPlus className="w-4 h-4" />}
              disabled={origemPin}
              onClick={() => setModalNovoAberto(true)}
            >
              Novo Colaborador
            </Botao>
          </div>
        </CardCabecalho>

        <CardConteudo>
          {/* Barra de Filtro e Busca */}
          <div className="mb-4 max-w-md">
            <CampoTexto
              placeholder="Buscar colaborador por nome, cargo ou CPF..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              iconeEsquerda={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Tabela de Colaboradores */}
          <TabelaContainer>
            <TabelaCabecalho>
              <TabelaLinha>
                <TabelaColuna>Colaborador</TabelaColuna>
                <TabelaColuna>Cargo & Filial</TabelaColuna>
                <TabelaColuna>Habilitação Técnica</TabelaColuna>
                <TabelaColuna>PIN de PDV</TabelaColuna>
                <TabelaColuna>Status</TabelaColuna>
                <TabelaColuna className="text-right">Ações de Segurança</TabelaColuna>
              </TabelaLinha>
            </TabelaCabecalho>
            <TabelaCorpo>
              {funcionariosFiltrados.map(f => (
                <TabelaLinha key={f.id}>
                  <TabelaCelula>
                    <div>
                      <span className="font-semibold text-slate-900 block">{f.nome}</span>
                      <span className="text-xs text-slate-500 font-mono">{f.cpf} • {f.email}</span>
                    </div>
                  </TabelaCelula>

                  <TabelaCelula>
                    <div>
                      <span className="text-sm font-medium text-slate-800 block">{f.cargo}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {f.filialNome}
                      </span>
                    </div>
                  </TabelaCelula>

                  <TabelaCelula>
                    {f.crfNumero ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          <FileBadge className="w-3 h-3 text-blue-600" />
                          CRF {f.crfNumero}/{f.crfUf}
                        </span>
                        {f.eResponsavelTecnico && (
                          <span className="block text-[11px] font-semibold text-emerald-700">
                            ★ Responsável Técnico (RT)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Não aplicável</span>
                    )}
                  </TabelaCelula>

                  <TabelaCelula>
                    {f.temPinTerminal ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Configurado
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Pendente</span>
                    )}
                  </TabelaCelula>

                  <TabelaCelula>
                    <Badge
                      variante={
                        f.status === 'ATIVO' ? 'sucesso' : f.status === 'BLOQUEADO' ? 'perigo' : 'neutro'
                      }
                    >
                      {f.status}
                    </Badge>
                  </TabelaCelula>

                  <TabelaCelula className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Botao
                        variante="secundario"
                        tamanho="sm"
                        disabled={origemPin}
                        iconeEsquerda={<Smartphone className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setFuncionarioSelecionado(f);
                          setModalPinAberto(true);
                        }}
                      >
                        PIN
                      </Botao>
                      <Botao
                        variante={f.status === 'ATIVO' ? 'perigo' : 'outline'}
                        tamanho="sm"
                        disabled={origemPin}
                        iconeEsquerda={f.status === 'ATIVO' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        onClick={() => alternarStatus(f.id)}
                      >
                        {f.status === 'ATIVO' ? 'Bloquear' : 'Desbloquear'}
                      </Botao>
                    </div>
                  </TabelaCelula>
                </TabelaLinha>
              ))}
            </TabelaCorpo>
          </TabelaContainer>
        </CardConteudo>
      </Card>

      {/* Modal de Cadastro de Colaborador */}
      <Modal
        aberto={modalNovoAberto}
        aoFechar={() => setModalNovoAberto(false)}
        titulo="Cadastrar Novo Colaborador Farmacêutico"
        descricao="Preencha os dados cadastrais e defina o cargo e filial de atuação"
      >
        <form onSubmit={salvarNovoFuncionario} className="space-y-4">
          <CampoTexto
            rotulo="Nome Completo *"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            placeholder="Ex: Amanda Souza Ribeiro"
          />

          <div className="grid grid-cols-2 gap-3">
            <CampoTexto
              rotulo="E-mail de Acesso *"
              type="email"
              value={novoEmail}
              onChange={e => setNovoEmail(e.target.value)}
              placeholder="amanda@farmacia.com.br"
            />
            <CampoTexto
              rotulo="CPF *"
              value={novoCpf}
              onChange={e => setNovoCpf(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 tracking-wide mb-1.5">
              Cargo Funcional *
            </label>
            <select
              value={novoCargo}
              onChange={e => setNovoCargo(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
            >
              <option value="Atendente Balcão">Atendente Balcão</option>
              <option value="Operador de Caixa">Operador de Caixa</option>
              <option value="Farmacêutico RT">Farmacêutico RT</option>
              <option value="Gerente Operacional">Gerente Operacional (Sem Admin Automático)</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Dados Profissionais (CRF)
            </h5>
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto
                rotulo="Número do CRF"
                value={novoCrf}
                onChange={e => setNovoCrf(e.target.value)}
                placeholder="Ex: 58.912"
              />
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eRt}
                    onChange={e => setERt(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  Responsável Técnico (RT)
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Botao type="button" variante="secundario" onClick={() => setModalNovoAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="primario">
              Salvar Colaborador
            </Botao>
          </div>
        </form>
      </Modal>

      {/* Modal de Configuração de PIN */}
      <Modal
        aberto={modalPinAberto}
        aoFechar={() => setModalPinAberto(false)}
        titulo="Configurar PIN do Terminal PDV"
        descricao={`Defina o PIN rápido de 6 dígitos para ${funcionarioSelecionado?.nome}`}
      >
        <form onSubmit={salvarPin} className="space-y-4">
          <CampoTexto
            rotulo="PIN de 6 Dígitos"
            type="password"
            value={pinNovo}
            onChange={e => setPinNovo(e.target.value)}
            placeholder="••••••"
            dica="O PIN é criptografado com Argon2id e restrito aos terminais de PDV."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Botao type="button" variante="secundario" onClick={() => setModalPinAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              type="submit"
              variante="primario"
              disabled={pinNovo.length !== 6}
            >
              Gravar PIN
            </Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
};
