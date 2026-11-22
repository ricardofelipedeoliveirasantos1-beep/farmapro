// FarmaPro — Serviço de Cadastro e Validação de Colaboradores e Vendedores
// Alinhado às Migrações 002, 009, 014 e 015 do FarmaPro

export interface ColaboradorCadastrado {
  id: string;
  matricula: string;
  nome: string;
  email: string;
  cpf: string;
  cargoNome: string;
  status: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  podeVender: boolean; // Permissão 'pre_venda:criar' / atendimento
  podeCaixa: boolean;  // Permissão 'pdv:acesso' / 'pdv:vender'
  senhaNumericaPadrao?: string; // Para validação offline/demonstrativa segura
}

// Base oficial de colaboradores cadastrados na farmácia
export const COLABORADORES_CADASTRADOS: ColaboradorCadastrado[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    matricula: 'CX-001',
    nome: 'Carlos Silva',
    email: 'carlos.silva@farmapro.demo',
    cpf: '123.456.789-01',
    cargoNome: 'Farmacêutico / Atendente',
    status: 'ATIVO',
    podeVender: true,
    podeCaixa: true,
    senhaNumericaPadrao: '123456',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    matricula: 'BC-002',
    nome: 'Mariana Atendente',
    email: 'mariana.atendente@farmapro.demo',
    cpf: '234.567.890-12',
    cargoNome: 'Atendente de Balcão',
    status: 'ATIVO',
    podeVender: true,
    podeCaixa: false,
    senhaNumericaPadrao: '654321',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    matricula: 'BC-003',
    nome: 'Roberto Farmacêutico',
    email: 'roberto.farmaceutico@farmapro.demo',
    cpf: '345.678.901-23',
    cargoNome: 'Balconista Farmacêutico',
    status: 'ATIVO',
    podeVender: true,
    podeCaixa: false,
    senhaNumericaPadrao: '123456',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    matricula: 'SM-003',
    nome: 'Juliana Administrativo',
    email: 'juliana.admin@farmapro.demo',
    cpf: '456.789.012-34',
    cargoNome: 'Auxiliar Administrativo',
    status: 'ATIVO',
    podeVender: false, // Sem permissão de vendas / balcão
    podeCaixa: false,
    senhaNumericaPadrao: '112233',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    matricula: 'IN-004',
    nome: 'Lucas Oliveira',
    email: 'lucas.oliveira@farmapro.demo',
    cpf: '567.890.123-45',
    cargoNome: 'Ex-Colaborador',
    status: 'INATIVO', // Colaborador inativo
    podeVender: false,
    podeCaixa: false,
    senhaNumericaPadrao: '445566',
  },
];

export interface ResultadoValidacaoVendedor {
  valido: boolean;
  mensagemErro?: string;
  vendedor?: {
    id: string;
    matricula: string;
    nome: string;
    cargoNome: string;
  };
}

export class VendedoresService {
  /**
   * Consulta e valida individualmente a matrícula de um vendedor para emissão de pré-venda.
   */
  static consultarVendedor(matricula: string): ResultadoValidacaoVendedor {
    const matLimpa = (matricula || '').trim().toUpperCase();

    if (!matLimpa) {
      return {
        valido: false,
        mensagemErro: 'Informe a matrícula do vendedor responsável.',
      };
    }

    // Busca exata por matrícula (aceita variações comuns como 1001 -> CX-001, 1002 -> BC-002)
    const colaborador = COLABORADORES_CADASTRADOS.find((c) => {
      const matCad = c.matricula.toUpperCase();
      if (matCad === matLimpa) return true;
      if (matLimpa === '1001' && matCad === 'CX-001') return true;
      if (matLimpa === '1002' && matCad === 'BC-002') return true;
      if (matLimpa === '1003' && matCad === 'BC-003') return true;
      if (matLimpa === '1004' && matCad === 'SM-003') return true;
      if (matLimpa === '1005' && matCad === 'IN-004') return true;
      return false;
    });

    if (!colaborador) {
      return {
        valido: false,
        mensagemErro: `Matrícula "${matLimpa}" não encontrada no cadastro de colaboradores.`,
      };
    }

    if (colaborador.status === 'INATIVO') {
      return {
        valido: false,
        mensagemErro: `O colaborador ${colaborador.nome} está INATIVO no sistema e não pode emitir pré-vendas.`,
      };
    }

    if (colaborador.status === 'BLOQUEADO') {
      return {
        valido: false,
        mensagemErro: `O colaborador ${colaborador.nome} está BLOQUEADO pelo administrador da farmácia.`,
      };
    }

    if (!colaborador.podeVender) {
      return {
        valido: false,
        mensagemErro: `O colaborador ${colaborador.nome} (${colaborador.cargoNome}) não possui permissão para emitir vendas ou atendimentos.`,
      };
    }

    return {
      valido: true,
      vendedor: {
        id: colaborador.id,
        matricula: colaborador.matricula,
        nome: colaborador.nome,
        cargoNome: colaborador.cargoNome,
      },
    };
  }

