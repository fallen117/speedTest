/* ─────────────────────────────────────────────
   NetPulse Speed Test — app.js
   Lógica de medición: ping, jitter, download, upload
───────────────────────────────────────────── */

// ── Tema claro / oscuro ────────────────────────────────────────────────────────
function setTheme(mode) {
  const body    = document.body;
  const btnDark  = document.getElementById('btn-dark');
  const btnLight = document.getElementById('btn-light');

  if (mode === 'light') {
    body.classList.add('light');
    btnLight.classList.add('active');
    btnDark.classList.remove('active');
  } else {
    body.classList.remove('light');
    btnDark.classList.add('active');
    btnLight.classList.remove('active');
  }

  try { localStorage.setItem('netpulse-theme', mode); } catch {}
}

// ── Estado global ──────────────────────────────────────────────────────────────
let isRunning = false;
const history = [];

// ── Reloj en tiempo real ───────────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('live-time');
  if (el) el.textContent = new Date().toLocaleTimeString('es-CO');
}
setInterval(updateClock, 1000);
updateClock();

// ── Info del sistema (Network Information API) ─────────────────────────────────
function loadSystemInfo() {
  const ua = navigator.userAgent;
  let browser = 'Desconocido';
  if (/Chrome\//.test(ua) && !/Edg/.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';
  else if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Opera|OPR/.test(ua)) browser = 'Opera';

  document.getElementById('inf-browser').textContent  = browser;
  document.getElementById('inf-platform').textContent = navigator.platform || navigator.userAgentData?.platform || 'N/A';

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    document.getElementById('inf-type').textContent      = conn.type || conn.effectiveType || 'N/A';
    document.getElementById('inf-effective').textContent = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'N/A';
    document.getElementById('inf-rtt').textContent       = conn.rtt != null ? `${conn.rtt} ms` : 'N/A';
    document.getElementById('inf-saver').textContent     = conn.saveData ? 'Activado' : 'Desactivado';
  } else {
    ['inf-type','inf-effective','inf-rtt','inf-saver'].forEach(id => {
      document.getElementById(id).textContent = 'No disponible';
    });
  }
}

// ── Info del servidor ──────────────────────────────────────────────────────────
async function loadServerInfo() {
  try {
    const res  = await fetch('/api/info');
    const data = await res.json();
    document.getElementById('inf-servertime').textContent = new Date(data.serverTime).toLocaleString('es-CO');
    document.getElementById('inf-ip').textContent         = data.clientIp || 'N/A';
    document.getElementById('client-ip').textContent      = `IP: ${data.clientIp || '—'}`;
  } catch {
    document.getElementById('inf-servertime').textContent = 'Error al conectar';
  }
}

// ── Gauge helpers ──────────────────────────────────────────────────────────────
const GAUGE_ARC_LEN = 376; // longitud del arco (px)

function setGauge(value, maxVal, label, color) {
  const pct     = Math.min(value / maxVal, 1);
  const offset  = GAUGE_ARC_LEN * (1 - pct);
  const angle   = -90 + pct * 180; // -90° a +90°

  const arc    = document.getElementById('gauge-arc');
  const needle = document.getElementById('gauge-needle');

  arc.style.strokeDashoffset = offset;
  arc.style.stroke           = color || 'var(--accent)';
  needle.setAttribute('transform', `rotate(${angle}, 150, 175)`);
  needle.style.stroke = color || 'var(--accent)';

  document.getElementById('gauge-value').textContent = Number.isInteger(value) ? value : value.toFixed(1);
  document.getElementById('gauge-label').textContent  = label;
}

function resetGauge() {
  document.getElementById('gauge-arc').style.strokeDashoffset = GAUGE_ARC_LEN;
  document.getElementById('gauge-arc').style.stroke           = 'var(--accent)';
  document.getElementById('gauge-needle').setAttribute('transform', 'rotate(-90, 150, 175)');
  document.getElementById('gauge-value').textContent = '0';
  document.getElementById('gauge-label').textContent  = 'ESPERANDO';
}

