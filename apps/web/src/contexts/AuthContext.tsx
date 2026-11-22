import React, { createContext, useContext, useState } from 'react';
import { ContextoTenant } from '@farmapro/shared';

export interface UsuarioAuth {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  eResponsavelTecnico: boolean;
  status: string;
  matricula?: string;
  cargoNome?: string;
}

export interface FilialDisponivel {
  id: string;
  codigoFilial: string;
  nome: string;
  eMatriz: boolean;
  cargoNome: string;
}

export interface EmpresaDisponivel {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  papelEmpresa: 'PROPRIETARIO' | 'ADMINISTRADOR' | 'COLABORADOR';
  filiais: FilialDisponivel[];
}

export interface CargoAtual {
  id: string;
  nome: string;
  nivelAcesso: 'ADMIN' | 'GERENTE' | 'FARMACEUTICO' | 'OPERADOR_CAIXA' | 'ATENDENTE';
  papelEmpresa: 'PROPRIETARIO' | 'ADMINISTRADOR' | 'COLABORADOR';
}

interface SessaoOperacionalStorage {
  token: string;
  usuario: UsuarioAuth;
  filial: FilialDisponivel;
  empresa?: EmpresaDisponivel;
  permissoes: string[];
  cargoAtual?: CargoAtual;
  expiraEm: number;
}

const CHAVE_SESSAO_STORAGE = 'farmapro_sessao_operacional';

interface AuthContextType {
  usuario: UsuarioAuth | null;
  token: string | null;
  tenant: ContextoTenant | null;
  empresaAtiva: EmpresaDisponivel | null;
  filialAtiva: FilialDisponivel | null;
  empresasDisponiveis: EmpresaDisponivel[];
  cargoAtual: CargoAtual | null;
  permissoesEfetivas: string[];
  origemPin: boolean;
  autenticado: boolean;
  carregando: boolean;
  erroAuth: string | null;
  login: (email: string, senha: string) => Promise<boolean>;
  loginPin: (pin: string, usuarioId: string, identificadorHardware: string) => Promise<boolean>;
  setSessaoOperacional: (dados: {
    estacao: 'CAIXA' | 'BALCAO';
    accessToken?: string;
    usuario: { id: string; nome: string; email?: string; cpf?: string; matricula?: string; cargoNome?: string };
    filial: { id: string; nome: string };
    empresa?: { id: string; nomeFantasia?: string };
    permissoes?: string[];
  }) => void;
  selecionarContexto: (empresaId: string, filialId: string) => Promise<boolean>;
  trocarUsuario: () => void;
  logout: () => void;
  temPermissao: (permissaoId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dados Fictícios de Empresas
const EMPRESAS_DEMO: EmpresaDisponivel[] = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    razaoSocial: 'FarmaPro Farmácia Matriz Ltda',
    nomeFantasia: 'Farmácia FarmaPro — Matriz Centro',
    cnpj: '11.222.333/0001-44',
    papelEmpresa: 'PROPRIETARIO',
    filiais: [
      {
        id: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
        codigoFilial: 'FIL-01',
        nome: 'Unidade 01 — Centro (Matriz)',
        eMatriz: true,
        cargoNome: 'Atendente de Balcão',
      },
      {
        id: '11111111-aaaa-4111-a111-bbbbbbbbbbbb',
        codigoFilial: 'FIL-02',
        nome: 'Unidade 02 — Bairro Sul',
        eMatriz: false,
        cargoNome: 'Atendente de Balcão',
      },
    ],
  },
];

const EMPRESA_PADRAO = EMPRESAS_DEMO[0]!;
const FILIAL_PADRAO = EMPRESA_PADRAO.filiais[0]!;

