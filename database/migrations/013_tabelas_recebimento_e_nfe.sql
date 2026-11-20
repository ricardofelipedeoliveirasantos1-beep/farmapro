-- ==============================================================================
-- FarmaPro — Migração 013: Recebimento de Mercadorias e Importação de XML de NF-e
-- Banco: PostgreSQL 15+
--
-- DIRETRIZ DE SEGURANÇA E AUDITORIA:
-- 1. Importação de XML de NF-e com chave de acesso única de 44 dígitos por empresa.
-- 2. Armazenamento do XML original para fins de auditoria e conformidade fiscal.
-- 3. Tripla conferência: Pedido de Compra x NF-e x Contagem Física.
-- 4. Separação explícita entre quantidade física recebida e liberada para venda.
-- 5. Segregação de funções: quem registra divergência não pode aprová-la.
-- 6. Garantia de que a importação de XML NÃO altera o estoque físico sem conferência.
-- ==============================================================================

-- 1. TABELA DE NOTAS FISCAIS ELETRÔNICAS RECEBIDAS (Importação de XML)
CREATE TABLE IF NOT EXISTS nfe_recebidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
    chave_acesso VARCHAR(44) NOT NULL,
    numero_nfe VARCHAR(20) NOT NULL,
    serie_nfe VARCHAR(10) NOT NULL,
    data_emissao TIMESTAMPTZ NOT NULL,
    fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE RESTRICT,
    cnpj_emitente VARCHAR(14) NOT NULL,
    razao_social_emitente VARCHAR(255) NOT NULL,
    nome_fantasia_emitente VARCHAR(255),
    cnpj_destinatario VARCHAR(14) NOT NULL,
    valor_produtos_centavos BIGINT NOT NULL DEFAULT 0,
    valor_frete_centavos BIGINT NOT NULL DEFAULT 0,
    valor_desconto_centavos BIGINT NOT NULL DEFAULT 0,
    valor_total_centavos BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'IMPORTADA' CHECK (status IN (
        'IMPORTADA',
        'EM_CONFERENCIA',
        'CONCILIADA',
        'DIVERGENCIA_PENDENTE',
        'RECEBIDA_PARCIAL',
        'RECEBIDA_TOTAL',
        'CANCELADA'
    )),
    pedido_compra_id UUID REFERENCES pedidos_compra(id) ON DELETE SET NULL,
    xml_conteudo TEXT NOT NULL,
    importado_por_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_nfe_chave_empresa UNIQUE (empresa_id, chave_acesso)
);