// ── Barra de progreso de tarjeta ───────────────────────────────────────────────
function setBar(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.min(pct * 100, 100)}%`;
}

// ── Estado del botón ───────────────────────────────────────────────────────────
function setStatus(msg, type = '') {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className   = `status-msg ${type}`;
}

function setCardState(cardId, state) {
  const el = document.getElementById(cardId);
  if (el) { el.className = `card${cardId.includes('download') || cardId.includes('upload') ? ' card--highlight' : ''} ${state}`; }
}

// ── Medición de latencia / jitter (contra servidor real externo via proxy) ──────
async function measurePing(samples = 10) {
  const times = [];
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    await fetch(`/api/ping?t=${Date.now()}`);
    times.push(performance.now() - t0);
    await sleep(100);
  }
  const avg    = times.reduce((a, b) => a + b, 0) / times.length;
  const jitter = times.reduce((sum, t) => sum + Math.abs(t - avg), 0) / times.length;
  return { ping: Math.round(avg), jitter: Math.round(jitter) };
}

// ── Mensajes de error claros ────────────────────────────────────────────────────────
const ERROR_MESSAGES = {
  CLOUDFLARE_ERROR: 'Cloudflare no responded. Try again later.',
  CONNECTION_ERROR: 'connection error. Check your internet.',
  TIMEOUT: 'Server took too long. Try again.',
  NETWORK: 'Network error. Check your connection.',
  UNKNOWN: 'Unknown error. Try again.'
};

function getErrorMessage(err) {
  if (typeof err === 'object' && err !== null && err.code) {
    return ERROR_MESSAGES[err.code] || err.message || ERROR_MESSAGES.UNKNOWN;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return ERROR_MESSAGES.UNKNOWN;
}

// ── Medición de descarga real (archivos desde Cloudflare CDN via proxy) ────────
// El servidor local actúa de proxy para evitar CORS y medir bytes reales descargados
// desde internet hacia tu equipo.
async function measureDownload(updateFn) {
  const ROUNDS = 3;
  const speeds = [];
  let lastError = null;

  for (let r = 0; r < ROUNDS; r++) {
    const url = `/api/download-proxy?r=${r}&t=${Date.now()}`;
    const t0 = performance.now();
    let loaded = 0;

    await new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.timeout = 50000;

      xhr.onprogress = (e) => {
        loaded = e.loaded;
        const elapsed = (performance.now() - t0) / 1000;
        if (elapsed > 0.3 && loaded > 0) {
          const liveMbps = (loaded * 8) / (1024 * 1024 * elapsed);
          updateFn(liveMbps);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const elapsed = (performance.now() - t0) / 1000;
          const bytes = xhr.response?.byteLength || loaded;
          if (elapsed > 0.1 && bytes > 0) {
            speeds.push((bytes * 8) / (1024 * 1024 * elapsed));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            lastError = new Error(data.error || 'Download failed');
            lastError.code = data.code;
          } catch {
            lastError = new Error('Download failed');
          }
        }
        resolve();
      };

      xhr.onerror = () => {
        lastError = new Error('Network error');
        lastError.code = 'NETWORK';
        resolve();
      };

      xhr.ontimeout = () => {
        lastError = new Error('Timeout');
        lastError.code = 'TIMEOUT';
        resolve();
      };

      xhr.send();
    });

    if (lastError && r < ROUNDS - 1) {
      setStatus(`Retrying download (${r + 2}/${ROUNDS})...`, 'active');
      await sleep(1500);
    }

    await sleep(200);
  }

  if (speeds.length === 0 && lastError) {
    throw new Error(getErrorMessage(lastError));
  }

  if (speeds.length === 0) throw new Error('No se pudo medir la descarga');
  speeds.sort((a, b) => a - b);
  const usable = speeds.length > 1 ? speeds.slice(1) : speeds;
  return usable.reduce((a, b) => a + b, 0) / usable.length;
}

// ── Medición de subida real (enviamos datos al servidor local que los descarta) ─
// La subida SÍ puede medirse correctamente contra localhost porque el cuello
// de botella es tu conexión WAN de salida, no el disco del servidor local.
// Para conexiones > 100 Mbps usamos chunks paralelos.
async function measureUpload(updateFn) {
  const CHUNK_MB  = 4;                          // tamaño por chunk
  const PARALLEL  = 3;                          // peticiones simultáneas
  const totalBytes = CHUNK_MB * 1024 * 1024 * PARALLEL;
  const chunk      = new Uint8Array(CHUNK_MB * 1024 * 1024).fill(65);
  const blob       = new Blob([chunk]);

  const t0         = performance.now();
  let   totalSent  = 0;
  let   done       = 0;

  await Promise.all(Array.from({ length: PARALLEL }, () =>
    new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/upload?t=${Date.now()}`, true);

      xhr.upload.onprogress = (e) => {
        totalSent += e.loaded - (xhr._prev || 0);
        xhr._prev  = e.loaded;
        const elapsed = (performance.now() - t0) / 1000;
        if (elapsed > 0.3) {
          updateFn((totalSent * 8) / (1024 * 1024 * elapsed));
        }
      };

      xhr.onload = xhr.onerror = () => { done++; resolve(); };
      xhr.send(blob);
    })
  ));

  const elapsed = (performance.now() - t0) / 1000;
  return (totalBytes * 8) / (1024 * 1024 * elapsed);
}

