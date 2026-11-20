-- ==============================================================================
-- FarmaPro — Migração 007: Trilha de Auditoria Imutável e Fila de Conflitos Offline
-- Banco: PostgreSQL 15+
--
-- DIRETRIZ DE PRESERVAÇÃO: A trilha de auditoria utiliza ON DELETE RESTRICT
-- para garantir que eventos históricos nunca sejam expurgados em cascata.
-- ==============================================================================

-- 1. Trilha de Auditoria Geral (Audit Trail)
-- Imutável: nunca deve sofrer UPDATE ou DELETE
CREATE TABLE IF NOT EXISTS auditoria_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  filial_id UUID REFERENCES filiais(id) ON DELETE RESTRICT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  
  operacao VARCHAR(30) NOT NULL CHECK (operacao IN (
    'INSERT',
    'UPDATE',
    'DELETE',
    'LOGIN_SUCESSO',
    'LOGIN_FALHA',
    'DESCONTO_ALCADA_SUPERIOR',
    'CANCELAMENTO_ITEM_PDV',
    'CANCELAMENTO_VENDA_TOTAL',
    'EMISSAO_VOUCHER_CANCELAMENTO',
    'RESGATE_VOUCHER_PDV',
    'SANGRIA_CAIXA',
    'SUPRIMENTO_CAIXA',
    'AJUSTE_ESTOQUE_MANUAL',
    'BLOQUEIO_LOTE_ANVISA'
  )),
  
  tabela_afetada VARCHAR(60) NOT NULL,
  registro_afetado_id VARCHAR(100),
  
  -- Snapshots em JSONB para rastrear o que mudou
  dados_anteriores JSONB,
  dados_novos JSONB,
  
  ip_origem VARCHAR(45),
  user_agent TEXT,
  dispositivo_id UUID REFERENCES dispositivos_autorizados(id) ON DELETE SET NULL,
  id_offline_uuid UUID,
  
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_empresa_data ON auditoria_logs(empresa_id, criado_em DESC);
CREATE INDEX idx_auditoria_tabela_reg ON auditoria_logs(empresa_id, tabela_afetada, registro_afetado_id);

-- 2. Fila de Conflitos de Sincronização Offline
-- Utilizada quando uma venda ou baixa de estoque offline colide com o estado do servidor
CREATE TABLE IF NOT EXISTS sincronizacao_offline_conflitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  dispositivo_id UUID NOT NULL REFERENCES dispositivos_autorizados(id) ON DELETE CASCADE,
  
  entidade_tipo VARCHAR(40) NOT NULL CHECK (entidade_tipo IN ('VENDA', 'ESTOQUE_MOVIMENTO', 'CLIENTE')),
  id_offline_uuid UUID NOT NULL,
  chave_idempotencia VARCHAR(64),
  dados_payload JSONB NOT NULL,
  
  tipo_conflito VARCHAR(40) NOT NULL CHECK (tipo_conflito IN (
    'ESTOQUE_INSUFICIENTE_OFFLINE',
    'DIVERGENCIA_PRECO_CATALOGO',
    'LOTE_VENCIDO_DURANTE_OFFLINE',
    'DUPLICIDADE_CHAVE_REJEITADA'
  )),
  
  resolucao_adotada VARCHAR(30) NOT NULL DEFAULT 'PENDENTE_INTERVENCAO' CHECK (resolucao_adotada IN (
    'PENDENTE_INTERVENCAO',
    'ACEITO_COM_AJUSTE_ESTOQUE',
    'REJEITADO_RECONCILIADO',
    'IGNORADO_DUPLICADO'
  )),
  
  resolvido_por_id UUID REFERENCES usuarios(id),
  resolvido_em TIMESTAMPTZ,
  detalhes_resolucao TEXT,
  
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conflitos_pendentes ON sincronizacao_offline_conflitos(empresa_id, filial_id, resolucao_adotada);
