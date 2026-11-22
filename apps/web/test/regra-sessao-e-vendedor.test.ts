import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VendedoresService, COLABORADORES_CADASTRADOS } from '../src/services/vendedoresService.js';
import { DemoPreSalesService } from '../src/services/demoPreSalesService.js';
import { MEDICAMENTOS_DEMONSTRATIVOS } from '../src/services/demoCatalogData.js';

describe('FarmaPro Balcão — Testes de Regra de Sessão e Identificação Individual do Vendedor', () => {
  // Teste 1: Primeiro acesso sem sessão exige login
  it('1. Primeiro acesso sem sessão deve exigir autenticação válida', () => {
    // Matrícula inexistente não pode autenticar
    const loginInvalido = VendedoresService.validarLoginOperacional('MAT-INEXISTENTE', '123456', 'BALCAO');
    assert.strictEqual(loginInvalido.sucesso, false);
    assert.ok(loginInvalido.mensagem?.includes('não encontrada'));

    // Senha errada não pode autenticar
    const senhaInvalida = VendedoresService.validarLoginOperacional('BC-002', '000000', 'BALCAO');
    assert.strictEqual(senhaInvalida.sucesso, false);
    assert.ok(senhaInvalida.mensagem?.includes('Senha incorreta'));
  });

  // Teste 2: Login com colaborador válido gera sessão e permissões
  it('2. Login com credenciais válidas gera sessão e permissões corretas', () => {
    const loginValido = VendedoresService.validarLoginOperacional('BC-002', '654321', 'BALCAO');
    assert.strictEqual(loginValido.sucesso, true);
    assert.ok(loginValido.dados);
    assert.strictEqual(loginValido.dados.usuario.nome, 'Mariana Atendente');
    assert.strictEqual(loginValido.dados.usuario.matricula, 'BC-002');
    assert.ok(loginValido.dados.permissoes.includes('balcao:consultar'));
    assert.ok(loginValido.dados.permissoes.includes('pre_venda:criar'));
  });

  // Teste 3: Colaborador sem permissão de balcão é estritamente bloqueado
  it('3. Colaborador sem permissão de balcão (ex: SM-003) é impedido de acessar', () => {
    const loginSemPerm = VendedoresService.validarLoginOperacional('SM-003', '112233', 'BALCAO');
    assert.strictEqual(loginSemPerm.sucesso, false);
    assert.ok(loginSemPerm.mensagem?.includes('não possui permissão'));
  });

  // Teste 4: Colaborador inativo é estritamente bloqueado
  it('4. Colaborador inativo (ex: IN-004) é impedido de acessar', () => {
    const loginInativo = VendedoresService.validarLoginOperacional('IN-004', '445566', 'BALCAO');
    assert.strictEqual(loginInativo.sucesso, false);
    assert.ok(loginInativo.mensagem?.includes('inativo'));
  });

  // Teste 5: Consulta e validação de vendedor por matrícula
  it('5. Matrícula válida identifica o vendedor correto', () => {
    const resCarlos = VendedoresService.consultarVendedor('CX-001');
    assert.strictEqual(resCarlos.valido, true);
    assert.strictEqual(resCarlos.vendedor?.nome, 'Carlos Silva');
    assert.strictEqual(resCarlos.vendedor?.matricula, 'CX-001');

    const resMariana = VendedoresService.consultarVendedor('BC-002');
    assert.strictEqual(resMariana.valido, true);
    assert.strictEqual(resMariana.vendedor?.nome, 'Mariana Atendente');
  });

  // Teste 6: Matrícula inválida impede a criação da pré-venda
  it('6. Matrícula inexistente ou sem permissão de venda é rejeitada', () => {
    const resInexistente = VendedoresService.consultarVendedor('9999');
    assert.strictEqual(resInexistente.valido, false);
    assert.ok(resInexistente.mensagemErro?.includes('não encontrada'));

    const resSemPerm = VendedoresService.consultarVendedor('SM-003');
    assert.strictEqual(resSemPerm.valido, false);
    assert.ok(resSemPerm.mensagemErro?.includes('não possui permissão'));

    const resInativo = VendedoresService.consultarVendedor('IN-004');
    assert.strictEqual(resInativo.valido, false);
    assert.ok(resInativo.mensagemErro?.includes('INATIVO'));
  });

  // Teste 7: Usuário autenticado e vendedor responsável podem ser pessoas diferentes
  it('7. Usuário autenticado (Funcionário A) e Vendedor responsável (Funcionário B) são registrados separadamente', () => {
    const med = MEDICAMENTOS_DEMONSTRATIVOS[0]!;
    const cart = [
      {
        medication: med,
        quantity: 2,
        unitPrice: med.preco,
        discount: 0,
        subtotal: med.preco * 2,
      },
    ];
    const totals = {
      distinctItems: 1,
      totalVolumes: 2,
      subtotalBruto: med.preco * 2,
      discountTotal: 0,
      totalLiquido: med.preco * 2,
    };
    const customer = {
      name: 'Cliente Teste',
      cpf: '111.222.333-44',
      convenio: 'PARTICULAR',
    };

    // Operador logado: Mariana (BC-002)
    // Vendedor responsável: Carlos Silva (CX-001)
    const pv = DemoPreSalesService.savePreVenda(
      cart,
      totals,
      customer,
      { matricula: 'CX-001', nome: 'Carlos Silva' },
      { id: 'usr-mariana', nome: 'Mariana Atendente (BC-002)' }
    );

    assert.ok(pv.code.startsWith('PV-'));
    assert.strictEqual(pv.vendedorMatricula, 'CX-001');
    assert.strictEqual(pv.vendedorNome, 'Carlos Silva');
    assert.strictEqual(pv.criadoPorNome, 'Mariana Atendente (BC-002)');
  });

  // Teste 8: Troca de usuário não altera retroativamente a identificação do vendedor em pré-vendas anteriores
  it('8. A pré-venda mantém a matrícula correta após troca de usuário autenticado', () => {
    const todasPreVendas = DemoPreSalesService.getPreVendas();
    const pvCriada = todasPreVendas[0]!;

    // Simula troca de usuário no terminal para Roberto (BC-003)
    const novoUsuarioLogado = { id: 'usr-roberto', nome: 'Roberto Farmacêutico (BC-003)' };

    // Verifica que a pré-venda anterior continua atribuída ao Carlos Silva
    const pvConsultada = DemoPreSalesService.getPreVendas().find(p => p.id === pvCriada.id)!;
    assert.strictEqual(pvConsultada.vendedorMatricula, 'CX-001');
    assert.strictEqual(pvConsultada.vendedorNome, 'Carlos Silva');

    // Cria nova pré-venda com o vendedor Roberto
    const med = MEDICAMENTOS_DEMONSTRATIVOS[1]!;
    const novaPv = DemoPreSalesService.savePreVenda(
      [{ medication: med, quantity: 1, unitPrice: med.preco, discount: 0, subtotal: med.preco }],
      { distinctItems: 1, totalVolumes: 1, subtotalBruto: med.preco, discountTotal: 0, totalLiquido: med.preco },
      { name: 'Outro Cliente', cpf: '', convenio: 'PARTICULAR' },
      { matricula: 'BC-003', nome: 'Roberto Farmacêutico' },
      novoUsuarioLogado
    );

    assert.strictEqual(novaPv.vendedorMatricula, 'BC-003');
    assert.strictEqual(novaPv.vendedorNome, 'Roberto Farmacêutico');
    assert.strictEqual(novaPv.criadoPorNome, 'Roberto Farmacêutico (BC-003)');

    // A pré-venda anterior continua intacta
    const pvAnteriorAindaIntacta = DemoPreSalesService.getPreVendas().find(p => p.id === pvCriada.id)!;
    assert.strictEqual(pvAnteriorAindaIntacta.vendedorMatricula, 'CX-001');
  });
});
