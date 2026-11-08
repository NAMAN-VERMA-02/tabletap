const http = require('http');
const mongoose = require('mongoose');
const env = require('./config/env');
const logger = require('./config/logger');
const connectDB = require('./config/db');
const app = require('./app');
const { initSocket, closeSocket } = require('./socket');

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start() {
  await connectDB(env.mongoUri);
  const server = http.createServer(app);
  initSocket(server); // real-time kitchen display + diner order updates
  server.listen(env.port, () => logger.info({ port: env.port }, 'API listening'));

  let stopping = false;
  // Stop taking new connections, let in-flight requests finish, then close sockets and the DB.
  const shutdown = (signal) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, 'shutting down');
    const force = setTimeout(() => {
      logger.error('shutdown timed out; forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    force.unref();

    server.close(async () => {
      try {
        closeSocket();
        await mongoose.disconnect();
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'error during shutdown');
        process.exit(1);
      }
    });
    server.closeIdleConnections?.();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.fatal({ err }, 'failed to start server');
  process.exit(1);
});
