-- ==============================================================================
-- FarmaPro — Migração 004: Cadastro de Clientes e Conformidade LGPD
-- Banco: PostgreSQL 15+
-- NOTA: O FarmaPro NÃO possui crediário próprio, limite ou carteira de crédito.
-- ==============================================================================

-- 1. Cadastro Central de Clientes por Empresa
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_pessoa VARCHAR(2) NOT NULL DEFAULT 'PF' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  nome_razao_social VARCHAR(255) NOT NULL,
  nome_social VARCHAR(255),
  cpf_cnpj VARCHAR(14),
  rg_ie VARCHAR(30),
  data_nascimento DATE,
  sexo VARCHAR(1) CHECK (sexo IN ('M', 'F', 'O')),
  telefone_principal VARCHAR(20) NOT NULL,
  telefone_secundario VARCHAR(20),
  email VARCHAR(255),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  cep VARCHAR(8),
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')),
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_empresa_cpf ON clientes(empresa_id, cpf_cnpj);
CREATE INDEX idx_clientes_empresa_nome ON clientes(empresa_id, nome_razao_social);

-- 2. Termos de Consentimento e Preferências LGPD (Art. 5º e 7º)
CREATE TABLE IF NOT EXISTS clientes_consentimentos_lgpd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  finalidade VARCHAR(50) NOT NULL CHECK (finalidade IN (
    'MARKETING_PROMOCIONAL',
    'LEMBRETE_TRATAMENTO_CONTINUO',
    'RETENCAO_HISTORICO_PRESCRICAO',
    'PROGRAMA_FIDELIDADE_DESCONTO'
  )),
  canal VARCHAR(20) NOT NULL CHECK (canal IN ('WHATSAPP', 'SMS', 'EMAIL', 'TELEFONE')),
  consentido BOOLEAN NOT NULL,
  data_consentimento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_origem VARCHAR(45),
  usuario_coletor_id UUID REFERENCES usuarios(id),
  revogado_em TIMESTAMPTZ,
  CONSTRAINT uq_cliente_consentimento UNIQUE (cliente_id, finalidade, canal)
);

CREATE INDEX idx_consentimentos_cliente ON clientes_consentimentos_lgpd(empresa_id, cliente_id);
