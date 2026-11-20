-- ==============================================================================
-- FarmaPro — Migração 010: Movimentações de Caixa (Suprimento/Sangria) e Troca de Operador
-- Banco: PostgreSQL 15+
--
-- DIRETRIZ FINANCEIRA E DE AUDITORIA:
-- Todas as movimentações de dinheiro na gaveta física (suprimentos de troco e retiradas
-- de sangria) são registradas de forma imutável e auditada com ON DELETE RESTRICT.
-- ==============================================================================

-- 1. Enriquecimento de caixas_sessoes para suporte a operador atual e justificativa
ALTER TABLE caixas_sessoes 
  ADD COLUMN IF NOT EXISTS operador_atual_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS justificativa_diferenca TEXT;

-- 2. Tabela de Movimentações Financeiras de Caixa (Suprimentos e Sangrias)
CREATE TABLE IF NOT EXISTS caixas_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  caixa_sessao_id UUID NOT NULL REFERENCES caixas_sessoes(id) ON DELETE RESTRICT,
  tipo_movimentacao VARCHAR(30) NOT NULL CHECK (tipo_movimentacao IN ('SUPRIMENTO', 'SANGRIA', 'SANGRIA_AUTOMATICA')),
  valor_centavos BIGINT NOT NULL CHECK (valor_centavos > 0),
  motivo TEXT NOT NULL,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  autorizado_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caixas_mov_sessao ON caixas_movimentacoes(caixa_sessao_id, tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_caixas_mov_filial ON caixas_movimentacoes(empresa_id, filial_id, criado_em);

-- 3. Tabela de Sessões Individuais de Operadores (Handover / Troca de Operador)
CREATE TABLE IF NOT EXISTS caixas_operadores_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  caixa_sessao_id UUID NOT NULL REFERENCES caixas_sessoes(id) ON DELETE RESTRICT,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  assumido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entregue_em TIMESTAMPTZ,
  saldo_fechamento_declarado_centavos BIGINT,
  saldo_fechamento_apurado_centavos BIGINT,
  diferenca_fechamento_centavos BIGINT,
  justificativa_diferenca TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'FECHADO'))
);

CREATE INDEX IF NOT EXISTS idx_caixas_op_sessao ON caixas_operadores_sessoes(caixa_sessao_id, usuario_id);

-- 4. Políticas de Row-Level Security (RLS)
ALTER TABLE caixas_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas_movimentacoes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_caixas_movimentacoes_isolamento ON caixas_movimentacoes;
CREATE POLICY p_caixas_movimentacoes_isolamento ON caixas_movimentacoes
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

ALTER TABLE caixas_operadores_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas_operadores_sessoes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_caixas_operadores_isolamento ON caixas_operadores_sessoes;
CREATE POLICY p_caixas_operadores_isolamento ON caixas_operadores_sessoes
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

-- 5. Privilégios ao papel da aplicação
GRANT SELECT, INSERT, UPDATE, DELETE ON caixas_movimentacoes TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON caixas_operadores_sessoes TO farmapro_app;
