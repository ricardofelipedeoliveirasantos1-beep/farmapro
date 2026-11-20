-- ==============================================================================
-- FarmaPro — Seeders Demonstrativos: Cenário com Duas Empresas Concorrentes
-- Finalidade: Validação do Isolamento Multiempresa por Row-Level Security (RLS)
-- NOTA: Sem cargo Estoquista; Sem crédito de cliente; Com vouchers auditáveis.
-- AVISO: Todos os dados abaixo são 100% fictícios e gerados para homologação.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Criação das Permissões do Sistema
-- ------------------------------------------------------------------------------
INSERT INTO permissoes (id, modulo, nome, descricao) VALUES
  ('pdv:vender', 'PDV', 'Realizar Venda', 'Permite abrir carrinho, bipar itens e receber pagamentos'),
  ('pdv:desconto', 'PDV', 'Aplicar Desconto', 'Permite conceder descontos dentro da alçada'),
  ('pdv:cancelar_item', 'PDV', 'Cancelar Item', 'Permite estornar item antes da conclusão'),
  ('pdv:cancelar_venda', 'PDV', 'Cancelar Venda', 'Permite cancelar cupom emitido'),
  ('vouchers:emitir', 'VOUCHERS', 'Emitir Voucher', 'Permite emitir voucher no cancelamento/devolução autorizada'),
  ('vouchers:consultar', 'VOUCHERS', 'Consultar Voucher', 'Permite consultar e validar saldo de voucher para resgate'),
  ('vouchers:autorizar_cancelamento', 'VOUCHERS', 'Autorizar Cancelamento com Voucher', 'Alçada superior para autorizar voucher'),
  ('estoque:visualizar', 'ESTOQUE', 'Consultar Estoque', 'Permite consultar saldos e lotes'),
  ('estoque:cadastrar_produto', 'ESTOQUE', 'Cadastrar Produtos', 'Permite criar itens no catálogo'),
  ('estoque:entrada_mercadoria', 'ESTOQUE', 'Receber Mercadorias', 'Permite dar entrada e conferência em NF-e'),
  ('estoque:ajustar', 'ESTOQUE', 'Ajuste de Estoque', 'Permite realizar inventários e ajustes manuais autorizados'),
  ('medicamentos:controlados', 'FARMACIA', 'Dispensar Controlados', 'Acesso exclusivo para farmacêuticos (Portaria 344)'),
  ('financeiro:fechar_caixa', 'FINANCEIRO', 'Fechar Caixa', 'Permite apurar conferência cega e fechar turno')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. EMPRESA A: "Farmácia Modelo A Ltda (Demonstração)"
-- ------------------------------------------------------------------------------
INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato, plano, status)
VALUES (
  '11111111-1111-4111-a111-111111111111',
  'Farmácia Modelo A Ltda (DEMONSTRAÇÃO)',
  'Farmácia Modelo A — Matriz e Rede',
  '00000000000191',
  'contato@modelo-a-demo.farmapro.local',
  '(11) 90000-0001',
  'PROFISSIONAL',
  'ATIVO'
) ON CONFLICT (id) DO NOTHING;

-- Filiais da Empresa A
INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz, status)
VALUES
  ('11111111-aaaa-4111-a111-111111111101', '11111111-1111-4111-a111-111111111111', 'FIL-01', 'Unidade Centro (Matriz A)', '00000000000191', 'Av. Central', '100', 'Centro', 'São Paulo', 'SP', '01001000', '(11) 90000-0101', TRUE, 'ATIVO'),
  ('11111111-aaaa-4111-a111-111111111102', '11111111-1111-4111-a111-111111111111', 'FIL-02', 'Unidade Shopping A', '00000000000272', 'Av. Shopping', '500', 'Jardins', 'São Paulo', 'SP', '01002000', '(11) 90000-0102', FALSE, 'ATIVO')
ON CONFLICT (id) DO NOTHING;

-- Cargos da Empresa A (Sem cargo Estoquista; permissões de estoque atribuídas a outros cargos)
INSERT INTO cargos (id, empresa_id, nome, descricao, nivel_acesso, status)
VALUES
  ('11111111-cccc-4111-a111-000000000001', '11111111-1111-4111-a111-111111111111', 'Farmacêutico Responsável', 'Responsabilidade Técnica, SNGPC e Gestão de Lotes', 'FARMACEUTICO', 'ATIVO'),
  ('11111111-cccc-4111-a111-000000000002', '11111111-1111-4111-a111-111111111111', 'Operador de Caixa PDV', 'Operações de atendimento e frente de caixa', 'OPERADOR_CAIXA', 'ATIVO')
ON CONFLICT (id) DO NOTHING;

