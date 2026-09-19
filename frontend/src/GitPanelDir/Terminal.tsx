import { useState, useRef, useEffect } from 'react'
import { Terminal as TerminalIcon, Play, Trash2, Copy } from 'lucide-react'
import './Terminal.css'

const API_BASE = 'http://localhost:3001'

interface ShellEntry {
  id: number
  command: string
  output: string
  cwd: string
  exitCode: number
  timestamp: number
}

interface TerminalProps {
  open: boolean
  onClose: () => void
}

export default function Terminal({ open, onClose }: TerminalProps) {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<ShellEntry[]>([])
  const [cwd, setCwd] = useState(() => localStorage.getItem('shell-cwd') || 'D:\\Plume Code')
  const [cmdHistory, setCmdHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('shell-cmd-history') || '[]') } catch { return [] }
  })
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

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
      entry.output = `Failed to connect to backend: ${e.message}`
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
    }
  }

  const handleCwdChange = () => {
    localStorage.setItem('shell-cwd', cwd)
  }

  const clearHistory = () => setHistory([])

  const copyOutput = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (!open) return null

  return (
    <div className="term-overlay" onClick={onClose}>
      <div className="term-modal" onClick={e => e.stopPropagation()}>
        <div className="term-header">
          <div className="term-title">
            <TerminalIcon size={16} />
            <span>Shell</span>
          </div>
          <div className="term-header-actions">
            <button className="term-clear-btn" onClick={clearHistory} title="Clear">
              <Trash2 size={14} />
            </button>
            <button className="term-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="term-cwd-bar">
          <span className="term-cwd-label">$</span>
          <input
            id="term-cwd"
            name="term-cwd"
            type="text"
            className="term-cwd-input"
            value={cwd}
            onChange={e => setCwd(e.target.value)}
            onBlur={handleCwdChange}
            placeholder="Working directory..."
            autoComplete="off"
          />
        </div>

        <div className="term-output" ref={listRef}>
          {history.length === 0 && (
            <div className="term-empty">
              <TerminalIcon size={24} />
              <span>Type a command and press Enter</span>
            </div>
          )}
          {history.map(entry => (
            <div key={entry.id} className="term-entry">
              <div className="term-cmd-line">
                <span className="term-prompt">$</span>
                <span className="term-cwd-small">{entry.cwd}</span>
                <span className="term-cmd-text">{entry.command}</span>
                <button className="term-copy-btn" onClick={() => copyOutput(entry.output)} title="Copy output">
                  <Copy size={12} />
                </button>
              </div>
              {entry.output && (
                <pre className="term-output-text">{entry.output}</pre>
              )}
            </div>
          ))}
          {loading && (
            <div className="term-entry">
              <div className="term-cmd-line">
                <span className="term-prompt">$</span>
                <span className="term-cmd-text term-running">Running...</span>
              </div>
            </div>
          )}
        </div>

        <div className="term-input-bar">
          <span className="term-prompt">$</span>
          <input
            id="term-command"
            name="term-command"
            ref={inputRef}
            type="text"
            className="term-input"
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            autoComplete="off"
            disabled={loading}
          />
          <button className="term-run-btn" onClick={runCommand} disabled={loading || !command.trim()}>
            <Play size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