// ── Utilidades ─────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function formatMbps(val) {
  return val >= 1000 ? (val / 1000).toFixed(2) : val.toFixed(1);
}

// ── Función principal ─────────────────────────────────────────────────────────
async function startTest() {
  if (isRunning) return;
  isRunning = true;

  const btn = document.getElementById('btn-start');
  btn.disabled    = true;
  btn.classList.add('running');
  btn.querySelector('.btn-text').textContent = 'MIDIENDO...';

  // Reset UI
  resetGauge();
  ['card-ping','card-jitter','card-download','card-upload'].forEach(id => setCardState(id, ''));
  ['val-ping','val-jitter','val-download','val-upload'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
  ['bar-ping','bar-jitter','bar-download','bar-upload'].forEach(id => setBar(id, 0));

  const result = { ping: null, jitter: null, download: null, upload: null };

  try {

    // ── FASE 1: Latencia ──────────────────────────────────────────────────────
    setStatus('Midiendo latencia...', 'active');
    setCardState('card-ping', 'active');
    setCardState('card-jitter', 'active');
    document.getElementById('gauge-label').textContent = 'LATENCIA';

    const { ping, jitter } = await measurePing(10);
    result.ping   = ping;
    result.jitter = jitter;

    document.getElementById('val-ping').textContent   = ping;
    document.getElementById('val-jitter').textContent = jitter;

    // barras: ping bueno < 20ms, jitter bueno < 5ms
    setBar('bar-ping',   1 - Math.min(ping / 150, 1));
    setBar('bar-jitter', 1 - Math.min(jitter / 50, 1));

    setGauge(ping, 200, 'PING ms', '#ffd600');
    setCardState('card-ping', 'done');
    setCardState('card-jitter', 'done');

    await sleep(400);

    // ── FASE 2: Descarga ──────────────────────────────────────────────────────
    setStatus('Midiendo velocidad de descarga...', 'active');
    setCardState('card-download', 'active');
    document.getElementById('gauge-label').textContent = 'DESCARGA';

    const dlSpeed = await measureDownload((live) => {
      document.getElementById('val-download').textContent = formatMbps(live);
      setGauge(live, 200, 'DESCARGA Mbps', 'var(--accent)');
      setBar('bar-download', live / 200);
    });

    result.download = dlSpeed;
    document.getElementById('val-download').textContent = formatMbps(dlSpeed);
    setGauge(dlSpeed, 200, 'DESCARGA Mbps', 'var(--green)');
    setBar('bar-download', dlSpeed / 200);
    setCardState('card-download', 'done');

    await sleep(400);

    // ── FASE 3: Subida ────────────────────────────────────────────────────────
    setStatus('Midiendo velocidad de subida...', 'active');
    setCardState('card-upload', 'active');
    document.getElementById('gauge-label').textContent = 'SUBIDA';

    const ulSpeed = await measureUpload((live) => {
      document.getElementById('val-upload').textContent = formatMbps(live);
      setGauge(live, 100, 'SUBIDA Mbps', 'var(--green)');
      setBar('bar-upload', live / 100);
    });

    result.upload = ulSpeed;
    document.getElementById('val-upload').textContent = formatMbps(ulSpeed);
    setGauge(ulSpeed, 100, 'SUBIDA Mbps', 'var(--green)');
    setBar('bar-upload', ulSpeed / 100);
    setCardState('card-upload', 'done');

    // ── Resultado final en gauge ──────────────────────────────────────────────
    await sleep(300);
    setGauge(dlSpeed, 200, 'DESCARGA Mbps', 'var(--green)');
    setStatus(`✓ Test completado — ↓ ${formatMbps(dlSpeed)} Mbps  ↑ ${formatMbps(ulSpeed)} Mbps`, 'done');

    // ── Guardar historial ─────────────────────────────────────────────────────
    addHistory(result);

  } catch (err) {
    setStatus('Error durante la medición. Intenta de nuevo.', 'error');
    console.error(err);
  } finally {
    isRunning = false;
    btn.disabled = false;
    btn.classList.remove('running');
    btn.querySelector('.btn-text').textContent = 'REPETIR TEST';
  }
}

// ── Historial ──────────────────────────────────────────────────────────────────
function addHistory(r) {
  history.unshift({ ...r, time: new Date().toLocaleTimeString('es-CO') });
  if (history.length > 8) history.pop();

  const section = document.getElementById('history-section');
  const tbody   = document.getElementById('history-body');
  section.style.display = '';

  tbody.innerHTML = history.map(h => `
    <tr>
      <td>${h.time}</td>
      <td>${h.ping} ms</td>
      <td>${h.jitter} ms</td>
      <td class="td-down">${formatMbps(h.download)} Mbps</td>
      <td class="td-up">${formatMbps(h.upload)} Mbps</td>
    </tr>
  `).join('');
}

// ── Inicialización ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Cargar tema guardado (por defecto: oscuro)
  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('netpulse-theme') || 'dark'; } catch {}
  setTheme(savedTheme);

  loadSystemInfo();
  loadServerInfo();
  drawGaugeTicks();
});

// ── Marcas del gauge ───────────────────────────────────────────────────────────
function drawGaugeTicks() {
  const g = document.getElementById('gauge-ticks');
  if (!g) return;
  const labels = [0, 50, 100, 150, 200];
  labels.forEach((val, i) => {
    const angle = -180 + (i / (labels.length - 1)) * 180;
    const rad   = (angle * Math.PI) / 180;
    const r1 = 115, r2 = 108;
    const cx = 150, cy = 175;
    const x1 = cx + r1 * Math.cos(rad);
    const y1 = cy + r1 * Math.sin(rad);
    const x2 = cx + r2 * Math.cos(rad);
    const y2 = cy + r2 * Math.sin(rad);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', 'rgba(74,96,112,.6)');
    line.setAttribute('stroke-width', '1.5');
    g.appendChild(line);

    const tr  = 95;
    const tx  = cx + tr * Math.cos(rad);
    const ty  = cy + tr * Math.sin(rad);
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', tx); txt.setAttribute('y', ty + 4);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', 'rgba(74,96,112,.8)');
    txt.setAttribute('font-size', '9');
    txt.setAttribute('font-family', 'Share Tech Mono, monospace');
    txt.textContent = val;
    g.appendChild(txt);
  });
}