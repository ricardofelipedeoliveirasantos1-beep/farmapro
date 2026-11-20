-- ==============================================================================
-- FarmaPro — Migração 009: Autenticação, Sessões JWT, PIN e Rate Limiting
-- Banco: PostgreSQL 15+
-- ==============================================================================

-- 1. Carga Inicial do Catálogo de Permissões Atômicas
INSERT INTO permissoes (id, modulo, nome, descricao) VALUES
  -- PDV / Caixa
  ('pdv:acesso', 'PDV', 'Acesso ao PDV', 'Permite abrir e operar o terminal de ponto de venda'),
  ('pdv:vender', 'PDV', 'Registrar Vendas', 'Permite registrar itens e finalizar cupons de venda'),
  ('pdv:aplicar_desconto', 'PDV', 'Aplicar Desconto', 'Permite aplicar descontos manuais em itens ou na venda'),
  ('pdv:cancelar_item', 'PDV', 'Cancelar Item', 'Permite cancelar itens individuais antes da finalização'),
  ('pdv:cancelar_venda', 'PDV', 'Cancelar Venda', 'Permite cancelar a venda completa'),
  ('pdv:sangria', 'PDV', 'Sangria de Caixa', 'Permite retirada de numerário da gaveta'),
  ('pdv:suprimento', 'PDV', 'Suprimento de Caixa', 'Permite entrada de troco inicial na gaveta'),
  ('pdv:fechar_caixa', 'PDV', 'Fechar Sessão de Caixa', 'Permite encerrar o turno com conferência'),
  ('pdv:reabrir_caixa', 'PDV', 'Reabrir Caixa', 'Permite reabertura emergencial autorizada'),
  
  -- Vouchers
  ('vouchers:emitir', 'VOUCHERS', 'Emitir Vouchers', 'Permite emitir voucher no cancelamento de venda'),
  ('vouchers:consultar', 'VOUCHERS', 'Consultar Vouchers', 'Permite consultar saldo e validade de vouchers'),
  ('vouchers:autorizar_cancelamento', 'VOUCHERS', 'Autorizar Cancelamento com Voucher', 'Alçada gerencial para autorizar voucher'),

  -- Estoque (Atribuível a qualquer cargo, sem cargo exclusivo de estoquista)
  ('estoque:visualizar', 'ESTOQUE', 'Visualizar Estoque', 'Permite consultar saldos físicos e disponíveis'),
  ('estoque:cadastrar_produto', 'ESTOQUE', 'Cadastrar Produtos', 'Permite cadastrar novos itens no catálogo'),
  ('estoque:editar_produto', 'ESTOQUE', 'Editar Produtos', 'Permite alterar descrições e configurações'),
  ('estoque:entrada_mercadoria', 'ESTOQUE', 'Entrada de Mercadorias', 'Permite dar entrada por XML ou nota'),
  ('estoque:movimentar', 'ESTOQUE', 'Movimentar Estoque', 'Permite registrar saídas, perdas e avarias'),
  ('estoque:ajuste_manual', 'ESTOQUE', 'Ajuste Manual de Inventário', 'Permite correção autorizada de divergências'),
  ('estoque:inventario', 'ESTOQUE', 'Contagem de Inventário', 'Permite participar de contagens periódicas'),
  ('estoque:transferir_filiais', 'ESTOQUE', 'Transferência entre Filiais', 'Permite solicitar e enviar mercadorias entre filiais'),
  ('estoque:gerenciar_lotes', 'ESTOQUE', 'Gestão de Lotes e Validade', 'Permite controle FEFO e quarentena de lotes'),
  ('estoque:medicamentos_controlados', 'ESTOQUE', 'Controle SNGPC / Portaria 344', 'Permite movimentar controlados e antibióticos'),

  -- Compras
  ('compras:visualizar', 'COMPRAS', 'Visualizar Compras', 'Permite ver pedidos de compras e cotações'),
  ('compras:emitir_pedido', 'COMPRAS', 'Emitir Pedido de Compra', 'Permite enviar pedidos a distribuidores'),
  ('compras:dar_entrada_nfe', 'COMPRAS', 'Manifestação e Importação NF-e', 'Permite manifestar notas fiscais emitidas'),

  -- Clientes
  ('clientes:visualizar', 'CLIENTES', 'Visualizar Clientes', 'Permite consultar cadastro e histórico'),
  ('clientes:gerenciar', 'CLIENTES', 'Gerenciar Clientes', 'Permite criar e alterar dados de clientes'),

  -- Financeiro
  ('financeiro:visualizar', 'FINANCEIRO', 'Visualizar Financeiro', 'Permite consultar fluxo de caixa e relatórios'),
  ('financeiro:contas_pagar', 'FINANCEIRO', 'Contas a Pagar', 'Permite agendar e baixar pagamentos a fornecedores'),
  ('financeiro:contas_receber', 'FINANCEIRO', 'Contas a Receber', 'Permite controle de conciliação de cartões e convênios'),
  ('financeiro:dre', 'FINANCEIRO', 'DRE e Demonstrativos', 'Permite visualizar balancetes e relatórios contábeis'),

  -- Administração e Configurações
  ('usuarios:gerenciar', 'ADMIN', 'Gerenciar Funcionários', 'Permite cadastrar, editar e bloquear colaboradores'),
  ('cargos:gerenciar', 'ADMIN', 'Gerenciar Cargos e Permissões', 'Permite configurar matriz de perfis e acessos'),
  ('filiais:gerenciar', 'ADMIN', 'Gerenciar Filiais', 'Permite alterar configurações de filiais'),
  ('auditoria:visualizar_logs', 'ADMIN', 'Visualizar Auditoria', 'Permite inspecionar logs de auditoria e segurança'),
  ('configuracoes:gerenciar', 'ADMIN', 'Configurações Globais da Empresa', 'Permite gerenciar planos e integrações')
