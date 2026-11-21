-- ==============================================================================
-- FarmaPro — Migração 015: Autenticação Operacional por Matrícula e Senha Numérica
-- Banco: PostgreSQL 15+
-- ==============================================================================

-- 1. Catálogo de Permissões Específicas de Balcão e Operação
INSERT INTO permissoes (id, modulo, nome, descricao) VALUES
  ('balcao:consultar', 'BALCAO', 'Consultar Medicamentos no Balcão', 'Permite pesquisar medicamentos, preços e estoques'),
  ('balcao:acesso', 'BALCAO', 'Acesso ao Balcão', 'Permite acessar a estação de trabalho de atendimento de balcão'),
  ('pre_venda:criar', 'BALCAO', 'Criar Comandas e Pré-Vendas', 'Permite gerar orçamentos e comandas curtas no balcão')
ON CONFLICT (id) DO NOTHING;

-- 2. Adicionar colunas de Matrícula e Senha Operacional (PIN 6 Dígitos) na vinculação do colaborador com a empresa
ALTER TABLE usuarios_empresas
  ADD COLUMN IF NOT EXISTS matricula VARCHAR(30),
  ADD COLUMN IF NOT EXISTS senha_operacional_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tentativas_falhas_operacional INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_operacional_ate TIMESTAMPTZ;

-- 2. Garantir unicidade da matrícula dentro da mesma empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_empresa_matricula'
  ) THEN
    ALTER TABLE usuarios_empresas
      ADD CONSTRAINT uq_empresa_matricula UNIQUE (empresa_id, matricula);
  END IF;
END $$;

-- 3. Índice para busca ultra rápida de matrícula por empresa
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_matricula 
  ON usuarios_empresas(empresa_id, matricula);

-- 4. Tabela de Auditoria de Tentativas e Acessos Operacionais
CREATE TABLE IF NOT EXISTS tentativas_acesso_operacional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES filiais(id) ON DELETE CASCADE,
  matricula VARCHAR(30) NOT NULL,
  estacao VARCHAR(20) NOT NULL CHECK (estacao IN ('CAIXA', 'BALCAO')),
  sucesso BOOLEAN NOT NULL,
  motivo_falha VARCHAR(100),
  ip_origem VARCHAR(45),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tentativas_operacionais_busca 
  ON tentativas_acesso_operacional(empresa_id, matricula, criado_em);

ALTER TABLE tentativas_acesso_operacional ENABLE ROW LEVEL SECURITY;
ALTER TABLE tentativas_acesso_operacional FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_tentativas_operacional_isolamento ON tentativas_acesso_operacional;
CREATE POLICY p_tentativas_operacional_isolamento ON tentativas_acesso_operacional
  AS RESTRICTIVE
  FOR ALL
  TO farmapro_app
  USING (
    empresa_id IS NULL OR empresa_id = NULLIF(current_setting('app.empresa_id', TRUE), '')::UUID
  )
  WITH CHECK (
    empresa_id IS NULL OR empresa_id = NULLIF(current_setting('app.empresa_id', TRUE), '')::UUID
  );

GRANT SELECT, INSERT ON tentativas_acesso_operacional TO farmapro_app;
