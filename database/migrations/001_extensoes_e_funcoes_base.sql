-- ==============================================================================
-- FarmaPro — Migração 001: Extensões e Funções Base
-- Banco: PostgreSQL 15+
-- ==============================================================================

-- Extensões opcionais para funções auxiliares (compatível com PG 13+ onde gen_random_uuid() é nativo)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- gen_random_uuid() já é nativo do PostgreSQL 13+
END $$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- ------------------------------------------------------------------------------
-- Funções utilitárias para extração do contexto da sessão de Tenant (RLS)
-- ------------------------------------------------------------------------------

-- Retorna o UUID da Empresa corrente da sessão
CREATE OR REPLACE FUNCTION current_empresa_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_empresa_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Retorna o UUID da Filial corrente da sessão
CREATE OR REPLACE FUNCTION current_filial_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_filial_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Retorna o UUID do Usuário operador corrente da sessão
CREATE OR REPLACE FUNCTION current_usuario_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_usuario_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- Gatilho automático para atualização do campo atualizado_em
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_timestamp_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