ON CONFLICT (id) DO UPDATE SET
  modulo = EXCLUDED.modulo,
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;

-- 2. Tabela de Sessões Ativas e Refresh Tokens
CREATE TABLE IF NOT EXISTS usuarios_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES filiais(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  dispositivo_id UUID REFERENCES dispositivos_autorizados(id) ON DELETE SET NULL,
  ip_origem VARCHAR(45),
  user_agent TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMPTZ NOT NULL,
  revogado_em TIMESTAMPTZ
);

CREATE INDEX idx_usuarios_sessoes_usuario ON usuarios_sessoes(usuario_id, expira_em);
CREATE INDEX idx_usuarios_sessoes_empresa ON usuarios_sessoes(empresa_id);

-- 3. Tabela de Autenticação Rápida por PIN (Vinculada a Dispositivo Autorizado)
CREATE TABLE IF NOT EXISTS usuarios_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  dispositivo_id UUID NOT NULL REFERENCES dispositivos_autorizados(id) ON DELETE CASCADE,
  pin_hash VARCHAR(255) NOT NULL,
  tentativas_falhas INT NOT NULL DEFAULT 0,
  bloqueado_ate TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_usuario_dispositivo_pin UNIQUE (usuario_id, dispositivo_id)
);

CREATE INDEX idx_usuarios_pins_busca ON usuarios_pins(empresa_id, dispositivo_id, usuario_id);

-- 4. Tabela de Recuperação de Senha Segura
CREATE TABLE IF NOT EXISTS usuarios_recuperacao_senha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  utilizado_em TIMESTAMPTZ,
  ip_origem VARCHAR(45),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recuperacao_senha_usuario ON usuarios_recuperacao_senha(usuario_id, expira_em);

-- 5. Tabela de Proteção contra Tentativas Excessivas (Rate Limiting)
CREATE TABLE IF NOT EXISTS tentativas_login_rate_limit (
  chave_identificador VARCHAR(255) PRIMARY KEY, -- Email ou IP
  tentativas INT NOT NULL DEFAULT 1,
  bloqueado_ate TIMESTAMPTZ,
  ultima_tentativa TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Políticas de Row-Level Security
ALTER TABLE usuarios_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_sessoes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_usuarios_sessoes_isolamento ON usuarios_sessoes;
CREATE POLICY p_usuarios_sessoes_isolamento ON usuarios_sessoes
  USING (empresa_id IS NULL OR empresa_id = current_empresa_id())
  WITH CHECK (empresa_id IS NULL OR empresa_id = current_empresa_id());

ALTER TABLE usuarios_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_pins FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_usuarios_pins_isolamento ON usuarios_pins;
CREATE POLICY p_usuarios_pins_isolamento ON usuarios_pins
  USING (empresa_id = current_empresa_id())
  WITH CHECK (empresa_id = current_empresa_id());

-- Concessão ao papel da aplicação
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios_sessoes TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios_pins TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios_recuperacao_senha TO farmapro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON tentativas_login_rate_limit TO farmapro_app;
GRANT SELECT ON permissoes TO farmapro_app;
