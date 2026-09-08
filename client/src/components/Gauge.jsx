import { useRef, useEffect } from 'react'

const GAUGE_ARC_LEN = 376

export default function Gauge({ value, max, label, color, offset, angle }) {
  const ticksRef = useRef(null)

  useEffect(() => {
    if (!ticksRef.current || ticksRef.current.children.length > 0) return
    const labels = [0, 50, 100, 150, 200]
    const svgNS = 'http://www.w3.org/2000/svg'
    const cx = 150, cy = 175

    labels.forEach((val, i) => {
      const a = -180 + (i / (labels.length - 1)) * 180
      const rad = (a * Math.PI) / 180
      const r1 = 115, r2 = 108, tr = 95

      const line = document.createElementNS(svgNS, 'line')
      line.setAttribute('x1', cx + r1 * Math.cos(rad))
      line.setAttribute('y1', cy + r1 * Math.sin(rad))
      line.setAttribute('x2', cx + r2 * Math.cos(rad))
      line.setAttribute('y2', cy + r2 * Math.sin(rad))
      line.setAttribute('stroke', 'rgba(74,96,112,.6)')
      line.setAttribute('stroke-width', '1.5')
      ticksRef.current.appendChild(line)

      const txt = document.createElementNS(svgNS, 'text')
      txt.setAttribute('x', cx + tr * Math.cos(rad))
      txt.setAttribute('y', cy + tr * Math.sin(rad) + 4)
      txt.setAttribute('text-anchor', 'middle')
      txt.setAttribute('fill', 'rgba(74,96,112,.8)')
      txt.setAttribute('font-size', '9')
      txt.setAttribute('font-family', 'Share Tech Mono, monospace')
      txt.textContent = val
      ticksRef.current.appendChild(txt)
    })
  }, [])

  return (
    <section className="gauge-section">
      <div className="gauge-wrap">
        <svg className="gauge-svg" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
          <path
            className="gauge-track"
            d="M 30 175 A 120 120 0 0 1 270 175"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            className="gauge-arc"
            d="M 30 175 A 120 120 0 0 1 270 175"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={GAUGE_ARC_LEN}
            strokeDashoffset={offset ?? GAUGE_ARC_LEN}
            style={{ stroke: color || 'var(--accent)' }}
          />
          <line
            className="gauge-needle"
            x1="150" y1="175" x2="150" y2="65"
            stroke={color || 'var(--accent)'}
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${angle ?? -90}, 150, 175)`}
          />
          <circle cx="150" cy="175" r="6" fill={color || 'var(--accent)'} />
          <g ref={ticksRef}></g>
        </svg>
      </div>

      <div className="gauge-center">
        <div className="gauge-value">{value ?? 0}</div>
        <div className="gauge-unit">Mbps</div>
        <div className="gauge-label">{label || 'ESPERANDO'}</div>
      </div>
    </section>
  )
}
