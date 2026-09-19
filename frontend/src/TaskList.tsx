import { useState } from 'react'
import { CheckCircle, Circle, Plus, X, ChevronDown, ChevronRight } from 'lucide-react'

export interface Task {
  id: string
  text: string
  status: 'pending' | 'done'
}

interface Props {
  tasks: Task[]
  onToggle: (id: string) => void
  onAdd: (text: string) => void
  onRemove: (id: string) => void
}

export default function TaskList({ tasks, onToggle, onAdd, onRemove }: Props) {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(true)

  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length

  return (
    <div className="task-list">
      <div className="task-header" onClick={() => setExpanded(!expanded)}>
        <span className="task-chevron">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="task-title">Tasks</span>
        {total > 0 && (
          <span className="task-count">{done}/{total}</span>
        )}
        {total > 0 && (
          <div className="task-progress">
            <div className="task-progress-bar" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        )}
      </div>
      {expanded && (
        <div className="task-body">
          {tasks.map(task => (
            <div key={task.id} className={`task-item ${task.status === 'done' ? 'done' : ''}`}>
              <button className="task-check" onClick={() => onToggle(task.id)}>
                {task.status === 'done' ? <CheckCircle size={14} /> : <Circle size={14} />}
              </button>
              <span className="task-text">{task.text}</span>
              <button className="task-remove" onClick={() => onRemove(task.id)}>
                <X size={12} />
              </button>
            </div>
          ))}
          <div className="task-add">
            <Plus size={14} />
            <input
              id="task-input"
              name="task-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && input.trim()) {
                  onAdd(input.trim())
                  setInput('')
                }
              }}
              placeholder="Add task..."
              autoComplete="off"
            />
          </div>
        </div>
      )}
    </div>
  )
}
