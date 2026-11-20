# FarmaPro — Estratégia de Dados Demonstrativos e Simulação

## 1. Contexto e Isolamento
Como o ambiente de desenvolvimento não possui uma farmácia física real para validações, toda a massa de dados deve ser:
1. **100% Simulada:** Nomes de empresas fictícias, CNPJs matematicamente válidos mas em faixa reservada para testes, CPFs simulados e medicamentos com dados sintéticos.
2. **Totalmente Segregada:** Os seeders demonstrativos ficam isolados em `database/seeds/demonstracao/` e jamais devem ser executados em ambientes de produção.
3. **Respeito à LGPD:** Nenhum dado pessoal real ou histórico clínico de pacientes reais será utilizado.

## 2. Cenário Demonstrativo Previsto
* **Empresa Principal:** "Farmácia FarmaPro Brasil Ltda" (CNPJ fictício)
* **Filiais:**
  * Filial 01 — Matriz Centro
  * Filial 02 — Unidade Bairro / Shopping
* **Usuários Demonstrativos:**
  * Administrador do Sistema
  * Farmacêutico Responsável Técnico (com CRF fictício)
  * Operador de Caixa 01
  * Operador de Caixa 02
* **Catálogo:** Medicamentos isentos (MIPs), antibióticos com controle de receita, genéricos e perfumaria.

