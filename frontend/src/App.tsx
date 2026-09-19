import { useState, useEffect, useRef } from 'react'
import { useTheme } from './ThemeContext'
import Settings, { getAllModels } from './Settings'
import Auth from './Auth'
import CodeBlock from './CodeBlock'
import { GitPanel } from './GitPanelDir'
import CommandPalette from './CommandPalette'
import InlineDiff from './InlineDiff'
import {
  Plus, MessageSquare, Settings as SettingsIcon, Sun, Moon, Monitor,
  Bug, Code2, Search, BookOpen, ArrowUp, Feather, LogOut, Trash2,
  Square, Copy, Mic, Cpu, ChevronDown, X, Bot, RotateCcw,
} from 'lucide-react'
import './index.css'

interface ToolCall { name: string; input: string; result: string }
interface Message { id: string; role: 'user' | 'assistant'; content: string; toolCalls?: ToolCall[] }
interface Conversation { id: string; title: string; messages: Message[]; createdAt: number }

const API_BASE = 'http://localhost:3001'
const FALLBACK_MODELS = getAllModels().length > 0 ? getAllModels().filter(m => m.id.endsWith(':free')).map(m => m.id) : ['deepseek/deepseek-v4-flash-0731:free', 'nvidia/nemotron-3-5-lightning:free', 'nvidia/nemotron-3-ultra:free', 'qwen/qwen3.8-27b:free', 'google/gemma-4-31b:free']
const MODES = [
  { id: 'chat', name: 'Chat', iconId: 'message', desc: 'General conversation' },
  { id: 'code', name: 'Code', iconId: 'code', desc: 'Write & edit files' },
  { id: 'debug', name: 'Debug', iconId: 'bug', desc: 'Find & fix bugs' },
  { id: 'agent', name: 'Agent', iconId: 'bot', desc: 'Full auto with tools' },
  { id: 'explain', name: 'Explain', iconId: 'book', desc: 'Explain code/logic' },
]

function getModeIcon(iconId: string, size = 14) {
  switch (iconId) {
    case 'message': return <MessageSquare size={size} />
    case 'code': return <Code2 size={size} />
    case 'bug': return <Bug size={size} />
    case 'bot': return <Bot size={size} />
    case 'book': return <BookOpen size={size} />
    default: return <MessageSquare size={size} />
  }
}

const quickActions = [
  { icon: Bug, title: 'Debug Code', desc: 'Find and fix bugs' },
  { icon: Code2, title: 'Write Code', desc: 'Generate new code' },
  { icon: Search, title: 'Explain Code', desc: 'Understand how it works' },
  { icon: BookOpen, title: 'Code Review', desc: 'Review and improve' },
]

function parseMarkdown(content: string) {
  const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = []
  const regex = /```(\w*)\n([\s\S]*?)```/g
  let lastIndex = 0, match
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    parts.push({ type: 'code', content: match[2].trimEnd(), lang: match[1] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < content.length) parts.push({ type: 'text', content: content.slice(lastIndex) })
  if (parts.length === 0) parts.push({ type: 'text', content })
  return parts
}

function renderText(text: string) {
  const lines = text.split('\n')
  const elements: JSX.Element[] = []
  let listItems: string[] = []
  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`list-${elements.length}`} className="msg-list">{listItems.map((item, i) => <li key={i}>{item}</li>)}</ul>)
      listItems = []
    }
  }
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) { listItems.push(trimmed.slice(2)); return }
    if (trimmed.match(/^\d+\.\s/)) { listItems.push(trimmed.replace(/^\d+\.\s/, '')); return }
    flushList()
    if (trimmed.startsWith('### ')) elements.push(<h3 key={i} className="msg-h3">{trimmed.slice(4)}</h3>)
    else if (trimmed.startsWith('## ')) elements.push(<h2 key={i} className="msg-h2">{trimmed.slice(3)}</h2>)
    else if (trimmed.startsWith('# ')) elements.push(<h4 key={i} className="msg-h4">{trimmed.slice(2)}</h4>)
    else if (trimmed.startsWith('> ')) elements.push(<blockquote key={i} className="msg-blockquote">{trimmed.slice(2)}</blockquote>)
    else if (trimmed === '') elements.push(<br key={i} />)
    else {
      const formatted = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code className="msg-inline-code">$1</code>')
      elements.push(<span key={i} dangerouslySetInnerHTML={{ __html: formatted + '<br/>' }} />)
    }
  })
  flushList()
  return elements
}

