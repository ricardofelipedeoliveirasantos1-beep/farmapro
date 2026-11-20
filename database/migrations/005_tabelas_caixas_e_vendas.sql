-- ==============================================================================
-- FarmaPro — Migração 005: Sessões de Caixa, Vendas (PDV), Vouchers e Pagamentos
-- Banco: PostgreSQL 15+
-- NOTA: O FarmaPro NÃO possui crediário próprio ou carteira de crédito.
-- O Voucher é uma modalidade originada no cancelamento/devolução autorizada.
-- ==============================================================================

-- 1. Sessões de Caixa (Abertura, Movimentações de Suprimento/Sangria e Fechamento)
CREATE TABLE IF NOT EXISTS caixas_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  dispositivo_id UUID NOT NULL REFERENCES dispositivos_autorizados(id) ON DELETE RESTRICT,
  operador_abertura_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  operador_fechamento_id UUID REFERENCES usuarios(id),
  saldo_inicial_centavos BIGINT NOT NULL DEFAULT 0 CHECK (saldo_inicial_centavos >= 0),
  saldo_fechamento_declarado_centavos BIGINT,
  saldo_fechamento_apurado_centavos BIGINT,
  diferenca_fechamento_centavos BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'FECHADO', 'EM_CONFERENCIA')),
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fechado_em TIMESTAMPTZ,
  observacoes TEXT
);

CREATE INDEX idx_caixas_sessoes_filial ON caixas_sessoes(empresa_id, filial_id, status);

-- 2. Registro Central de Vendas do PDV
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  caixa_sessao_id UUID NOT NULL REFERENCES caixas_sessoes(id) ON DELETE RESTRICT,
  dispositivo_id UUID NOT NULL REFERENCES dispositivos_autorizados(id) ON DELETE RESTRICT,
  operador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  
  numero_cupom_sequencial VARCHAR(30) NOT NULL,
  serie_terminal VARCHAR(20) NOT NULL,
  
  -- Valores em centavos inteiros (sem imprecisão de ponto flutuante)
  subtotal_centavos BIGINT NOT NULL CHECK (subtotal_centavos >= 0),
  desconto_centavos BIGINT NOT NULL DEFAULT 0 CHECK (desconto_centavos >= 0),
  acrescimo_centavos BIGINT NOT NULL DEFAULT 0 CHECK (acrescimo_centavos >= 0),
  total_centavos BIGINT NOT NULL CHECK (total_centavos >= 0),
  troco_centavos BIGINT NOT NULL DEFAULT 0 CHECK (troco_centavos >= 0),
  
  status VARCHAR(20) NOT NULL DEFAULT 'CONCLUIDA' CHECK (status IN (
    'ABERTA',
    'CONCLUIDA',
    'CANCELADA',
    'ESTORNADA'
  )),
  
  cancelado_por_id UUID REFERENCES usuarios(id),
  motivo_cancelamento TEXT,
  cancelado_em TIMESTAMPTZ,
  voucher_gerado_id UUID, -- Preenchido quando o cancelamento gera voucher
  data_hora_emissao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Campos de Resiliência Offline e Idempotência
  id_offline_uuid UUID,
  chave_idempotencia VARCHAR(64) UNIQUE, -- SHA256 da transação única
  sincronizado_em TIMESTAMPTZ,
  versao_sincronizacao INT NOT NULL DEFAULT 1,
  hash_integridade VARCHAR(64),
  
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendas_filial_data ON vendas(empresa_id, filial_id, data_hora_emissao);
CREATE INDEX idx_vendas_cliente ON vendas(empresa_id, cliente_id);
CREATE INDEX idx_vendas_offline_sync ON vendas(empresa_id, sincronizado_em);

