// Runs the API against a throwaway in-memory MongoDB, so you can try the app
// without installing MongoDB or creating an Atlas cluster. Data is lost on exit.
const http = require('http');
const { MongoMemoryServer } = require('mongodb-memory-server');
const connectDB = require('../src/config/db');
const env = require('../src/config/env');
const app = require('../src/app');
const { initSocket } = require('../src/socket');
const { seedDemo } = require('./demoData');

(async () => {
  const mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri('tabletap'));
  if (process.argv.includes('--demo')) await seedDemo();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(env.port, () => {
    console.log(`API (in-memory DB) running on http://localhost:${env.port}`);
  });

  const shutdown = async () => {
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
