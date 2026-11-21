import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { AuthService } from '../src/services/auth.service.js';
import { CryptoService } from '../src/services/crypto.service.js';
import { JwtService } from '../src/services/jwt.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FarmaPro — Autenticação Operacional por Matrícula e Senha Numérica (17 Cenários)', () => {
  let db: PGlite;
  let poolAdapter: pg.Pool;

  // IDs Fictícios de Empresas e Filiais
  const empresaAId = '11111111-1111-4111-a111-111111111111';
  const filialA1Id = '11111111-aaaa-4111-a111-aaaaaaaaaaaa';
  const filialA2Id = '11111111-bbbb-4111-a111-bbbbbbbbbbbb';

  const empresaBId = '22222222-2222-4222-b222-222222222222';
  const filialB1Id = '22222222-aaaa-4222-b222-aaaaaaaaaaaa';

  // Usuários com Cargos Distintos
  const userCaixaId = '10000000-0000-4000-8000-000000000001';
  const userBalcaoId = '10000000-0000-4000-8000-000000000002';
  const userSemPermissaoId = '10000000-0000-4000-8000-000000000003';
  const userInativoId = '10000000-0000-4000-8000-000000000004';
  const userEmpresaBId = '20000000-0000-4000-8000-000000000001';

  // IDs Fictícios de Vinculações Usuário-Empresa (UUID)
  const ueCaixaId = '11111111-ea01-4000-8000-000000000001';
  const ueBalcaoId = '11111111-ea02-4000-8000-000000000002';
  const ueSemPermId = '11111111-ea03-4000-8000-000000000003';
  const ueInativoId = '11111111-ea04-4000-8000-000000000004';
  const ueEmpresaBId = '22222222-ea01-4000-8000-000000000001';

  // Matrículas e Senhas de 6 dígitos
  const matriculaCaixa = 'CX-001';
  const senhaCaixa = '123456';

  const matriculaBalcao = 'BC-002';
  const senhaBalcao = '654321';

  const matriculaSemPerm = 'SM-003';
  const senhaSemPerm = '112233';

  const matriculaInativo = 'IN-004';
  const senhaInativo = '445566';

  const matriculaEmpresaB = 'EB-999';
  const senhaEmpresaB = '998877';

  before(async () => {
    db = new PGlite();

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

    // Executar as 15 migrações
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
      '010_tabelas_caixas_movimentacoes.sql',
      '011_tabelas_inventarios_e_ajustes.sql',
      '012_tabelas_fornecedores_e_pedidos_compra.sql',
      '013_tabelas_recebimento_e_nfe.sql',
      '014_tabelas_pre_venda_balcao.sql',
      '015_matricula_e_senha_operacional.sql',
    ];

    for (const arq of arquivosMigracao) {
      const sql = fs.readFileSync(path.join(migrationsDir, arq), 'utf-8');
      await db.exec(sql);
    }

    // Gerar hashes Argon2id para as senhas de 6 dígitos
    const hashCaixa = await CryptoService.gerarHashPin(senhaCaixa);
    const hashBalcao = await CryptoService.gerarHashPin(senhaBalcao);
    const hashSemPerm = await CryptoService.gerarHashPin(senhaSemPerm);
    const hashInativo = await CryptoService.gerarHashPin(senhaInativo);
    const hashEmpresaB = await CryptoService.gerarHashPin(senhaEmpresaB);

    // Carga de Empresas e Filiais Fictícias
    await db.exec(`
      INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, email_contato, telefone_contato)
      VALUES 
        ('${empresaAId}', 'FarmaPro Matriz Ltda', 'FarmaPro Centro', '11222333000144', 'contato@farmapro.demo', '1133331111'),
        ('${empresaBId}', 'Drogaria Sul Ltda', 'Drogaria Sul', '22333444000155', 'contato@drogariasul.demo', '1144442222');

      INSERT INTO filiais (id, empresa_id, codigo_filial, nome, cnpj, logradouro, numero, bairro, cidade, uf, cep, telefone, e_matriz)
      VALUES
        ('${filialA1Id}', '${empresaAId}', 'FIL-01', 'FarmaPro - Centro Matriz', '11222333000144', 'Rua Central', '100', 'Centro', 'São Paulo', 'SP', '01001000', '1133331111', true),
        ('${filialA2Id}', '${empresaAId}', 'FIL-02', 'FarmaPro - Bairro Sul', '11222333000225', 'Av das Nações', '500', 'Sul', 'São Paulo', 'SP', '04001000', '1133332222', false),
        ('${filialB1Id}', '${empresaBId}', 'FIL-B1', 'Drogaria Sul - Loja 1', '22333444000155', 'Rua Sul', '200', 'Sul', 'São Paulo', 'SP', '04002000', '1144442222', true);

      -- Cargos da Empresa A
      INSERT INTO cargos (id, empresa_id, nome, descricao, nivel_acesso)
      VALUES
        ('c1111111-1111-4000-8000-000000000001', '${empresaAId}', 'Operador de Caixa', 'Acesso ao PDV', 'OPERADOR_CAIXA'),
        ('c2222222-2222-4000-8000-000000000002', '${empresaAId}', 'Balconista / Atendente', 'Acesso ao Balcão e Pré-venda', 'ATENDENTE'),
        ('c3333333-3333-4000-8000-000000000003', '${empresaAId}', 'Auxiliar de Limpeza', 'Sem permissão de vendas', 'ATENDENTE');

      -- Permissões por Cargo
      INSERT INTO cargos_permissoes (cargo_id, permissao_id)
      VALUES
        ('c1111111-1111-4000-8000-000000000001', 'pdv:acesso'),
        ('c1111111-1111-4000-8000-000000000001', 'pdv:vender'),
        ('c2222222-2222-4000-8000-000000000002', 'balcao:consultar'),
        ('c2222222-2222-4000-8000-000000000002', 'pre_venda:criar');

      -- Usuários Globais
      INSERT INTO usuarios (id, nome, email, cpf, hash_senha, status)
      VALUES
        ('${userCaixaId}', 'Carlos Santos Operador', 'carlos.caixa@farmapro.demo', '11122233344', 'hash_argon', 'ATIVO'),
        ('${userBalcaoId}', 'Carlos Silva Balconista', 'carlos.balcao@farmapro.demo', '22233344455', 'hash_argon', 'ATIVO'),
        ('${userSemPermissaoId}', 'Pedro Auxiliar', 'pedro.aux@farmapro.demo', '33344455566', 'hash_argon', 'ATIVO'),
        ('${userInativoId}', 'Joana Bloqueada', 'joana.inativa@farmapro.demo', '44455566677', 'hash_argon', 'BLOQUEADO'),
        ('${userEmpresaBId}', 'Roberto Outra Empresa', 'roberto@drogariasul.demo', '55566677788', 'hash_argon', 'ATIVO');

      -- Vinculação Usuário-Empresa com Matrícula e Senha Operacional Argon2id
      INSERT INTO usuarios_empresas (id, usuario_id, empresa_id, papel_empresa, status, matricula, senha_operacional_hash)
      VALUES
        ('${ueCaixaId}', '${userCaixaId}', '${empresaAId}', 'COLABORADOR', 'ATIVO', '${matriculaCaixa}', '${hashCaixa}'),
        ('${ueBalcaoId}', '${userBalcaoId}', '${empresaAId}', 'COLABORADOR', 'ATIVO', '${matriculaBalcao}', '${hashBalcao}'),
        ('${ueSemPermId}', '${userSemPermissaoId}', '${empresaAId}', 'COLABORADOR', 'ATIVO', '${matriculaSemPerm}', '${hashSemPerm}'),
        ('${ueInativoId}', '${userInativoId}', '${empresaAId}', 'COLABORADOR', 'BLOQUEADO', '${matriculaInativo}', '${hashInativo}'),
        ('${ueEmpresaBId}', '${userEmpresaBId}', '${empresaBId}', 'COLABORADOR', 'ATIVO', '${matriculaEmpresaB}', '${hashEmpresaB}');

      -- Vinculação com Filial A1 e Cargo
      INSERT INTO usuarios_filiais (usuario_id, filial_id, empresa_id, cargo_id, e_filial_padrao, status)
      VALUES
        ('${userCaixaId}', '${filialA1Id}', '${empresaAId}', 'c1111111-1111-4000-8000-000000000001', true, 'ATIVO'),
        ('${userBalcaoId}', '${filialA1Id}', '${empresaAId}', 'c2222222-2222-4000-8000-000000000002', true, 'ATIVO'),
        ('${userSemPermissaoId}', '${filialA1Id}', '${empresaAId}', 'c3333333-3333-4000-8000-000000000003', true, 'ATIVO'),
        ('${userInativoId}', '${filialA1Id}', '${empresaAId}', 'c1111111-1111-4000-8000-000000000001', true, 'ATIVO'),
        ('${userEmpresaBId}', '${filialB1Id}', '${empresaBId}', 'c1111111-1111-4000-8000-000000000001', true, 'ATIVO');
    `);
  });

  after(async () => {
    await db.close();
  });

  // 1. Login com matrícula e senha válida de 6 dígitos no Caixa
  it('1. Deve autenticar com sucesso operador de caixa com matrícula e senha de 6 dígitos', async () => {
    const res = await AuthService.autenticarPorMatricula(poolAdapter, {
      matricula: matriculaCaixa,
      senhaNumerica: senhaCaixa,
      estacao: 'CAIXA',
      empresaId: empresaAId,
      filialId: filialA1Id,
    });

    assert.ok(res.accessToken);
    assert.equal(res.estacao, 'CAIXA');
    assert.equal(res.usuario.matricula, matriculaCaixa);
    assert.equal(res.filial.id, filialA1Id);
    assert.ok(res.permissoes.includes('pdv:acesso'));
  });

  // 2. Rejeição de matrícula inexistente
  it('2. Deve rejeitar matrícula que não existe na empresa', async () => {
    await assert.rejects(
      async () => {
        await AuthService.autenticarPorMatricula(poolAdapter, {
          matricula: 'MAT-NAO-EXISTE',
          senhaNumerica: '123456',
          estacao: 'CAIXA',
          empresaId: empresaAId,
        });
      },
      { message: /Matrícula não encontrada/ }
    );
  });

  // 3. Rejeição de senha incorreta e incremento do contador de tentativas
  it('3. Deve rejeitar senha incorreta e contabilizar a tentativa', async () => {
    await assert.rejects(
      async () => {
        await AuthService.autenticarPorMatricula(poolAdapter, {
          matricula: matriculaCaixa,
          senhaNumerica: '999999',
          estacao: 'CAIXA',
          empresaId: empresaAId,
        });
      },
      { message: /Senha incorreta\. Tentativa 1 de 3/ }
    );

    const check = await poolAdapter.query<{ tentativas_falhas_operacional: number }>(`
      SELECT tentativas_falhas_operacional FROM usuarios_empresas WHERE id = '${ueCaixaId}';
    `);
    assert.equal(check.rows[0]?.tentativas_falhas_operacional, 1);
  });

  // 4. Bloqueio temporário após 3 tentativas inválidas (15 minutos)
  it('4. Deve bloquear temporariamente após 3 tentativas de senha incorreta', async () => {
    // 2ª tentativa falha
    await assert.rejects(async () => {
      await AuthService.autenticarPorMatricula(poolAdapter, {
        matricula: matriculaCaixa,
        senhaNumerica: '999999',
        estacao: 'CAIXA',
        empresaId: empresaAId,
      });
    }, { message: /Tentativa 2 de 3/ });

    // 3ª tentativa falha -> bloqueio disparado
    await assert.rejects(async () => {
      await AuthService.autenticarPorMatricula(poolAdapter, {
        matricula: matriculaCaixa,
        senhaNumerica: '999999',
        estacao: 'CAIXA',
        empresaId: empresaAId,
      });
    }, { message: /Acesso bloqueado por 15 minutos/ });

    // Tentativa subsequente é rejeitada imediatamente por bloqueio ativo
    await assert.rejects(async () => {
      await AuthService.autenticarPorMatricula(poolAdapter, {
        matricula: matriculaCaixa,
        senhaNumerica: senhaCaixa, // mesmo com a senha certa!
        estacao: 'CAIXA',
        empresaId: empresaAId,
      });
    }, { message: /Acesso bloqueado por tentativas consecutivas inválidas/ });

    // Desbloquear manualmente para os próximos testes
    await poolAdapter.query(`
      UPDATE usuarios_empresas
      SET tentativas_falhas_operacional = 0, bloqueado_operacional_ate = NULL
      WHERE id = '${ueCaixaId}';
    `);
  });

  // 5. Rejeição de colaborador com status inativo/bloqueado
  it('5. Deve recusar acesso a colaborador inativo ou com vínculo bloqueado', async () => {
    await assert.rejects(
      async () => {
        await AuthService.autenticarPorMatricula(poolAdapter, {
          matricula: matriculaInativo,
          senhaNumerica: senhaInativo,
          estacao: 'CAIXA',
          empresaId: empresaAId,
        });
      },
      { message: /Colaborador bloqueado pelo administrador/ }
    );
  });

  // 6. Bloqueio de colaborador sem permissão pdv:acesso ao tentar acessar o Caixa
  it('6. Deve impedir colaborador sem permissão pdv:acesso de acessar o Caixa', async () => {
    await assert.rejects(
      async () => {
        await AuthService.autenticarPorMatricula(poolAdapter, {
          matricula: matriculaSemPerm,
          senhaNumerica: senhaSemPerm,
          estacao: 'CAIXA',
          empresaId: empresaAId,
          filialId: filialA1Id,
        });
      },
      { message: /não possui permissão de Operador de Caixa \(pdv:acesso\)/ }
    );
  });

  // 7. Bloqueio de colaborador sem permissão balcao:consultar ao tentar acessar o Balcão
  it('7. Deve impedir colaborador sem permissão balcao:consultar de acessar o Balcão', async () => {
    await assert.rejects(
      async () => {
        await AuthService.autenticarPorMatricula(poolAdapter, {
          matricula: matriculaSemPerm,
          senhaNumerica: senhaSemPerm,
          estacao: 'BALCAO',
          empresaId: empresaAId,
          filialId: filialA1Id,
        });
      },
      { message: /não possui permissão de Atendimento no Balcão \(balcao:consultar\)/ }
    );
  });

  // 8. Sucesso no Balcão para colaborador com permissão de Balconista
  it('8. Deve autorizar colaborador do balcão para terminal BALCAO', async () => {
    const res = await AuthService.autenticarPorMatricula(poolAdapter, {
      matricula: matriculaBalcao,
      senhaNumerica: senhaBalcao,
      estacao: 'BALCAO',
      empresaId: empresaAId,
      filialId: filialA1Id,
    });

    assert.equal(res.estacao, 'BALCAO');
    assert.equal(res.usuario.matricula, matriculaBalcao);
    assert.ok(res.permissoes.includes('balcao:consultar'));
  });

  // 9. Operador de Caixa tentando acessar o Balcão: concedido se possui permissão pdv:acesso
  it('9. Operador de caixa pode consultar o Balcão com permissão pdv:acesso', async () => {
    const res = await AuthService.autenticarPorMatricula(poolAdapter, {
      matricula: matriculaCaixa,
      senhaNumerica: senhaCaixa,
      estacao: 'BALCAO',
      empresaId: empresaAId,
      filialId: filialA1Id,
    });

    assert.equal(res.estacao, 'BALCAO');
    assert.equal(res.usuario.matricula, matriculaCaixa);
  });

  // 10. Isolamento Multiempresa: matrícula da Empresa B não loga na Empresa A
  it('10. Isolamento Multiempresa: colaborador da Empresa B não pode autenticar na Empresa A', async () => {
    await assert.rejects(
      async () => {
        await AuthService.autenticarPorMatricula(poolAdapter, {
          matricula: matriculaEmpresaB,
          senhaNumerica: senhaEmpresaB,
          estacao: 'CAIXA',
          empresaId: empresaAId,
        });
      },
      { message: /Matrícula não encontrada/ }
    );
  });

  // 11. Autorização estrita por filial: rejeitar filial à qual o colaborador não pertence
  it('11. Deve rejeitar operação em filial não vinculada ao colaborador', async () => {
    await assert.rejects(
      async () => {
        await AuthService.autenticarPorMatricula(poolAdapter, {
          matricula: matriculaCaixa,
          senhaNumerica: senhaCaixa,
          estacao: 'CAIXA',
          empresaId: empresaAId,
          filialId: filialA2Id, // Caixa A1 não está cadastrado na filial A2
        });
      },
      { message: /Colaborador não autorizado para operar nesta filial/ }
    );
  });

  // 12. Emissão de JWT contendo matrícula, operador e permissões
  it('12. JWT gerado deve conter claims completas de operador, matrícula e estação', async () => {
    const res = await AuthService.autenticarPorMatricula(poolAdapter, {
      matricula: matriculaCaixa,
      senhaNumerica: senhaCaixa,
      estacao: 'CAIXA',
      empresaId: empresaAId,
      filialId: filialA1Id,
    });

    const decodificado = JwtService.verificarAccessToken(res.accessToken);
    assert.equal(decodificado.sub, userCaixaId);
    assert.equal(decodificado.empresaId, empresaAId);
    assert.equal(decodificado.filialId, filialA1Id);
    assert.equal(decodificado.origemPin, true);
    assert.ok(decodificado.permissoes.includes('pdv:acesso'));
  });

  // 13. Rejeição de senha com menos de 6 dígitos
  it('13. Deve rejeitar rigorosamente senha com menos de 6 dígitos', async () => {
    await assert.rejects(
      async () => {
        await AuthService.autenticarPorMatricula(poolAdapter, {
          matricula: matriculaCaixa,
          senhaNumerica: '12345', // 5 dígitos
          estacao: 'CAIXA',
          empresaId: empresaAId,
        });
      },
      { message: /A senha operacional deve conter exclusivamente 6 dígitos numéricos/ }
    );
  });

  // 14. Rejeição de senha com mais de 6 dígitos
  it('14. Deve rejeitar rigorosamente senha com mais de 6 dígitos', async () => {
    await assert.rejects(
      async () => {
        await AuthService.autenticarPorMatricula(poolAdapter, {
          matricula: matriculaCaixa,
          senhaNumerica: '1234567', // 7 dígitos
          estacao: 'CAIXA',
          empresaId: empresaAId,
        });
      },
      { message: /A senha operacional deve conter exclusivamente 6 dígitos numéricos/ }
    );
  });

  // 15. Rejeição de senha não-numérica (com letras ou símbolos)
  it('15. Deve rejeitar senha com letras ou caracteres não numéricos', async () => {
    await assert.rejects(
      async () => {
        await AuthService.autenticarPorMatricula(poolAdapter, {
          matricula: matriculaCaixa,
          senhaNumerica: '12345a',
          estacao: 'CAIXA',
          empresaId: empresaAId,
        });
      },
      { message: /A senha operacional deve conter exclusivamente 6 dígitos numéricos/ }
    );
  });

  // 16. Auditoria: Registro das tentativas em tentativas_acesso_operacional
  it('16. Deve registrar auditoria em tentativas_acesso_operacional para cada tentativa', async () => {
    const auditoria = await poolAdapter.query<{
      matricula: string;
      estacao: string;
      sucesso: boolean;
      motivo_falha: string | null;
    }>(`
      SELECT matricula, estacao, sucesso, motivo_falha 
      FROM tentativas_acesso_operacional 
      WHERE empresa_id = '${empresaAId}'
      ORDER BY criado_em ASC;
    `);

    assert.ok(auditoria.rows.length >= 5);
    
    // Contém registros de falha e de sucesso
    const falhas = auditoria.rows.filter((r) => !r.sucesso);
    const sucessos = auditoria.rows.filter((r) => r.sucesso);

    assert.ok(falhas.length > 0);
    assert.ok(sucessos.length > 0);
  });

  // 17. Reset do contador de falhas após login bem-sucedido
  it('17. Deve resetar tentativas_falhas_operacional para 0 após autenticação com sucesso', async () => {
    // Inserir 1 falha prévia
    await poolAdapter.query(`
      UPDATE usuarios_empresas SET tentativas_falhas_operacional = 1 WHERE id = '${ueCaixaId}';
    `);

    // Logar com a senha correta
    await AuthService.autenticarPorMatricula(poolAdapter, {
      matricula: matriculaCaixa,
      senhaNumerica: senhaCaixa,
      estacao: 'CAIXA',
      empresaId: empresaAId,
      filialId: filialA1Id,
    });

    const check = await poolAdapter.query<{ tentativas_falhas_operacional: number }>(`
      SELECT tentativas_falhas_operacional FROM usuarios_empresas WHERE id = '${ueCaixaId}';
    `);
    assert.equal(check.rows[0]?.tentativas_falhas_operacional, 0);
  });
});
