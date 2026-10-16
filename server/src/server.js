const http = require('http');
const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const { initSocket } = require('./socket');

async function start() {
  await connectDB(env.mongoUri);
  const server = http.createServer(app);
  initSocket(server); // real-time kitchen display + diner order updates
  server.listen(env.port, () => console.log(`API running on http://localhost:${env.port}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
