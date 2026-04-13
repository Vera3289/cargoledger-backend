import request from 'supertest';
import { createApp } from '../src/index';

const app = createApp();

describe('GET /', () => {
  it('returns service info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('cargoledger-backend');
  });
});

describe('GET /health', () => {
  it('returns status and timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ service: 'cargoledger-backend' });
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('includes security headers from helmet', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('does not expose X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
