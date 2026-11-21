-- ==============================================================================
-- FarmaPro — Migração 014: Tabelas de Pré-Venda do Balcão e Comandas Operacionais
-- Banco: PostgreSQL 15+
--
-- SEPARAÇÃO OPERACIONAL RIGOROSA:
-- O Balcão de atendimento gera orçamentos e pré-vendas (comandas identificadas
-- por código único curto, ex: PV-1048). O atendente de balcão NÃO possui acesso
-- à movimentação financeira, recebimento de valores ou baixa fiscal de estoque.
-- A conferência, recebimento e baixa definitiva ocorrem exclusivamente no Caixa/PDV.
-- ==============================================================================

-- 1. Sequência e Tabela Central de Pré-Vendas (Comandas do Balcão)
CREATE SEQUENCE IF NOT EXISTS seq_comandas_balcao START 1001 INCREMENT 1;

CREATE TABLE IF NOT EXISTS pre_vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  
  -- Código curto legível para digitação ou leitura por código de barras (Ex: PV-1048)
  codigo_comanda VARCHAR(30) NOT NULL,
  
  -- Identificação do Atendente e Posição de Atendimento
  atendente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  identificacao_balcao VARCHAR(50) NOT NULL DEFAULT 'Balcão 01',
  
  -- Identificação Opcional do Cliente (para orçamento/comanda nominal)
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(150),
  cliente_cpf VARCHAR(14),
  
  -- Totais Financeiros Estimados (em centavos)
  subtotal_centavos BIGINT NOT NULL CHECK (subtotal_centavos >= 0),
  desconto_centavos BIGINT NOT NULL DEFAULT 0 CHECK (desconto_centavos >= 0),
  total_centavos BIGINT NOT NULL CHECK (total_centavos >= 0),
  
  -- Ciclo de Vida da Pré-Venda
  -- PENDENTE: emitido no balcão, aguardando cliente apresentar no caixa
  -- EM_ATENDIMENTO: puxado na tela do caixa para conferência
  -- FINALIZADA: venda concluída e paga no caixa
  -- CANCELADA: desistência ou cancelamento pelo atendente/gerente
  -- EXPIRADA: comanda não apresentada dentro do prazo
  status VARCHAR(25) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN (
    'PENDENTE',
    'EM_ATENDIMENTO',
    'FINALIZADA',
    'CANCELADA',
    'EXPIRADA'
  )),
  
  -- Vínculo com a venda finalizada no Caixa (quando concluída)
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  caixa_operador_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  
  validade_minutos INT NOT NULL DEFAULT 120,
  observacoes TEXT,
  
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizado_em TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  
  CONSTRAINT uq_pre_venda_codigo_filial UNIQUE (empresa_id, filial_id, codigo_comanda)
);

CREATE INDEX idx_pre_vendas_filial_status ON pre_vendas(empresa_id, filial_id, status);
CREATE INDEX idx_pre_vendas_codigo ON pre_vendas(empresa_id, codigo_comanda);
CREATE INDEX idx_pre_vendas_atendente ON pre_vendas(empresa_id, atendente_id);

-- 2. Itens da Pré-Venda
CREATE TABLE IF NOT EXISTS pre_venda_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
  pre_venda_id UUID NOT NULL REFERENCES pre_vendas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  lote_id UUID REFERENCES lotes(id) ON DELETE RESTRICT,
  
  numero_item INT NOT NULL,
  codigo_barras VARCHAR(30),
  nome_produto VARCHAR(150) NOT NULL,
  apresentacao VARCHAR(150),
  quantidade NUMERIC(12,3) NOT NULL CHECK (quantidade > 0),
  preco_unitario_centavos BIGINT NOT NULL CHECK (preco_unitario_centavos >= 0),
  desconto_unitario_centavos BIGINT NOT NULL DEFAULT 0 CHECK (desconto_unitario_centavos >= 0),
  total_item_centavos BIGINT NOT NULL CHECK (total_item_centavos >= 0),
  
  exige_receita BOOLEAN NOT NULL DEFAULT FALSE,
  classificacao_receita VARCHAR(50) DEFAULT 'ISENTO',
  
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pre_venda_item_numero UNIQUE (pre_venda_id, numero_item)
);

CREATE INDEX idx_pre_venda_itens_produto ON pre_venda_itens(empresa_id, produto_id);

-- 3. Habilitação de RLS em Pré-Vendas e Itens
ALTER TABLE pre_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_vendas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_pre_vendas_isolamento ON pre_vendas;
CREATE POLICY p_pre_vendas_isolamento ON pre_vendas
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

ALTER TABLE pre_venda_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_venda_itens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_pre_venda_itens_isolamento ON pre_venda_itens;
CREATE POLICY p_pre_venda_itens_isolamento ON pre_venda_itens
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());
