const http = require('http');
const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

async function start() {
  await connectDB(env.mongoUri);
  // Plain http server so Socket.io can attach to it later (kitchen display).
  const server = http.createServer(app);
  server.listen(env.port, () => console.log(`API running on http://localhost:${env.port}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
