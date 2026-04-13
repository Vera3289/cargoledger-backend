import { check } from 'k6';
import http from 'k6/http';
import { BASE_URL } from '../config.js';

export function healthScenario() {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'health status 200': (r) => r.status === 200,
    'health body has status': (r) => JSON.parse(r.body).status !== undefined,
  });
}
