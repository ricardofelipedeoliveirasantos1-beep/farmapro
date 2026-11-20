-- ============================================================================
-- FARMAPRO — ETAPA 08: FORNECEDORES, SOLICITAÇÕES E PEDIDOS DE COMPRA
-- Migração 012: Tabelas de fornecedores centralizados, desativação local,
-- solicitações de compra por filial, pedidos centralizados, itens e histórico
-- ============================================================================

-- 1. TABELA DE FORNECEDORES (Centralizados por Empresa)
CREATE TABLE IF NOT EXISTS fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255) NOT NULL,
    cnpj VARCHAR(14) NOT NULL,
    inscricao_estadual VARCHAR(30),
    email VARCHAR(255),
    telefone VARCHAR(30),
    contato_principal_nome VARCHAR(150),
    contato_principal_cargo VARCHAR(100),
    contato_principal_telefone VARCHAR(30),
    contato_principal_email VARCHAR(255),
    logradouro VARCHAR(255),
    numero VARCHAR(30),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    cep VARCHAR(8),
    condicoes_comerciais TEXT,
    prazo_entrega_dias INT NOT NULL DEFAULT 5,
    dados_bancarios JSONB,
    observacoes TEXT,
    documentos JSONB DEFAULT '[]'::JSONB,
    status VARCHAR(30) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('PENDENTE_APROVACAO', 'ATIVO', 'BLOQUEADO', 'INATIVO')),
    solicitado_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    aprovado_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_aprovacao TIMESTAMPTZ,
    motivo_rejeicao TEXT,
    motivo_bloqueio TEXT,
    bloqueado_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_bloqueio TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_fornecedor_empresa_cnpj UNIQUE (empresa_id, cnpj)
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa ON fornecedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores(cnpj);
CREATE INDEX IF NOT EXISTS idx_fornecedores_status ON fornecedores(empresa_id, status);

-- 2. DESATIVAÇÃO DE FORNECEDOR POR FILIAL (Restrição Local)
CREATE TABLE IF NOT EXISTS fornecedores_filiais_desativados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
    filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
    desativado_por_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    motivo TEXT NOT NULL,
    data_desativacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_fornecedor_filial_desativado UNIQUE (fornecedor_id, filial_id)
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_filiais_desativados_empresa ON fornecedores_filiais_desativados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_filiais_desativados_filial ON fornecedores_filiais_desativados(filial_id);