-- 3. Itens da Venda
CREATE TABLE IF NOT EXISTS venda_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  lote_id UUID REFERENCES lotes(id) ON DELETE RESTRICT,
  
  numero_item INT NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL CHECK (quantidade > 0),
  preco_unitario_centavos BIGINT NOT NULL CHECK (preco_unitario_centavos >= 0),
  desconto_unitario_centavos BIGINT NOT NULL DEFAULT 0 CHECK (desconto_unitario_centavos >= 0),
  acrescimo_unitario_centavos BIGINT NOT NULL DEFAULT 0 CHECK (acrescimo_unitario_centavos >= 0),
  total_item_centavos BIGINT NOT NULL CHECK (total_item_centavos >= 0),
  
  cancelado BOOLEAN NOT NULL DEFAULT FALSE,
  cancelado_por_id UUID REFERENCES usuarios(id),
  
  -- Rastreabilidade de Medicamentos Controlados / Receitas
  exige_receita BOOLEAN NOT NULL DEFAULT FALSE,
  numero_receita_controle VARCHAR(50),
  crm_medico_prescritor VARCHAR(20),
  uf_crm_medico VARCHAR(2),
  
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_venda_item_numero UNIQUE (venda_id, numero_item)
);

CREATE INDEX idx_venda_itens_produto ON venda_itens(empresa_id, produto_id);
CREATE INDEX idx_venda_itens_lote ON venda_itens(empresa_id, lote_id);

-- 4. Tabela de Vouchers (Originados de cancelamentos autorizados)
-- REGRA OBRIGATÓRIA: Utilização integral em uma única compra.
-- Proibido uso parcial, proibido devolução de troco, proibido saldo residual.
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_origem_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  codigo_voucher VARCHAR(30) NOT NULL,
  valor_centavos BIGINT NOT NULL CHECK (valor_centavos > 0),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  venda_origem_id UUID NOT NULL REFERENCES vendas(id) ON DELETE RESTRICT,
  motivo_cancelamento_origem TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL' CHECK (status IN (
    'DISPONIVEL',
    'UTILIZADO',
    'CANCELADO',
    'EXPIRADO'
  )),
  emitido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  emitido_por_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  autorizado_por_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  
  -- Dados de Resgate
  utilizado_em TIMESTAMPTZ,
  utilizado_por_id UUID REFERENCES usuarios(id),
  filial_resgate_id UUID REFERENCES filiais(id),
  venda_resgate_id UUID REFERENCES vendas(id),
  
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_voucher_codigo_empresa UNIQUE (empresa_id, codigo_voucher)
);

CREATE INDEX idx_vouchers_busca ON vouchers(empresa_id, codigo_voucher, status);
CREATE INDEX idx_vouchers_cliente ON vouchers(empresa_id, cliente_id);
CREATE INDEX idx_vouchers_venda_origem ON vouchers(empresa_id, venda_origem_id);

-- 5. Histórico e Trilha de Auditoria do Voucher
CREATE TABLE IF NOT EXISTS vouchers_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  operacao VARCHAR(30) NOT NULL CHECK (operacao IN (
    'EMISSAO',
    'CONSULTA_VALIDACAO',
    'RESGATE_UTILIZACAO',
    'CANCELAMENTO_VOUCHER',
    'ESTORNO_VENDA_RESGATE'
  )),
  status_anterior VARCHAR(20),
  status_novo VARCHAR(20) NOT NULL,
  venda_id UUID REFERENCES vendas(id),
  operador_id UUID NOT NULL REFERENCES usuarios(id),
  justificativa TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vouchers_historico_voucher ON vouchers_historico(empresa_id, voucher_id, criado_em);

-- 6. Formas de Pagamento da Venda
CREATE TABLE IF NOT EXISTS venda_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  forma_pagamento VARCHAR(30) NOT NULL CHECK (forma_pagamento IN (
    'DINHEIRO',
    'CARTAO_CREDITO',
    'CARTAO_DEBITO',
    'PIX',
    'VOUCHER',
    'CONVENIO_EMPRESA'
  )),
  valor_centavos BIGINT NOT NULL CHECK (valor_centavos > 0),
  parcelas INT NOT NULL DEFAULT 1 CHECK (parcelas >= 1),
  bandeira_cartao VARCHAR(50),
  autorizacao_tef_nsu VARCHAR(50),
  voucher_id UUID REFERENCES vouchers(id) ON DELETE RESTRICT,
  detalhes_transacao JSONB DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venda_pagamentos_venda ON venda_pagamentos(venda_id);
CREATE INDEX idx_venda_pagamentos_voucher ON venda_pagamentos(empresa_id, voucher_id);