export default function App() {
  const { theme, rawTheme, toggle } = useTheme()
  const [user, setUser] = useState<string | null>(() => localStorage.getItem('plume-user'))
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try { return JSON.parse(localStorage.getItem('plume-conversations') || '[]') } catch { return [] }
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [gitOpen, setGitOpen] = useState(false)
  const [tokens, setTokens] = useState(0)
  const [model, setModel] = useState(() => localStorage.getItem('plume-model') || 'auto')
  const [mode, setMode] = useState('chat')
  const [showModeSwitcher, setShowModeSwitcher] = useState(false)
  const [showModelSwitcher, setShowModelSwitcher] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [diffView, setDiffView] = useState<{ old: string; new: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const activeConv = conversations.find(c => c.id === activeId)
  const messages = activeConv?.messages || []

  useEffect(() => { localStorage.setItem('plume-conversations', JSON.stringify(conversations)) }, [conversations])
  useEffect(() => { localStorage.setItem('plume-model', model) }, [model])
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [messages])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'l') { e.preventDefault(); newChat() }
      else if (e.ctrlKey && e.key === 'k') { e.preventDefault(); inputRef.current?.focus() }
      else if (e.ctrlKey && e.key === 'p') { e.preventDefault(); setCommandPaletteOpen(true) }
      else if (e.ctrlKey && e.key === ',') { e.preventDefault(); setSettingsOpen(true) }
      else if (e.ctrlKey && e.shiftKey && e.key === 'D') { e.preventDefault(); toggle() }
      else if (e.key === 'Escape') { setCommandPaletteOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogin = (name: string) => { localStorage.setItem('plume-user', name); setUser(name) }
  const handleLogout = () => { localStorage.removeItem('plume-user'); setUser(null); setConversations([]) }
  const newChat = () => { const c: Conversation = { id: Date.now().toString(), title: 'New Chat', messages: [], createdAt: Date.now() }; setConversations(prev => [c, ...prev]); setActiveId(c.id) }
  const selectChat = (id: string) => setActiveId(id)
  const deleteChat = (id: string) => { setConversations(prev => prev.filter(c => c.id !== id)); if (activeId === id) setActiveId(null) }

  const send = async () => {
    if (!input.trim() || loading) return
    const apiKey = localStorage.getItem('plume-api-key') || ''
    let convId = activeId
    if (!convId) { convId = Date.now().toString(); const c: Conversation = { id: convId, title: input.slice(0, 50), messages: [], createdAt: Date.now() }; setConversations(prev => [c, ...prev]); setActiveId(convId) }
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    const prevMessages = messages
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: c.messages.length === 0 ? input.slice(0, 50) : c.title, messages: [...c.messages, userMsg] } : c))
    setInput(''); setLoading(true)
    const assistantId = (Date.now() + 1).toString()
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, { id: assistantId, role: 'assistant', content: '' }] } : c))
    const history = prevMessages.map(m => ({ role: m.role, content: m.content }))
    const modelsToTry = model === 'auto' ? [...FALLBACK_MODELS] : [model]
    let lastError = ''
    for (const tryModel of modelsToTry) {
      if (abortRef.current?.signal.aborted) break
      try {
        const githubToken = localStorage.getItem('plume-github-token') || ''
        const res = await fetch(`${API_BASE}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: input, model: tryModel, apiKey, history, mode, githubToken }), signal: abortRef.current?.signal })
        const reader = res.body?.getReader(); const decoder = new TextDecoder(); let buffer = '', fullContent = '', gotError = false
        if (reader) {
          while (true) {
            const { done, value } = await reader.read(); if (done) break
            buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue; const data = line.slice(6).trim(); if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                if (parsed.error) { lastError = parsed.error; gotError = true; break }
                else if (parsed.trying) { setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: c.messages.map(m => m.id === assistantId ? { ...m, content: `Trying ${parsed.trying}...` } : m) } : c)); continue }
                else if (parsed.tool_call) setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: c.messages.map(m => m.id === assistantId ? { ...m, toolCalls: [...(m.toolCalls || []), parsed.tool_call] } : m) } : c))
                else if (parsed.content) fullContent += parsed.content
                else if (parsed.done && parsed.tokens) setTokens(parsed.tokens)
                if (fullContent) setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: c.messages.map(m => m.id === assistantId ? { ...m, content: fullContent } : m) } : c))
              } catch {}
            }
            if (gotError) break
          }
        }
        if (!gotError) { setLoading(false); return }
      } catch (err: any) { if (err.name === 'AbortError') break; lastError = err.message || 'Network error' }
    }
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: c.messages.map(m => m.id === assistantId ? { ...m, content: `**Error:** ${lastError}` } : m) } : c))
    setLoading(false); abortRef.current = null
  }

  const stopGeneration = () => { abortRef.current?.abort(); setLoading(false) }
  const regenerate = async () => {
    if (loading || !activeConv || messages.length < 2) return
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUserMsg) return
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, messages: c.messages.slice(0, -1) } : c))
    setInput(lastUserMsg.content); setTimeout(() => send(), 100)
  }
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  const themeIcon = rawTheme === 'system' ? <Monitor size={15} /> : theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />
  const themeTitle = rawTheme === 'system' ? 'System' : `${theme === 'dark' ? 'Light' : 'Dark'}`

  const commands = [
    { id: 'new-chat', label: 'New Chat', icon: Plus, action: () => newChat(), category: 'Chat' },
    { id: 'search', label: 'Search Chat', icon: Search, action: () => setSearchOpen(true), category: 'Chat' },
    { id: 'regenerate', label: 'Regenerate', icon: RotateCcw, action: () => regenerate(), category: 'Chat' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, action: () => setSettingsOpen(true), category: 'App' },
    { id: 'toggle-theme', label: 'Toggle Theme', icon: theme === 'dark' ? Sun : Moon, action: () => toggle(), category: 'App' },
    { id: 'mode-chat', label: 'Mode: Chat', icon: MessageSquare, action: () => setMode('chat'), category: 'Mode' },
    { id: 'mode-code', label: 'Mode: Code', icon: Code2, action: () => setMode('code'), category: 'Mode' },
    { id: 'mode-debug', label: 'Mode: Debug', icon: Bug, action: () => setMode('debug'), category: 'Mode' },
    { id: 'mode-agent', label: 'Mode: Agent', icon: Bot, action: () => setMode('agent'), category: 'Mode' },
    { id: 'mode-explain', label: 'Mode: Explain', icon: BookOpen, action: () => setMode('explain'), category: 'Mode' },
  ]

  if (!user) return <Auth onLogin={handleLogin} />

  return (
    <div className="ide">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-icon"><Feather size={16} /></div><span className="brand-name">Plume</span></div>
        <button className="new-btn" onClick={newChat}><Feather size={14} /> New Chat</button>
        <div className="nav">
          <div className="nav-label">Recent</div>
          {conversations.map(c => (
            <div key={c.id} className={`nav-item ${c.id === activeId ? 'active' : ''}`} onClick={() => selectChat(c.id)}>
              <MessageSquare size={14} /><span className="nav-item-text">{c.title}</span>
              <button className="nav-item-delete" onClick={e => { e.stopPropagation(); deleteChat(c.id) }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-footer-row"><button className="icon-btn sidebar-settings-btn" onClick={() => setSettingsOpen(true)}><SettingsIcon size={14} /> Settings</button></div>
          <div className="user-row">
            <div className="user-avatar">{user.charAt(0).toUpperCase()}</div><span className="user-name">{user}</span>
            <button className="icon-btn" onClick={handleLogout}><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="header">
          <div className="header-left"></div>
          <div className="header-center"><span className="header-title"><Feather size={14} /> Plume{activeConv && <span className="header-conv-title">{activeConv.title}</span>}</span></div>
          <div className="header-right"><button className="icon-btn" onClick={toggle} title={themeTitle}>{themeIcon}</button></div>
        </header>

        {searchOpen && <div className="chat-search-bar"><Search size={14} /><input id="chat-search" name="chat-search" type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus /><button onClick={() => { setSearchOpen(false); setSearchQuery('') }}><X size={14} /></button></div>}

        {messages.length === 0 ? (
          <div className="home">
            <div className="hero-icon">
              <div className="hero-icon-bg">
                <Feather size={36} />
              </div>
            </div>
            <h1 className="hero-title">What can I help with?</h1>
            <p className="hero-sub">Ask me to write, debug, explain, or review code.</p>
            <div className="cards">{quickActions.map((a, i) => (
              <div key={i} className="card" onClick={() => { setInput(a.title); inputRef.current?.focus() }}>
                <div className="card-icon"><a.icon size={18} /></div><div className="card-title">{a.title}</div><div className="card-desc">{a.desc}</div>
              </div>
            ))}</div>
          </div>
        ) : (
          <div className="chat" ref={chatRef}>
            {messages.filter(m => !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())).map(m => (
              <div key={m.id} className={`msg ${m.role} ${m.role === 'assistant' && loading && m.id === messages[messages.length - 1]?.id ? 'msg-streaming' : ''}`}>
                <div className={`msg-avatar ${m.role}`}>{m.role === 'user' ? user.charAt(0).toUpperCase() : <Feather size={12} />}</div>
                <div className="msg-body">
                  {m.role === 'assistant' ? (<>
                    {m.toolCalls && m.toolCalls.length > 0 && <div className="tool-calls">{m.toolCalls.map((tc, i) => (
                      <div key={i} className="tool-call-block">
                        <div className="tool-call-header"><span className="tool-call-icon">{tc.name === 'shell' ? '>' : tc.name === 'git' ? '⎇' : '⚙'}</span><span className="tool-call-name">{tc.name}</span><span className="tool-call-input">{tc.input}</span></div>
                        <div className="tool-call-result"><pre>{tc.result}</pre></div>
                      </div>
                    ))}</div>}
                    {parseMarkdown(m.content).map((part, i) => part.type === 'code' ? <CodeBlock key={i} language={part.lang || ''}>{part.content}</CodeBlock> : <div key={i} className="msg-text">{renderText(part.content)}</div>)}
                    {m.content === '' && (!m.toolCalls || m.toolCalls.length === 0) && loading && <div className="msg-thinking"><span className="dot-typing"><span></span></span></div>}
                  </>) : <div className="msg-text">{m.content}</div>}
                </div>
                {m.role === 'assistant' && m.content && <div className="msg-actions"><button className="msg-action-btn" onClick={() => navigator.clipboard.writeText(m.content)} title="Copy"><Copy size={13} /></button><button className="msg-action-btn" onClick={regenerate} title="Regenerate"><RotateCcw size={13} /></button></div>}
              </div>
            ))}
          </div>
        )}

        <div className="input-bar"><div className="input-wrap">
          <div className="input-left"><div className="mode-switcher-wrap">
            <button className="mode-switcher-btn" onClick={() => { setShowModeSwitcher(!showModeSwitcher); setShowModelSwitcher(false) }}>
              <span className="mode-icon">{getModeIcon(MODES.find(m => m.id === mode)?.iconId || 'message')}</span><span className="mode-name">{MODES.find(m => m.id === mode)?.name}</span><ChevronDown size={10} />
            </button>
            {showModeSwitcher && <div className="mode-dropdown">{MODES.map(m => (
              <div key={m.id} className={`mode-dropdown-item ${mode === m.id ? 'active' : ''}`} onClick={() => { setMode(m.id); setShowModeSwitcher(false) }}>
                <span className="mode-item-icon">{getModeIcon(m.iconId, 16)}</span><div className="mode-item-text"><span className="mode-item-name">{m.name}</span><span className="mode-item-desc">{m.desc}</span></div>
                {mode === m.id && <span className="mode-dropdown-check">&#10003;</span>}
              </div>
            ))}</div>}
          </div></div>
          <textarea id="chat-input" name="chat-input" ref={inputRef} className="input" placeholder="Message Plume..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={1} />
          <div className="input-right"><div className="model-switcher-wrap">
            <button className="model-switcher-btn" onClick={() => { setShowModelSwitcher(!showModelSwitcher); setShowModeSwitcher(false) }}>
              <Cpu size={14} /><span className="model-switcher-name">{model === 'auto' ? 'Auto' : getAllModels().find(m => m.id === model)?.name || model}</span><ChevronDown size={12} />
            </button>
            {showModelSwitcher && <div className="model-dropdown">
              <div className={`model-dropdown-item ${model === 'auto' ? 'active' : ''}`} onClick={() => { setModel('auto'); localStorage.setItem('plume-model', 'auto'); setShowModelSwitcher(false) }}><span>Auto (Best Model)</span>{model === 'auto' && <span className="model-dropdown-check">&#10003;</span>}</div>
              {getAllModels().map(m => (
              <div key={m.id} className={`model-dropdown-item ${model === m.id ? 'active' : ''}`} onClick={() => { setModel(m.id); localStorage.setItem('plume-model', m.id); setShowModelSwitcher(false) }}><span>{m.name}</span>{model === m.id && <span className="model-dropdown-check">&#10003;</span>}</div>
            ))}</div>}
          </div>
          {loading ? <button className="send stop" onClick={stopGeneration}><Square size={14} /></button> : <button className="send" onClick={send} disabled={!input.trim()}>{input.trim() ? <ArrowUp size={15} /> : <Mic size={15} />}</button>}
          </div>
        </div></div>

        <div className="status"><div className="status-left"><div className="status-dot" /> Ready{tokens > 0 && <span className="status-tokens">{tokens} tok</span>}</div><div className="status-right"><span className="status-mode">{mode}</span></div></div>
      </div>

      {diffView && <div className="diff-panel"><div className="diff-panel-header"><span>Changes</span><button onClick={() => setDiffView(null)}><X size={14} /></button></div><InlineDiff oldText={diffView.old} newText={diffView.new} /></div>}

      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} commands={commands} />
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} onModelChange={(m) => { setModel(m); localStorage.setItem('plume-model', m) }} />
      <GitPanel open={gitOpen} onClose={() => setGitOpen(false)} />
    </div>
  )
}
