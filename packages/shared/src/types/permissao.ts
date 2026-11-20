/**
 * Permissões atômicas granulares do sistema FarmaPro.
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
  
  // Estoque e Medicamentos
  | 'estoque:visualizar'
  | 'estoque:cadastrar_produto'
  | 'estoque:editar_produto'
  | 'estoque:ajuste_manual'
  | 'estoque:gerenciar_lotes'
  | 'estoque:medicamentos_controlados'
  
  // Compras e Fornecedores
  | 'compras:visualizar'
  | 'compras:emitir_pedido'
  | 'compras:dar_entrada_nfe'
  
  // Clientes e Crediário
  | 'clientes:visualizar'
  | 'clientes:gerenciar'
  | 'clientes:alterar_limite_crediario'
  | 'clientes:dar_baixa_crediario'
  
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

