import { useState, useEffect } from 'react'
import { X, Monitor, Palette, Cpu, Info, ChevronRight, Key, Keyboard } from 'lucide-react'
import { useTheme } from './ThemeContext'
import ColorPicker from './ColorPicker'
import './Settings.css'

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onModelChange?: (modelId: string) => void;
}

interface FetchedModel {
  id: string
  name: string
  provider: string
  context_length?: number
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d4a574',
  google: '#4285f4',
  meta: '#0668E1',
  deepseek: '#4d6bfe',
  mistralai: '#f76e11',
  nvidia: '#76b900',
  qwen: '#615EFC',
  xai: '#1DA1F2',
  cohere: '#39594D',
  microsoft: '#00a4ef',
  bytedance: '#fe2c55',
  alibaba: '#ff6a00',
  baidu: '#2932e1',
  tencent: '#07c160',
  moonshotai: '#1a1a2e',
  fireworks: '#ff4d00',
  together: '#6366f1',
  poolside: '#0ea5e9',
  dots: '#f43f5e',
  dots_studio: '#f43f5e',
  inclusionai: '#8b5cf6',
  'nex-agi': '#00d4aa',
  liquid: '#7c3aed',
  'z-ai': '#e11d48',
}

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] || '#666'
}

function ProviderIcon({ provider, size = 18 }: { provider: string; size?: number }) {
  const p = provider.toLowerCase()
  const s = size
  switch (p) {
    case 'openai':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
        </svg>
      )
    case 'anthropic':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.803 5.093c-1.264-2.168-3.378-3.418-5.68-3.418C4.775 1.675 0 6.11 0 11.712c0 1.722.46 3.378 1.3 4.789a8.47 8.47 0 0 1-.82 2.133c-.265.606-.14.955.355.955h5.452c.86 0 1.39-.656 1.667-1.226a6.228 6.228 0 0 1 3.087-3.307 8.463 8.463 0 0 1 1.79-.744c.262-.073.395-.34.263-.59a6.14 6.14 0 0 0-1.304-1.694 6.178 6.178 0 0 0-1.65-1.155 7.93 7.93 0 0 1 1.598-.588c.636-.156 1.008-.785.904-1.428-.053-.326-.23-.62-.489-.82a5.148 5.148 0 0 0-1.706-.892l-.004-.002zM9.842 13.266a3.73 3.73 0 0 1 .752 2.579c0 .587-.12 1.153-.352 1.673a3.34 3.34 0 0 1-.552.954l.257-1.492a4.52 4.52 0 0 0 .125-1.068 4.597 4.597 0 0 0-.23-1.646zM24 12.334c0-4.97-3.39-9.003-7.57-9.003-4.18 0-7.57 4.034-7.57 9.004 0 4.97 3.39 9.003 7.57 9.003 4.18 0 7.57-4.033 7.57-9.003zm-7.57 7.003c-3.067 0-5.55-2.864-5.55-7.003 0-4.14 2.483-7.004 5.55-7.004s5.55 2.864 5.55 7.004c0 4.139-2.483 7.003-5.55 7.003z"/>
        </svg>
      )
    case 'google':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )
    case 'meta':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.93 3.78-3.93 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
        </svg>
      )
    case 'deepseek':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" opacity="0.8"/>
        </svg>
      )
    case 'nvidia':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.38 3H6.37l-.25.44v12.89l.25.44h1.89c.68 0 1.23-.55 1.23-1.23V9.49c0-.68-.55-1.23-1.23-1.23H8.5V6.93h1.81c.68 0 1.23.55 1.23 1.23v5.05c0 .68-.55 1.23-1.23 1.23H8.51v1.32h2.12c.68 0 1.23-.55 1.23-1.23V6.88c0-.68-.55-1.23-1.23-1.23h1.75zm3.59.01l-.25.44v12.89l.25.44h1.89c.68 0 1.23-.55 1.23-1.23V9.5c0-.68-.55-1.23-1.23-1.23h-1.02V6.94h1.81c.68 0 1.23.55 1.23 1.23v5.05c0 .68-.55 1.23-1.23 1.23h-1.01v1.32h2.12c.68 0 1.23-.55 1.23-1.23V6.89c0-.68-.55-1.23-1.23-1.23h-1.76l-.25-.44H15.97z"/>
        </svg>
      )
    case 'qwen':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 12h10M12 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
    case 'mistralai':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 15h18v2H3v-2zm0-4h18v2H3v-2zm0-4h18v2H3V7zm0-4h18v2H3V3z"/>
        </svg>
      )
    case 'cohere':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
          <path d="M7 12a5 5 0 0 1 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        </svg>
      )
    case 'xai':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.6 2.4L8.2 12.8l-5.6 6.4h2.6l3.8-4.4 4.6 4.4h5.8L14.2 12.2 19.2 2.4h-3l-2.6 3.6-3-3.6zm1.4 1.2l2.8 4-2.8 4.2V3.6z"/>
        </svg>
      )
    case 'microsoft':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
          <rect x="13" y="1" width="10" height="10" fill="#7fba00"/>
          <rect x="1" y="13" width="10" height="10" fill="#00a4ef"/>
          <rect x="13" y="13" width="10" height="10" fill="#ffb900"/>
        </svg>
      )
    case 'poolside':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 8h4v8H4zm6-4h4v16h-4zm6 8h4v4h-4z" opacity="0.8"/>
        </svg>
      )
    case 'dots-studio':
    case 'dots':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/>
          <circle cx="12" cy="6" r="2"/><circle cx="12" cy="18" r="2"/>
        </svg>
      )
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 17c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
  }
}

