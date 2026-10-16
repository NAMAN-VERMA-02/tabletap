process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Restaurant = require('../src/models/Restaurant');

let mongo;

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

const owner = {
  name: 'Asha Owner',
  email: 'asha@example.edu',
  password: 'supersecret1',
  restaurantName: 'Spice Garden',
};

describe('auth', () => {
  it('registers an owner with a restaurant and sets an httpOnly cookie', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(owner);

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('owner');
    expect(res.body.user.password).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/token=.+HttpOnly/);

    const restaurant = await Restaurant.findById(res.body.user.restaurant);
    expect(restaurant.slug).toBe('spice-garden');
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(owner);
    const res = await request(app).post('/api/v1/auth/register').send(owner);
    expect(res.status).toBe(409);
  });

  it('rejects invalid input with field details', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...owner, email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('logs in and reads /me with the cookie', async () => {
    await request(app).post('/api/v1/auth/register').send(owner);
    const agent = request.agent(app);

    const login = await agent.post('/api/v1/auth/login').send({ email: owner.email, password: owner.password });
    expect(login.status).toBe(200);

    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(owner.email);
    expect(me.body.restaurant.name).toBe('Spice Garden');
  });

  it('rejects a wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send(owner);
    const res = await request(app).post('/api/v1/auth/login').send({ email: owner.email, password: 'wrongpass1' });
    expect(res.status).toBe(401);
  });

  it('blocks /me without a token and after logout', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);

    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(owner);
    await agent.post('/api/v1/auth/logout');
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
  });
});
