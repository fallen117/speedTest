export default function ResultCards({ results, cardStates, bars, liveValues, formatMbps }) {
  const getDisplayValue = (key, val) => {
    if (key === 'ping' || key === 'jitter') {
      if (val !== null && val !== undefined) return Math.round(val)
      return '—'
    }
    if (key === 'download') {
      const v = liveValues.download !== null ? liveValues.download : val
      return v !== null ? formatMbps(v) : '—'
    }
    if (key === 'upload') {
      const v = liveValues.upload !== null ? liveValues.upload : val
      return v !== null ? formatMbps(v) : '—'
    }
    return '—'
  }

  const cards = [
    { key: 'ping', icon: '◎', label: 'LATENCIA', unit: 'ms', highlight: false },
    { key: 'jitter', icon: '≋', label: 'JITTER', unit: 'ms', highlight: false },
    { key: 'download', icon: '↓', label: 'DESCARGA', unit: 'Mbps', highlight: true },
    { key: 'upload', icon: '↑', label: 'SUBIDA', unit: 'Mbps', highlight: true },
  ]

  return (
    <section className="cards-grid">
      {cards.map(({ key, icon, label, unit, highlight }) => (
        <div
          key={key}
          className={`card ${highlight ? 'card--highlight' : ''} ${cardStates[key] || ''}`}
        >
          <div className="card-icon">{icon}</div>
          <div className="card-body">
            <div className="card-label">{label}</div>
            <div className="card-value">
              <span>{getDisplayValue(key, results[key])}</span>
              <small>{unit}</small>
            </div>
            <div className="card-bar">
              <div
                className="card-bar-fill"
                style={{ width: `${bars[key] || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}
