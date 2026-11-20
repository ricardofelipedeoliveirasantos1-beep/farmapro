import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../src/services/auth.service.js';
import { CryptoService } from '../src/services/crypto.service.js';
import { JwtService } from '../src/services/jwt.service.js';
import { PermissoesService } from '../src/services/permissoes.service.js';
import { CargosService } from '../src/services/cargos.service.js';
import { FuncionariosService } from '../src/services/funcionarios.service.js';
import { bloquearOrigemPinParaOperacaoSensivel } from '../src/middlewares/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Etapa 05: Autenticação Real, Empresas, Filiais e Permissões', () => {
  let db: PGlite;
  let poolAdapter: pg.Pool;

  // IDs Fictícios de Demonstração
  const empresaAId = '11111111-1111-4111-a111-111111111111';
  const filialA1Id = '11111111-aaaa-4111-a111-aaaaaaaaaaaa';
  const filialA2Id = '11111111-aaaa-4111-a111-bbbbbbbbbbbb';

  const empresaBId = '22222222-2222-4222-b222-222222222222';
  const filialB1Id = '22222222-aaaa-4222-b222-aaaaaaaaaaaa';

  const proprietarioId = 'aaaaaaaa-1111-4000-8000-000000000001';
  const atendenteId = 'aaaaaaaa-2222-4000-8000-000000000002';
  const inativoId = 'aaaaaaaa-3333-4000-8000-000000000003';
  const terminalPdvId = 'dddddddd-1111-4000-8000-000000000001';
  const identificadorHardware = 'HW-CAIXA-01-TERMINAL';

  let cargoAtendenteId: string;

  before(async () => {
    db = new PGlite();

    // Adaptador compatível com pg.Pool para os serviços
    poolAdapter = {
      query: async (sql: string, params?: unknown[]) => {
        const res = await db.query(sql, params as unknown[] | undefined);
        return {
          rows: res.rows,
          rowCount: res.rows.length,
          command: '',
          oid: 0,
          fields: [],
        } as unknown as pg.QueryResult;
      },
    } as unknown as pg.Pool;

    // 1. Executar as 9 migrações em ordem
    const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
    const arquivosMigracao = [
      '001_extensoes_e_funcoes_base.sql',
      '002_tabelas_multiempresa_e_acesso.sql',
      '003_tabelas_produtos_medicamentos_e_lotes.sql',
      '004_tabelas_clientes_e_lgpd.sql',
      '005_tabelas_caixas_e_vendas.sql',
      '006_tabelas_estoque_e_movimentacoes.sql',
      '007_tabelas_auditoria_e_offline.sql',
      '008_politicas_rls_e_seguranca.sql',
      '009_tabelas_autenticacao_e_sessoes.sql',
    ];

    for (const arq of arquivosMigracao) {
      const sql = fs.readFileSync(path.join(migrationsDir, arq), 'utf-8');
      await db.exec(sql);
    }

    // 2. Criar Empresas e Filiais Fictícias com dados compatíveis com o schema
    await db.exec(`
      INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato)
      VALUES 
        ('${empresaAId}', 'Farma Vida Matriz Ltda', 'Farma Vida', '11222333000144', 'contato@farmavida.demo', '1133331111'),
        ('${empresaBId}', 'Drogaria Norte Ltda', 'Drogaria Norte', '22333444000155', 'contato@droganorte.demo', '1144442222');

      INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz)
      VALUES
        ('${filialA1Id}', '${empresaAId}', 'FIL-01', 'Farma Vida - Centro Matriz', '11222333000144', 'Rua Principal', '100', 'Centro', 'São Paulo', 'SP', '01001000', '1133331111', true),
        ('${filialA2Id}', '${empresaAId}', 'FIL-02', 'Farma Vida - Bairro Sul', '11222333000225', 'Av das Flores', '500', 'Sul', 'São Paulo', 'SP', '02002000', '1133332222', false),
        ('${filialB1Id}', '${empresaBId}', 'FIL-01', 'Drogaria Norte - Filial Única', '22333444000155', 'Rua do Norte', '50', 'Bairro Norte', 'Campinas', 'SP', '13000000', '1933334444', true);
    `);

    // 3. Criar Cargo 'Atendente Balcão' na Empresa A
    const resCargo = await db.query<{ id: string }>(`
      INSERT INTO cargos (empresa_id, nome, descricao, nivel_acesso)
      VALUES ('${empresaAId}', 'Atendente Balcão', 'Atendimento inicial a clientes e abertura de vendas', 'ATENDENTE')
      RETURNING id;
    `);
    cargoAtendenteId = resCargo.rows[0].id;

    // Vincular permissões padrão ao cargo
    await db.exec(`
      INSERT INTO cargos_permissoes (cargo_id, permissao_id)
      VALUES 
        ('${cargoAtendenteId}', 'pdv:vender'),
        ('${cargoAtendenteId}', 'pdv:acesso');
    `);

    // 4. Criar Usuários Fictícios com senhas reais Argon2id
    const hashSenhaPadrao = await CryptoService.gerarHashSenha('FarmaPro@2026');

    // Proprietário Empresa A
    await db.exec(`
      INSERT INTO usuarios (id, nome, email, cpf, hash_senha, status)
      VALUES ('${proprietarioId}', 'Carlos Proprietário', 'carlos@farmavida.demo', '11111111111', '${hashSenhaPadrao}', 'ATIVO');

      INSERT INTO usuarios_empresas (usuario_id, empresa_id, papel_empresa, status)
      VALUES ('${proprietarioId}', '${empresaAId}', 'PROPRIETARIO', 'ATIVO');

      INSERT INTO usuarios_filiais (usuario_id, filial_id, empresa_id, cargo_id, e_filial_padrao, status)
      VALUES ('${proprietarioId}', '${filialA1Id}', '${empresaAId}', '${cargoAtendenteId}', true, 'ATIVO');
    `);

    // Atendente Empresa A
    await db.exec(`
      INSERT INTO usuarios (id, nome, email, cpf, hash_senha, status)
      VALUES ('${atendenteId}', 'Mariana Atendente', 'mariana@farmavida.demo', '22222222222', '${hashSenhaPadrao}', 'ATIVO');

      INSERT INTO usuarios_empresas (usuario_id, empresa_id, papel_empresa, status)
      VALUES ('${atendenteId}', '${empresaAId}', 'COLABORADOR', 'ATIVO');

      INSERT INTO usuarios_filiais (usuario_id, filial_id, empresa_id, cargo_id, e_filial_padrao, status)
      VALUES ('${atendenteId}', '${filialA1Id}', '${empresaAId}', '${cargoAtendenteId}', true, 'ATIVO');
    `);

    // Usuário Inativo
    await db.exec(`
      INSERT INTO usuarios (id, nome, email, cpf, hash_senha, status)
      VALUES ('${inativoId}', 'João Inativo', 'joao@farmavida.demo', '33333333333', '${hashSenhaPadrao}', 'INATIVO');

      INSERT INTO usuarios_empresas (usuario_id, empresa_id, papel_empresa, status)
      VALUES ('${inativoId}', '${empresaAId}', 'COLABORADOR', 'INATIVO');
    `);

    // 5. Cadastrar Dispositivo PDV Autorizado na Empresa A / Filial A1
    const tokenDispositivoHash = CryptoService.gerarHashSha256('token-terminal-caixa-01');
    await db.exec(`
      INSERT INTO dispositivos_autorizados (id, empresa_id, filial_id, identificador_hardware, nome_terminal, numero_serie_caixa, tipo_dispositivo, token_acesso_hash, ativo)
      VALUES ('${terminalPdvId}', '${empresaAId}', '${filialA1Id}', '${identificadorHardware}', 'Caixa 01 Balcão', 'CX-BALCAO-001', 'DESKTOP_PDV', '${tokenDispositivoHash}', true);
    `);
  });

  it('1. Login com e-mail e senha válidos: retorna JWT, Refresh Token e registra sessão ativa', async () => {
    const resposta = await AuthService.login(poolAdapter, {
      email: 'carlos@farmavida.demo',
      senha: 'FarmaPro@2026',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 FarmaPro Test Agent',
    });

    assert.ok(resposta.accessToken, 'Deve gerar Access Token JWT');
    assert.ok(resposta.refreshToken, 'Deve gerar Refresh Token');
    assert.strictEqual(resposta.usuario.email, 'carlos@farmavida.demo');
    assert.strictEqual(resposta.empresas.length, 1);
    assert.strictEqual(resposta.empresas[0].id, empresaAId);

    // Valida assinatura JWT
    const payload = JwtService.verificarAccessToken(resposta.accessToken);
    assert.ok(payload);
    assert.strictEqual(payload?.sub, proprietarioId);

    // Valida persistência em usuarios_sessoes
    const sessaoDb = await db.query<{ id: string; revogado_em: Date | null }>(`
      SELECT id, revogado_em FROM usuarios_sessoes WHERE usuario_id = $1 AND revogado_em IS NULL;
    `, [proprietarioId]);
    assert.strictEqual(sessaoDb.rows.length, 1, 'Deve existir uma sessão ativa no banco');
  });

  it('2. Senha incorreta registra falha e aciona Rate Limiting após limite de tentativas', async () => {
    const emailAlvo = 'mariana@farmavida.demo';

    // 1ª tentativa com senha errada
    await assert.rejects(
      async () => {
        await AuthService.login(poolAdapter, {
          email: emailAlvo,
          senha: 'senha_errada_123',
        });
      },
      /E-mail ou senha incorretos/,
      'Deve falhar com senha incorreta'
    );

    // Simula 4 tentativas adicionais para atingir o limite de 5
    for (let i = 0; i < 4; i++) {
      try {
        await AuthService.login(poolAdapter, { email: emailAlvo, senha: 'senha_errada' });
      } catch {
        // Ignora para acumular tentativas
      }
    }

    // A 6ª tentativa deve ser bloqueada pelo Rate Limiter
    await assert.rejects(
      async () => {
        await AuthService.login(poolAdapter, {
          email: emailAlvo,
          senha: 'FarmaPro@2026', // mesmo com a senha certa, deve estar temporariamente bloqueado
        });
      },
      /temporariamente bloqueada/,
      'Deve bloquear acesso após 5 falhas consecutivas'
    );
  });

  it('3. Usuário inativo ou bloqueado tem login sumariamente rejeitado', async () => {
    await assert.rejects(
      async () => {
        await AuthService.login(poolAdapter, {
          email: 'joao@farmavida.demo',
          senha: 'FarmaPro@2026',
        });
      },
      /Usuário inativo/,
      'Usuário inativo não pode efetuar login'
    );
  });

  it('4. Seleção de empresa e filial autorizadas: estabelece ContextoTenant e calcula permissões', async () => {
    // Seleciona Empresa A e Filial A1
    const resultado = await AuthService.selecionarContextoEmpresaFilial(poolAdapter, {
      usuarioId: proprietarioId,
      empresaId: empresaAId,
      filialId: filialA1Id,
    });

    assert.ok(resultado.accessToken);
    assert.strictEqual(resultado.tenant.empresaId, empresaAId);
    assert.strictEqual(resultado.tenant.filialId, filialA1Id);
    assert.strictEqual(resultado.cargo.papelEmpresa, 'PROPRIETARIO');

    // Valida que o token contextualizado contém as permissões e o tenant embutido
    const payload = JwtService.verificarAccessToken(resultado.accessToken);
    assert.ok(payload);
    assert.strictEqual(payload?.empresaId, empresaAId);
    assert.strictEqual(payload?.filialId, filialA1Id);
    assert.strictEqual(payload?.papelEmpresa, 'PROPRIETARIO');
    // Proprietário tem acesso irrestrito ao catálogo de permissões
    assert.ok((payload?.permissoes?.length || 0) > 10, 'Proprietário deve possuir todas as permissões');
  });

  it('5. Rejeição de segurança ao tentar selecionar empresa ou filial não autorizada', async () => {
    // Carlos pertence à Empresa A. Tentar selecionar a Empresa B deve falhar categoricamente
    await assert.rejects(
      async () => {
        await AuthService.selecionarContextoEmpresaFilial(poolAdapter, {
          usuarioId: proprietarioId,
          empresaId: empresaBId,
          filialId: filialB1Id,
        });
      },
      /Usuário não possui autorização ou vínculo ativo/,
      'Não deve permitir selecionar empresa sem vínculo'
    );
  });

  it('6. Login rápido por PIN de 6 dígitos em terminal PDV autorizado retorna token com flag origemPin: true', async () => {
    // Cadastrar PIN para Mariana no terminal do Caixa 01
    await FuncionariosService.configurarPinDispositivo(poolAdapter, {
      usuarioId: atendenteId,
      empresaId: empresaAId,
      filialId: filialA1Id,
      dispositivoId: terminalPdvId,
      pinNovo: '654321',
    });

    // Executar login via PIN
    const respostaPin = await AuthService.loginPin(poolAdapter, {
      identificadorHardware,
      usuarioId: atendenteId,
      pin: '654321',
    });

    assert.ok(respostaPin.accessToken);
    assert.strictEqual(respostaPin.usuario.id, atendenteId);
    assert.strictEqual(respostaPin.origemPin, true);

    const payload = JwtService.verificarAccessToken(respostaPin.accessToken);
    assert.ok(payload);
    assert.strictEqual(payload?.origemPin, true);
    assert.strictEqual(payload?.dispositivoId, terminalPdvId);
    assert.strictEqual(payload?.empresaId, empresaAId);
    assert.strictEqual(payload?.filialId, filialA1Id);
  });

  it('7. Erro de PIN por 3 vezes consecutivas bloqueia o PIN temporariamente por 15 minutos', async () => {
    // 1º erro
    await assert.rejects(
      async () => {
        await AuthService.loginPin(poolAdapter, {
          identificadorHardware,
          usuarioId: atendenteId,
          pin: '000000',
        });
      },
      /PIN incorreto/,
      '1ª tentativa incorreta'
    );

    // 2º erro
    await assert.rejects(
      async () => {
        await AuthService.loginPin(poolAdapter, {
          identificadorHardware,
          usuarioId: atendenteId,
          pin: '111111',
        });
      },
      /PIN incorreto/,
      '2ª tentativa incorreta'
    );

    // 3º erro deve causar o bloqueio
    await assert.rejects(
      async () => {
        await AuthService.loginPin(poolAdapter, {
          identificadorHardware,
          usuarioId: atendenteId,
          pin: '222222',
        });
      },
      /PIN bloqueado por 15 minutos/,
      '3º erro deve bloquear o PIN'
    );

    // 4ª tentativa mesmo com o PIN correto deve ser rejeitada pelo bloqueio
    await assert.rejects(
      async () => {
        await AuthService.loginPin(poolAdapter, {
          identificadorHardware,
          usuarioId: atendenteId,
          pin: '654321',
        });
      },
      /PIN temporariamente bloqueado por excesso de tentativas/,
      'Deve permanecer bloqueado'
    );
  });

  it('8. Middleware bloquearOrigemPinParaOperacaoSensivel impede acesso com token originado por PIN', async () => {
    let statusRetornado = 0;
    let corpoRetornado: unknown = null;

    const mockReply = {
      status: (code: number) => {
        statusRetornado = code;
        return {
          send: (body: unknown) => {
            corpoRetornado = body;
          },
        };
      },
    };

    // Requisição com origemPin: true
    const mockRequestComPin = {
      usuario: {
        sub: atendenteId,
        nome: 'Mariana',
        email: 'mariana@demo',
        origemPin: true,
      },
    };

    await bloquearOrigemPinParaOperacaoSensivel(
      mockRequestComPin as unknown as FastifyRequest,
      mockReply as unknown as FastifyReply,
    );

    assert.strictEqual(statusRetornado, 403);
    assert.deepStrictEqual((corpoRetornado as { erro?: string })?.erro, 'OPERACAO_SENSIVEL_BLOQUEADA');

    // Requisição com login completo (origemPin: false / undefined)
    statusRetornado = 0;
    const mockRequestLoginCompleto = {
      usuario: {
        sub: atendenteId,
        nome: 'Mariana',
        email: 'mariana@demo',
        origemPin: false,
      },
    };

    await bloquearOrigemPinParaOperacaoSensivel(
      mockRequestLoginCompleto as unknown as FastifyRequest,
      mockReply as unknown as FastifyReply,
    );
    assert.strictEqual(statusRetornado, 0, 'Não deve bloquear quando não tem origemPin');
  });

  it('9. Cálculo de permissões efetivas respeita permissões do cargo e exceções de filial', async () => {
    // Mariana tem cargo 'Atendente Balcão' com: pdv:vender, pdv:acesso
    // Vamos adicionar uma filial A2 para Mariana com exceção:
    // Concede 'clientes:gerenciar' e revoga 'pdv:acesso' na Filial A2
    const resUf = await db.query<{ id: string }>(`
      INSERT INTO usuarios_filiais (usuario_id, filial_id, empresa_id, cargo_id, e_filial_padrao, status)
      VALUES ('${atendenteId}', '${filialA2Id}', '${empresaAId}', '${cargoAtendenteId}', false, 'ATIVO')
      RETURNING id;
    `);
    const ufId = resUf.rows[0].id;

    await db.exec(`
      INSERT INTO usuarios_filiais_permissoes (usuario_filial_id, permissao_id, concedida, motivo_concessao)
      VALUES 
        ('${ufId}', 'clientes:gerenciar', true, 'Autorizada a gerenciar clientes na Filial Sul'),
        ('${ufId}', 'pdv:acesso', false, 'Proibida de abrir caixa na Filial Sul');
    `);

    const permissoesEfetivas = await PermissoesService.calcularPermissoesEfetivas(poolAdapter, {
      usuarioId: atendenteId,
      empresaId: empresaAId,
      filialId: filialA2Id,
    });

    assert.ok(permissoesEfetivas);
    assert.strictEqual(permissoesEfetivas.cargoNome, 'Atendente Balcão');
    assert.ok(permissoesEfetivas.permissoesEfetivas.includes('pdv:vender'), 'Deve manter permissão herdada do cargo');
    assert.ok(permissoesEfetivas.permissoesEfetivas.includes('clientes:gerenciar'), 'Deve conter permissão concedida por exceção');
    assert.ok(!permissoesEfetivas.permissoesEfetivas.includes('pdv:acesso'), 'NÃO deve conter permissão revogada por exceção');
    assert.deepStrictEqual(permissoesEfetivas.permissoesConcedidasExcecao, ['clientes:gerenciar']);
    assert.deepStrictEqual(permissoesEfetivas.permissoesRevogadasExcecao, ['pdv:acesso']);
  });

  it('10. Renovação de sessão via refresh token e revogação no Logout', async () => {
    // 1. Login inicial
    const loginRes = await AuthService.login(poolAdapter, {
      email: 'carlos@farmavida.demo',
      senha: 'FarmaPro@2026',
    });

    // 2. Renovar sessão usando refresh token (passando string diretamente)
    const renovacaoRes = await AuthService.renovarSessao(poolAdapter, loginRes.refreshToken);

    assert.ok(renovacaoRes.accessToken, 'Deve gerar novo access token');

    // 3. Efetuar Logout com o refresh token
    await AuthService.logout(poolAdapter, loginRes.refreshToken);

    // 4. Tentar renovar com o refresh token recém-deslogado/revogado deve falhar
    await assert.rejects(
      async () => {
        await AuthService.renovarSessao(poolAdapter, loginRes.refreshToken);
      },
      /Sessão revogada/,
      'Não pode renovar com token de sessão revogada'
    );
  });

  it('11. Proibição explícita do cargo "Estoquista" e manutenção das permissões atômicas', async () => {
    // Tentativa de criar cargo chamado "Estoquista"
    await assert.rejects(
      async () => {
        await CargosService.criarCargo(poolAdapter, empresaAId, {
          nome: 'Estoquista',
          descricao: 'Responsável pelo estoque',
          nivelAcesso: 'ATENDENTE',
          permissoes: ['estoque:visualizar', 'estoque:ajuste_manual'],
        });
      },
      /O cargo predefinido "Estoquista" foi removido da arquitetura FarmaPro/,
      'Criação de cargo "Estoquista" deve ser proibida'
    );

    // Permissões de estoque podem ser atribuídas a qualquer outro cargo
    const novoCargo = await CargosService.criarCargo(poolAdapter, empresaAId, {
      nome: 'Auxiliar de Logística e Farmácia',
      descricao: 'Gerencia recebimento e conferência de medicamentos',
      nivelAcesso: 'ATENDENTE',
      permissoes: ['estoque:visualizar', 'estoque:ajuste_manual', 'estoque:cadastrar_produto'],
    });

    assert.ok(novoCargo.id);
    const listaCargos = await CargosService.listarCargos(poolAdapter, empresaAId);
    const cargoCadastrado = listaCargos.find(c => c.id === novoCargo.id);
    assert.ok(cargoCadastrado);
    assert.ok(cargoCadastrado.permissoes.includes('estoque:visualizar'));
    assert.ok(cargoCadastrado.permissoes.includes('estoque:ajuste_manual'));
  });
});
