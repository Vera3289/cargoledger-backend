import request from 'supertest';
import { createApp } from '../src/index';
import { shipmentStore } from '../src/store/shipments';

const app = createApp();

const SENDER    = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const RECIPIENT = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZCP2J7F1NRQKQOHP3OGN';

const validBody = {
  sender: SENDER,
  recipient: RECIPIENT,
  freightAmount: '5000.0000000',
  ratePerKg: '0.0025000',
  origin: 'Lagos, Nigeria',
  destination: 'Nairobi, Kenya',
  scheduledAt: 1700000000,
};

beforeEach(() => shipmentStore.clear());

describe('POST /api/shipments', () => {
  it('creates a shipment and returns 201', async () => {
    const res = await request(app).post('/api/shipments').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^shipment-/);
    expect(res.body.status).toBe('pending');
    expect(res.body.freightAmount).toBe('5000.0000000');
    expect(res.body.origin).toBe('Lagos, Nigeria');
  });

  it('rejects numeric freightAmount', async () => {
    const res = await request(app).post('/api/shipments').send({ ...validBody, freightAmount: 5000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('DECIMAL_INVALID_TYPE');
  });

  it('rejects invalid sender address', async () => {
    const res = await request(app).post('/api/shipments').send({ ...validBody, sender: 'not-a-key' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('rejects missing ratePerKg', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ratePerKg: _r, ...body } = validBody;
    const res = await request(app).post('/api/shipments').send(body);
    expect(res.status).toBe(400);
  });

  it('rejects missing origin', async () => {
    const res = await request(app).post('/api/shipments').send({ ...validBody, origin: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('rejects non-numeric scheduledAt', async () => {
    const res = await request(app).post('/api/shipments').send({ ...validBody, scheduledAt: 'tomorrow' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/shipments', () => {
  it('returns empty list initially', async () => {
    const res = await request(app).get('/api/shipments');
    expect(res.status).toBe(200);
    expect(res.body.shipments).toEqual([]);
  });

  it('filters by status', async () => {
    await request(app).post('/api/shipments').send(validBody);
    const res = await request(app).get('/api/shipments?status=pending');
    expect(res.body.shipments).toHaveLength(1);
  });

  it('rejects invalid status', async () => {
    const res = await request(app).get('/api/shipments?status=unknown');
    expect(res.status).toBe(400);
  });

  it('rejects invalid sender address in filter', async () => {
    const res = await request(app).get('/api/shipments?sender=bad-key');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/shipments/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/shipments/shipment-unknown');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('returns shipment by id', async () => {
    const created = await request(app).post('/api/shipments').send(validBody);
    const res = await request(app).get(`/api/shipments/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });
});

describe('DELETE /api/shipments/:id', () => {
  it('cancels a pending shipment', async () => {
    const created = await request(app).post('/api/shipments').send(validBody);
    const res = await request(app).delete(`/api/shipments/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 409 when already cancelled', async () => {
    const created = await request(app).post('/api/shipments').send(validBody);
    await request(app).delete(`/api/shipments/${created.body.id}`);
    const res = await request(app).delete(`/api/shipments/${created.body.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CONFLICT');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/shipments/shipment-ghost');
    expect(res.status).toBe(404);
  });
});
