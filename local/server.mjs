import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleOfflineApi } from './lib/offline-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.QUIZBIT_LOCAL_PORT || 3000);
const HOST = process.env.QUIZBIT_LOCAL_HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const getRouteName = req => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const segments = url.pathname.split('/').filter(Boolean);
  const apiIndex = segments.indexOf('api');
  if (apiIndex === -1) return segments.join('/') || 'index';
  return segments.slice(apiIndex + 1).join('/') || 'health';
};

const SHARED_DIR = path.join(__dirname, '..', 'shared');

const serveSharedCss = (res, fileName) => {
  const filePath = path.join(SHARED_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('CSS not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
  fs.createReadStream(filePath).pipe(res);
};

const serveStatic = (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/panel-theme.css') {
    return serveSharedCss(res, 'panel-theme.css');
  }
  if (url.pathname === '/panel-layout.css') {
    return serveSharedCss(res, 'panel-layout.css');
  }
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const absolute = path.join(__dirname, safePath);
  if (!absolute.startsWith(__dirname) || !fs.existsSync(absolute)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  const ext = path.extname(absolute);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(absolute).pipe(res);
};

const server = http.createServer(async (req, res) => {
  const routeName = getRouteName(req);
  if (req.url?.startsWith('/api/')) {
    return handleOfflineApi(req, res, routeName);
  }
  return serveStatic(req, res);
});

server.listen(PORT, HOST, async () => {
  console.log(`QuizBit offline server: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Panel admin: http://localhost:${PORT}/`);
  console.log(`API mobile: http://10.0.2.2:${PORT} (emulateur Android)`);
  console.log('Compte demo: demo@local.quizbit / demo123');
  try {
    const { getOllamaConfig, isOllamaAvailable } = await import(
      './lib/ollama-generate.js'
    );
    const config = getOllamaConfig();
    const ready = await isOllamaAvailable();
    console.log(
      ready
        ? `Ollama: ${config.model} (generation IA locale active)`
        : `Ollama: indisponible — npm run setup:ollama (modele ${config.model})`,
    );
  } catch {
    console.log('Ollama: verification impossible');
  }
});
