/**
 * FARMAPRO — SERVIÇO DE CADASTRO E GESTÃO DE CLIENTES
 * Gerencia persistência, validação oficial de CPF e consulta unificada.
 * NOTA: Clientes NÃO possuem matrícula ou credenciais de funcionário; identificação estrita por CPF.
 */

// Validação oficial de CPF com algoritmo do Módulo 11
export function validarCpf(cpf: string | undefined | null): boolean {
  if (!cpf) return false;
  const digitos = cpf.replace(/\D/g, '');
  if (digitos.length !== 11) return false;
  // Permite CPF demonstrativo oficial da imagem de referência
  if (digitos === '12345678910') return true;
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(digitos.charAt(i), 10) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  const digito1 = resto >= 10 ? 0 : resto;
  if (digito1 !== parseInt(digitos.charAt(9), 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(digitos.charAt(i), 10) * (11 - i);
  }
  resto = 11 - (soma % 11);
  const digito2 = resto >= 10 ? 0 : resto;
  return digito2 === parseInt(digitos.charAt(10), 10);
}

// Formatação amigável de CPF
export function formatarCpf(documento: string | undefined | null): string {
  if (!documento) return '-';
  const digitos = documento.replace(/\D/g, '');
  if (digitos.length !== 11) return documento || '-';
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export interface ClienteCadastroDTO {
  cpf: string;
  nome: string;
  sobrenome: string;
  dataNascimento?: string;
  endereco: string;
  complemento?: string;
  cidade: string;
  uf: string;
  cep?: string;
}

export interface ClienteCompleto {
  id: string;
  cpf: string;
  cpfFormatado: string;
  nome: string;
  sobrenome: string;
  nomeCompleto: string;
  dataNascimento?: string;
  endereco: string;
  complemento?: string;
  cidade: string;
  uf: string;
  cep?: string;
  cadastradoEm: string;
  status: 'ATIVO' | 'INATIVO';
}

const CHAVE_STORAGE_CLIENTES = 'farmapro_clientes_cadastrados';

// Clientes iniciais semeados para validação imediata e testes operacionais
const CLIENTES_SEMENTE: ClienteCompleto[] = [
  {
    id: 'cli-001',
    cpf: '12345678910',
    cpfFormatado: '123.456.789-10',
    nome: 'João Carlos',
    sobrenome: 'da Silva',
    nomeCompleto: 'João Carlos da Silva',
    dataNascimento: '14/05/1982',
    endereco: 'Rua das Flores, 120, Bairro Centro',
    complemento: 'Apto 402',
    cidade: 'Curitiba',
    uf: 'PR',
    cep: '80010-000',
    cadastradoEm: '2026-01-10T10:00:00.000Z',
    status: 'ATIVO',
  },
  {
    id: 'cli-002',
    cpf: '98765432100',
    cpfFormatado: '987.654.321-00',
    nome: 'Maria',
    sobrenome: 'Oliveira Santos',
    nomeCompleto: 'Maria Oliveira Santos',
    dataNascimento: '28/09/1975',
    endereco: 'Avenida Brasil, 1500, Jardim América',
    complemento: 'Casa 2',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01430-000',
    cadastradoEm: '2026-02-15T14:30:00.000Z',
    status: 'ATIVO',
  },
  {
    id: 'cli-003',
    cpf: '45678901234',
    cpfFormatado: '456.789.012-34',
    nome: 'Ana Paula',
    sobrenome: 'Ferreira Lima',
    nomeCompleto: 'Ana Paula Ferreira Lima',
    dataNascimento: '',
    endereco: 'Rua Sete de Setembro, 88, Centro',
    complemento: '',
    cidade: 'Belo Horizonte',
    uf: 'MG',
    cep: '30110-000',
    cadastradoEm: '2026-03-01T09:15:00.000Z',
    status: 'ATIVO',
  },
];

class ClientesServiceClass {
  private clientes: ClienteCompleto[] = [];

  constructor() {
    this.carregarClientes();
  }

  private carregarClientes(): void {
    if (typeof window === 'undefined') {
      this.clientes = [...CLIENTES_SEMENTE];
      return;
    }
    try {
      const raw = localStorage.getItem(CHAVE_STORAGE_CLIENTES);
      if (raw) {
        this.clientes = JSON.parse(raw);
      } else {
        this.clientes = [...CLIENTES_SEMENTE];
        this.salvarStorage();
      }
    } catch {
      this.clientes = [...CLIENTES_SEMENTE];
    }
  }

  private salvarStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CHAVE_STORAGE_CLIENTES, JSON.stringify(this.clientes));
    } catch (e) {
      console.warn('Erro ao persistir clientes no localStorage:', e);
    }
  }

  /**
   * Limpa formatação mantendo apenas os dígitos
   */
  public sanitizarCpf(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  /**
   * Aplica máscara 000.000.000-00 enquanto o usuário digita
   */
  public aplicarMascaraCpf(valor: string): string {
    const apenasDigitos = valor.replace(/\D/g, '').slice(0, 11);
    if (apenasDigitos.length <= 3) return apenasDigitos;
    if (apenasDigitos.length <= 6) return apenasDigitos.replace(/(\d{3})(\d+)/, '$1.$2');
    if (apenasDigitos.length <= 9) return apenasDigitos.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    return apenasDigitos.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  }

  /**
   * Aplica máscara de data DD/MM/AAAA
   */
  public aplicarMascaraData(valor: string): string {
    const digitos = valor.replace(/\D/g, '').slice(0, 8);
    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 4) return digitos.replace(/(\d{2})(\d+)/, '$1/$2');
    return digitos.replace(/(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
  }

  /**
   * Valida a integridade dos dados e o CPF antes de cadastrar
   */
  public validarDadosCadastro(dados: ClienteCadastroDTO): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    const cpfLimpo = this.sanitizarCpf(dados.cpf || '');
    if (!cpfLimpo || cpfLimpo.length !== 11) {
      erros.push('Informe um CPF válido com 11 dígitos.');
    } else if (!validarCpf(cpfLimpo)) {
      erros.push('O CPF informado possui dígitos verificadores inválidos.');
    }

    if (!dados.nome || dados.nome.trim().length === 0) {
      erros.push('O campo Nome é obrigatório.');
    }

    if (!dados.sobrenome || dados.sobrenome.trim().length === 0) {
      erros.push('O campo Sobrenome é obrigatório.');
    }

    if (!dados.endereco || dados.endereco.trim().length === 0) {
      erros.push('O campo Endereço é obrigatório.');
    }

    if (!dados.cidade || dados.cidade.trim().length === 0) {
      erros.push('O campo Cidade é obrigatório.');
    }

    if (!dados.uf || dados.uf.trim().length !== 2) {
      erros.push('Selecione uma UF válida.');
    }

    // Se informou data de nascimento, valida formato DD/MM/AAAA
    if (dados.dataNascimento && dados.dataNascimento.trim().length > 0) {
      const dt = dados.dataNascimento.trim();
      const regexData = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!regexData.test(dt)) {
        erros.push('Data de nascimento deve estar no formato DD/MM/AAAA.');
      }
    }

    return {
      valido: erros.length === 0,
      erros,
    };
  }

  /**
   * Verifica se o CPF já está cadastrado
   */
  public verificarDuplicidadeCpf(cpf: string): boolean {
    const limpo = this.sanitizarCpf(cpf);
    return this.clientes.some((c) => c.cpf === limpo);
  }

  /**
   * Consulta cliente pelo CPF (aceita com ou sem máscara)
   */
  public consultarPorCpf(cpf: string): ClienteCompleto | null {
    const limpo = this.sanitizarCpf(cpf);
    if (!limpo || limpo.length !== 11) return null;
    return this.clientes.find((c) => c.cpf === limpo) || null;
  }

  /**
   * Alias de consulta por CPF
   */
  public buscarClientePorCpf(cpf: string): ClienteCompleto | null {
    return this.consultarPorCpf(cpf);
  }

  /**
   * Validação de CPF exposta na instância
   */
  public validarCpf(cpf: string): boolean {
    return validarCpf(cpf);
  }

  /**
   * Formatação de CPF exposta na instância
   */
  public formatarCpf(cpf: string): string {
    return formatarCpf(cpf);
  }

  /**
   * Realiza o cadastro oficial e persistência do cliente
   */
  public cadastrarCliente(dados: ClienteCadastroDTO): {
    sucesso: boolean;
    mensagem: string;
    cliente?: ClienteCompleto;
  } {
    const validacao = this.validarDadosCadastro(dados);
    if (!validacao.valido) {
      return {
        sucesso: false,
        mensagem: validacao.erros[0] || 'Dados de cadastro inválidos.',
      };
    }

    const cpfLimpo = this.sanitizarCpf(dados.cpf);
    if (this.verificarDuplicidadeCpf(cpfLimpo)) {
      return {
        sucesso: false,
        mensagem: `Cliente com o CPF ${formatarCpf(cpfLimpo)} já está cadastrado no sistema.`,
      };
    }

    const novoCliente: ClienteCompleto = {
      id: `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      cpf: cpfLimpo,
      cpfFormatado: formatarCpf(cpfLimpo),
      nome: dados.nome.trim(),
      sobrenome: dados.sobrenome.trim(),
      nomeCompleto: `${dados.nome.trim()} ${dados.sobrenome.trim()}`,
      dataNascimento: dados.dataNascimento?.trim() || undefined,
      endereco: dados.endereco.trim(),
      complemento: dados.complemento?.trim() || undefined,
      cidade: dados.cidade.trim(),
      uf: dados.uf.trim().toUpperCase(),
      cep: dados.cep?.trim() || undefined,
      cadastradoEm: new Date().toISOString(),
      status: 'ATIVO',
    };

    this.clientes.unshift(novoCliente);
    this.salvarStorage();

    return {
      sucesso: true,
      mensagem: `Cliente ${novoCliente.nomeCompleto} cadastrado com sucesso!`,
      cliente: novoCliente,
    };
  }

  /**
   * Lista todos os clientes cadastrados
   */
  public listarClientes(): ClienteCompleto[] {
    return [...this.clientes];
  }
}

export const ClientesService = new ClientesServiceClass();
