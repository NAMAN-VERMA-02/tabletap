process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

let mongo;

// Call once at the top of a test file: in-memory MongoDB, wiped after every test.
function setupDB() {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });
  afterEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });
}

let counter = 0;

// Registers a new owner + restaurant and returns a logged-in supertest agent.
async function ownerAgent(restaurantName = 'Spice Garden') {
  counter += 1;
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send({
    name: `Owner ${counter}`,
    email: `owner${counter}@example.edu`,
    password: 'supersecret1',
    restaurantName,
  });
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.user };
}

// Creates a staff member in the given restaurant and returns a logged-in agent.
async function staffAgent(restaurantId) {
  counter += 1;
  const email = `staff${counter}@example.edu`;
  await User.create({ name: 'Staff', email, password: 'supersecret1', role: 'staff', restaurant: restaurantId });
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password: 'supersecret1' });
  return agent;
}

module.exports = { app, setupDB, ownerAgent, staffAgent };
