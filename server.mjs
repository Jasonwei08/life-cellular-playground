import http from 'node:http';
import { readFile } from 'node:fs/promises';
const types = new Map([
  ['/index.html', 'text/html; charset=utf-8'],
  ['/style.css', 'text/css; charset=utf-8'],
  ['/app.js', 'text/javascript; charset=utf-8'],
  ['/life_engine.js', 'text/javascript; charset=utf-8'],
  ['/life_engine.wasm', 'application/wasm']
]);
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const route = pathname === '/' ? '/index.html' : pathname;
  if (!types.has(route)) { res.writeHead(404).end('Not found'); return; }
  try {
    const body = await readFile(new URL('.' + route, import.meta.url));
    res.writeHead(200, { 'Content-Type': types.get(route) });
    res.end(body);
  } catch {
    res.writeHead(500).end('Unable to load website asset');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Life playground: http://127.0.0.1:${port}`));
