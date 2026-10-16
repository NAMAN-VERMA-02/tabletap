// Loads the demo restaurant into the database in MONGO_URI (replacing any previous demo data).
// Usage: npm run seed
const mongoose = require('mongoose');
const env = require('../src/config/env');
const connectDB = require('../src/config/db');
const { seedDemo } = require('./demoData');

(async () => {
  await connectDB(env.mongoUri);
  await seedDemo();
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
