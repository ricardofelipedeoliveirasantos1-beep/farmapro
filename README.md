# FarmaPro — Plataforma SaaS de Gestão Farmacêutica

> **Versão:** 0.1.0-fundacao (Etapa 02)  
> **Idioma Padrão:** Português do Brasil (pt-BR)  
> **Padrão Visual:** Exclusivamente Light Mode  
> **Status:** Fundação Estrutural, Padronização e Design System

---

## 1. Visão Geral

O **FarmaPro** é uma plataforma SaaS profissional para gestão de farmácias e drogarias de pequeno e médio porte no Brasil. O sistema contempla rotinas de frente de caixa (PDV), controle rigoroso de estoque por lotes e validades, gestão financeira, controle de filiais (multiempresa com isolamento RLS) e capacidade de operação contínua tanto online quanto offline.

> [!NOTE]
> Todo o desenvolvimento atual utiliza dados e cenários **100% fictícios e simulados** para fins de engenharia e homologação, sem envolver dados reais de estabelecimentos ou clientes (em estrita conformidade com a LGPD e boas práticas).

---

## 2. Estrutura do Repositório (npm Workspaces)

```
FarmaPro/
├── apps/
│   ├── web/               # Frontend Web em React 18/19, Vite e Tailwind CSS
│   └── api/               # API Backend Node.js / Fastify em TypeScript
├── packages/
│   ├── shared/            # Contratos de dados, tipos, entidades e utilitários BRL
│   ├── ui/                # Biblioteca de componentes do Design System (Light Mode)
│   └── config/            # Configurações compartilhadas de TypeScript e build
├── database/
│   ├── migrations/        # Estratégia de esquemas e isolamento por RLS (PostgreSQL)
│   └── seeds/             # Seeders demonstrativos de farmácias fictícias
├── docs/
│   ├── arquitetura/       # Especificação técnica e arquitetural completa
│   ├── auditorias/        # Relatórios de auditoria de cada etapa
│   └── decisoes/          # Registros de Decisões de Arquitetura (ADRs)
├── scripts/               # Scripts auxiliares de desenvolvimento e checagem
├── .gitignore             # Regras de exclusão rigorosas (proteção de segredos)
├── .env.example           # Modelo de variáveis de ambiente sem credenciais
├── package.json           # Orquestração de workspaces do monorepo
└── README.md              # Documentação principal
```

---

## 3. Identidade Visual (Design System — Light Mode)

A identidade visual do FarmaPro foi desenvolvida especificamente para ambientes de balcão e retaguarda de farmácia:
- **Tema:** Exclusivamente **Light Mode** (alta legibilidade em ambientes iluminados).
- **Cor Primária:** Azul Farmacêutico (`#2563EB` / `#1D4ED8`).
- **Fundo da Aplicação:** Branco Puro (`#FFFFFF`) e Cinza Suave (`#F8FAFC`).
- **Textos:** Ardósia Escuro (`#0F172A`) com alto contraste e cinza neutro (`#64748B`) para apoios.
- **Bordas e Divisores:** Linhas discretas (`#E2E8F0`).
- **Ícones:** Lucide Icons.

---

## 4. Como Executar

### Pré-requisitos
- **Node.js:** v20+ (Ambiente auditado com v24.18.0)
- **npm:** v10+

### Instalação de Dependências
```bash
npm install
```

### Comandos Disponíveis
* `npm run dev`: Inicia o frontend da aplicação web (`apps/web`).
* `npm run dev:api`: Inicia a API Fastify (`apps/api`).
* `npm run build`: Executa o build de produção de todos os workspaces.
* `npm run typecheck`: Valida a integridade dos tipos TypeScript em modo strict.
* `npm run lint`: Executa a verificação estática de código.
* `npm run format`: Formata arquivos conforme as regras do Prettier.

---

## 5. Diretrizes de Segurança e Multiempresa

1. **Isolamento de Dados:** Cada empresa (farmácia) e filial possui seu identificador único. Toda consulta na camada de persistência utiliza filtros mandatórios e políticas de **Row-Level Security (RLS)** no PostgreSQL.
2. **Dados em Moeda (BRL):** Valores monetários são armazenados e manipulados internamente em centavos inteiros (`BigInt` ou `number`), evitando problemas de precisão de ponto flutuante, e formatados para exibição como `R$ 0,00`.
3. **Auditoria:** Toda ação crítica (abertura de caixa, descontos, estornos, vendas) possui rastreabilidade imutável.

