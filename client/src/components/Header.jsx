import { useState, useEffect } from 'react'

export default function Header({ theme, onThemeChange }) {
  const [time, setTime] = useState('--:--:--')
  const [clientIp, setClientIp] = useState('IP: ---')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('es-CO'))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch('/api/info')
      .then(r => r.json())
      .then(data => {
        setClientIp(`IP: ${data.clientIp || '—'}`)
      })
      .catch(() => {})
  }, [])

  return (
    <header>
      <div className="logo">
        <span className="logo-icon"><i className="fa-brands fa-sitrox"></i></span>
        <span className="logo-text">speed<strong>Test</strong></span>
      </div>
      <div className="header-right">
        <div className="header-meta">
          <span>{time}</span>
          <span className="dot-sep">·</span>
          <span>{clientIp}</span>
        </div>
        <div className="theme-switcher">
          <button
            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => onThemeChange('dark')}
            title="Modo oscuro"
            aria-label="Modo oscuro"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
            </svg>
          </button>
          <button
            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => onThemeChange('light')}
            title="Modo claro"
            aria-label="Modo claro"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
