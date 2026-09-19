import { useState } from 'react'
import { Star, GitBranch, AlertCircle, ExternalLink, Search, RefreshCw } from 'lucide-react'
import './GitHub.css'

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string
  updated_at: string
  default_branch: string
}

interface GitHubIssue {
  id: number
  number: number
  title: string
  state: string
  body: string
  created_at: string
  user: { login: string }
  labels: Array<{ name: string; color: string }>
}

interface GitHubPR {
  id: number
  number: number
  title: string
  state: string
  body: string
  created_at: string
  user: { login: string }
  head: { ref: string }
  base: { ref: string }
}

interface GitHubProps {
  open: boolean
  onClose: () => void
}

export default function GitHub({ open, onClose }: GitHubProps) {
  const [token, setToken] = useState(() => localStorage.getItem('github-token') || '')
  const [activeTab, setActiveTab] = useState<'repos' | 'issues' | 'pr' | 'code'>('repos')
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [prs, setPrs] = useState<GitHubPR[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const headers: Record<string, string> = token ? { Authorization: `token ${token}` } : {}

  const fetchRepos = async () => {
    setLoading(true)
    setError('')
    try {
      const url = searchQuery
        ? `https://api.github.com/search/repositories?q=${searchQuery}&sort=stars&order=desc`
        : 'https://api.github.com/user/repos?sort=updated&per_page=20'
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error('Failed to fetch repos')
      const data = await res.json()
      setRepos(data.items || data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchIssues = async (repo: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=20`, { headers })
      if (!res.ok) throw new Error('Failed to fetch issues')
      const data = await res.json()
      setIssues(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchPRs = async (repo: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=20`, { headers })
      if (!res.ok) throw new Error('Failed to fetch PRs')
      const data = await res.json()
      setPrs(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRepoSelect = (repo: string) => {
    setSelectedRepo(repo)
    if (activeTab === 'issues') fetchIssues(repo)
    if (activeTab === 'pr') fetchPRs(repo)
  }

  const handleSaveToken = () => {
    localStorage.setItem('github-token', token)
    if (token) fetchRepos()
  }

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    if (tab === 'repos') fetchRepos()
    if (tab === 'issues' && selectedRepo) fetchIssues(selectedRepo)
    if (tab === 'pr' && selectedRepo) fetchPRs(selectedRepo)
  }

  if (!open) return null

  return (
    <div className="github-overlay" onClick={onClose}>
      <div className="github-modal" onClick={e => e.stopPropagation()}>
        <div className="github-header">
          <div className="github-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            <span>GitHub</span>
          </div>
          <button className="github-close" onClick={onClose}>×</button>
        </div>

        <div className="github-body">
          {/* Token Input */}
          <div className="github-token-section">
            <input
              id="github-token"
              name="github-token"
              type="password"
              className="github-token-input"
              placeholder="GitHub Personal Access Token (optional)"
              value={token}
              onChange={e => setToken(e.target.value)}
              onBlur={handleSaveToken}
              autoComplete="off"
            />
            <p className="github-token-hint">Token stored locally. Required for private repos.</p>
          </div>

          {/* Tabs */}
          <div className="github-tabs">
            <button
              className={`github-tab ${activeTab === 'repos' ? 'active' : ''}`}
              onClick={() => handleTabChange('repos')}
            >
              Repos
            </button>
            <button
              className={`github-tab ${activeTab === 'issues' ? 'active' : ''}`}
              onClick={() => handleTabChange('issues')}
              disabled={!selectedRepo}
            >
              Issues
            </button>
            <button
              className={`github-tab ${activeTab === 'pr' ? 'active' : ''}`}
              onClick={() => handleTabChange('pr')}
              disabled={!selectedRepo}
            >
              Pull Requests
            </button>
          </div>

          {/* Search */}
          {activeTab === 'repos' && (
            <div className="github-search">
              <Search size={14} />
              <input
                id="github-search"
                name="github-search"
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchRepos()}
                autoComplete="off"
              />
              <button onClick={fetchRepos} className="github-search-btn">Search</button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="github-error">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="github-loading">
              <RefreshCw size={16} className="spin" />
              Loading...
            </div>
          )}

          {/* Repos List */}
          {activeTab === 'repos' && !loading && (
            <div className="github-list">
              {repos.length === 0 && (
                <div className="github-empty">
                  {token ? 'Click Search to find repos' : 'Set token to see your repos, or search public repos'}
                </div>
              )}
              {repos.map(repo => (
                <div
                  key={repo.id}
                  className={`github-item ${selectedRepo === repo.full_name ? 'selected' : ''}`}
                  onClick={() => handleRepoSelect(repo.full_name)}
                >
                  <div className="github-item-header">
                    <span className="github-item-name">{repo.name}</span>
                    <a href={repo.html_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  {repo.description && (
                    <div className="github-item-desc">{repo.description}</div>
                  )}
                  <div className="github-item-meta">
                    {repo.language && <span className="github-lang">{repo.language}</span>}
                    <span className="github-stars"><Star size={12} /> {repo.stargazers_count}</span>
                    <span className="github-forks"><GitBranch size={12} /> {repo.forks_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Issues List */}
          {activeTab === 'issues' && !loading && (
            <div className="github-list">
              {issues.length === 0 && (
                <div className="github-empty">No open issues</div>
              )}
              {issues.map(issue => (
                <div key={issue.id} className="github-item">
                  <div className="github-item-header">
                    <span className="github-item-name">#{issue.number} {issue.title}</span>
                    <span className={`github-state ${issue.state}`}>{issue.state}</span>
                  </div>
                  <div className="github-item-meta">
                    <span>by {issue.user.login}</span>
                    {issue.labels.map(label => (
                      <span
                        key={label.name}
                        className="github-label"
                        style={{ background: `#${label.color}` }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PRs List */}
          {activeTab === 'pr' && !loading && (
            <div className="github-list">
              {prs.length === 0 && (
                <div className="github-empty">No open pull requests</div>
              )}
              {prs.map(pr => (
                <div key={pr.id} className="github-item">
                  <div className="github-item-header">
                    <span className="github-item-name">#{pr.number} {pr.title}</span>
                    <span className={`github-state ${pr.state}`}>{pr.state}</span>
                  </div>
                  <div className="github-item-meta">
                    <span>{pr.head.ref} → {pr.base.ref}</span>
                    <span>by {pr.user.login}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