-- 3. TABELA DE SOLICITAÇÕES DE COMPRA (Iniciadas pelas Filiais)
CREATE TABLE IF NOT EXISTS solicitacoes_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
    numero_sequencial INT NOT NULL,
    solicitado_por_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    justificativa_geral TEXT NOT NULL,
    prioridade VARCHAR(20) NOT NULL DEFAULT 'MEDIA' CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE_APROVACAO' CHECK (status IN ('RASCUNHO', 'PENDENTE_APROVACAO', 'APROVADA_TOTAL', 'APROVADA_PARCIAL', 'REJEITADA', 'CONSOLIDADA', 'CANCELADA')),
    aprovado_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_decisao TIMESTAMPTZ,
    justificativa_decisao TEXT,
    pedido_compra_consolidado_id UUID, -- FK adicionada após a criação da tabela pedidos_compra
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_compra_empresa ON solicitacoes_compra(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_compra_filial ON solicitacoes_compra(filial_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_compra_status ON solicitacoes_compra(empresa_id, status);

-- 4. ITENS DA SOLICITAÇÃO DE COMPRA
CREATE TABLE IF NOT EXISTS solicitacao_compra_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    solicitacao_id UUID NOT NULL REFERENCES solicitacoes_compra(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade_solicitada INT NOT NULL CHECK (quantidade_solicitada > 0),
    quantidade_aprovada INT CHECK (quantidade_aprovada >= 0),
    justificativa_item TEXT
);

CREATE INDEX IF NOT EXISTS idx_solicitacao_itens_solicitacao ON solicitacao_compra_itens(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_solicitacao_itens_produto ON solicitacao_compra_itens(produto_id);

-- 5. TABELA DE PEDIDOS DE COMPRA A FORNECEDORES (Centralizados)
CREATE TABLE IF NOT EXISTS pedidos_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE RESTRICT,
    numero_pedido VARCHAR(50) NOT NULL,
    numero_sequencial INT NOT NULL,
    filial_destino_principal_id UUID REFERENCES filiais(id) ON DELETE RESTRICT,
    destinado_multiplas_filiais BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'PENDENTE_APROVACAO', 'APROVADO', 'ENVIADO_FORNECEDOR', 'CONFIRMADO_FORNECEDOR', 'PARCIALMENTE_ATENDIDO', 'CONCLUIDO', 'CANCELADO')),
    valor_subtotal_centavos BIGINT NOT NULL DEFAULT 0,
    valor_desconto_centavos BIGINT NOT NULL DEFAULT 0,
    valor_frete_centavos BIGINT NOT NULL DEFAULT 0,
    valor_total_centavos BIGINT NOT NULL DEFAULT 0,
    condicoes_pagamento VARCHAR(100),
    prazo_entrega_previsto DATE,
    observacoes TEXT,
    criado_por_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    aprovado_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_aprovacao TIMESTAMPTZ,
    data_envio TIMESTAMPTZ,
    data_confirmacao TIMESTAMPTZ,
    cancelado_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_cancelamento TIMESTAMPTZ,
    motivo_cancelamento TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_pedidos_compra_numero UNIQUE (empresa_id, numero_pedido)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_compra_empresa ON pedidos_compra(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_fornecedor ON pedidos_compra(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_status ON pedidos_compra(empresa_id, status);

-- Adiciona a FK circular segura em solicitacoes_compra para pedidos_compra
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_solicitacao_pedido_consolidado'
    ) THEN
        ALTER TABLE solicitacoes_compra
        ADD CONSTRAINT fk_solicitacao_pedido_consolidado
        FOREIGN KEY (pedido_compra_consolidado_id) REFERENCES pedidos_compra(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. ITENS DO PEDIDO DE COMPRA (Com Destino Específico por Filial)
CREATE TABLE IF NOT EXISTS pedidos_compra_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    pedido_id UUID NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    filial_destino_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
    quantidade_pedida INT NOT NULL CHECK (quantidade_pedida > 0),
    quantidade_entregue INT NOT NULL DEFAULT 0 CHECK (quantidade_entregue >= 0),
    valor_unitario_centavos BIGINT NOT NULL CHECK (valor_unitario_centavos >= 0),
    desconto_centavos BIGINT NOT NULL DEFAULT 0 CHECK (desconto_centavos >= 0),
    valor_total_centavos BIGINT NOT NULL CHECK (valor_total_centavos >= 0),
    solicitacao_item_id UUID REFERENCES solicitacao_compra_itens(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pedidos_compra_itens_pedido ON pedidos_compra_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_itens_produto ON pedidos_compra_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_itens_filial ON pedidos_compra_itens(filial_destino_id);

-- 7. HISTÓRICO E AUDITORIA DE PEDIDOS DE COMPRA
CREATE TABLE IF NOT EXISTS pedidos_compra_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    pedido_id UUID NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
    status_anterior VARCHAR(30),
    status_novo VARCHAR(30) NOT NULL,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    motivo_alteracao TEXT,
    alteracoes_detalhe JSONB,
    data_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pedidos_compra_historico_pedido ON pedidos_compra_historico(pedido_id);

-- 8. ROW-LEVEL SECURITY (RLS) PARA AS NOVAS TABELAS
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores_filiais_desativados ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacao_compra_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_compra_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_compra_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_fornecedores_isolamento ON fornecedores;
CREATE POLICY p_fornecedores_isolamento ON fornecedores
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

DROP POLICY IF EXISTS p_fornecedores_filiais_desativados_isolamento ON fornecedores_filiais_desativados;
CREATE POLICY p_fornecedores_filiais_desativados_isolamento ON fornecedores_filiais_desativados
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

DROP POLICY IF EXISTS p_solicitacoes_compra_isolamento ON solicitacoes_compra;
CREATE POLICY p_solicitacoes_compra_isolamento ON solicitacoes_compra
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

DROP POLICY IF EXISTS p_solicitacao_compra_itens_isolamento ON solicitacao_compra_itens;
CREATE POLICY p_solicitacao_compra_itens_isolamento ON solicitacao_compra_itens
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

DROP POLICY IF EXISTS p_pedidos_compra_isolamento ON pedidos_compra;
CREATE POLICY p_pedidos_compra_isolamento ON pedidos_compra
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

DROP POLICY IF EXISTS p_pedidos_compra_itens_isolamento ON pedidos_compra_itens;
CREATE POLICY p_pedidos_compra_itens_isolamento ON pedidos_compra_itens
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

DROP POLICY IF EXISTS p_pedidos_compra_historico_isolamento ON pedidos_compra_historico;
CREATE POLICY p_pedidos_compra_historico_isolamento ON pedidos_compra_historico
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

-- Conceder permissões para o papel farmapro_app
GRANT SELECT, INSERT, UPDATE, DELETE ON fornecedores TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON fornecedores_filiais_desativados TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON solicitacoes_compra TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON solicitacao_compra_itens TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON pedidos_compra TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON pedidos_compra_itens TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON pedidos_compra_historico TO farmapro_app;