// Leitura inicial segura do LocalStorage (Sessão persistente)
const obterSessaoSalva = (): SessaoOperacionalStorage | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHAVE_SESSAO_STORAGE);
    if (!raw) return null;
    const sessao: SessaoOperacionalStorage = JSON.parse(raw);
    if (!sessao || !sessao.expiraEm || Date.now() > sessao.expiraEm) {
      localStorage.removeItem(CHAVE_SESSAO_STORAGE);
      return null;
    }
    return sessao;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sessaoInicial = obterSessaoSalva();

  const [usuario, setUsuario] = useState<UsuarioAuth | null>(() => sessaoInicial?.usuario || null);
  const [token, setToken] = useState<string | null>(() => sessaoInicial?.token || null);
  const [tenant, setTenant] = useState<ContextoTenant | null>(() => {
    if (sessaoInicial) {
      return {
        empresaId: sessaoInicial.empresa?.id || EMPRESA_PADRAO.id,
        filialId: sessaoInicial.filial.id,
        usuarioId: sessaoInicial.usuario.id,
      };
    }
    return null;
  });
  const [empresaAtiva, setEmpresaAtiva] = useState<EmpresaDisponivel | null>(() => sessaoInicial?.empresa || EMPRESA_PADRAO);
  const [filialAtiva, setFilialAtiva] = useState<FilialDisponivel | null>(() => sessaoInicial?.filial || FILIAL_PADRAO);
  const [empresasDisponiveis] = useState<EmpresaDisponivel[]>(EMPRESAS_DEMO);
  const [cargoAtual, setCargoAtual] = useState<CargoAtual | null>(() => sessaoInicial?.cargoAtual || null);
  const [permissoesEfetivas, setPermissoesEfetivas] = useState<string[]>(() => sessaoInicial?.permissoes || []);
  const [origemPin, setOrigemPin] = useState<boolean>(true);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erroAuth, setErroAuth] = useState<string | null>(null);

  // Define sessão operacional (Matrícula + Senha) com persistência segura
  const setSessaoOperacional = (dados: {
    estacao: 'CAIXA' | 'BALCAO';
    accessToken?: string;
    usuario: { id: string; nome: string; email?: string; cpf?: string; matricula?: string; cargoNome?: string };
    filial: { id: string; nome: string };
    empresa?: { id: string; nomeFantasia?: string };
    permissoes?: string[];
  }) => {
    const matSegura = dados.usuario.matricula || 'OP-101';
    const tokenGerado = dados.accessToken || `jwt_operacional_${Date.now()}`;
    const novoUsuario: UsuarioAuth = {
      id: dados.usuario.id,
      nome: dados.usuario.nome,
      email: dados.usuario.email || `${matSegura.toLowerCase()}@farmapro.demo`,
      cpf: dados.usuario.cpf || '000.000.000-00',
      eResponsavelTecnico: false,
      status: 'ATIVO',
      matricula: matSegura,
      cargoNome: dados.usuario.cargoNome,
    };

    const novaFilial: FilialDisponivel = {
      id: dados.filial.id,
      codigoFilial: 'FIL-01',
      nome: dados.filial.nome,
      eMatriz: true,
      cargoNome: dados.usuario.cargoNome || 'Atendente',
    };

    const perms = dados.permissoes && dados.permissoes.length > 0
      ? dados.permissoes
      : dados.estacao === 'CAIXA'
      ? ['pdv:acesso', 'pdv:vender', 'pdv:fechar_caixa']
      : ['balcao:consultar', 'balcao:acesso', 'pre_venda:criar', 'pdv:acesso'];

    const novoCargo: CargoAtual = {
      id: `cargo-${dados.usuario.id}`,
      nome: dados.usuario.cargoNome || 'Atendente de Balcão',
      nivelAcesso: 'ATENDENTE',
      papelEmpresa: 'COLABORADOR',
    };

    setUsuario(novoUsuario);
    setToken(tokenGerado);
    setFilialAtiva(novaFilial);
    setPermissoesEfetivas(perms);
    setCargoAtual(novoCargo);
    setTenant({
      empresaId: dados.empresa?.id || EMPRESA_PADRAO.id,
      filialId: dados.filial.id,
      usuarioId: dados.usuario.id,
    });

    // Salva no LocalStorage com validade de 8 horas (sem senhas nem dados confidenciais)
    if (typeof window !== 'undefined') {
      const payload: SessaoOperacionalStorage = {
        token: tokenGerado,
        usuario: novoUsuario,
        filial: novaFilial,
        empresa: empresaAtiva || EMPRESA_PADRAO,
        permissoes: perms,
        cargoAtual: novoCargo,
        expiraEm: Date.now() + 8 * 60 * 60 * 1000,
      };
      localStorage.setItem(CHAVE_SESSAO_STORAGE, JSON.stringify(payload));
    }
  };

  const login = async (email: string, _senha: string): Promise<boolean> => {
    setCarregando(true);
    setErroAuth(null);
    try {
      const emailLimpo = email.trim().toLowerCase();
      if (emailLimpo.includes('inativo')) {
        throw new Error('Usuário inativo. Entre em contato com seu gestor.');
      }
      if (emailLimpo.includes('bloqueado')) {
        throw new Error('Acesso bloqueado pelo administrador da farmácia.');
      }

      const u: UsuarioAuth = {
        id: '10000000-0000-4000-8000-000000000001',
        nome: 'Carlos Silva',
        email: emailLimpo,
        cpf: '123.456.789-01',
        eResponsavelTecnico: true,
        status: 'ATIVO',
        matricula: 'CX-001',
        cargoNome: 'Farmacêutico',
      };

      setSessaoOperacional({
        estacao: 'BALCAO',
        usuario: u,
        filial: FILIAL_PADRAO,
        empresa: EMPRESA_PADRAO,
      });

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação';
      setErroAuth(msg);
      return false;
    } finally {
      setCarregando(false);
    }
  };

  const loginPin = async (pin: string, _usuarioId: string, _identificadorHardware: string): Promise<boolean> => {
    setCarregando(true);
    setErroAuth(null);
    try {
      if (!/^\d{6}$/.test(pin)) {
        throw new Error('O PIN deve conter exatamente 6 dígitos numéricos.');
      }
      setSessaoOperacional({
        estacao: 'BALCAO',
        usuario: {
          id: '10000000-0000-4000-8000-000000000002',
          nome: 'Mariana Atendente',
          email: 'mariana.atendente@farmapro.demo',
          cpf: '234.567.890-12',
          matricula: 'BC-002',
          cargoNome: 'Atendente de Balcão',
        },
        filial: FILIAL_PADRAO,
        empresa: EMPRESA_PADRAO,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha no login com PIN';
      setErroAuth(msg);
      return false;
    } finally {
      setCarregando(false);
    }
  };

  const selecionarContexto = async (empresaId: string, filialId: string): Promise<boolean> => {
    setCarregando(true);
    try {
      const emp = empresasDisponiveis.find(e => e.id === empresaId);
      if (!emp) throw new Error('Empresa não vinculada ao usuário.');
      const fil = emp.filiais.find(f => f.id === filialId);
      if (!fil) throw new Error('Filial não autorizada para este usuário.');

      setEmpresaAtiva(emp);
      setFilialAtiva(fil);
      setTenant({
        empresaId,
        filialId,
        usuarioId: usuario ? usuario.id : 'anonimo',
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao selecionar filial';
      setErroAuth(msg);
      return false;
    } finally {
      setCarregando(false);
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CHAVE_SESSAO_STORAGE);
    }
    setUsuario(null);
    setToken(null);
    setTenant(null);
    setEmpresaAtiva(null);
    setFilialAtiva(null);
    setCargoAtual(null);
    setPermissoesEfetivas([]);
    setOrigemPin(false);
  };

  const trocarUsuario = () => {
    logout();
  };

  const temPermissao = (permissaoId: string): boolean => {
    if (cargoAtual?.papelEmpresa === 'PROPRIETARIO') return true;
    return permissoesEfetivas.includes(permissaoId);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        tenant,
        empresaAtiva,
        filialAtiva,
        empresasDisponiveis,
        cargoAtual,
        permissoesEfetivas,
        origemPin,
        autenticado: !!token && !!usuario,
        carregando,
        erroAuth,
        login,
        loginPin,
        setSessaoOperacional,
        selecionarContexto,
        trocarUsuario,
        logout,
        temPermissao,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
