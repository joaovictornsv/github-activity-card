import http from 'node:http';

const HEALTH_BODY = JSON.stringify({ status: 'ok' });

function parsePort(value) {
  if (!value?.trim()) return 3000;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT: ${value}`);
  }
  return parsed;
}

export function startHealthServer() {
  const port = parsePort(process.env.PORT);

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(HEALTH_BODY),
      });
      res.end(HEALTH_BODY);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(port, () => {
    console.log(`Health check listening on http://0.0.0.0:${port}/`);
  });

  return server;
}
