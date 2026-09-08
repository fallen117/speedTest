export default function History({ history, formatMbps }) {
  if (history.length === 0) return null

  return (
    <section className="history-section">
      <h2 className="info-title">◈ HISTORIAL DE MEDICIONES</h2>
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Ping</th>
              <th>Jitter</th>
              <th>↓ Descarga</th>
              <th>↑ Subida</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id}>
                <td>{h.time}</td>
                <td>{h.ping} ms</td>
                <td>{h.jitter} ms</td>
                <td className="td-down">{formatMbps(h.download)} Mbps</td>
                <td className="td-up">{formatMbps(h.upload)} Mbps</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
