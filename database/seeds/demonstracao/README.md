# FarmaPro — Seeders e Dados Demonstrativos Fictícios

## 1. Diretrizes de Homologação Sem Farmácia Física
Para o desenvolvimento, validação e homologação do FarmaPro sem expor estabelecimentos ou pacientes reais:
1. **Dados Estritamente Sintéticos:** Nomes fictícios, empresas com CNPJs simulados em faixa de teste (`00.000.000/0001-91` e `99.999.999/0001-88`), CPFs e CRFs explicitamente sufixados com `DEMO` ou gerados aleatoriamente.
2. **Cenário de Duas Empresas Concorrentes:**
   * **Empresa A:** Farmácia Modelo A Ltda (Rede com Matriz Centro e Filial Shopping).
   * **Empresa B:** Drogaria Concorrente B Ltda (Empresa competidora no mesmo SaaS).
3. **Prova Estrutural de RLS:**
   * O script `01_cenario_duas_empresas_ficticias.sql` popula ambas as empresas no mesmo banco relacional.
   * Ao setar a variável de sessão `app.current_empresa_id` para o UUID da Empresa A, todas as operações no sistema (catálogo de produtos, clientes, vendas, saldos de estoque e relatórios) enxergam apenas os dados da Empresa A.
   * Tentativas de consulta com IDs da Empresa B retornam zero linhas, comprovando a eficácia das políticas do PostgreSQL.

## 2. Regra de Isolamento de Produção
Os scripts desta pasta **jamais** devem ser executados em bases produtivas reais.
