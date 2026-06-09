import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { handleOfflineApi } from './lib/offline-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Chargement manuel de .env si present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length) process.env[key.trim()] = value.join('=').trim();
  });
}

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
  if (url.pathname === '/panel-surfaces.css') {
    return serveSharedCss(res, 'panel-surfaces.css');
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
  console.log(`[api] ${req.method} ${req.url} -> ${routeName}`);
  if (req.url?.startsWith('/api/')) {
    return handleOfflineApi(req, res, routeName);
  }
  return serveStatic(req, res);
});

const getLocalIPs = () => {
  const nets = networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
};

server.listen(PORT, HOST, async () => {
  const ips = getLocalIPs();
  console.log(`QuizBit offline server: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Panel admin: http://localhost:${PORT}/`);
  ips.forEach(ip => {
    console.log(`API mobile (telephone reel): http://${ip}:${PORT}`);
  });
  console.log(`API mobile (emulateur Android): http://10.0.2.2:3000`);
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
