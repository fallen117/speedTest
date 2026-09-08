import { useState, useEffect } from 'react'
import Header from './components/Header'
import Gauge from './components/Gauge'
import StartButton from './components/StartButton'
import ResultCards from './components/ResultCards'
import ConnectionInfo from './components/ConnectionInfo'
import History from './components/History'
import Footer from './components/Footer'
import { useSpeedTest } from './hooks/useSpeedTest'

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('netpulse-theme') || 'dark' } catch { return 'dark' }
  })

  const {
    isRunning,
    statusMsg,
    gauge,
    results,
    cardStates,
    bars,
    history,
    liveValues,
    startTest,
    formatMbps
  } = useSpeedTest()

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light')
    } else {
      document.body.classList.remove('light')
    }
    try { localStorage.setItem('netpulse-theme', theme) } catch {}
  }, [theme])

  return (
    <>
      <div className="scanline"></div>
      <div className="noise"></div>

      <Header theme={theme} onThemeChange={setTheme} />

      <main>
        <Gauge
          value={gauge.value}
          max={gauge.max}
          label={gauge.label}
          color={gauge.color}
          offset={gauge.offset}
          angle={gauge.angle}
        />

        <StartButton
          isRunning={isRunning}
          statusMsg={statusMsg}
          onStart={startTest}
        />

        <ResultCards
          results={results}
          cardStates={cardStates}
          bars={bars}
          liveValues={liveValues}
          formatMbps={formatMbps}
        />

        <ConnectionInfo />

        <History history={history} formatMbps={formatMbps} />
      </main>

      <Footer />
    </>
  )
}
