import { useState, useEffect, useCallback, useRef } from 'react'

const GAUGE_ARC_LEN = 376

const ERROR_MESSAGES = {
  CLOUDFLARE_ERROR: 'Cloudflare no respondió. Intenta más tarde.',
  CONNECTION_ERROR: 'Error de conexión. Revisa tu internet.',
  TIMEOUT: 'El servidor tardó demasiado. Intenta de nuevo.',
  NETWORK: 'Error de red. Revisa tu conexión.',
  UNKNOWN: 'Error desconocido. Intenta de nuevo.'
}

function getErrorMessage(err) {
  if (typeof err === 'object' && err !== null && err.code) {
    return ERROR_MESSAGES[err.code] || err.message || ERROR_MESSAGES.UNKNOWN
  }
  if (err instanceof Error) return err.message
  return ERROR_MESSAGES.UNKNOWN
}

function formatMbps(val) {
  return val >= 1000 ? (val / 1000).toFixed(2) : val.toFixed(1)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

export function useSpeedTest() {
  const [isRunning, setIsRunning] = useState(false)
  const [statusMsg, setStatusMsg] = useState({ text: 'Listo para medir tu conexión', type: '' })
  const [gauge, setGaugeState] = useState({ value: 0, max: 200, label: 'ESPERANDO', color: 'var(--accent)' })
  const [results, setResults] = useState({
    ping: null, jitter: null, download: null, upload: null
  })
  const [cardStates, setCardStates] = useState({
    ping: '', jitter: '', download: '', upload: ''
  })
  const [bars, setBars] = useState({
    ping: 0, jitter: 0, download: 0, upload: 0
  })
  const [history, setHistory] = useState([])
  const [liveValues, setLiveValues] = useState({
    download: null, upload: null
  })

  const isRunningRef = useRef(false)

  const setGauge = useCallback((value, maxVal, label, color) => {
    const pct = Math.min(value / maxVal, 1)
    const offset = GAUGE_ARC_LEN * (1 - pct)
    const angle = -90 + pct * 180
    setGaugeState({
      value: Number.isInteger(value) ? value : parseFloat(value.toFixed(1)),
      max: maxVal,
      label,
      color: color || 'var(--accent)',
      offset,
      angle
    })
  }, [])

  const resetGauge = useCallback(() => {
    setGaugeState({ value: 0, max: 200, label: 'ESPERANDO', color: 'var(--accent)', offset: GAUGE_ARC_LEN, angle: -90 })
  }, [])

  const setStatus = useCallback((text, type = '') => {
    setStatusMsg({ text, type })
  }, [])

  const setCardState = useCallback((cardId, state) => {
    setCardStates(prev => ({ ...prev, [cardId]: state }))
  }, [])

  const setBar = useCallback((id, pct) => {
    setBars(prev => ({ ...prev, [id]: Math.min(pct * 100, 100) }))
  }, [])

  // ── Measure ping ──
  const measurePing = useCallback(async (samples = 10) => {
    const times = []
    for (let i = 0; i < samples; i++) {
      const t0 = performance.now()
      await fetch(`/api/ping?t=${Date.now()}`)
      times.push(performance.now() - t0)
      await sleep(100)
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const jitter = times.reduce((sum, t) => sum + Math.abs(t - avg), 0) / times.length
    return { ping: Math.round(avg), jitter: Math.round(jitter) }
  }, [])

  // ── Measure download ──
  const measureDownload = useCallback((updateFn) => {
    return new Promise((resolve, reject) => {
      const ROUNDS = 3
      const speeds = []
      let lastError = null
      let round = 0

      function doRound() {
        if (round >= ROUNDS) {
          if (speeds.length === 0 && lastError) {
            reject(new Error(getErrorMessage(lastError)))
            return
          }
          if (speeds.length === 0) {
            reject(new Error('No se pudo medir la descarga'))
            return
          }
          speeds.sort((a, b) => a - b)
          const usable = speeds.length > 1 ? speeds.slice(1) : speeds
          resolve(usable.reduce((a, b) => a + b, 0) / usable.length)
          return
        }

        const url = `/api/download-proxy?r=${round}&t=${Date.now()}`
        const t0 = performance.now()
        let loaded = 0

        const xhr = new XMLHttpRequest()
        xhr.open('GET', url, true)
        xhr.responseType = 'arraybuffer'
        xhr.timeout = 50000

        xhr.onprogress = (e) => {
          loaded = e.loaded
          const elapsed = (performance.now() - t0) / 1000
          if (elapsed > 0.3 && loaded > 0) {
            const liveMbps = (loaded * 8) / (1024 * 1024 * elapsed)
            updateFn(liveMbps)
          }
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            const elapsed = (performance.now() - t0) / 1000
            const bytes = xhr.response?.byteLength || loaded
            if (elapsed > 0.1 && bytes > 0) {
              speeds.push((bytes * 8) / (1024 * 1024 * elapsed))
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText)
              lastError = new Error(data.error || 'Download failed')
              lastError.code = data.code
            } catch {
              lastError = new Error('Download failed')
            }
          }
          round++
          if (lastError && round < ROUNDS) {
            setStatus(`Reintentando descarga (${round + 1}/${ROUNDS})...`, 'active')
            sleep(1500).then(doRound)
          } else {
            sleep(200).then(doRound)
          }
        }

        xhr.onerror = () => {
          lastError = new Error('Network error')
          lastError.code = 'NETWORK'
          round++
          if (round < ROUNDS) {
            setStatus(`Reintentando descarga (${round + 1}/${ROUNDS})...`, 'active')
            sleep(1500).then(doRound)
          } else {
            sleep(200).then(doRound)
          }
        }

        xhr.ontimeout = () => {
          lastError = new Error('Timeout')
          lastError.code = 'TIMEOUT'
          round++
          if (round < ROUNDS) {
            setStatus(`Reintentando descarga (${round + 1}/${ROUNDS})...`, 'active')
            sleep(1500).then(doRound)
          } else {
            sleep(200).then(doRound)
          }
        }

        xhr.send()
      }

      doRound()
    })
  }, [setStatus])

  // ── Measure upload ──
  const measureUpload = useCallback((updateFn) => {
    return new Promise((resolve) => {
      const CHUNK_MB = 4
      const PARALLEL = 3
      const totalBytes = CHUNK_MB * 1024 * 1024 * PARALLEL
      const chunk = new Uint8Array(CHUNK_MB * 1024 * 1024).fill(65)
      const blob = new Blob([chunk])

      const t0 = performance.now()
      let totalSent = 0
      let done = 0

      const promises = Array.from({ length: PARALLEL }, () =>
        new Promise((res) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', `/api/upload?t=${Date.now()}`, true)

          xhr.upload.onprogress = (e) => {
            totalSent += e.loaded - (xhr._prev || 0)
            xhr._prev = e.loaded
            const elapsed = (performance.now() - t0) / 1000
            if (elapsed > 0.3) {
              updateFn((totalSent * 8) / (1024 * 1024 * elapsed))
            }
          }

          xhr.onload = xhr.onerror = () => { done++; res() }
          xhr.send(blob)
        })
      )

      Promise.all(promises).then(() => {
        const elapsed = (performance.now() - t0) / 1000
        resolve((totalBytes * 8) / (1024 * 1024 * elapsed))
      })
    })
  }, [])

  // ── Main test function ──
  const startTest = useCallback(async () => {
    if (isRunningRef.current) return
    isRunningRef.current = true
    setIsRunning(true)

    resetGauge()
    setCardStates({ ping: '', jitter: '', download: '', upload: '' })
    setResults({ ping: null, jitter: null, download: null, upload: null })
    setBars({ ping: 0, jitter: 0, download: 0, upload: 0 })
    setLiveValues({ download: null, upload: null })

    const result = { ping: null, jitter: null, download: null, upload: null }

    try {
      // ── Phase 1: Latency ──
      setStatus('Midiendo latencia...', 'active')
      setCardState('ping', 'active')
      setCardState('jitter', 'active')
      setGauge(0, 200, 'LATENCIA', '#ffd600')

      const { ping, jitter } = await measurePing(10)
      result.ping = ping
      result.jitter = jitter

      setResults(prev => ({ ...prev, ping, jitter }))
      setBar('ping', 1 - Math.min(ping / 150, 1))
      setBar('jitter', 1 - Math.min(jitter / 50, 1))
      setGauge(ping, 200, 'PING ms', '#ffd600')
      setCardState('ping', 'done')
      setCardState('jitter', 'done')

      await sleep(400)

      // ── Phase 2: Download ──
      setStatus('Midiendo velocidad de descarga...', 'active')
      setCardState('download', 'active')

      const dlSpeed = await measureDownload((live) => {
        setLiveValues(prev => ({ ...prev, download: live }))
        setGauge(live, 200, 'DESCARGA Mbps', 'var(--accent)')
        setBar('download', live / 200)
      })

      result.download = dlSpeed
      setResults(prev => ({ ...prev, download: dlSpeed }))
      setGauge(dlSpeed, 200, 'DESCARGA Mbps', 'var(--green)')
      setBar('download', dlSpeed / 200)
      setCardState('download', 'done')

      await sleep(400)

      // ── Phase 3: Upload ──
      setStatus('Midiendo velocidad de subida...', 'active')
      setCardState('upload', 'active')

      const ulSpeed = await measureUpload((live) => {
        setLiveValues(prev => ({ ...prev, upload: live }))
        setGauge(live, 100, 'SUBIDA Mbps', 'var(--green)')
        setBar('upload', live / 100)
      })

      result.upload = ulSpeed
      setResults(prev => ({ ...prev, upload: ulSpeed }))
      setGauge(ulSpeed, 100, 'SUBIDA Mbps', 'var(--green)')
      setBar('upload', ulSpeed / 100)
      setCardState('upload', 'done')

      await sleep(300)
      setGauge(dlSpeed, 200, 'DESCARGA Mbps', 'var(--green)')
      setStatus(`✓ Test completado — ↓ ${formatMbps(dlSpeed)} Mbps  ↑ ${formatMbps(ulSpeed)} Mbps`, 'done')

      // ── Save history ──
      setHistory(prev => {
        const next = [{ ...result, time: new Date().toLocaleTimeString('es-CO'), id: Date.now() }, ...prev]
        return next.slice(0, 8)
      })

    } catch (err) {
      setStatus('Error durante la medición. Intenta de nuevo.', 'error')
      console.error(err)
    } finally {
      isRunningRef.current = false
      setIsRunning(false)
    }
  }, [resetGauge, setStatus, setCardState, setBar, setGauge, measurePing, measureDownload, measureUpload])

  return {
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
  }
}
