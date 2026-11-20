import Fastify from 'fastify';
import cors from '@fastify/cors';
import { pluginContextoTenant } from './plugins/tenant.js';
import { pluginDatabase } from './plugins/database.js';
import { rotasAutenticacao } from './routes/auth.routes.js';
import { rotasFuncionarios } from './routes/funcionarios.routes.js';
import { rotasCargos } from './routes/cargos.routes.js';
import { rotasCaixa } from './routes/caixa.routes.js';
import { rotasVendas } from './routes/vendas.routes.js';
import { rotasEstoque } from './routes/estoque.routes.js';

const porta = Number(process.env.PORT) || 3333;
const host = process.env.API_HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

async function iniciarServidor() {
  try {
    // Configuração de CORS para permitir acesso do frontend Web
    await fastify.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    // Registro do plugin de banco de dados e pool de conexões
    await fastify.register(pluginDatabase);

    // Registro do middleware/plugin de contexto Multi-tenant derivado do JWT
    await fastify.register(pluginContextoTenant);

    // Registro das rotas da API
    await fastify.register(rotasAutenticacao);
    await fastify.register(rotasFuncionarios);
    await fastify.register(rotasCargos);
    await fastify.register(rotasCaixa);
    await fastify.register(rotasVendas);
    await fastify.register(rotasEstoque);

    // Rota de Verificação de Saúde (Health Check)
    fastify.get('/api/health', async () => {
      const saudeBanco = await fastify.db.verificarSaude();

      return {
        status: saudeBanco.conectado ? 'OK' : 'DEGRADADO',
        sistema: 'FarmaPro API',
        versao: '0.1.0-etapa07',
        etapa: '07 — Gestão de Estoque, Lotes, Validade, FEFO e Inventário',
        dataHora: new Date().toISOString(),
        multiempresa: 'Habilitado (Isolamento RLS e JWT Seguro)',
        banco: {
          conectado: saudeBanco.conectado,
          tempoRespostaMs: saudeBanco.tempoRespostaMs,
          detalhe: saudeBanco.conectado ? 'Disponível' : saudeBanco.mensagem,
        },
      };
    });

    await fastify.listen({ port: porta, host });
    fastify.log.info(`Servidor FarmaPro API ativo em http://${host}:${porta}`);
  } catch (erro) {
    fastify.log.error(erro);
    process.exit(1);
  }
}

// Inicialização somente em execução direta
if (process.env.NODE_ENV !== 'test') {
  iniciarServidor();
}

export { fastify };
