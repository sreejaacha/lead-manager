const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

let app;
before(() => { app = createApp(createDb(':memory:')); });

const lead = (over = {}) => ({
  name: 'Jane Doe', email: 'jane@acme.com', phone: '+91 98765 43210',
  company: 'Acme', source: 'Website', status: 'New', ...over,
});

async function signup(email) {
  const res = await request(app).post('/api/auth/signup').send({ name: 'Tester', email, password: 'password123' });
  assert.equal(res.status, 201);
  return { Authorization: `Bearer ${res.body.token}` };
}

test('rejects unauthenticated access', async () => {
  assert.equal((await request(app).get('/api/leads')).status, 401);
});

test('signup validates input and blocks duplicates', async () => {
  const bad = await request(app).post('/api/auth/signup').send({ name: 'A', email: 'nope', password: '1' });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.details.email && bad.body.details.password);
  await signup('dup@test.com');
  const dup = await request(app).post('/api/auth/signup').send({ name: 'Tester', email: 'dup@test.com', password: 'password123' });
  assert.equal(dup.status, 409);
});

test('login works and fails on wrong password', async () => {
  await signup('login@test.com');
  const ok = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'password123' });
  assert.equal(ok.status, 200);
  const bad = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'wrong' });
  assert.equal(bad.status, 401);
});

test('full lead CRUD', async () => {
  const auth = await signup('crud@test.com');
  const created = await request(app).post('/api/leads').set(auth).send(lead());
  assert.equal(created.status, 201);
  const id = created.body.id;

  const updated = await request(app).put(`/api/leads/${id}`).set(auth).send({ status: 'Qualified' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.status, 'Qualified');
  assert.equal(updated.body.name, 'Jane Doe'); // untouched fields preserved

  assert.equal((await request(app).delete(`/api/leads/${id}`).set(auth)).status, 204);
  assert.equal((await request(app).get(`/api/leads/${id}`).set(auth)).status, 404);
});

test('lead validation returns field errors', async () => {
  const auth = await signup('val@test.com');
  const res = await request(app).post('/api/leads').set(auth).send(lead({ email: 'bad', name: '', status: 'Maybe', source: 'x' }));
  assert.equal(res.status, 400);
  assert.deepEqual(Object.keys(res.body.details).sort(), ['email', 'name', 'source', 'status']);
});

test('users only see their own leads', async () => {
  const a = await signup('a@test.com');
  const b = await signup('b@test.com');
  const { body } = await request(app).post('/api/leads').set(a).send(lead());
  assert.equal((await request(app).get('/api/leads').set(b)).body.data.length, 0);
  assert.equal((await request(app).get(`/api/leads/${body.id}`).set(b)).status, 404);
  assert.equal((await request(app).put(`/api/leads/${body.id}`).set(b).send({ status: 'Lost' })).status, 404);
  assert.equal((await request(app).delete(`/api/leads/${body.id}`).set(b)).status, 404);
});

test('search, status filter, sorting, pagination and stats', async () => {
  const auth = await signup('list@test.com');
  const seed = [
    lead({ name: 'Alice', email: 'a@x.com', status: 'New' }),
    lead({ name: 'Bob', email: 'b@x.com', status: 'Qualified' }),
    lead({ name: 'Carol', email: 'c@x.com', status: 'Qualified', company: 'Globex' }),
  ];
  for (const l of seed) await request(app).post('/api/leads').set(auth).send(l);

  const byName = await request(app).get('/api/leads?q=bob').set(auth);
  assert.deepEqual(byName.body.data.map((l) => l.name), ['Bob']);

  const byStatus = await request(app).get('/api/leads?status=Qualified').set(auth);
  assert.equal(byStatus.body.pagination.total, 2);

  const sorted = await request(app).get('/api/leads?sort=name&order=asc').set(auth);
  assert.deepEqual(sorted.body.data.map((l) => l.name), ['Alice', 'Bob', 'Carol']);

  const paged = await request(app).get('/api/leads?limit=2&page=2&sort=name&order=asc').set(auth);
  assert.deepEqual(paged.body.data.map((l) => l.name), ['Carol']);
  assert.equal(paged.body.pagination.totalPages, 2);

  const stats = await request(app).get('/api/leads/stats').set(auth);
  assert.deepEqual(stats.body, { total: 3, counts: { New: 1, Contacted: 0, Qualified: 2, Lost: 0 } });

  assert.equal((await request(app).get('/api/leads?status=Bogus').set(auth)).status, 400);
});

test('malformed JSON returns 400, unknown api route 404', async () => {
  const auth = await signup('json@test.com');
  const res = await request(app).post('/api/leads').set(auth).set('Content-Type', 'application/json').send('{bad');
  assert.equal(res.status, 400);
  assert.equal((await request(app).get('/api/nope')).status, 404);
});
