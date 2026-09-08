import { useState, useEffect } from 'react'

export default function ConnectionInfo() {
  const [info, setInfo] = useState({
    browser: '—',
    platform: '—',
    type: '—',
    effective: '—',
    rtt: '—',
    saver: '—',
    serverTime: '—',
    ip: '—'
  })

  useEffect(() => {
    const ua = navigator.userAgent
    let browser = 'Desconocido'
    if (/Chrome\//.test(ua) && !/Edg/.test(ua)) browser = 'Google Chrome'
    else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox'
    else if (/Edg\//.test(ua)) browser = 'Microsoft Edge'
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari'
    else if (/Opera|OPR/.test(ua)) browser = 'Opera'

    const platform = navigator.platform || navigator.userAgentData?.platform || 'N/A'

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    let type = 'No disponible'
    let effective = 'No disponible'
    let rtt = 'No disponible'
    let saver = 'No disponible'

    if (conn) {
      type = conn.type || conn.effectiveType || 'N/A'
      effective = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'N/A'
      rtt = conn.rtt != null ? `${conn.rtt} ms` : 'N/A'
      saver = conn.saveData ? 'Activado' : 'Desactivado'
    }

    setInfo(prev => ({ ...prev, browser, platform, type, effective, rtt, saver }))

    fetch('/api/info')
      .then(r => r.json())
      .then(data => {
        setInfo(prev => ({
          ...prev,
          serverTime: new Date(data.serverTime).toLocaleString('es-CO'),
          ip: data.clientIp || 'N/A'
        }))
      })
      .catch(() => {
        setInfo(prev => ({ ...prev, serverTime: 'Error al conectar' }))
      })
  }, [])

  const items = [
    { key: 'Navegador', val: info.browser },
    { key: 'Plataforma', val: info.platform },
    { key: 'Tipo de conexión', val: info.type },
    { key: 'Velocidad efectiva', val: info.effective },
    { key: 'RTT estimado', val: info.rtt },
    { key: 'Data Saver', val: info.saver },
    { key: 'Hora del servidor', val: info.serverTime },
    { key: 'IP detectada', val: info.ip },
  ]

  return (
    <section className="info-section">
      <h2 className="info-title">◈ INFORMACIÓN DE CONEXIÓN</h2>
      <div className="info-grid">
        {items.map(({ key, val }) => (
          <div className="info-item" key={key}>
            <span className="info-key">{key}</span>
            <span className="info-val">{val}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
