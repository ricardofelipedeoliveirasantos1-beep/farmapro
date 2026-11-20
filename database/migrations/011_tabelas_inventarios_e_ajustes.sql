-- ==============================================================================
-- FarmaPro — Migração 011: Gestão de Estoque, Lotes, Validades e Inventários
-- Banco: PostgreSQL 15+
--
-- DIRETRIZ REGULATÓRIA E DE AUDITORIA:
-- 1. Controle de inventários físicos por filial com aprovação formal de divergências.
-- 2. Preservação estrita do Livro-Razão de movimentações com ON DELETE RESTRICT.
-- 3. RLS ativo para isolamento absoluto entre empresas (tenants).
-- ==============================================================================

-- 1. Atualizar tipos permitidos no Livro-Razão de Movimentações de Estoque
ALTER TABLE estoque_movimentacoes 
  DROP CONSTRAINT IF EXISTS estoque_movimentacoes_tipo_movimentacao_check;

ALTER TABLE estoque_movimentacoes 
  ADD CONSTRAINT estoque_movimentacoes_tipo_movimentacao_check CHECK (
    tipo_movimentacao IN (
      'ENTRADA_COMPRA_NFE',
      'ENTRADA_AVULSA',
      'SAIDA_VENDA_PDV',
      'SAIDA_AVULSA',
      'ESTORNO_CANCELAMENTO_VENDA',
      'AJUSTE_POSITIVO_INVENTARIO',
      'AJUSTE_NEGATIVO_INVENTARIO',
      'AJUSTE_MANUAL_POSITIVO',
      'AJUSTE_MANUAL_NEGATIVO',
      'RESERVA_PDV',
      'LIBERACAO_RESERVA',
      'PERDA_AVARIA',
      'PERDA_VENCIMENTO',
      'BLOQUEIO_QUARENTENA',
      'BLOQUEIO_SANITARIO',
      'DESBLOQUEIO_SANITARIO',
      'TRANSFERENCIA_SAIDA',
      'TRANSFERENCIA_ENTRADA'
    )
  );

-- 2. Tabela de Inventários Físicos por Filial
CREATE TABLE IF NOT EXISTS inventarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  codigo_sequencial SERIAL,
  descricao VARCHAR(255) NOT NULL,
  tipo_inventario VARCHAR(30) NOT NULL DEFAULT 'GERAL' CHECK (
    tipo_inventario IN ('GERAL', 'CATEGORIA', 'ROTATIVO', 'ESPECIFICO')
  ),
  categoria_id UUID REFERENCES categorias_produtos(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'EM_ANDAMENTO' CHECK (
    status IN ('EM_ANDAMENTO', 'AGUARDANDO_APROVACAO', 'CONCLUIDO_APROVADO', 'CANCELADO')
  ),
  aberto_por_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizado_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  finalizado_em TIMESTAMPTZ,
  aprovado_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  aprovado_em TIMESTAMPTZ,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventarios_empresa_filial ON inventarios(empresa_id, filial_id, status);
CREATE INDEX IF NOT EXISTS idx_inventarios_aberto_em ON inventarios(filial_id, aberto_em DESC);

-- 3. Tabela de Itens Contados no Inventário
CREATE TABLE IF NOT EXISTS inventario_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  inventario_id UUID NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  lote_id UUID REFERENCES lotes(id) ON DELETE RESTRICT,
  quantidade_sistema NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantidade_contada NUMERIC(12,3),
  divergencia NUMERIC(12,3),
  custo_unitario_centavos BIGINT NOT NULL DEFAULT 0,
  valor_divergencia_centavos BIGINT DEFAULT 0,
  justificativa TEXT,
  contado_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  contado_em TIMESTAMPTZ,
  status_item VARCHAR(30) NOT NULL DEFAULT 'PENDENTE' CHECK (
    status_item IN ('PENDENTE', 'CONTADO', 'APROVADO', 'REJEITADO')
  ),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_itens_inventario ON inventario_itens(inventario_id, status_item);
CREATE INDEX IF NOT EXISTS idx_inv_itens_produto ON inventario_itens(filial_id, produto_id);

-- 4. Políticas de Row-Level Security (RLS)
ALTER TABLE inventarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventarios FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_inventarios_isolamento ON inventarios;
CREATE POLICY p_inventarios_isolamento ON inventarios
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

ALTER TABLE inventario_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_itens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_inventario_itens_isolamento ON inventario_itens;
CREATE POLICY p_inventario_itens_isolamento ON inventario_itens
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

-- 5. Concessão de Privilégios ao papel da aplicação
GRANT SELECT, INSERT, UPDATE, DELETE ON inventarios TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventario_itens TO farmapro_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO farmapro_app;
