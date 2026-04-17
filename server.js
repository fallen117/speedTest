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
app.get('/api/download-proxy', (req, res) => {
  // Alternamos tamaños para que las 3 rondas usen archivos distintos
  const round = parseInt(req.query.r) || 0;
  const sizes  = ['10mb', '25mb', '10mb'];
  const size   = sizes[round % sizes.length];
  const target = `https://speed.cloudflare.com/__down?bytes=${size === '10mb' ? 10000000 : 25000000}`;

  res.setHeader('Cache-Control', 'no-store, no-cache');
  res.setHeader('Content-Type', 'application/octet-stream');

  const url = new URL(target);
  const lib  = url.protocol === 'https:' ? https : http;

  const proxyReq = lib.get({
    hostname: url.hostname,
    path:     url.pathname + url.search,
    headers:  {
      'User-Agent': 'NetPulse-SpeedTest/1.0',
      'Accept':     '*/*'
    }
  }, (proxyRes) => {
    if (proxyRes.statusCode !== 200) {
      res.status(502).json({ error: `Upstream ${proxyRes.statusCode}` });
      return;
    }
    if (proxyRes.headers['content-length']) {
      res.setHeader('Content-Length', proxyRes.headers['content-length']);
    }
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) res.status(502).json({ error: err.message });
  });

  proxyReq.setTimeout(30000, () => {
    proxyReq.destroy();
    if (!res.headersSent) res.status(504).json({ error: 'Timeout' });
  });
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
