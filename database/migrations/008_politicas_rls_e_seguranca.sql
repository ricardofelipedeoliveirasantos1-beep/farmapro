-- ==============================================================================
-- FarmaPro — Migração 008: Políticas de Row-Level Security (RLS) e Papéis de Banco
-- Banco: PostgreSQL 15+
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Criação de Roles Dedicadas do PostgreSQL
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Papel da aplicação (não possui BYPASSRLS)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'farmapro_app') THEN
    CREATE ROLE farmapro_app NOINHERIT;
  END IF;

  -- Papel de migrações e manutenção (possui BYPASSRLS)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'farmapro_migrator') THEN
    CREATE ROLE farmapro_migrator NOINHERIT BYPASSRLS;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Habilitação e Imposição de RLS em Todas as Tabelas Multiempresa
-- ------------------------------------------------------------------------------

-- Filiais
ALTER TABLE filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE filiais FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_filiais_isolamento ON filiais;
CREATE POLICY p_filiais_isolamento ON filiais
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Usuários Empresas
ALTER TABLE usuarios_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_empresas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_usuarios_empresas_isolamento ON usuarios_empresas;
CREATE POLICY p_usuarios_empresas_isolamento ON usuarios_empresas
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Cargos
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_cargos_isolamento ON cargos;
CREATE POLICY p_cargos_isolamento ON cargos
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Usuários Filiais
ALTER TABLE usuarios_filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_filiais FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_usuarios_filiais_isolamento ON usuarios_filiais;
CREATE POLICY p_usuarios_filiais_isolamento ON usuarios_filiais
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Dispositivos Autorizados
ALTER TABLE dispositivos_autorizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispositivos_autorizados FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_dispositivos_isolamento ON dispositivos_autorizados;
CREATE POLICY p_dispositivos_isolamento ON dispositivos_autorizados
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Categorias de Produtos
ALTER TABLE categorias_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_produtos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_categorias_isolamento ON categorias_produtos;
CREATE POLICY p_categorias_isolamento ON categorias_produtos
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Produtos
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_produtos_isolamento ON produtos;
CREATE POLICY p_produtos_isolamento ON produtos
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Códigos de Barras
ALTER TABLE produtos_codigos_barras ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos_codigos_barras FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_codigos_barras_isolamento ON produtos_codigos_barras;
CREATE POLICY p_codigos_barras_isolamento ON produtos_codigos_barras
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Medicamentos Dados Farmacêuticos
ALTER TABLE medicamentos_dados_farmaceuticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicamentos_dados_farmaceuticos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_medicamentos_isolamento ON medicamentos_dados_farmaceuticos;
CREATE POLICY p_medicamentos_isolamento ON medicamentos_dados_farmaceuticos
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Produtos Filiais
ALTER TABLE produtos_filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos_filiais FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_produtos_filiais_isolamento ON produtos_filiais;
CREATE POLICY p_produtos_filiais_isolamento ON produtos_filiais
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

-- Lotes
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_lotes_isolamento ON lotes;
CREATE POLICY p_lotes_isolamento ON lotes
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

-- Clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_clientes_isolamento ON clientes;
CREATE POLICY p_clientes_isolamento ON clientes
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Consentimentos LGPD
ALTER TABLE clientes_consentimentos_lgpd ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_consentimentos_lgpd FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_consentimentos_isolamento ON clientes_consentimentos_lgpd;
CREATE POLICY p_consentimentos_isolamento ON clientes_consentimentos_lgpd
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Carteira de Movimentações de Clientes
ALTER TABLE clientes_carteira_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_carteira_movimentacoes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_carteira_isolamento ON clientes_carteira_movimentacoes;
CREATE POLICY p_carteira_isolamento ON clientes_carteira_movimentacoes
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Caixas Sessões
ALTER TABLE caixas_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas_sessoes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_caixas_isolamento ON caixas_sessoes;
CREATE POLICY p_caixas_isolamento ON caixas_sessoes
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

-- Vendas
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_vendas_isolamento ON vendas;
CREATE POLICY p_vendas_isolamento ON vendas
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

-- Venda Itens
ALTER TABLE venda_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE venda_itens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_venda_itens_isolamento ON venda_itens;
CREATE POLICY p_venda_itens_isolamento ON venda_itens
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

-- Venda Pagamentos
ALTER TABLE venda_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE venda_pagamentos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_venda_pagamentos_isolamento ON venda_pagamentos;
CREATE POLICY p_venda_pagamentos_isolamento ON venda_pagamentos
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

-- Estoque Saldos
ALTER TABLE estoque_saldos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_saldos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_estoque_saldos_isolamento ON estoque_saldos;
CREATE POLICY p_estoque_saldos_isolamento ON estoque_saldos
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

-- Estoque Reservas
ALTER TABLE estoque_reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_reservas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_estoque_reservas_isolamento ON estoque_reservas;
CREATE POLICY p_estoque_reservas_isolamento ON estoque_reservas
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

-- Estoque Movimentações
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_estoque_movimentacoes_isolamento ON estoque_movimentacoes;
CREATE POLICY p_estoque_movimentacoes_isolamento ON estoque_movimentacoes
  USING (empresa_id = current_empresa_id() AND (current_filial_id() IS NULL OR filial_id = current_filial_id()))
  WITH CHECK (empresa_id = current_empresa_id());

-- Auditoria Logs
ALTER TABLE auditoria_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_auditoria_logs_isolamento ON auditoria_logs;
CREATE POLICY p_auditoria_logs_isolamento ON auditoria_logs
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Sincronização Conflitos
ALTER TABLE sincronizacao_offline_conflitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sincronizacao_offline_conflitos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_conflitos_isolamento ON sincronizacao_offline_conflitos;
CREATE POLICY p_conflitos_isolamento ON sincronizacao_offline_conflitos
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());
