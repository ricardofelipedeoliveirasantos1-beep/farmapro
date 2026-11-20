# FarmaPro — Arquitetura de Banco de Dados & RLS (PostgreSQL)

## 1. Visão Geral do Isolamento Multiempresa

No FarmaPro, a proteção dos dados de cada farmácia é garantida em múltiplos níveis:
1. **Camada de Aplicação:** Middleware extrai e valida `empresaId` e `filialId` a partir de credenciais autenticadas.
2. **Camada de Persistência (PostgreSQL RLS):** Políticas nativas de **Row-Level Security** garantem que nenhuma query (mesmo com erros de sintaxe ou injeções) consiga ler ou escrever registros de outros tenants.

## 2. Padrão de RLS Planejado (Para Etapa 03)

Nas tabelas operacionais, a coluna `empresa_id UUID NOT NULL` será incluída como chave estrangeira mandatória.

Exemplo conceitual da política:
```sql
-- Ativação de RLS na tabela
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- Política de isolamento por sessão de tenant
CREATE POLICY tenant_isolation_policy ON produtos
  USING (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::uuid)
  WITH CHECK (empresa_id = NULLIF(current_setting('app.current_empresa_id', true), '')::uuid);
```

## 3. Diretrizes de Migrações
* As migrações serão versionadas e executadas através de ferramentas automatizadas.
* Nenhuma migração ou criação de tabelas operacionais foi executada na Etapa 02, preservando a fase de fundação.