function formatContext(ctx?: number): string {
  if (!ctx) return ''
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(1)}M`
  if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`
  return `${ctx}`
}

const DEFAULT_MODELS: FetchedModel[] = [
  { id: 'nvidia/nemotron-3-ultra:free', name: 'Nemotron 3 Ultra', provider: 'nvidia', context_length: 1000000 },
  { id: 'inclusionai/ling-3.0-flash:free', name: 'Ling 3.0 Flash', provider: 'inclusionai', context_length: 262144 },
  { id: 'qwen/qwen3.8-27b:free', name: 'Qwen 3.8 27B', provider: 'qwen', context_length: 262144 },
  { id: 'qwen/qwen3.7-flash', name: 'Qwen 3.7 Flash', provider: 'qwen', context_length: 1000000 },
  { id: 'google/gemini-3.7-flash', name: 'Gemini 3.7 Flash', provider: 'google', context_length: 1048576 },
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'deepseek', context_length: 1000000 },
  { id: 'qwen/qwen3.8-2.4t-a95b', name: 'Qwen 3.8 2.4T', provider: 'qwen', context_length: 1048576 },
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'meta', context_length: 1000000 },
]

export function getAllModels(): FetchedModel[] {
  return DEFAULT_MODELS
}

export default function Settings({ open, onClose, onModelChange }: SettingsProps) {
  const { rawTheme, toggle, accent, setAccent } = useTheme()
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('plume-api-key') || '')
  const [model, setModel] = useState(() => localStorage.getItem('plume-model') || 'auto')
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    localStorage.setItem('plume-api-key', apiKey)
  }, [apiKey])

  useEffect(() => {
    localStorage.setItem('plume-model', model)
  }, [model])

  if (!open) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <button className="settings-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="settings-body">
          {/* API Key */}
          <div className="settings-section" onClick={() => setShowApiKey(!showApiKey)}>
            <div className="section-icon"><Key size={16} /></div>
            <div className="section-content">
              <div className="section-label">API Key</div>
              <div className="section-desc">{apiKey ? 'Key configured' : 'Set your API key to use AI'}</div>
            </div>
            <div className="section-right">
              {apiKey && <div className="section-badge">Set</div>}
              <ChevronRight size={14} className={`chevron ${showApiKey ? 'open' : ''}`} />
            </div>
          </div>

          {showApiKey && (
            <div className="settings-panel">
              <div className="api-key-input-wrap">
                <input
                  id="api-key"
                  name="api-key"
                  type="password"
                  className="api-key-input"
                  placeholder="sk-or-... (OpenRouter key)"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  autoComplete="off"
                />
                {apiKey && (
                  <button className="api-key-clear" onClick={() => setApiKey('')}>Clear</button>
                )}
              </div>
              <p className="api-key-hint">Get your key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">OpenRouter</a></p>
              {fetchStatus && <p className="api-key-hint">{fetchStatus}</p>}
            </div>
          )}

          {/* Appearance */}
          <div className="settings-section" onClick={toggle}>
            <div className="section-icon"><Monitor size={16} /></div>
            <div className="section-content">
              <div className="section-label">Appearance</div>
              <div className="section-desc">
                {rawTheme === 'system' ? 'System (auto)' : rawTheme === 'dark' ? 'Dark mode' : 'Light mode'}
              </div>
            </div>
            <button className="theme-cycle-btn" onClick={e => { e.stopPropagation(); toggle() }}>
              {rawTheme === 'system' ? 'Auto' : rawTheme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>

          {/* Accent Color */}
          <div className="settings-section" onClick={() => setShowColorPicker(!showColorPicker)}>
            <div className="section-icon"><Palette size={16} /></div>
            <div className="section-content">
              <div className="section-label">Accent Color</div>
              <div className="section-desc">Customize your accent color</div>
            </div>
            <div className="section-right">
              <div className="color-preview" style={{ background: accent }} />
              <ChevronRight size={14} className={`chevron ${showColorPicker ? 'open' : ''}`} />
            </div>
          </div>

          {showColorPicker && (
            <div className="settings-panel">
              <ColorPicker color={accent} onChange={setAccent} />
            </div>
          )}

          {/* Keyboard Shortcuts */}
          <div className="settings-section" onClick={() => setShowShortcuts(!showShortcuts)}>
            <div className="section-icon"><Keyboard size={16} /></div>
            <div className="section-content">
              <div className="section-label">Keyboard Shortcuts</div>
              <div className="section-desc">View available shortcuts</div>
            </div>
            <ChevronRight size={14} className={`chevron ${showShortcuts ? 'open' : ''}`} />
          </div>

          {showShortcuts && (
            <div className="settings-panel shortcuts-panel">
              <div className="shortcut-row"><div><kbd>Ctrl</kbd><span className="kbd-sep">+</span><kbd>L</kbd></div><span>New chat</span></div>
              <div className="shortcut-row"><div><kbd>Ctrl</kbd><span className="kbd-sep">+</span><kbd>K</kbd></div><span>Focus input</span></div>
              <div className="shortcut-row"><div><kbd>Ctrl</kbd><span className="kbd-sep">+</span><kbd>P</kbd></div><span>Command palette</span></div>
              <div className="shortcut-row"><div><kbd>Ctrl</kbd><span className="kbd-sep">+</span><kbd>,</kbd></div><span>Settings</span></div>
              <div className="shortcut-row"><div><kbd>Ctrl</kbd><span className="kbd-sep">+</span><kbd>Shift</kbd><span className="kbd-sep">+</span><kbd>D</kbd></div><span>Toggle theme</span></div>
              <div className="shortcut-row"><div><kbd>Enter</kbd></div><span>Send message</span></div>
              <div className="shortcut-row"><div><kbd>Shift</kbd><span className="kbd-sep">+</span><kbd>Enter</kbd></div><span>New line</span></div>
            </div>
          )}

          {/* About */}
          <div className="settings-section">
            <div className="section-icon"><Info size={16} /></div>
            <div className="section-content">
              <div className="section-label">About</div>
              <div className="section-desc">Plume Coding Agent v2.0.0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
