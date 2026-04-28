const express = require('express');
const path    = require('path');
const https   = require('https');
const http    = require('http');
const app     = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// ─── Proxy de descarga → Cloudflare Speed Test CDN ───────────────────────────
// El frontend pide /api/download-proxy y el servidor descarga desde
// speed.cloudflare.com y hace pipe al cliente. Así los bytes viajan:
//   Cloudflare → tu router → tu PC  (mide tu bajada real de internet)
//
// Cloudflare ofrece archivos de 10 MB, 25 MB, 100 MB sin auth ni CORS.
// Retry automático implementado para mayor robustez.
app.get('/api/download-proxy', (req, res) => {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 45000;
  const round = parseInt(req.query.r) || 0;
  const sizes = ['10mb', '25mb', '10mb'];
  const size = sizes[round % sizes.length];
  const target = `https://speed.cloudflare.com/__down?bytes=${size === '10mb' ? 10000000 : 25000000}`;

  res.setHeader('Cache-Control', 'no-store, no-cache');
  res.setHeader('Content-Type', 'application/octet-stream');

  const url = new URL(target);
  const lib = url.protocol === 'https:' ? https : http;

  function makeProxyRequest(attempt) {
    const proxyReq = lib.get({
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'User-Agent': 'NetPulse-SpeedTest/1.0',
        'Accept': '*/*'
      },
      timeout: TIMEOUT_MS
    }, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        if (attempt < MAX_RETRIES - 1) {
          console.log(`Proxy attempt ${attempt + 1} failed (${proxyRes.statusCode}), retrying...`);
          setTimeout(() => makeProxyRequest(attempt + 1), 1000 * (attempt + 1));
          return;
        }
        res.status(502).json({ error: `Cloudflare no respondió (${proxyRes.statusCode})`, code: 'CLOUDFLARE_ERROR' });
        return;
      }
      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length']);
      }
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      if (attempt < MAX_RETRIES - 1) {
        console.log(`Proxy attempt ${attempt + 1} error (${err.message}), retrying...`);
        setTimeout(() => makeProxyRequest(attempt + 1), 1000 * (attempt + 1));
        return;
      }
      console.error('Proxy error:', err.message);
      if (!res.headersSent) res.status(502).json({ error: err.message, code: 'CONNECTION_ERROR' });
    });

    proxyReq.setTimeout(TIMEOUT_MS, () => {
      proxyReq.destroy();
      if (attempt < MAX_RETRIES - 1) {
        console.log(`Proxy attempt ${attempt + 1} timeout, retrying...`);
        setTimeout(() => makeProxyRequest(attempt + 1), 1000 * (attempt + 1));
        return;
      }
      if (!res.headersSent) res.status(504).json({ error: 'Tiempo de espera agotado', code: 'TIMEOUT' });
    });
  }

  makeProxyRequest(0);
});

// ─── Upload test: recibe datos y los descarta ─────────────────────────────────
// Los datos viajan: tu PC → router → servidor local (mide tu subida real WAN)
app.post('/api/upload', (req, res) => {
  let received = 0;
  req.on('data', chunk => { received += chunk.length; });
  req.on('end', () => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ received });
  });
});

// ─── Ping / latency test ──────────────────────────────────────────────────────
app.get('/api/ping', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ pong: true, ts: Date.now() });
});

// ─── Server info ──────────────────────────────────────────────────────────────
app.get('/api/info', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  res.json({
    serverTime: new Date().toISOString(),
    clientIp:   ip,
    userAgent:  req.headers['user-agent']
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀  Speed Test Server corriendo en http://localhost:${PORT}`);
  console.log(`    Descarga: proxy hacia speed.cloudflare.com (medición real)`);
  console.log(`    Subida:   servidor local (mide tu WAN de salida)\n`);
});
