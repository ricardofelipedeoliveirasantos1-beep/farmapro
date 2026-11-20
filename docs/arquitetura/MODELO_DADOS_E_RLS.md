# FarmaPro — Modelo de Dados, Arquitetura PostgreSQL e Isolamento Multiempresa

## 1. Visão Geral da Arquitetura de Dados

O FarmaPro foi modelado para atender aos rigorosos requisitos de um SaaS farmacêutico brasileiro:
* **Multi-tenancy com Isolamento RLS:** Garantia matemática e estrutural de que uma farmácia jamais acesse dados de outra farmácia no mesmo banco de dados.
* **Preservação Financeira e Imutabilidade (`ON DELETE RESTRICT`):** Tabelas financeiras e contábeis (`vendas`, `venda_pagamentos`, `vouchers`, `vouchers_historico`, `estoque_movimentacoes` e `auditoria_logs`) utilizam `ON DELETE RESTRICT` em relação a empresas e filiais. A exclusão acidental de uma filial ou tenant jamais apagará em cascata registros contábeis ou fiscais. O encerramento de atividades é realizado via desativação lógica (*soft delete*).
* **Desacoplamento de Produtos e Medicamentos:** Medicamentos possuem dados regulatórios e clínicos específicos (ANVISA, DCI, Portaria 344/SNGPC), enquanto itens de perfumaria, cosméticos e conveniência possuem estruturas simplificadas.
* **Controle Rigoroso de Lotes e Validades (FEFO):** Rastreabilidade unitária por filial, impedindo a comercialização de produtos vencidos, bloqueados ou em quarentena.
* **Operações de Estoque Independentes de Cargo:** As atividades de estoque (consulta, entrada de NF-e, movimentação, ajustes, inventários e lotes) são controladas por permissões atômicas granulares configuráveis pelo proprietário, sem dependência do cargo "Estoquista".
* **Ausência de Crédito Próprio da Farmácia:** O FarmaPro não possui crediário próprio, limite de crédito, carteira de clientes ou dívidas internas. Pagamentos externos comerciais (Cartão de Crédito/Débito parcelado, PIX e Dinheiro) continuam normalmente.
* **Vouchers Auditáveis com Resgate 100% Integral:** Vouchers originados exclusivamente do cancelamento/devolução autorizada de uma venda anterior, com exigência de **resgate 100% integral em uma única compra**, sem troco e sem resíduos.
* **Proteção contra Dupla Emissão:** Restrição única `uq_voucher_venda_origem` no banco impede a geração de mais de um voucher para o mesmo evento de cancelamento.
* **Validade dos Vouchers:** Nenhuma expiração automática é ativada nesta fase. O status `EXPIRADO` é mantido para suporte futuro mediante decisão comercial e validação jurídica com o Código de Defesa do Consumidor (CDC).
* **Integridade Financeira em Centavos:** Todos os valores monetários são tipados como `BIGINT` representando centavos inteiros (BRL), prevenindo erros de arredondamento.

---

## 2. Diagrama Entidade-Relacionamento (ERD)

