// backend/healthcheck.js
// Simple health check for Google Cloud Run

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 8080,
  path: '/api/health',
  method: 'GET',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('Health check failed:', err.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.log('Health check timeout');
  request.destroy();
  process.exit(1);
});

request.end();