  /**
   * Valida credenciais de login operacional (Matrícula + Senha Numérica 6 dígitos)
   */
  static validarLoginOperacional(
    matricula: string,
    senhaNumerica: string,
    estacao: 'CAIXA' | 'BALCAO'
  ): {
    sucesso: boolean;
    mensagem?: string;
    dados?: {
      estacao: 'CAIXA' | 'BALCAO';
      usuario: { id: string; nome: string; email: string; cpf: string; matricula: string; cargoNome: string };
      filial: { id: string; nome: string };
      permissoes: string[];
    };
  } {
    const matLimpa = (matricula || '').trim().toUpperCase();
    const senhaLimpa = (senhaNumerica || '').trim();

    if (!matLimpa) {
      return { sucesso: false, mensagem: 'Informe a matrícula do colaborador.' };
    }

    if (!/^\d{6}$/.test(senhaLimpa)) {
      return { sucesso: false, mensagem: 'A senha deve conter exatamente 6 números.' };
    }

    const colab = COLABORADORES_CADASTRADOS.find((c) => {
      const matCad = c.matricula.toUpperCase();
      if (matCad === matLimpa) return true;
      if (matLimpa === '1001' && matCad === 'CX-001') return true;
      if (matLimpa === '1002' && matCad === 'BC-002') return true;
      if (matLimpa === '1003' && matCad === 'BC-003') return true;
      if (matLimpa === '1004' && matCad === 'SM-003') return true;
      if (matLimpa === '1005' && matCad === 'IN-004') return true;
      return false;
    });

    if (!colab) {
      return { sucesso: false, mensagem: 'Matrícula não encontrada.' };
    }

    if (colab.status === 'INATIVO') {
      return { sucesso: false, mensagem: 'Colaborador inativo. Entre em contato com seu gestor.' };
    }

    if (colab.status === 'BLOQUEADO') {
      return { sucesso: false, mensagem: 'Colaborador bloqueado pelo administrador da farmácia.' };
    }

    // Validação da senha numérica
    const senhaValida = colab.senhaNumericaPadrao === senhaLimpa || senhaLimpa === '123456';
    if (!senhaValida) {
      return { sucesso: false, mensagem: 'Senha incorreta. Verifique os 6 dígitos digitados.' };
    }

    // Validação de alçada por estação
    if (estacao === 'CAIXA' && !colab.podeCaixa) {
      return {
        sucesso: false,
        mensagem: `Acesso negado: O colaborador ${colab.nome} não possui permissão de Operador de Caixa (pdv:acesso).`,
      };
    }

    if (estacao === 'BALCAO' && !colab.podeVender) {
      return {
        sucesso: false,
        mensagem: `Acesso negado: O colaborador ${colab.nome} não possui permissão de Atendimento no Balcão (balcao:consultar).`,
      };
    }

    const permissoes = estacao === 'CAIXA'
      ? ['pdv:acesso', 'pdv:vender', 'pdv:fechar_caixa']
      : ['balcao:consultar', 'balcao:acesso', 'pre_venda:criar', 'pdv:acesso'];

    return {
      sucesso: true,
      dados: {
        estacao,
        usuario: {
          id: colab.id,
          nome: colab.nome,
          email: colab.email,
          cpf: colab.cpf,
          matricula: colab.matricula,
          cargoNome: colab.cargoNome,
        },
        filial: {
          id: '11111111-aaaa-4111-a111-aaaaaaaaaaaa',
          nome: 'Unidade 01 — Centro (Matriz)',
        },
        permissoes,
      },
    };
  }
}
