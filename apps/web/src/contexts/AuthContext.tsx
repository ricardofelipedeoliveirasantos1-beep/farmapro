import React, { createContext, useContext, useState } from 'react';
import { ContextoTenant } from '@farmapro/shared';

export interface UsuarioAuth {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  eResponsavelTecnico: boolean;
  status: string;
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
  selecionarContexto: (empresaId: string, filialId: string) => Promise<boolean>;
  logout: () => void;
  temPermissao: (permissaoId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dados Fictícios Demonstrativos para Inicialização
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
        cargoNome: 'Proprietário Geral',
      },
      {
        id: '11111111-aaaa-4111-a111-bbbbbbbbbbbb',
        codigoFilial: 'FIL-02',
        nome: 'Unidade 02 — Bairro Sul',
        eMatriz: false,
        cargoNome: 'Proprietário Geral',
      },
    ],
  },
  {
    id: '22222222-2222-4222-b222-222222222222',
    razaoSocial: 'Drogaria Norte Ltda',
    nomeFantasia: 'Drogaria Norte — Filial Campinas',
    cnpj: '22.333.444/0001-55',
    papelEmpresa: 'ADMINISTRADOR',
    filiais: [
      {
        id: '22222222-aaaa-4222-b222-aaaaaaaaaaaa',
        codigoFilial: 'FIL-01',
        nome: 'Unidade Única — Campinas',
        eMatriz: true,
        cargoNome: 'Farmacêutico RT',
      },
    ],
  },
];

const EMPRESA_PADRAO = EMPRESAS_DEMO[0]!;
const FILIAL_PADRAO = EMPRESA_PADRAO.filiais[0]!;

const USUARIO_DEMO_PADRAO: UsuarioAuth = {
  id: 'aaaaaaaa-1111-4000-8000-000000000001',
  nome: 'Carlos Proprietário',
  email: 'carlos@farmavida.demo',
  cpf: '111.111.111-11',
  eResponsavelTecnico: true,
  status: 'ATIVO',
};

const PERMISSOES_PROPRIETARIO_DEMO: string[] = [
  'pdv:acesso', 'pdv:vender', 'pdv:aplicar_desconto', 'pdv:cancelar_item', 'pdv:cancelar_venda',
  'pdv:sangria', 'pdv:suprimento', 'pdv:fechar_caixa', 'pdv:reabrir_caixa',
  'vouchers:emitir', 'vouchers:consultar', 'vouchers:autorizar_cancelamento',
  'estoque:visualizar', 'estoque:cadastrar_produto', 'estoque:editar_produto', 'estoque:entrada_mercadoria',
  'estoque:movimentar', 'estoque:ajuste_manual', 'estoque:inventario', 'estoque:transferir_filiais',
  'estoque:gerenciar_lotes', 'estoque:medicamentos_controlados',
  'compras:visualizar', 'compras:emitir_pedido', 'compras:dar_entrada_nfe',
  'clientes:visualizar', 'clientes:gerenciar',
  'financeiro:visualizar', 'financeiro:contas_pagar', 'financeiro:contas_receber', 'financeiro:dre',
  'usuarios:gerenciar', 'cargos:gerenciar', 'filiais:gerenciar', 'auditoria:visualizar_logs', 'configuracoes:gerenciar',
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(USUARIO_DEMO_PADRAO);
  const [token, setToken] = useState<string | null>('jwt_demo_farmapro_autenticado_etapa05');
  const [tenant, setTenant] = useState<ContextoTenant | null>({
    empresaId: EMPRESA_PADRAO.id,
    filialId: FILIAL_PADRAO.id,
    usuarioId: USUARIO_DEMO_PADRAO.id,
  });
  const [empresaAtiva, setEmpresaAtiva] = useState<EmpresaDisponivel | null>(EMPRESA_PADRAO);
  const [filialAtiva, setFilialAtiva] = useState<FilialDisponivel | null>(FILIAL_PADRAO);
  const [empresasDisponiveis, setEmpresasDisponiveis] = useState<EmpresaDisponivel[]>(EMPRESAS_DEMO);
  const [cargoAtual, setCargoAtual] = useState<CargoAtual | null>({
    id: 'cargo-proprietario',
    nome: 'Proprietário Geral',
    nivelAcesso: 'ADMIN',
    papelEmpresa: 'PROPRIETARIO',
  });
  const [permissoesEfetivas, setPermissoesEfetivas] = useState<string[]>(PERMISSOES_PROPRIETARIO_DEMO);
  const [origemPin, setOrigemPin] = useState<boolean>(false);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erroAuth, setErroAuth] = useState<string | null>(null);

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

      setUsuario(USUARIO_DEMO_PADRAO);
      setToken('jwt_token_sessao_ativa_' + Date.now());
      setEmpresasDisponiveis(EMPRESAS_DEMO);
      setEmpresaAtiva(EMPRESA_PADRAO);
      setFilialAtiva(FILIAL_PADRAO);
      setTenant({
        empresaId: EMPRESA_PADRAO.id,
        filialId: FILIAL_PADRAO.id,
        usuarioId: USUARIO_DEMO_PADRAO.id,
      });
      setOrigemPin(false);
      setPermissoesEfetivas(PERMISSOES_PROPRIETARIO_DEMO);
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
      if (pin === '000000') {
        throw new Error('PIN incorreto. Tentativa 1 de 3.');
      }

      const usuarioOperador: UsuarioAuth = {
        id: 'aaaaaaaa-2222-4000-8000-000000000002',
        nome: 'Mariana Atendente',
        email: 'mariana@farmavida.demo',
        cpf: '222.222.222-22',
        eResponsavelTecnico: false,
        status: 'ATIVO',
      };

      setUsuario(usuarioOperador);
      setToken('jwt_pin_pdv_' + Date.now());
      setEmpresaAtiva(EMPRESA_PADRAO);
      setFilialAtiva(FILIAL_PADRAO);
      setTenant({
        empresaId: EMPRESA_PADRAO.id,
        filialId: FILIAL_PADRAO.id,
        usuarioId: usuarioOperador.id,
      });
      setCargoAtual({
        id: 'cargo-atendente',
        nome: 'Operador de Caixa / Atendente',
        nivelAcesso: 'OPERADOR_CAIXA',
        papelEmpresa: 'COLABORADOR',
      });
      setPermissoesEfetivas([
        'pdv:acesso', 'pdv:vender', 'pdv:fechar_caixa', 'pdv:sangria', 'pdv:suprimento',
        'vouchers:consultar', 'estoque:visualizar', 'clientes:visualizar',
      ]);
      setOrigemPin(true);
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

      if (emp.papelEmpresa === 'PROPRIETARIO') {
        setPermissoesEfetivas(PERMISSOES_PROPRIETARIO_DEMO);
      } else {
        setPermissoesEfetivas([
          'pdv:acesso', 'pdv:vender', 'estoque:visualizar', 'clientes:visualizar', 'clientes:gerenciar',
        ]);
      }

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
    setUsuario(null);
    setToken(null);
    setTenant(null);
    setEmpresaAtiva(null);
    setFilialAtiva(null);
    setCargoAtual(null);
    setPermissoesEfetivas([]);
    setOrigemPin(false);
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
        selecionarContexto,
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
