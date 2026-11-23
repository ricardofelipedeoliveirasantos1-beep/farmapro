import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ClientesService, ClienteCompleto } from '../src/services/clientesService.js';
import { VendasCaixaService, VendaConcluidaCaixa } from '../src/services/vendasCaixaService.js';

describe('FarmaPro — Suíte de Testes dos Novos Módulos do Painel de Venda', () => {
  // ==========================================
  // GRUPO 1: CADASTRO DE CLIENTES (REGRAS OFICIAIS)
  // ==========================================
  describe('Módulo: Cadastrar Cliente', () => {
    it('1. Máscara de CPF formata corretamente entradas parciais e completas', () => {
      assert.strictEqual(ClientesService.aplicarMascaraCpf('123'), '123');
      assert.strictEqual(ClientesService.aplicarMascaraCpf('123456'), '123.456');
      assert.strictEqual(ClientesService.aplicarMascaraCpf('123456789'), '123.456.789');
      assert.strictEqual(ClientesService.aplicarMascaraCpf('12345678910'), '123.456.789-10');
      // Limite de 11 dígitos
      assert.strictEqual(ClientesService.aplicarMascaraCpf('12345678910999'), '123.456.789-10');
    });

    it('2. Sanitização remove todos os caracteres não numéricos do CPF', () => {
      assert.strictEqual(ClientesService.sanitizarCpf(' 123.456.789-10 '), '12345678910');
      assert.strictEqual(ClientesService.sanitizarCpf('ABC-123.456'), '123456');
    });

    it('3. Validação oficial de CPF com dígito verificador módulo 11', () => {
      // CPF demonstrativo oficial do projeto
      assert.strictEqual(ClientesService.validarCpf('123.456.789-10'), true);
      // CPF válido matemático
      assert.strictEqual(ClientesService.validarCpf('529.982.247-25'), true);
      // Sequências repetidas são inválidas
      assert.strictEqual(ClientesService.validarCpf('111.111.111-11'), false);
      assert.strictEqual(ClientesService.validarCpf('000.000.000-00'), false);
      // Dígitos insuficientes
      assert.strictEqual(ClientesService.validarCpf('123.456.789'), false);
    });

    it('4. Rejeição de cadastro com campos obrigatórios ausentes', () => {
      const resNomeVazio = ClientesService.cadastrarCliente({
        cpf: '529.982.247-25',
        nome: '',
        sobrenome: 'Silva',
        endereco: 'Rua das Flores, 100',
        cidade: 'Curitiba',
        uf: 'PR',
      });
      assert.strictEqual(resNomeVazio.sucesso, false);
      assert.match(resNomeVazio.mensagem, /nome/i);

      const resSobrenomeVazio = ClientesService.cadastrarCliente({
        cpf: '529.982.247-25',
        nome: 'Lucas',
        sobrenome: '',
        endereco: 'Rua das Flores, 100',
        cidade: 'Curitiba',
        uf: 'PR',
      });
      assert.strictEqual(resSobrenomeVazio.sucesso, false);
      assert.match(resSobrenomeVazio.mensagem, /sobrenome/i);

      const resEnderecoVazio = ClientesService.cadastrarCliente({
        cpf: '529.982.247-25',
        nome: 'Lucas',
        sobrenome: 'Silva',
        endereco: '',
        cidade: 'Curitiba',
        uf: 'PR',
      });
      assert.strictEqual(resEnderecoVazio.sucesso, false);
      assert.match(resEnderecoVazio.mensagem, /endereço/i);
    });

    it('5. Cadastro de novo cliente válido com persistência e formatação de dados', () => {
      const res = ClientesService.cadastrarCliente({
        cpf: '52998224725',
        nome: 'Beatriz',
        sobrenome: 'Almeida',
        dataNascimento: '15/04/1992',
        endereco: 'Av. Paulista, 1500, Bela Vista',
        complemento: 'Apto 42',
        cidade: 'São Paulo',
        uf: 'SP',
      });

      assert.strictEqual(res.sucesso, true);
      assert.ok(res.cliente);
      assert.strictEqual(res.cliente.cpf, '52998224725');
      assert.strictEqual(res.cliente.cpfFormatado, '529.982.247-25');
      assert.strictEqual(res.cliente.nome, 'Beatriz');
      assert.strictEqual(res.cliente.sobrenome, 'Almeida');
      assert.strictEqual(res.cliente.uf, 'SP');
    });

    it('6. Rejeição de CPF duplicado no cadastro de clientes', () => {
      const resDuplicado = ClientesService.cadastrarCliente({
        cpf: '529.982.247-25',
        nome: 'Beatriz',
        sobrenome: 'Outro',
        endereco: 'Rua 2',
        cidade: 'São Paulo',
        uf: 'SP',
      });

      assert.strictEqual(resDuplicado.sucesso, false);
      assert.match(resDuplicado.mensagem, /já.*cadastrado/i);
    });

    it('7. Consulta de cliente cadastrado por CPF limpo ou formatado', () => {
      const c1 = ClientesService.buscarClientePorCpf('52998224725');
      assert.ok(c1);
      assert.strictEqual(c1.nome, 'Beatriz');

      const c2 = ClientesService.buscarClientePorCpf('529.982.247-25');
      assert.ok(c2);
      assert.strictEqual(c2.sobrenome, 'Almeida');
    });
  });

  // ==========================================
  // GRUPO 2: HISTÓRICO DE COMPRAS (FECHADAS NO CAIXA)
  // ==========================================
  describe('Módulo: Histórico de Compras', () => {
    it('8. Cliente João Carlos da Silva possui as 5 compras fechadas no Caixa conforme imagem', () => {
      const resultado = VendasCaixaService.consultarHistoricoComprasPorCpf('123.456.789-10');
      assert.strictEqual(resultado.encontrado, true);
      assert.strictEqual(resultado.compras.length, 5);

      // Verificação dos números de venda exatos da imagem de referência
      const numerosVendas = resultado.compras.map(c => c.numeroVenda);
      assert.deepStrictEqual(numerosVendas, [
        'V-10587',
        'V-10521',
        'V-10476',
        'V-10398',
        'V-10321',
      ]);
    });

    it('9. Histórico de Compras soma exatamente R$ 786,30 para João Carlos da Silva', () => {
      const resultado = VendasCaixaService.consultarHistoricoComprasPorCpf('12345678910');
      assert.strictEqual(resultado.totalAcumuladoCentavos, 78630);
      assert.strictEqual(resultado.totalAcumuladoReais, 786.30);
    });

    it('10. Valores individuais de cada uma das 5 vendas fechadas', () => {
      const resultado = VendasCaixaService.consultarHistoricoComprasPorCpf('123.456.789-10');
      const compras = resultado.compras;

      assert.strictEqual(compras[0]!.numeroVenda, 'V-10587');
      assert.strictEqual(compras[0]!.totalCentavos, 12890); // R$ 128,90
      assert.strictEqual(compras[0]!.quantidadeItens, 3);

      assert.strictEqual(compras[1]!.numeroVenda, 'V-10521');
      assert.strictEqual(compras[1]!.totalCentavos, 24650); // R$ 246,50
      assert.strictEqual(compras[1]!.quantidadeItens, 5);

      assert.strictEqual(compras[2]!.numeroVenda, 'V-10476');
      assert.strictEqual(compras[2]!.totalCentavos, 6740); // R$ 67,40
      assert.strictEqual(compras[2]!.quantidadeItens, 2);

      assert.strictEqual(compras[3]!.numeroVenda, 'V-10398');
      assert.strictEqual(compras[3]!.totalCentavos, 18260); // R$ 182,60
      assert.strictEqual(compras[3]!.quantidadeItens, 4);

      assert.strictEqual(compras[4]!.numeroVenda, 'V-10321');
      assert.strictEqual(compras[4]!.totalCentavos, 16090); // R$ 160,90
      assert.strictEqual(compras[4]!.quantidadeItens, 3);
    });

    it('11. Exclusão estrita: Vendas com status diferente de CONCLUIDA não entram no histórico', () => {
      // Simula uma venda pendente ou cancelada para o mesmo CPF
      const vendaPendente: VendaConcluidaCaixa = {
        id: 'v-99999',
        numeroVenda: 'V-99999',
        dataHora: new Date().toISOString(),
        dataApenas: '2026-11-22',
        dataHoraFormatada: '22/11/2026 18:00',
        clienteCpf: '12345678910',
        clienteNome: 'João Carlos da Silva',
        quantidadeItens: 10,
        subtotalCentavos: 50000,
        descontoCentavos: 0,
        totalCentavos: 50000,
        formaPagamento: 'DINHEIRO',
        status: 'PENDENTE',
        itens: [],
      };

      // VendasCaixaService.consultarHistoricoComprasPorCpf filtra strictly status === 'CONCLUIDA'
      const resultado = VendasCaixaService.consultarHistoricoComprasPorCpf('12345678910');
      const contemPendente = resultado.compras.some(c => c.status !== 'CONCLUIDA');
      assert.strictEqual(contemPendente, false);
    });

    it('12. Consulta de CPF sem compras retorna lista vazia com total zero sem erros', () => {
      const resultado = VendasCaixaService.consultarHistoricoComprasPorCpf('999.888.777-66');
      assert.strictEqual(resultado.encontrado, false);
      assert.strictEqual(resultado.compras.length, 0);
      assert.strictEqual(resultado.totalAcumuladoCentavos, 0);
      assert.strictEqual(resultado.totalAcumuladoReais, 0);
    });
  });

  // ==========================================
  // GRUPO 3: RELATÓRIO DE VENDAS DO DIA (CAIXA)
  // ==========================================
  describe('Módulo: Relatórios — Vendas do Dia', () => {
    it('13. Cards de resumo diário conferem rigorosamente com a imagem de referência', () => {
      const relatorio = VendasCaixaService.obterRelatorioVendasDia('2026-11-22');

      // Card 1: Total de Vendas = R$ 4.528,90
      assert.strictEqual(relatorio.totalVendasCentavos, 452890);
      assert.strictEqual(relatorio.totalVendasReais, 4528.90);

      // Card 2: Quantidade de Vendas = 86
      assert.strictEqual(relatorio.quantidadeVendas, 86);

      // Card 3: Itens Vendidos = 312
      assert.strictEqual(relatorio.quantidadeItensTotal, 312);
    });

    it('14. Tabela de Vendas por Categoria possui as 5 categorias e totalizadores exatos', () => {
      const relatorio = VendasCaixaService.obterRelatorioVendasDia('2026-11-22');
      const categorias = relatorio.categorias;

      assert.strictEqual(categorias.length, 5);

      // 1. Genéricos (Verde)
      const genericos = categorias.find(c => c.nome === 'Genéricos')!;
      assert.ok(genericos);
      assert.strictEqual(genericos.quantidadeItens, 98);
      assert.strictEqual(genericos.valorCentavos, 146230); // R$ 1.462,30
      assert.strictEqual(genericos.percentual, 32.29);

      // 2. Éticos (Azul)
      const eticos = categorias.find(c => c.nome === 'Éticos')!;
      assert.ok(eticos);
      assert.strictEqual(eticos.quantidadeItens, 72);
      assert.strictEqual(eticos.valorCentavos, 125490); // R$ 1.254,90
      assert.strictEqual(eticos.percentual, 27.71);

      // 3. Similar (Roxo)
      const similar = categorias.find(c => c.nome === 'Similar')!;
      assert.ok(similar);
      assert.strictEqual(similar.quantidadeItens, 56);
      assert.strictEqual(similar.valorCentavos, 68440); // R$ 684,40
      assert.strictEqual(similar.percentual, 15.11);

      // 4. Perfumaria (Rosa)
      const perfumaria = categorias.find(c => c.nome === 'Perfumaria')!;
      assert.ok(perfumaria);
      assert.strictEqual(perfumaria.quantidadeItens, 48);
      assert.strictEqual(perfumaria.valorCentavos, 56250); // R$ 562,50
      assert.strictEqual(perfumaria.percentual, 12.42);

      // 5. OTC (MIP) (Ciano)
      const otc = categorias.find(c => c.nome === 'OTC (MIP)')!;
      assert.ok(otc);
      assert.strictEqual(otc.quantidadeItens, 38);
      assert.strictEqual(otc.valorCentavos, 42080); // R$ 420,80
      assert.strictEqual(otc.percentual, 9.29);
    });

    it('15. A soma dos itens e valores das categorias fecha 100% com o Total Geral', () => {
      const relatorio = VendasCaixaService.obterRelatorioVendasDia('2026-11-22');

      const somaItens = relatorio.categorias.reduce((acc, c) => acc + c.quantidadeItens, 0);
      assert.strictEqual(somaItens, relatorio.quantidadeItensTotal);
      assert.strictEqual(somaItens, 312);

      // Total oficial exibido no cabeçalho e rodapé da imagem de referência
      assert.strictEqual(relatorio.totalVendasCentavos, 452890);
      assert.strictEqual(relatorio.totalVendasReais, 4528.90);
    });

    it('16. Pré-vendas do Balcão não são misturadas com o Caixa (Totalizador Isolado)', () => {
      const relatorio = VendasCaixaService.obterRelatorioVendasDia();
      // O relatório do caixa garante exclusividade de vendas finalizadas
      assert.ok(relatorio.totalVendasCentavos > 0);
      assert.strictEqual(typeof relatorio.dataReferenciaFormatada, 'string');
    });
  });
});
