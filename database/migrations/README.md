# FarmaPro — Guia de Migrações e Ordem de Execução SQL

## 1. Diretrizes de Segurança (IMPORTANTE)
* **Status:** Todos os scripts nesta pasta foram gerados estritamente para revisão técnica e aprovação de arquitetura.
* **RESTRIÇÃO:** NENHUM script desta pasta foi executado automaticamente em banco de dados de produção ou remoto, em estrito cumprimento às instruções da Etapa 03.

---

## 2. Ordem de Execução das Migrações

A ordem de execução deve ser rigorosamente sequencial para respeitar chaves estrangeiras e funções utilitárias:

| Ordem | Arquivo | Descrição |
| :---: | :--- | :--- |
| **01** | `001_extensoes_e_funcoes_base.sql` | Instala `uuid-ossp`, `pgcrypto` e funções de contexto de sessão RLS (`current_empresa_id()`, etc.). |
| **02** | `002_tabelas_multiempresa_e_acesso.sql` | Cria tabelas de `empresas`, `filiais`, `usuarios`, `usuarios_empresas`, `cargos`, `permissoes`, `usuarios_filiais` e `dispositivos_autorizados`. |
| **03** | `003_tabelas_produtos_medicamentos_e_lotes.sql` | Cria catálogo desacoplado: `categorias_produtos`, `produtos`, `produtos_codigos_barras`, `medicamentos_dados_farmaceuticos`, `produtos_filiais` e `lotes`. |
| **04** | `004_tabelas_clientes_e_lgpd.sql` | Cria `clientes`, crediário, `clientes_consentimentos_lgpd` e `clientes_carteira_movimentacoes`. |
| **05** | `005_tabelas_caixas_e_vendas.sql` | Cria `caixas_sessoes`, `vendas`, `venda_itens` e `venda_pagamentos` com suporte a idempotência e offline. |
| **06** | `006_tabelas_estoque_e_movimentacoes.sql` | Cria `estoque_saldos`, livro-razão imutável `estoque_movimentacoes` e `estoque_reservas`. |
| **07** | `007_tabelas_auditoria_e_offline.sql` | Cria `auditoria_logs` (ledger imutável de eventos) e `sincronizacao_offline_conflitos`. |
| **08** | `008_politicas_rls_e_seguranca.sql` | Habilita e impõe `ROW LEVEL SECURITY (RLS)` em todas as 23 tabelas com dados de tenants. |

---

## 3. Como o Backend (Fastify) Opera com as Migrações
Em produção, a aplicação conecta-se ao PostgreSQL utilizando o usuário `farmapro_app` (sem privilégios de `BYPASSRLS`). Em cada requisição recebida, o middleware de Tenant Context abre uma transação e executa:
```sql
SET LOCAL app.current_empresa_id = 'UUID-DA-EMPRESA';
SET LOCAL app.current_filial_id  = 'UUID-DA-FILIAL';
SET LOCAL app.current_usuario_id = 'UUID-DO-OPERADOR';
```
Qualquer consulta posterior dentro da transação tem filtragem forçada em hardware/kernel pelo PostgreSQL, impedindo vazamento de dados entre concorrentes.
