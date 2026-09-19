import { useState, useRef, useEffect } from 'react'
import { Copy, Trash2, Play, ChevronDown } from 'lucide-react'

const API_BASE = 'http://localhost:3001'

interface ShellEntry {
  id: number
  command: string
  output: string
  cwd: string
  exitCode: number
  timestamp: number
}

export default function ShellInline() {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<ShellEntry[]>([])
  const [cwd, setCwd] = useState(() => localStorage.getItem('shell-cwd') || 'D:\\Plume Code')
  const [cmdHistory, setCmdHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('shell-cmd-history') || '[]') } catch { return [] }
  })
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [showCwd, setShowCwd] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [history])

  const runCommand = async () => {
    const cmd = command.trim()
    if (!cmd || loading) return

    const newHistory = [...cmdHistory, cmd].slice(-50)
    setCmdHistory(newHistory)
    localStorage.setItem('shell-cmd-history', JSON.stringify(newHistory))
    localStorage.setItem('shell-cwd', cwd)
    setHistoryIdx(-1)

    const entry: ShellEntry = {
      id: ++idRef.current,
      command: cmd,
      output: '',
      cwd,
      exitCode: 0,
      timestamp: Date.now(),
    }

    setHistory(prev => [...prev, entry])
    setCommand('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/shell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, cwd }),
      })
      const data = await res.json()
      entry.output = data.output || ''
      entry.exitCode = data.exitCode || 0
    } catch (e: any) {
      entry.output = `Failed to connect: ${e.message}`
      entry.exitCode = 1
    }

    setHistory(prev => prev.map(h => h.id === entry.id ? { ...entry } : h))
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      runCommand()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (cmdHistory.length > 0) {
        const idx = historyIdx < cmdHistory.length - 1 ? historyIdx + 1 : historyIdx
        setHistoryIdx(idx)
        setCommand(cmdHistory[cmdHistory.length - 1 - idx] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIdx > 0) {
        const idx = historyIdx - 1
        setHistoryIdx(idx)
        setCommand(cmdHistory[cmdHistory.length - 1 - idx] || '')
      } else {
        setHistoryIdx(-1)
        setCommand('')
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setHistory([])
    }
  }

  const copyOutput = (text: string) => navigator.clipboard.writeText(text)

  return (
    <div className="shell-inline">
      <div className="shell-inline-header">
        <div className="shell-inline-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          <span>Shell</span>
        </div>
        <div className="shell-inline-actions">
          <button className="shell-inline-btn" onClick={() => setShowCwd(!showCwd)} title="Working directory">
            <ChevronDown size={12} style={{ transform: showCwd ? 'rotate(180deg)' : 'none', transition: 'transform 0.08s' }} />
            <span className="shell-cwd-label">{cwd}</span>
          </button>
          <button className="shell-inline-btn" onClick={() => setHistory([])} title="Clear">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {showCwd && (
        <div className="shell-cwd-edit">
          <span className="shell-prompt-symbol">$</span>
          <input
            id="shell-cwd"
            name="shell-cwd"
            type="text"
            className="shell-cwd-input"
            value={cwd}
            onChange={e => setCwd(e.target.value)}
            onBlur={() => localStorage.setItem('shell-cwd', cwd)}
            placeholder="Working directory..."
            autoComplete="off"
          />
        </div>
      )}

      <div className="shell-output" ref={listRef}>
        {history.length === 0 && !loading && (
          <div className="shell-welcome">
            <span className="shell-prompt-symbol">$</span> Ready. Type a command below.
          </div>
        )}
        {history.map(entry => (
          <div key={entry.id} className="shell-entry">
            <div className="shell-cmd-line">
              <span className="shell-prompt-symbol">$</span>
              <span className="shell-cmd-text">{entry.command}</span>
              <button className="shell-copy-btn" onClick={() => copyOutput(entry.output)} title="Copy">
                <Copy size={11} />
              </button>
            </div>
            {entry.output && (
              <pre className="shell-output-text">{entry.output}</pre>
            )}
          </div>
        ))}
        {loading && (
          <div className="shell-entry">
            <div className="shell-cmd-line">
              <span className="shell-prompt-symbol">$</span>
              <span className="shell-cmd-text shell-running">Running...</span>
            </div>
          </div>
        )}
      </div>

      <div className="shell-input-bar">
        <span className="shell-prompt-symbol">$</span>
        <input
          id="shell-command"
          name="shell-command"
          ref={inputRef}
          type="text"
          className="shell-input"
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type command... (↑↓ history, Ctrl+L clear)"
          disabled={loading}
          autoComplete="off"
        />
        <button className="shell-run-btn" onClick={runCommand} disabled={loading || !command.trim()}>
          <Play size={13} />
        </button>
      </div>
    </div>
  )
}
