export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
};

export const smokeOptions = {
  thresholds,
  vus: 1,
  duration: '30s',
};

export const loadOptions = {
  thresholds,
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 0 },
  ],
};

export const stressOptions = {
  thresholds,
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export const soakOptions = {
  thresholds,
  stages: [
    { duration: '5m',  target: 20 },
    { duration: '30m', target: 20 },
    { duration: '5m',  target: 0 },
  ],
};