```mermaid
erDiagram
    EMPRESAS ||--o{ FILIAIS : "possui"
    EMPRESAS ||--o{ USUARIOS_EMPRESAS : "vincula"
    EMPRESAS ||--o{ CARGOS : "define"
    EMPRESAS ||--o{ PRODUTOS : "cadastra"
    EMPRESAS ||--o{ CLIENTES : "atende"
    EMPRESAS ||--o{ VOUCHERS : "emite_preserva"

    FILIAIS ||--o{ USUARIOS_FILIAIS : "autoriza"
    FILIAIS ||--o{ PRODUTOS_FILIAIS : "parametrizacao"
    FILIAIS ||--o{ LOTES : "armazena"
    FILIAIS ||--o{ ESTOQUE_SALDOS : "saldo_local"
    FILIAIS ||--o{ CAIXAS_SESSOES : "opera"
    FILIAIS ||--o{ VENDAS : "emite"

    USUARIOS ||--o{ USUARIOS_EMPRESAS : "pertence"
    USUARIOS ||--o{ USUARIOS_FILIAIS : "atua"
    USUARIOS_FILIAIS ||--o{ USUARIOS_FILIAIS_PERMISSOES : "excecoes"
    CARGOS ||--o{ CARGOS_PERMISSOES : "contem"
    PERMISSOES ||--o{ CARGOS_PERMISSOES : "atribuida"

    CATEGORIAS_PRODUTOS ||--o{ PRODUTOS : "classifica"
    PRODUTOS ||--o{ PRODUTOS_CODIGOS_BARRAS : "codigos"
    PRODUTOS ||--o| MEDICAMENTOS_DADOS_FARMACEUTICOS : "dados_clinicos"
    PRODUTOS ||--o{ PRODUTOS_FILIAIS : "precos_locais"
    PRODUTOS ||--o{ LOTES : "lotes"
    PRODUTOS ||--o{ ESTOQUE_SALDOS : "saldos"

    CAIXAS_SESSOES ||--o{ VENDAS : "registra"
    CLIENTES ||--o{ VENDAS : "compra"
    CLIENTES ||--o{ CLIENTES_CONSENTIMENTOS_LGPD : "consentimentos"
    CLIENTES ||--o{ VOUCHERS : "titular"

    VENDAS ||--o{ VENDA_ITENS : "itens"
    VENDAS ||--o{ VENDA_PAGAMENTOS : "pagamentos"
    VENDAS ||--o| VOUCHERS : "origem_cancelamento_1para1"
    VOUCHERS ||--o{ VOUCHERS_HISTORICO : "auditoria"
    VOUCHERS ||--o| VENDA_PAGAMENTOS : "utilizado_em"
    LOTES ||--o{ VENDA_ITENS : "baixa"

    PRODUTOS ||--o{ ESTOQUE_MOVIMENTACOES : "movimenta"
    LOTES ||--o{ ESTOQUE_MOVIMENTACOES : "rastreia"
    FILIAIS ||--o{ ESTOQUE_MOVIMENTACOES : "ocorre"
    
    EMPRESAS ||--o{ AUDITORIA_LOGS : "audita_preserva"
```

---

## 3. Diretriz de Preservação Financeira (`ON DELETE RESTRICT`)

Em sistemas contábeis e fiscais, a integridade do histórico é prioritária. Por isso:
1. **Proteção Contra Deleção em Cascata:** As tabelas `vendas`, `vouchers`, `vouchers_historico`, `caixas_sessoes`, `estoque_movimentacoes` e `auditoria_logs` definem suas chaves estrangeiras para `empresas` e `filiais` com `ON DELETE RESTRICT`.
2. **Desativação Lógica:** Se uma filial for fechada ou uma empresa cancelar sua assinatura, seu status é alterado para `INATIVO` ou `BLOQUEADO`. A exclusão física do registro principal é bloqueada pelo banco de dados enquanto houver vendas ou vouchers emitidos.
3. **Auditoria de Cancelamento de Venda com Voucher:** Caso uma venda que utilizou voucher seja cancelada, a operação é registrada imutavelmente em `vouchers_historico` com a operação `ESTORNO_VENDA_RESGATE` e justificativa formal, sem recriação automática de saldo ou duplicação financeira.

---

## 4. Dicionário de Dados & Estrutura das Tabelas

### 4.1. Núcleo Multiempresa & Controle de Acesso (RBAC)
* **`empresas`**: Tenants cadastrados no SaaS (`id UUID`, `razao_social`, `nome_fantasia`, `cnpj`, `status`, `plano`).
* **`filiais`**: Unidades físicas da farmácia (`id UUID`, `empresa_id FK`, `codigo_filial`, `e_matriz BOOLEAN`, endereço e contato).
* **`usuarios`**: Pessoas físicas/operadores (`id UUID`, `nome`, `email`, `cpf`, `hash_senha`, `crf_numero`, `crf_uf`, `e_responsavel_tecnico`).
* **`usuarios_empresas`**: Vínculo do usuário com a empresa e papel (`PROPRIETARIO`, `ADMINISTRADOR`, `COLABORADOR`).
* **`cargos`**: Perfis funcionais independentes por empresa (Ex: Farmacêutico RT, Gerente, Operador de Caixa). Não há cargo Estoquista pré-fixado.
* **`permissoes`**: Catálogo de permissões atômicas (`pdv:vender`, `vouchers:emitir`, `vouchers:consultar`, `estoque:visualizar`, `estoque:ajustar`, `estoque:inventario`, etc.).
* **`cargos_permissoes`**: Mapeamento N:N entre cargos e permissões padrão.
* **`usuarios_filiais`**: Autorização expressa do funcionário em filiais específicas.
* **`usuarios_filiais_permissoes`**: Exceções por filial (concessões adicionais ou revogações).
* **`dispositivos_autorizados`**: Terminais de PDV autorizados com identificador de hardware (UUID).

