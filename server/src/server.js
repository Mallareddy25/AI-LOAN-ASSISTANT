'use strict';

const app = require('./app');
const { config, describeConfig } = require('./config/env');
const { logger } = require('./config/logger');
const db = require('./config/db');
const { aiService } = require('./services/aiService');

const BANNER = `
╔══════════════════════════════════════════════════════════════════════╗
║   AI LOAN INFORMATION ASSISTANT  ·  Project Code 4SU24CS045          ║
║   Educational AI chatbot — no loan approval, no financial advice.    ║
╚══════════════════════════════════════════════════════════════════════╝`;

async function bootstrap() {
  logger.info(BANNER);
  logger.info('Starting API server', describeConfig());

  // ── Preflight: is the database reachable and migrated? ────────────────
  const dbHealth = await db.healthCheck();
  if (dbHealth.status !== 'up') {
    logger.error(
      'Database is not reachable. The API will start, but database-backed routes will fail.',
      { database: describeConfig().database, code: dbHealth.error },
    );
  } else {
    const schema = await db.assertSchema();
    if (!schema.ok) {
      logger.error(
        `Database is reachable but ${schema.missing.length} table(s) are missing: ${schema.missing.join(', ')}. ` +
          'Run: npm run db:setup',
      );
    } else {
      logger.info('Database schema verified', { tables: schema.present.length });
    }
  }

  if (aiService.isConfigured()) {
    logger.info('AI mode: OpenAI', { model: aiService.getModel() });
  } else {
    logger.warn(
      'AI mode: OFFLINE KNOWLEDGE BASE. OPENAI_API_KEY is not set in your .env, so the assistant ' +
        'answers from the local MySQL knowledge base. Every feature still works — set OPENAI_API_KEY ' +
        'and restart to enable the model.',
    );
  }

  const server = app.listen(config.server.port, () => {
    logger.info(`API listening on http://localhost:${config.server.port}`);
    logger.info(`Health check:  http://localhost:${config.server.port}${config.server.apiPrefix}/health`);
    logger.info(`Allowed client origins: ${config.server.clientUrl.join(', ')}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${config.server.port} is already in use. Set PORT in your .env to a free port.`);
    } else {
      logger.error('Server error', { message: error.message });
    }
    process.exit(1);
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received — shutting down gracefully`);

    const timer = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, config.server.shutdownTimeoutMs);
    timer.unref();

    server.close(async () => {
      try {
        await db.closePool();
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { message: error.message });
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      message: reason?.message || String(reason),
      stack: reason?.stack,
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception — exiting', { message: error.message, stack: error.stack });
    process.exit(1);
  });

  return server;
}

if (require.main === module) {
  bootstrap().catch((error) => {
    logger.error('Failed to start server', { message: error.message, stack: error.stack });
    process.exit(1);
  });
}

module.exports = { bootstrap, app };
