# ADR 001: Escolha da Stack Base, Monorepo e Isolamento Multiempresa

## Status
Aprovado (Etapa 02)

## Contexto
O FarmaPro é uma plataforma SaaS profissional para farmácias no Brasil. Exige alta performance no balcão (PDV), suporte a funcionamento offline, integração futura com desktop Windows (Tauri) e garantia de que nenhum dado de uma farmácia seja acessado por outra.

## Decisão
1. **Monorepo com npm Workspaces:** Utilizar workspaces padrão do npm suportado nativamente pelo Node.js v24 instalado no ambiente, evitando dependências externas globais não instaladas.
2. **Frontend:** React + Vite + TypeScript em modo strict + Tailwind CSS.
3. **Design System:** Exclusivamente Light Mode, com componentes acessíveis e consistentes em português do Brasil.
4. **Backend:** Node.js + Fastify pela velocidade, menor consumo de memória e ecossistema de plugins.
5. **Multiempresa:** PostgreSQL com Row-Level Security (RLS) para garantia no nível do banco de dados, complementando a autorização na camada da API.
6. **Moeda:** Centavos inteiros em todas as operações monetárias.

## Consequências
* Base de código unificada, com tipos compartilhados entre frontend e backend.
* Desenvolvimento ágil sem duplicar interfaces de domínio.
* Preparação limpa para empacotamento com Tauri no futuro sem reescrever o frontend.