### 4.2. Catálogo Desacoplado de Produtos & Medicamentos
* **`categorias_produtos`**: Hierarquia mercadológica.
* **`produtos`**: Cadastro central do item (`nome_comercial`, `fabricante`, `apresentacao`, `unidade_medida`, `tipo_produto`).
* **`produtos_codigos_barras`**: Múltiplos códigos por produto (EAN-13, EAN-14, DUN-14, código interno).
* **`medicamentos_dados_farmaceuticos`** (1:0..1 com `produtos`): Atributos clínicos exclusivos de medicamentos (Princípio ativo DCI, Registro ANVISA, Classificação de receita, Portaria 344/SNGPC, Termossensível).
* **`produtos_filiais`**: Parametrização comercial por unidade (`preco_custo_centavos`, `preco_venda_centavos`, `estoque_minimo`, `ativo`).

### 4.3. Lotes, Validade e Rastreabilidade (FEFO)
* **`lotes`**: `numero_lote`, `data_fabricacao`, `data_validade`, `quantidade_recebida`, `quantidade_disponivel`, `quantidade_reservada`, `quantidade_bloqueada`, `status: ATIVO, QUARENTENA, BLOQUEADO, VENCIDO, ESGOTADO`.

### 4.4. Clientes & Proteção de Dados (LGPD)
* **`clientes`**: Dados cadastrais por empresa (Nome, CPF/CNPJ, Telefone, Email, Endereço). **Sem limites de crédito, sem saldo devedor e sem carteira de crédito**.
* **`clientes_consentimentos_lgpd`**: Registro explícito de autorizações do cliente (Marketing, Lembrete de tratamento contínuo, Retenção de histórico).

### 4.5. Vouchers (Origem em Cancelamentos & Regra de Resgate Integral)
* **`vouchers`**:
  * `empresa_id RESTRICT`, `filial_origem_id RESTRICT`, `codigo_voucher UNIQUE`.
  * `valor_centavos`: Valor integral gerado no cancelamento.
  * `venda_origem_id UNIQUE`: Venda cancelada que originou o voucher (impede dupla emissão).
  * `motivo_cancelamento_origem`: Justificativa legal/comercial.
  * `status`: `DISPONIVEL`, `UTILIZADO`, `CANCELADO`, `EXPIRADO`.
  * Rastreabilidade: `emitido_por_id`, `autorizado_por_id`, `utilizado_em`, `utilizado_por_id`, `venda_resgate_id`.
* **`vouchers_historico`**: Trilha de auditoria das movimentações do voucher (`EMISSAO`, `CONSULTA_VALIDACAO`, `RESGATE_UTILIZACAO`, `CANCELAMENTO_VOUCHER`, `ESTORNO_VENDA_RESGATE`).

**Regras Mandatórias do Voucher:**
1. Resgate 100% integral em uma única compra.
2. Se Compra < Voucher: Bloquear resgate (não há devolução de troco nem resíduos).
3. Se Compra > Voucher: Voucher cobre 100% do seu valor e a diferença é paga por modalidade aceita (Dinheiro, Cartão, PIX).
4. O voucher **não** é dinheiro líquido recebido no caixa físico, tratando-se de quitação de obrigação decorrente de cancelamento.

### 4.6. Frente de Caixa (PDV), Vendas e Pagamentos
* **`caixas_sessoes`**: Abertura, suprimentos, sangrias e fechamento cego por operador.
* **`vendas`**: Vendas do PDV com suporte a contingência offline (`id_offline_uuid`, `chave_idempotencia`, `hash_integridade`).
* **`venda_itens`**: Itens com rastreio de lote e retenção de receita.
* **`venda_pagamentos`**: Modalidades de pagamento: `DINHEIRO`, `CARTAO_CREDITO`, `CARTAO_DEBITO`, `PIX`, `VOUCHER`, `CONVENIO_EMPRESA`.

### 4.7. Estoque, Auditoria e Conflitos
* **`estoque_saldos`**: Consulta rápida de saldos físicos, reservados e disponíveis.
* **`estoque_reservas`**: Bloqueios temporários para evitar concorrência de caixas simultâneos.
* **`estoque_movimentacoes`**: Livro-razão contábil imutável (*append-only ledger*).
* **`auditoria_logs`**: Trilha de auditoria com snapshots em `JSONB`.
* **`sincronizacao_offline_conflitos`**: Fila de conciliação para operações sincronizadas.

---

## 5. Políticas de Row-Level Security (RLS)
Todas as 23 tabelas com dados de empresas possuem RLS ativado e forçado (`FORCE ROW LEVEL SECURITY`), filtradas pela variável de sessão `app.current_empresa_id`.
Os vouchers pertencem estritamente à empresa emissora: um usuário da Empresa A jamais conseguirá validar ou resgatar vouchers emitidos pela Empresa B.
