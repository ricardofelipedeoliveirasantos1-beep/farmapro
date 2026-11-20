# FarmaPro — Documento de Arquitetura Técnica (DAT)

## 1. Princípios de Engenharia
1. **Identidade Visual:** Exclusivamente **Light Mode** para garantir ergonomia visual em ambientes de balcão e retaguarda de farmácia.
2. **Localização:** Todo o sistema é projetado nativamente em **Português do Brasil (pt-BR)**.
3. **Multi-tenancy:** Segregação rígida por empresa e filial.
4. **Precisão Numérica:** Valores monetários armazenados em **centavos inteiros**, prevenindo desvios contábeis.
5. **Offline-First:** O PDV de balcão deve continuar registrando vendas caso a conexão com a nuvem caia, sincronizando assim que restabelecida.

## 2. Visão dos Componentes
* **Monorepo (npm Workspaces):**
  * `apps/web`: Interface de usuário SaaS em React, Vite e Tailwind CSS.
  * `apps/api`: Backend de alta performance em Node.js com Fastify.
  * `packages/shared`: Contratos de tipos TypeScript, entidades e utilitários compartilhados.
  * `packages/ui`: Biblioteca de componentes atômicos do Design System.
  * `packages/config`: Presets compartilhados de TypeScript e ferramentas.

## 3. Segurança e LGPD
* Isolamento de banco via RLS no PostgreSQL.
* Senhas criptografadas com Argon2 ou bcrypt.
* Sessões gerenciadas via JWT assinado com chave assimétrica ou segredo seguro e refresh tokens rotativos.
* Logs de auditoria imutáveis para operações financeiras e dispensação de medicamentos controlados.

