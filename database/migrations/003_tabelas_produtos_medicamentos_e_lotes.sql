-- ==============================================================================
-- FarmaPro — Migração 003: Produtos, Medicamentos e Rastreabilidade de Lotes
-- Banco: PostgreSQL 15+
-- ==============================================================================

-- 1. Categorias Mercadológicas de Produtos
CREATE TABLE IF NOT EXISTS categorias_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  categoria_pai_id UUID REFERENCES categorias_produtos(id) ON DELETE SET NULL,
  nome VARCHAR(100) NOT NULL,
  codigo VARCHAR(30),
  descricao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_categoria_empresa UNIQUE (empresa_id, nome)
);

CREATE INDEX idx_categorias_empresa ON categorias_produtos(empresa_id);

-- 2. Cadastro Central de Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias_produtos(id) ON DELETE SET NULL,
  nome_comercial VARCHAR(255) NOT NULL,
  nome_generico VARCHAR(255),
  fabricante VARCHAR(150) NOT NULL,
  apresentacao VARCHAR(255) NOT NULL,
  descricao TEXT,
  unidade_medida VARCHAR(10) NOT NULL DEFAULT 'UN' CHECK (unidade_medida IN ('UN', 'CX', 'FR', 'BL', 'TB', 'ENV', 'KG', 'L')),
  tipo_produto VARCHAR(40) NOT NULL CHECK (tipo_produto IN (
    'MEDICAMENTO_REFERENCIA',
    'MEDICAMENTO_GENERICO',
    'MEDICAMENTO_SIMILAR',
    'MEDICAMENTO_MIP',
    'HIGIENE_BELEZA',
    'COSMETICOS',
    'PERFUMARIA',
    'INFANTIL',
    'SUPLEMENTO_ALIMENTAR',
    'PRODUTO_SAUDE_CORRELATO',
    'CONVENIENCIA',
    'DIVERSOS'
  )),
  fracionavel BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_produtos_empresa_nome ON produtos(empresa_id, nome_comercial);
CREATE INDEX idx_produtos_empresa_tipo ON produtos(empresa_id, tipo_produto);

-- 3. Códigos de Barras Vinculados ao Produto (Suporte a múltiplos códigos por item)
CREATE TABLE IF NOT EXISTS produtos_codigos_barras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  codigo_barras VARCHAR(50) NOT NULL,
  tipo_codigo VARCHAR(20) NOT NULL DEFAULT 'EAN13' CHECK (tipo_codigo IN ('EAN13', 'EAN14', 'DUN14', 'CODIGO_INTERNO', 'DATAMATRIX')),
  e_principal BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_codigo_barras_empresa UNIQUE (empresa_id, codigo_barras)
);

CREATE INDEX idx_codigos_barras_busca ON produtos_codigos_barras(empresa_id, codigo_barras);

-- 4. Informações Regulatórias e Farmacêuticas (1:0..1 com Produtos)
-- Preenchido exclusivamente para produtos que sejam medicamentos
CREATE TABLE IF NOT EXISTS medicamentos_dados_farmaceuticos (
  produto_id UUID PRIMARY KEY REFERENCES produtos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  principio_ativo_dci TEXT NOT NULL,
  concentracao VARCHAR(100),
  forma_farmaceutica VARCHAR(100) NOT NULL, -- Ex: Comprimido, Xarope, Solução
  via_administracao VARCHAR(50) NOT NULL,    -- Ex: Oral, Tópica, Injetável
  registro_anvisa VARCHAR(20),               -- Formato oficial 13 dígitos
  classificacao_receita VARCHAR(50) NOT NULL CHECK (classificacao_receita IN (
    'ISENTO',                                -- MIPs
    'RECEITA_BRANCA_SIMPLES',                -- Tarja vermelha comum
    'RECEITA_BRANCA_CONTROLE_ESPECIAL',      -- Antimicrobianos / Lista C1
    'RECEITA_AZUL',                          -- Psicotrópicos Listas B1/B2
    'RECEITA_AMARELA',                       -- Entorpecentes Listas A1/A2/A3
    'RECEITA_RETENCAO_OUTROS'
  )),
  lista_controlado_portaria344 VARCHAR(10),  -- A1, A2, B1, B2, C1, C2...
  termossensivel BOOLEAN NOT NULL DEFAULT FALSE,
  temperatura_minima_celsius NUMERIC(4,1),
  temperatura_maxima_celsius NUMERIC(4,1),
  exige_sngpc BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medicamentos_principio_ativo ON medicamentos_dados_farmaceuticos(empresa_id, principio_ativo_dci);

-- 5. Configurações Comerciais e Preços por Filial
CREATE TABLE IF NOT EXISTS produtos_filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  preco_custo_centavos BIGINT NOT NULL DEFAULT 0 CHECK (preco_custo_centavos >= 0),
  preco_venda_centavos BIGINT NOT NULL CHECK (preco_venda_centavos >= 0),
  preco_promocional_centavos BIGINT CHECK (preco_promocional_centavos IS NULL OR preco_promocional_centavos >= 0),
  estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_maximo NUMERIC(12,3) NOT NULL DEFAULT 0,
  localizacao_prateleira VARCHAR(50),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_produto_filial UNIQUE (filial_id, produto_id)
);

CREATE INDEX idx_produtos_filiais_busca ON produtos_filiais(empresa_id, filial_id, produto_id);

-- 6. Lotes e Controle de Validade (Rastreabilidade Unitária por Filial)
CREATE TABLE IF NOT EXISTS lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  numero_lote VARCHAR(50) NOT NULL,
  data_fabricacao DATE NOT NULL,
  data_validade DATE NOT NULL,
  quantidade_recebida NUMERIC(12,3) NOT NULL CHECK (quantidade_recebida >= 0),
  quantidade_disponivel NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantidade_disponivel >= 0),
  quantidade_reservada NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantidade_reservada >= 0),
  quantidade_bloqueada NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantidade_bloqueada >= 0),
  custo_unitario_centavos BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN (
    'ATIVO',
    'QUARENTENA',
    'BLOQUEADO',
    'VENCIDO',
    'ESGOTADO'
  )),
  motivo_bloqueio TEXT,
  origem_entrada_tipo VARCHAR(30) NOT NULL DEFAULT 'COMPRA_NFE' CHECK (origem_entrada_tipo IN (
    'COMPRA_NFE',
    'AJUSTE_INVENTARIO',
    'TRANSFERENCIA_ENTRADA',
    'DEVOLUCAO_CLIENTE'
  )),
  origem_entrada_id VARCHAR(100),
  temperatura_monitorada NUMERIC(4,1),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lote_filial_produto UNIQUE (filial_id, produto_id, numero_lote)
);

CREATE INDEX idx_lotes_validade_fefo ON lotes(filial_id, produto_id, data_validade, status);
CREATE INDEX idx_lotes_empresa ON lotes(empresa_id, status);