CREATE INDEX IF NOT EXISTS idx_nfe_recebidas_empresa ON nfe_recebidas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_nfe_recebidas_filial ON nfe_recebidas(filial_id);
CREATE INDEX IF NOT EXISTS idx_nfe_recebidas_chave ON nfe_recebidas(empresa_id, chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfe_recebidas_fornecedor ON nfe_recebidas(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_nfe_recebidas_pedido ON nfe_recebidas(pedido_compra_id);
CREATE INDEX IF NOT EXISTS idx_nfe_recebidas_status ON nfe_recebidas(empresa_id, status);

-- 2. ITENS DA NOTA FISCAL IMPORTADA
CREATE TABLE IF NOT EXISTS nfe_recebida_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    nfe_id UUID NOT NULL REFERENCES nfe_recebidas(id) ON DELETE CASCADE,
    numero_item INT NOT NULL,
    codigo_produto_fornecedor VARCHAR(60) NOT NULL,
    codigo_barras VARCHAR(50),
    nome_produto VARCHAR(255) NOT NULL,
    ncm VARCHAR(20),
    cfop VARCHAR(10),
    unidade_comercial VARCHAR(10) NOT NULL DEFAULT 'UN',
    quantidade_comercial NUMERIC(12,3) NOT NULL CHECK (quantidade_comercial > 0),
    valor_unitario_centavos BIGINT NOT NULL CHECK (valor_unitario_centavos >= 0),
    valor_total_centavos BIGINT NOT NULL CHECK (valor_total_centavos >= 0),
    desconto_centavos BIGINT NOT NULL DEFAULT 0 CHECK (desconto_centavos >= 0),
    produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
    pedido_item_id UUID REFERENCES pedidos_compra_itens(id) ON DELETE SET NULL,
    lote_fornecedor VARCHAR(50),
    data_fabricacao DATE,
    data_validade DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nfe_itens_nfe ON nfe_recebida_itens(nfe_id);
CREATE INDEX IF NOT EXISTS idx_nfe_itens_produto ON nfe_recebida_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_nfe_itens_codigo_barras ON nfe_recebida_itens(empresa_id, codigo_barras);

-- 3. TABELA DE RECEBIMENTOS DE MERCADORIAS (Sessão de Conferência Física)
CREATE TABLE IF NOT EXISTS recebimentos_mercadorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
    nfe_id UUID REFERENCES nfe_recebidas(id) ON DELETE RESTRICT,
    pedido_compra_id UUID REFERENCES pedidos_compra(id) ON DELETE RESTRICT,
    numero_recebimento VARCHAR(50) NOT NULL,
    numero_sequencial INT NOT NULL,
    status VARCHAR(35) NOT NULL DEFAULT 'EM_CONFERENCIA' CHECK (status IN (
        'EM_CONFERENCIA',
        'AGUARDANDO_APROVACAO_DIVERGENCIA',
        'APROVADO',
        'CONCLUIDO',
        'REJEITADO',
        'CANCELADO'
    )),
    tem_divergencia BOOLEAN NOT NULL DEFAULT false,
    justificativa_divergencia TEXT,
    divergencia_registrada_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    divergencia_aprovada_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_aprovacao_divergencia TIMESTAMPTZ,
    -- Limite da Etapa 09: Dados estruturados para reconhecimento no Contas a Pagar
    valor_total_nfe_centavos BIGINT NOT NULL DEFAULT 0,
    valor_total_pedido_centavos BIGINT NOT NULL DEFAULT 0,
    valor_reconhecido_centavos BIGINT NOT NULL DEFAULT 0,
    conferido_por_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    finalizado_por_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_recebimento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_recebimento_numero UNIQUE (empresa_id, numero_recebimento),
    CONSTRAINT chk_segregacao_funcoes_divergencia CHECK (
        divergencia_aprovada_por_id IS NULL OR 
        divergencia_registrada_por_id IS NULL OR 
        divergencia_aprovada_por_id <> divergencia_registrada_por_id
    )
);

CREATE INDEX IF NOT EXISTS idx_recebimentos_empresa ON recebimentos_mercadorias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_filial ON recebimentos_mercadorias(filial_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_nfe ON recebimentos_mercadorias(nfe_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_pedido ON recebimentos_mercadorias(pedido_compra_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_status ON recebimentos_mercadorias(empresa_id, status);

-- 4. ITENS DO RECEBIMENTO DE MERCADORIAS (Conferência Física, Lotes e Destino)
CREATE TABLE IF NOT EXISTS recebimento_mercadoria_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    recebimento_id UUID NOT NULL REFERENCES recebimentos_mercadorias(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    filial_destino_id UUID NOT NULL REFERENCES filiais(id) ON DELETE RESTRICT,
    pedido_item_id UUID REFERENCES pedidos_compra_itens(id) ON DELETE SET NULL,
    nfe_item_id UUID REFERENCES nfe_recebida_itens(id) ON DELETE SET NULL,
    quantidade_pedida NUMERIC(12,3) NOT NULL DEFAULT 0,
    quantidade_nota_fiscal NUMERIC(12,3) NOT NULL DEFAULT 0,
    quantidade_recebida_fisica NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantidade_recebida_fisica >= 0),
    quantidade_liberada_venda NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantidade_liberada_venda >= 0),
    valor_unitario_pedido_centavos BIGINT NOT NULL DEFAULT 0,
    valor_unitario_nfe_centavos BIGINT NOT NULL DEFAULT 0,
    valor_unitario_reconhecido_centavos BIGINT NOT NULL DEFAULT 0,
    numero_lote VARCHAR(50) NOT NULL,
    data_fabricacao DATE NOT NULL,
    data_validade DATE NOT NULL,
    status_lote VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status_lote IN (
        'ATIVO',
        'QUARENTENA',
        'BLOQUEADO',
        'VENCIDO'
    )),
    divergencia_detectada VARCHAR(50) NOT NULL DEFAULT 'NENHUMA' CHECK (divergencia_detectada IN (
        'NENHUMA',
        'QUANTIDADE_A_MAIS',
        'QUANTIDADE_A_MENOS',
        'PRECO_DIVERGENTE',
        'PRODUTO_DIVERGENTE',
        'LOTE_VENCIDO',
        'AVARIA_QUARENTENA',
        'OUTRA'
    )),
    motivo_divergencia TEXT,
    lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
    estoque_atualizado BOOLEAN NOT NULL DEFAULT false,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rec_itens_recebimento ON recebimento_mercadoria_itens(recebimento_id);
CREATE INDEX IF NOT EXISTS idx_rec_itens_produto ON recebimento_mercadoria_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_rec_itens_filial_destino ON recebimento_mercadoria_itens(filial_destino_id);
CREATE INDEX IF NOT EXISTS idx_rec_itens_pedido_item ON recebimento_mercadoria_itens(pedido_item_id);

-- 5. HISTÓRICO E AUDITORIA DE DIVERGÊNCIAS NO RECEBIMENTO
CREATE TABLE IF NOT EXISTS recebimento_divergencias_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    recebimento_id UUID NOT NULL REFERENCES recebimentos_mercadorias(id) ON DELETE CASCADE,
    tipo_divergencia VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('REGISTRADA', 'APROVADA', 'REJEITADA')),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    justificativa TEXT NOT NULL,
    detalhes JSONB,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rec_div_hist_recebimento ON recebimento_divergencias_historico(recebimento_id);

-- 6. ROW-LEVEL SECURITY (RLS) MULTIEMPRESA
ALTER TABLE nfe_recebidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_recebida_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE recebimentos_mercadorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE recebimento_mercadoria_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE recebimento_divergencias_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_nfe_recebidas_isolamento ON nfe_recebidas;
CREATE POLICY p_nfe_recebidas_isolamento ON nfe_recebidas
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

DROP POLICY IF EXISTS p_nfe_recebida_itens_isolamento ON nfe_recebida_itens;
CREATE POLICY p_nfe_recebida_itens_isolamento ON nfe_recebida_itens
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

DROP POLICY IF EXISTS p_recebimentos_mercadorias_isolamento ON recebimentos_mercadorias;
CREATE POLICY p_recebimentos_mercadorias_isolamento ON recebimentos_mercadorias
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

DROP POLICY IF EXISTS p_recebimento_mercadoria_itens_isolamento ON recebimento_mercadoria_itens;
CREATE POLICY p_recebimento_mercadoria_itens_isolamento ON recebimento_mercadoria_itens
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

DROP POLICY IF EXISTS p_recebimento_divergencias_historico_isolamento ON recebimento_divergencias_historico;
CREATE POLICY p_recebimento_divergencias_historico_isolamento ON recebimento_divergencias_historico
    FOR ALL TO farmapro_app
    USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID)
    WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::UUID);

-- Permissões ao usuário de aplicação
GRANT SELECT, INSERT, UPDATE, DELETE ON nfe_recebidas TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON nfe_recebida_itens TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON recebimentos_mercadorias TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON recebimento_mercadoria_itens TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON recebimento_divergencias_historico TO farmapro_app;
