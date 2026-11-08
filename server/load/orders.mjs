// Load test: POST /public/t/:qrToken/orders against a throwaway in-memory MongoDB.
// Usage: node load/orders.mjs [connections=50] [seconds=15]
// The per-IP order limiter is skipped (NODE_ENV=test) so it doesn't cap throughput; see BENCHMARKS.md.
process.env.NODE_ENV = 'test';
import http from 'node:http';
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const autocannon = require('autocannon');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../src/app');
const { seedDemo } = require('../scripts/demoData');
const Table = require('../src/models/Table');
const MenuItem = require('../src/models/MenuItem');
const Order = require('../src/models/Order');

const connections = Number(process.argv[2]) || 50;
const duration = Number(process.argv[3]) || 15;

const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri('tabletap'));
await seedDemo({ log: () => {} });
await Order.syncIndexes();
const table = await Table.findOne().lean();
const dishes = await MenuItem.find({ isAvailable: true }).limit(3).lean();
const server = http.createServer(app).listen(0);
const port = server.address().port;
const url = `http://127.0.0.1:${port}/api/v1/public/t/${table.qrToken}/orders`;

const before = await Order.countDocuments();
const body = JSON.stringify({ items: dishes.map((d) => ({ menuItem: String(d._id), qty: 1 })) });
const result = await autocannon({
  url,
  method: 'POST',
  connections,
  duration,
  headers: { 'content-type': 'application/json', 'idempotency-key': `load${Date.now()}-[<id>]` },
  body,
  workers: 2, // generate load on separate threads so it doesn't steal the server's event loop
  idReplacement: true, // [<id>] becomes a fresh value per request
});

const stored = (await Order.countDocuments()) - before;
const cpu = os.cpus();
console.log(JSON.stringify({
  machine: { cpu: cpu[0].model.trim(), cores: cpu.length, ramGB: Math.round(os.totalmem() / 2 ** 30), node: process.version },
  run: { connections, seconds: duration, itemsPerOrder: dishes.length },
  requestsPerSec: { avg: result.requests.average, p50: result.requests.p50 },
  latencyMs: { p50: result.latency.p50, p90: result.latency.p90, p97_5: result.latency.p97_5, p99: result.latency.p99, max: result.latency.max },
  responses: { total: result.requests.total, '2xx': result['2xx'], non2xx: result.non2xx, errors: result.errors, timeouts: result.timeouts },
  newOrdersStored: stored, // should equal responses.total, otherwise some requests were replays or were lost
}, null, 2));

server.close();
await mongoose.disconnect();
await mongo.stop();
process.exit(0);
