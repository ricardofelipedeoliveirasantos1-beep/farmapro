-- ==============================================================================
-- FarmaPro — Migração 006: Saldos de Estoque e Livro-Razão de Movimentações (Ledger)
-- Banco: PostgreSQL 15+
-- ==============================================================================

-- 1. Saldos Consolidados de Estoque por Filial e Produto (Snapshot em tempo real)
CREATE TABLE IF NOT EXISTS estoque_saldos (
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade_fisica NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantidade_reservada NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantidade_reservada >= 0),
  quantidade_disponivel NUMERIC(12,3) GENERATED ALWAYS AS (quantidade_fisica - quantidade_reservada) STORED,
  custo_medio_centavos BIGINT NOT NULL DEFAULT 0,
  ultimo_custo_centavos BIGINT NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (filial_id, produto_id)
);

CREATE INDEX idx_estoque_saldos_empresa ON estoque_saldos(empresa_id, filial_id, quantidade_disponivel);

-- 2. Reservas Temporárias de Estoque (Prevenção de concorrência entre caixas simultâneos)
CREATE TABLE IF NOT EXISTS estoque_reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES lotes(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES vendas(id) ON DELETE CASCADE,
  dispositivo_id UUID NOT NULL REFERENCES dispositivos_autorizados(id),
  quantidade_reservada NUMERIC(12,3) NOT NULL CHECK (quantidade_reservada > 0),
  expira_em TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'CONFIRMADA', 'EXPIRADA_CANCELADA')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservas_ativas ON estoque_reservas(filial_id, produto_id, status, expira_em);

-- 3. Livro-Razão Imutável de Movimentações de Estoque (Audit Trail Contábil)
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  lote_id UUID REFERENCES lotes(id) ON DELETE RESTRICT,
  tipo_movimentacao VARCHAR(40) NOT NULL CHECK (tipo_movimentacao IN (
    'ENTRADA_COMPRA_NFE',
    'SAIDA_VENDA_PDV',
    'ESTORNO_CANCELAMENTO_VENDA',
    'AJUSTE_POSITIVO_INVENTARIO',
    'AJUSTE_NEGATIVO_INVENTARIO',
    'PERDA_AVARIA',
    'PERDA_VENCIMENTO',
    'TRANSFERENCIA_SAIDA',
    'TRANSFERENCIA_ENTRADA',
    'BLOQUEIO_QUARENTENA'
  )),
  quantidade NUMERIC(12,3) NOT NULL, -- Positivo para entradas, negativo para saídas
  custo_unitario_centavos BIGINT NOT NULL DEFAULT 0,
  saldo_anterior NUMERIC(12,3) NOT NULL,
  saldo_posterior NUMERIC(12,3) NOT NULL,
  origem_documento_tipo VARCHAR(50), -- Ex: 'VENDA', 'NFE', 'INVENTARIO'
  origem_documento_id VARCHAR(100),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  motivo TEXT,
  id_offline_uuid UUID,
  chave_idempotencia VARCHAR(64) UNIQUE,
  data_hora_movimento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimentacoes_filial_prod ON estoque_movimentacoes(empresa_id, filial_id, produto_id, data_hora_movimento);
CREATE INDEX idx_movimentacoes_lote ON estoque_movimentacoes(empresa_id, lote_id);
