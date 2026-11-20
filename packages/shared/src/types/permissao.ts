/**
 * Permissões atômicas granulares do sistema FarmaPro.
 * NOTA: Não há dependência de um cargo "Estoquista". As operações de estoque são permissões
 * atribuíveis a funcionários de quaisquer cargos (Gerente, Farmacêutico, Balconista, etc.).
 */
export type Permissao =
  // Frente de Caixa (PDV)
  | 'pdv:acesso'
  | 'pdv:vender'
  | 'pdv:aplicar_desconto'
  | 'pdv:cancelar_item'
  | 'pdv:cancelar_venda'
  | 'pdv:sangria'
  | 'pdv:suprimento'
  | 'pdv:fechar_caixa'
  | 'pdv:reabrir_caixa'
  
  // Vouchers (Cancelamentos e Devoluções)
  | 'vouchers:emitir'
  | 'vouchers:consultar'
  | 'vouchers:autorizar_cancelamento'
  
  // Estoque e Mercadorias (Atribuíveis a qualquer funcionário autorizado)
  | 'estoque:visualizar'
  | 'estoque:consultar'
  | 'estoque:cadastrar_produto'
  | 'estoque:editar_produto'
  | 'estoque:entrada_mercadoria'
  | 'estoque:saida_mercadoria'
  | 'estoque:movimentar'
  | 'estoque:ajuste_manual'
  | 'estoque:inventario'
  | 'estoque:aprovar_divergencia'
  | 'estoque:bloquear_produto'
  | 'estoque:transferir_filiais'
  | 'estoque:gerenciar_lotes'
  | 'estoque:medicamentos_controlados'
  
  // Compras e Fornecedores (Etapa 08)
  | 'compras:visualizar'
  | 'compras:emitir_pedido'
  | 'compras:dar_entrada_nfe'
  | 'fornecedores:consultar'
  | 'fornecedores:cadastrar'
  | 'fornecedores:editar'
  | 'fornecedores:aprovar'
  | 'fornecedores:bloquear'
  | 'compras:solicitar'
  | 'compras:aprovar_solicitacao'
  | 'compras:criar_pedido'
  | 'compras:aprovar_pedido'
  | 'compras:cancelar_pedido'
  
  // Recebimento de Mercadorias e Importação de XML de NF-e (Etapa 09)
  | 'recebimento:consultar'
  | 'recebimento:importar_xml'
  | 'recebimento:conferir'
  | 'recebimento:registrar_divergencia'
  | 'recebimento:aprovar_divergencia'
  | 'recebimento:confirmar'
  | 'recebimento:consultar_documentos'
  
  // Clientes
  | 'clientes:visualizar'
  | 'clientes:gerenciar'
  
  // Financeiro
  | 'financeiro:visualizar'
  | 'financeiro:contas_pagar'
  | 'financeiro:contas_receber'
  | 'financeiro:dre'
  
  // Administração e Auditoria
  | 'usuarios:gerenciar'
  | 'cargos:gerenciar'
  | 'filiais:gerenciar'
  | 'auditoria:visualizar_logs'
  | 'configuracoes:gerenciar';
