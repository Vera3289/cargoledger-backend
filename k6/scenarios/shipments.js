import { check } from 'k6';
import http from 'k6/http';
import { BASE_URL } from '../config.js';

const SENDER    = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const RECIPIENT = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZCP2J7F1NRQKQOHP3OGN';

export function shipmentsScenario() {
  const headers = { 'Content-Type': 'application/json' };

  // Create shipment
  const createRes = http.post(`${BASE_URL}/api/shipments`, JSON.stringify({
    sender: SENDER,
    recipient: RECIPIENT,
    freightAmount: '5000.0000000',
    ratePerKg: '0.0025000',
    origin: 'Lagos, Nigeria',
    destination: 'Nairobi, Kenya',
    scheduledAt: 1700000000,
  }), { headers });

  check(createRes, { 'create shipment 201': (r) => r.status === 201 });

  if (createRes.status === 201) {
    const id = JSON.parse(createRes.body).id;

    // Get shipment
    const getRes = http.get(`${BASE_URL}/api/shipments/${id}`);
    check(getRes, { 'get shipment 200': (r) => r.status === 200 });
  }

  // List shipments
  const listRes = http.get(`${BASE_URL}/api/shipments`);
  check(listRes, { 'list shipments 200': (r) => r.status === 200 });
}
