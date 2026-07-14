/**
 * Basic integration tests for the auth API surface.
 *
 * These tests intentionally avoid touching the database: they only cover
 * routes/branches that return before any `query()` call is made (health
 * check, input validation, unknown routes, missing/invalid auth token).
 * This means the suite can run with `npm test` without a Postgres
 * instance configured, which keeps it fast and CI-friendly.
 *
 * For full end-to-end coverage against a real database, point DB_* env
 * vars at a disposable test database and extend this suite with
 * DB-backed cases (create user -> login -> access protected route, etc).
 */
const request = require('supertest');
const app = require('../src/app');

describe('Health check', () => {
  it('GET /health returns 200 and a success payload', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'API is running' });
  });
});

describe('POST /api/auth/register - validation', () => {
  it('rejects a request with missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a request with no body at all', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login - validation', () => {
  it('rejects a request missing the password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a request missing the email', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'secret123' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Authentication middleware', () => {
  it('rejects protected routes with no Authorization header', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects protected routes with a malformed token', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('404 handler', () => {
  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
