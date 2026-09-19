import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

interface Command {
  id: string
  label: string
  icon: any
  action: () => void
  category: string
}

interface Props {
  open: boolean
  onClose: () => void
  commands: Command[]
}

export default function CommandPalette({ open, onClose, commands }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIdx]) {
        filtered[selectedIdx].action()
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        <div className="cp-search">
          <Search size={16} />
          <input
            id="command-palette"
            name="command-palette"
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            autoComplete="off"
          />
        </div>
        <div className="cp-list">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`cp-item ${i === selectedIdx ? 'selected' : ''}`}
              onClick={() => { cmd.action(); onClose() }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <cmd.icon size={16} />
              <div className="cp-item-text">
                <span className="cp-item-label">{cmd.label}</span>
                <span className="cp-item-category">{cmd.category}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="cp-empty">No commands found</div>
          )}
        </div>
      </div>
    </div>
  )
}