-- Usuários da Empresa A
INSERT INTO usuarios (id, nome, email, cpf, hash_senha, crf_numero, crf_uf, e_responsavel_tecnico, status)
VALUES
  ('11111111-dddd-4111-a111-000000000001', 'Dr. Carlos Silva (Fictício)', 'carlos@modelo-a-demo.local', '00011122233', '$2a$12$e8FicticioSenhaHashParaDemonstracaoA1', '45892-DEMO', 'SP', TRUE, 'ATIVO'),
  ('11111111-dddd-4111-a111-000000000002', 'Mariana Souza (Fictícia)', 'mariana@modelo-a-demo.local', '00044455566', '$2a$12$e8FicticioSenhaHashParaDemonstracaoA2', NULL, NULL, FALSE, 'ATIVO')
ON CONFLICT (id) DO NOTHING;

-- Vínculo Usuários com Empresa A e Filiais
INSERT INTO usuarios_empresas (usuario_id, empresa_id, papel_empresa) VALUES
  ('11111111-dddd-4111-a111-000000000001', '11111111-1111-4111-a111-111111111111', 'ADMINISTRADOR'),
  ('11111111-dddd-4111-a111-000000000002', '11111111-1111-4111-a111-111111111111', 'COLABORADOR')
ON CONFLICT DO NOTHING;

INSERT INTO usuarios_filiais (usuario_id, empresa_id, filial_id, cargo_id, e_filial_padrao) VALUES
  ('11111111-dddd-4111-a111-000000000001', '11111111-1111-4111-a111-111111111111', '11111111-aaaa-4111-a111-111111111101', '11111111-cccc-4111-a111-000000000001', TRUE),
  ('11111111-dddd-4111-a111-000000000002', '11111111-1111-4111-a111-111111111111', '11111111-aaaa-4111-a111-111111111101', '11111111-cccc-4111-a111-000000000002', TRUE)
ON CONFLICT DO NOTHING;

-- Cliente Fictício da Empresa A (Sem crédito ou carteira)
INSERT INTO clientes (id, empresa_id, nome_razao_social, cpf_cnpj, telefone_principal, status)
VALUES (
  '11111111-ffff-4111-a111-000000000001',
  '11111111-1111-4111-a111-111111111111',
  'João Pereira da Silva (Fictício)',
  '12345678900',
  '(11) 98888-0001',
  'ATIVO'
) ON CONFLICT (id) DO NOTHING;

-- Produto Exclusivo da Empresa A
INSERT INTO produtos (id, empresa_id, nome_comercial, fabricante, apresentacao, tipo_produto, status)
VALUES (
  '11111111-eeee-4111-a111-000000000001',
  '11111111-1111-4111-a111-111111111111',
  'Amoxicilina + Clavulanato Modelo A',
  'Lab Nacional A (Demo)',
  '500mg/125mg Cx 21 comp',
  'MEDICAMENTO_GENERICO',
  'ATIVO'
) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. EMPRESA B: "Drogaria Concorrente B Ltda (Concorrente Demonstração)"
-- ------------------------------------------------------------------------------
INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato, plano, status)
VALUES (
  '22222222-2222-4222-b222-222222222222',
  'Drogaria Concorrente B Ltda (DEMONSTRAÇÃO)',
  'Drogaria B — Concorrente',
  '99999999000188',
  'contato@concorrente-b-demo.farmapro.local',
  '(11) 90000-0002',
  'BASICO',
  'ATIVO'
) ON CONFLICT (id) DO NOTHING;

-- Filial da Empresa B
INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz, status)
VALUES (
  '22222222-bbbb-4222-b222-222222222201',
  '22222222-2222-4222-b222-222222222222',
  'FIL-B01',
  'Matriz Drogaria B',
  '99999999000188',
  'Rua do Comércio',
  '200',
  'Centro',
  'Campinas',
  'SP',
  '13000000',
  '(19) 90000-0201',
  TRUE,
  'ATIVO'
) ON CONFLICT (id) DO NOTHING;

-- Produto Exclusivo da Empresa B
INSERT INTO produtos (id, empresa_id, nome_comercial, fabricante, apresentacao, tipo_produto, status)
VALUES (
  '22222222-eeee-4222-b222-000000000001',
  '22222222-2222-4222-b222-222222222222',
  'Medicamento Exclusivo da Drogaria B',
  'Lab Exclusivo B',
  '100mg Frasco 100mL',
  'MEDICAMENTO_SIMILAR',
  'ATIVO'
) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. Exemplo de Verificação RLS (Prova Conceitual)
-- ------------------------------------------------------------------------------
-- Quando a sessão pertence à Empresa A:
-- SET LOCAL app.current_empresa_id = '11111111-1111-4111-a111-111111111111';
-- SELECT COUNT(*) FROM produtos; -> RETORNA EXATAMENTE 1 (apenas o produto da Empresa A)
--
-- Quando a sessão pertence à Empresa B:
-- SET LOCAL app.current_empresa_id = '22222222-2222-4222-b222-222222222222';
-- SELECT COUNT(*) FROM produtos; -> RETORNA EXATAMENTE 1 (apenas o produto da Empresa B)
--
-- Tentativa de consulta cruzada (Empresa A tentando ver produto B):
-- SELECT * FROM produtos WHERE id = '22222222-eeee-4222-b222-000000000001'; -> RETORNA 0 LINHAS (vazio)
