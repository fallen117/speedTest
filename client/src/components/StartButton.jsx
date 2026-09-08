export default function StartButton({ isRunning, statusMsg, onStart }) {
  return (
    <div className="start-wrap">
      <button
        className={`btn-start ${isRunning ? 'running' : ''}`}
        disabled={isRunning}
        onClick={onStart}
      >
        <span className="btn-ring"></span>
        <span className="btn-text">{isRunning ? 'MIDIENDO...' : (statusMsg.type === 'done' ? 'REPETIR TEST' : 'INICIAR TEST')}</span>
      </button>
      <div className={`status-msg ${statusMsg.type}`}>{statusMsg.text}</div>
    </div>
  )
}
