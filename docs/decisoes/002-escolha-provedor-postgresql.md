# ADR 002: Arquitetura do Banco de Dados PostgreSQL e Avaliação de Provedores

## Status
Aprovado (Etapa 03)

## 1. Contexto e Requisitos do FarmaPro
O FarmaPro exige um banco de dados relacional robusto, com suporte integral a:
1. **Row-Level Security (RLS):** Isolamento de dados multiempresa nativo no motor de banco, garantindo que queries da aplicação nunca acessem registros de outro tenant.
2. **Precisão e Integridade Financeira:** Transações ACID estritas para vendas, movimentações de estoque, crediário e caixa.
3. **Alta Disponibilidade e Resiliência:** Farmácias operam em horários estendidos (frequentemente 7 dias por semana). Falhas no banco central impactam a sincronização do PDV e retaguarda.
4. **Recuperação Ponto-a-Ponto (PITR):** Backups contínuos com capacidade de restauração para um minuto específico em caso de corrupção ou incidente operacional.
5. **Agnosticismo de Nuvem:** O esquema SQL, funções e políticas RLS devem ser 100% portáveis em qualquer PostgreSQL 15+, sem dependência proprietária de um único vendor.

---

## 2. Comparativo Técnico de Provedores de PostgreSQL

| Critério | Provedores Gerenciados Tradicionais (AWS RDS / Cloud SQL) | Provedores Modernos / Serverless (Neon / Supabase) | Autogerenciado (Docker / VPS / Bare-Metal) |
| :--- | :--- | :--- | :--- |
| **Suporte a RLS** | Nativo (PostgreSQL padrão) | Nativo (PostgreSQL padrão) | Nativo (PostgreSQL padrão) |
| **Backups & PITR** | Automatizados, retenção configurável, PITR nativo | Automatizados (planos pagos), PITR nos tiers Pro | Totalmente manual (scripts pg_dump, WAL archiving, pgBackRest) |
| **Conexões & Pooling** | Exige PgBouncer separado ou RDS Proxy | Pooler integrado (Supavisor / PgBouncer nativo) | Exige configuração manual de PgBouncer |
| **Escalabilidade** | Vertical com resize de instância; réplicas de leitura | Elástica (auto-scaling em Neon; tiers gerenciados) | Manual (adicionar nós, gerenciar réplicas lógicas/físicas) |
| **Custos Iniciais** | Médio / Alto (instância mínima 24/7 ligada) | Baixo / Médio (tiers de entrada muito competitivos) | Baixo em infraestrutura, altíssimo em horas de DevOps |
| **SLA e Alta Disponibilidade** | 99.95% a 99.99% com Multi-AZ automatizado | 99.9% a 99.95% (conforme tier) | Depende exclusivamente da infraestrutura própria |
| **Segurança e Rede** | VPC privada, peering, IP restrito, KMS | SSL obrigatório, restrições de IP em tiers corporativos | Responsabilidade total do administrador do servidor |

---

## 3. Decisão Arquitetural

1. **Agnosticismo Técnico Estrito:**
   * Toda a DDL (tabelas, chaves, índices, constraints), funções PL/pgSQL e políticas RLS foram escritas estritamente em **SQL ANSI e dialeto PostgreSQL 15+ padrão**.
   * Não utilizamos extensões proprietárias ou recursos exclusivos de uma única plataforma.

2. **Recomendação para Produção Comercial:**
   * **Ambiente de Produção SaaS:** Provedor gerenciado com **Multi-AZ**, **PITR de 7 a 30 dias** e **Pooler de Conexões integrado** (ex: Google Cloud SQL for PostgreSQL ou AWS RDS for PostgreSQL).
   * **Ambiente de Homologação / Staging:** Instância gerenciada compatível com pooler (ex: Neon ou Supabase com pooler em modo transacional), aproveitando facilidade de provisionamento e baixo custo inicial.
   * **Ambiente Local de Desenvolvimento:** PostgreSQL 16 local ou via contêiner para testes automatizados.

3. **Arquitetura de Conexões do Backend (Fastify):**
   * A aplicação utilizará pool de conexões configurado para gerenciar variáveis de sessão de tenant (`app.current_empresa_id` e `app.current_filial_id`) via transações locais (`SET LOCAL`), garantindo que a reutilização de conexões não contamine o contexto de outros tenants.

---

## 4. Consequências
* O FarmaPro não fica refém de nenhum fornecedor de nuvem (zero lock-in).
* Migração simples entre provedores apenas executando os scripts SQL padrões e restaurando o dump.
* Custo previsível e segurança corporativa assegurada por RLS.
