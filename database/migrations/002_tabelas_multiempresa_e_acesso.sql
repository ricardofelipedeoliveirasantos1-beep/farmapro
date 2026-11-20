-- ==============================================================================
-- FarmaPro — Migração 002: Núcleo Multiempresa, Filiais e Controle de Acesso (RBAC)
-- Banco: PostgreSQL 15+
-- ==============================================================================

-- 1. Tabela de Empresas (Tenants)
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) NOT NULL UNIQUE,
  inscricao_estadual VARCHAR(30),
  email_contato VARCHAR(255) NOT NULL,
  telefone_contato VARCHAR(20) NOT NULL,
  plano VARCHAR(50) NOT NULL DEFAULT 'BASICO',
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')),
  configuracoes JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_empresas_atualizado_em
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION set_timestamp_atualizado_em();

-- 2. Tabela de Filiais (Unidades da Farmácia)
CREATE TABLE IF NOT EXISTS filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo_filial VARCHAR(30) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) NOT NULL,
  inscricao_estadual VARCHAR(30),
  logradouro VARCHAR(255) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  complemento VARCHAR(100),
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  cep VARCHAR(8) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  e_matriz BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_filial_codigo_por_empresa UNIQUE (empresa_id, codigo_filial)
);

CREATE INDEX idx_filiais_empresa ON filiais(empresa_id);

CREATE TRIGGER trg_filiais_atualizado_em
  BEFORE UPDATE ON filiais
  FOR EACH ROW EXECUTE FUNCTION set_timestamp_atualizado_em();

-- 3. Tabela de Usuários (Pessoas / Operadores do Sistema)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  cpf VARCHAR(11) NOT NULL UNIQUE,
  hash_senha VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  crf_numero VARCHAR(20),
  crf_uf VARCHAR(2),
  e_responsavel_tecnico BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')),
  ultimo_acesso_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Vínculo de Usuário com a Empresa
CREATE TABLE IF NOT EXISTS usuarios_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  papel_empresa VARCHAR(30) NOT NULL DEFAULT 'COLABORADOR' CHECK (papel_empresa IN ('PROPRIETARIO', 'ADMINISTRADOR', 'COLABORADOR')),
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_usuario_empresa UNIQUE (usuario_id, empresa_id)
);

CREATE INDEX idx_usuarios_empresas_busca ON usuarios_empresas(empresa_id, usuario_id);

-- 5. Tabela de Cargos (Perfis Funcionais por Empresa)
CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  nivel_acesso VARCHAR(30) NOT NULL CHECK (nivel_acesso IN ('ADMIN', 'GERENTE', 'FARMACEUTICO', 'OPERADOR_CAIXA', 'ATENDENTE')),
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cargos_nome_empresa UNIQUE (empresa_id, nome)
);

CREATE INDEX idx_cargos_empresa ON cargos(empresa_id);

-- 6. Tabela de Permissões (Dicionário Imutável de Permissões)
CREATE TABLE IF NOT EXISTS permissoes (
  id VARCHAR(60) PRIMARY KEY,
  modulo VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL
);

-- 7. Associação de Permissões por Cargo
CREATE TABLE IF NOT EXISTS cargos_permissoes (
  cargo_id UUID NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  permissao_id VARCHAR(60) NOT NULL REFERENCES permissoes(id) ON DELETE RESTRICT,
  PRIMARY KEY (cargo_id, permissao_id)
);

-- 8. Vínculo de Usuário com Filiais Específicas
CREATE TABLE IF NOT EXISTS usuarios_filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  cargo_id UUID NOT NULL REFERENCES cargos(id) ON DELETE RESTRICT,
  e_filial_padrao BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_usuario_filial UNIQUE (usuario_id, filial_id)
);

CREATE INDEX idx_usuarios_filiais_acesso ON usuarios_filiais(empresa_id, filial_id, usuario_id);

-- 9. Exceções de Permissões por Filial (Concessões ou Revogações Específicas)
CREATE TABLE IF NOT EXISTS usuarios_filiais_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_filial_id UUID NOT NULL REFERENCES usuarios_filiais(id) ON DELETE CASCADE,
  permissao_id VARCHAR(60) NOT NULL REFERENCES permissoes(id) ON DELETE RESTRICT,
  concedida BOOLEAN NOT NULL, -- TRUE: adiciona permissão; FALSE: revoga permissão do cargo
  motivo_concessao TEXT,
  concedido_por_id UUID REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_usuario_filial_permissao UNIQUE (usuario_filial_id, permissao_id)
);

-- 10. Dispositivos e Terminais de PDV Autorizados
CREATE TABLE IF NOT EXISTS dispositivos_autorizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  identificador_hardware VARCHAR(255) NOT NULL, -- UUID único da máquina/terminal
  nome_terminal VARCHAR(100) NOT NULL,
  numero_serie_caixa VARCHAR(30) NOT NULL,
  tipo_dispositivo VARCHAR(30) NOT NULL DEFAULT 'DESKTOP_PDV' CHECK (tipo_dispositivo IN ('DESKTOP_PDV', 'WEB_RETRO', 'MOBILE_COLETOR')),
  token_acesso_hash VARCHAR(255) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_ip VARCHAR(45),
  ultimo_sync_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_dispositivo_terminal UNIQUE (filial_id, numero_serie_caixa),
  CONSTRAINT uq_dispositivo_hardware UNIQUE (empresa_id, identificador_hardware)
);

CREATE INDEX idx_dispositivos_filial ON dispositivos_autorizados(empresa_id, filial_id);
