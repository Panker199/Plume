import { useState, useEffect, useCallback } from 'react'
import {
  GitBranch,
  GitCommit,
  Upload,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  X,
  FolderGit2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Minus,
} from 'lucide-react'
import './GitPanel.css'

declare global {
  interface Window {
    __TAURI__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
    }
  }
}

const isTauri = !!window.__TAURI__

interface GitFile {
  path: string
  status: string
  staged: boolean
}

interface GitLogEntry {
  hash: string
  author: string
  date: string
  message: string
}

interface GitPanelProps {
  open: boolean
  onClose: () => void
}

export default function GitPanel({ open, onClose }: GitPanelProps) {
  const [repoPath, setRepoPath] = useState(() => localStorage.getItem('git-repo-path') || '')
  const [activeTab, setActiveTab] = useState<'changes' | 'branches' | 'log' | 'remotes' | 'stash'>('changes')
  const [files, setFiles] = useState<GitFile[]>([])
  const [commitMsg, setCommitMsg] = useState('')
  const [branches, setBranches] = useState<string[]>([])
  const [currentBranch, setCurrentBranch] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  const [logs, setLogs] = useState<GitLogEntry[]>([])
  const [diff, setDiff] = useState('')
  const [diffFile, setDiffFile] = useState<string | null>(null)
  const [remotes, setRemotes] = useState('')
  const [stashList, setStashList] = useState('')
  const [output, setOutput] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [cloneUrl, setCloneUrl] = useState('')
  const [clonePath, _setClonePath] = useState('')

  const isTauriAvailable = isTauri && repoPath

  const invoke = useCallback(async (cmd: string, args?: Record<string, unknown>) => {
    if (!window.__TAURI__) throw new Error('Tauri not available')
    return window.__TAURI__.invoke(cmd, args)
  }, [])

  const showOutput = (type: 'ok' | 'err', msg: string) => {
    setOutput({ type, msg })
    setTimeout(() => setOutput(null), 4000)
  }

  const refreshAll = useCallback(async () => {
    if (!isTauriAvailable) return
    setLoading(true)
    try {
      const status = (await invoke('git_status', { repoPath })) as string
      const parsed = parseStatus(status)
      setFiles(parsed)

      const branchOutput = (await invoke('git_branches', { repoPath })) as string
      const branchList = branchOutput.split('\n').map(l => l.replace(/^\*?\s*/, '').trim()).filter(Boolean)
      const current = branchOutput.split('\n').find(l => l.startsWith('*'))?.replace(/^\*\s*/, '').trim() || ''
      setBranches(branchList)
      setCurrentBranch(current)

      const logOutput = (await invoke('git_log_detail', { repoPath, count: 30 })) as string
      setLogs(parseLog(logOutput))

      const remoteOutput = (await invoke('git_remotes', { repoPath })) as string
      setRemotes(remoteOutput)

      const stashOutput = (await invoke('git_stash_list', { repoPath })) as string
      setStashList(stashOutput)
    } catch (e: any) {
      showOutput('err', e.toString())
    }
    setLoading(false)
  }, [isTauriAvailable, repoPath, invoke])

  useEffect(() => {
    if (open && isTauriAvailable) refreshAll()
  }, [open, isTauriAvailable, refreshAll])

  const parseStatus = (raw: string): GitFile[] => {
    if (!raw.trim()) return []
    return raw.split('\n').filter(Boolean).map(line => {
      const indexStatus = line[0]
      const workStatus = line[1]
      const path = line.slice(3)
      const staged = indexStatus !== ' ' && indexStatus !== '?'
      const status = indexStatus === '?' ? 'untracked' :
        workStatus === 'D' || indexStatus === 'D' ? 'deleted' :
          workStatus === 'M' || indexStatus === 'M' ? 'modified' :
            workStatus === 'A' || indexStatus === 'A' ? 'added' :
              'modified'
      return { path, status, staged }
    })
  }

  const parseLog = (raw: string): GitLogEntry[] => {
    if (!raw.trim()) return []
    return raw.split('\n').filter(Boolean).map(line => {
      const parts = line.split('|')
      return {
        hash: parts[0] || '',
        author: parts[1] || '',
        date: parts[2] || '',
        message: parts[3] || '',
      }
    })
  }

  const runGit = async (cmd: string, args?: Record<string, unknown>, successMsg?: string) => {
    setLoading(true)
    try {
      const result = await invoke(cmd, { repoPath, ...args }) as string
      showOutput('ok', successMsg || result || 'Done')
      await refreshAll()
    } catch (e: any) {
      showOutput('err', e.toString())
    }
    setLoading(false)
  }

  const handleStage = (path: string) => runGit('git_add', { files: [path] }, `Staged: ${path}`)
  const handleUnstage = (path: string) => {
    setLoading(true)
    invoke('git_reset', { repoPath, file: path })
      .then(() => { showOutput('ok', `Unstaged: ${path}`); refreshAll() })
      .catch((e: any) => showOutput('err', e.toString()))
      .finally(() => setLoading(false))
  }

  const handleStageAll = () => runGit('git_add_all', {}, 'Staged all files')
  const handleDiscard = (path: string) => runGit('git_discard', { file: path }, `Discarded: ${path}`)

  const handleCommit = async () => {
    if (!commitMsg.trim()) return showOutput('err', 'Commit message required')
    await runGit('git_commit', { message: commitMsg }, 'Committed!')
    setCommitMsg('')
  }

  const handlePush = () => runGit('git_push', {}, 'Pushed!')
  const handlePull = () => runGit('git_pull', {}, 'Pulled!')
  const handleStash = () => runGit('git_stash', {}, 'Stashed!')
  const handleStashPop = () => runGit('git_stash_pop', {}, 'Stash popped!')

  const handleNewBranch = async () => {
    if (!newBranchName.trim()) return showOutput('err', 'Branch name required')
    await runGit('git_new_branch', { name: newBranchName }, `Created branch: ${newBranchName}`)
    setNewBranchName('')
  }

  const handleCheckout = (branch: string) => runGit('git_checkout', { branch }, `Switched to: ${branch}`)
  const handleDeleteBranch = (branch: string) => {
    if (branch === currentBranch) return showOutput('err', 'Cannot delete current branch')
    runGit('git_delete_branch', { name: branch }, `Deleted branch: ${branch}`)
  }

  const handleShowDiff = async (path: string) => {
    setLoading(true)
    try {
      const d = await invoke('git_diff_file', { file: path }) as string
      setDiff(d)
      setDiffFile(path)
    } catch (e: any) {
      showOutput('err', e.toString())
    }
    setLoading(false)
  }

  const handleClone = async () => {
    if (!cloneUrl.trim()) return showOutput('err', 'URL required')
    setLoading(true)
    try {
      await invoke('git_clone', { url: cloneUrl, path: clonePath || '.' })
      showOutput('ok', 'Cloned!')
      if (clonePath) setRepoPath(clonePath)
    } catch (e: any) {
      showOutput('err', e.toString())
    }
    setLoading(false)
  }

  const handleInit = () => runGit('git_init', { path: repoPath }, 'Repository initialized!')

  const handleSavePath = () => {
    localStorage.setItem('git-repo-path', repoPath)
    showOutput('ok', `Repo path set: ${repoPath}`)
  }

  if (!open) return null

  const stagedFiles = files.filter(f => f.staged)
  const unstagedFiles = files.filter(f => !f.staged)

  return (
    <div className="git-overlay" onClick={onClose}>
      <div className="git-modal" onClick={e => e.stopPropagation()}>
        <div className="git-header">
          <div className="git-title">
            <FolderGit2 size={18} />
            <span>Git</span>
            {currentBranch && <span className="git-branch-badge"><GitBranch size={12} /> {currentBranch}</span>}
          </div>
          <button className="git-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="git-body">
          {!isTauriAvailable ? (
            <div className="git-tauri-warning">
              <AlertCircle size={16} />
              <div>
                <strong>Desktop only</strong>
                <p>Git integration requires the Tauri desktop app. Set your repo path below to connect.</p>
              </div>
            </div>
          ) : null}

          {/* Repo Path */}
          <div className="git-repo-path">
            <input
              id="git-repo-path"
              name="git-repo-path"
              type="text"
              className="git-path-input"
              placeholder="Repository path (e.g. D:\Plume Code)"
              value={repoPath}
              onChange={e => setRepoPath(e.target.value)}
              autoComplete="off"
            />
            <button className="git-btn git-btn-sm" onClick={handleSavePath}>Set</button>
            <button className="git-btn git-btn-sm" onClick={refreshAll} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>

          {/* Output */}
          {output && (
            <div className={`git-output ${output.type}`}>
              {output.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <span>{output.msg}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="git-tabs">
            <button className={`git-tab ${activeTab === 'changes' ? 'active' : ''}`} onClick={() => setActiveTab('changes')}>
              Changes {files.length > 0 && <span className="git-tab-count">{files.length}</span>}
            </button>
            <button className={`git-tab ${activeTab === 'branches' ? 'active' : ''}`} onClick={() => setActiveTab('branches')}>
              Branches
            </button>
            <button className={`git-tab ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>
              Log
            </button>
            <button className={`git-tab ${activeTab === 'remotes' ? 'active' : ''}`} onClick={() => setActiveTab('remotes')}>
              Remotes
            </button>
            <button className={`git-tab ${activeTab === 'stash' ? 'active' : ''}`} onClick={() => setActiveTab('stash')}>
              Stash
            </button>
          </div>

          {/* Actions Bar */}
          <div className="git-actions-bar">
            <button className="git-action-btn" onClick={handlePush} disabled={loading || !isTauriAvailable} title="Push">
              <Upload size={14} /> Push
            </button>
            <button className="git-action-btn" onClick={handlePull} disabled={loading || !isTauriAvailable} title="Pull">
              <Download size={14} /> Pull
            </button>
            <button className="git-action-btn" onClick={handleStageAll} disabled={loading || !isTauriAvailable} title="Stage All">
              <Plus size={14} /> Stage All
            </button>
            <button className="git-action-btn" onClick={handleInit} disabled={loading || !isTauriAvailable} title="Init">
              <GitCommit size={14} /> Init
            </button>
          </div>

          {/* Diff View */}
          {diffFile && (
            <div className="git-diff-view">
              <div className="git-diff-header">
                <span>Diff: {diffFile}</span>
                <button onClick={() => { setDiff(''); setDiffFile(null) }}><X size={14} /></button>
              </div>
              <pre className="git-diff-content">{diff || 'No changes'}</pre>
            </div>
          )}

          {/* Clone Section */}
          <div className="git-clone-section">
            <div className="git-clone-row">
              <input
                id="git-clone-url"
                name="git-clone-url"
                type="text"
                className="git-path-input"
                placeholder="Clone URL (https://github.com/user/repo.git)"
                value={cloneUrl}
                onChange={e => setCloneUrl(e.target.value)}
                autoComplete="off"
              />
              <button className="git-btn git-btn-sm" onClick={handleClone} disabled={loading}>Clone</button>
            </div>
          </div>

          {/* Changes Tab */}
          {activeTab === 'changes' && (
            <div className="git-section">
              {stagedFiles.length > 0 && (
                <div className="git-file-group">
                  <div className="git-file-group-header">
                    <ChevronDown size={14} />
                    <span>Staged ({stagedFiles.length})</span>
                  </div>
                  {stagedFiles.map(f => (
                    <div key={f.path} className="git-file staged">
                      <span className={`git-file-status ${f.status}`}>{f.status[0].toUpperCase()}</span>
                      <span className="git-file-path" onClick={() => handleShowDiff(f.path)}>{f.path}</span>
                      <div className="git-file-actions">
                        <button onClick={() => handleUnstage(f.path)} title="Unstage"><Minus size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="git-file-group">
                <div className="git-file-group-header">
                  <ChevronRight size={14} />
                  <span>Changes ({unstagedFiles.length})</span>
                </div>
                {unstagedFiles.length === 0 && <div className="git-empty">No changes</div>}
                {unstagedFiles.map(f => (
                  <div key={f.path} className="git-file">
                    <span className={`git-file-status ${f.status}`}>{f.status[0].toUpperCase()}</span>
                    <span className="git-file-path" onClick={() => handleShowDiff(f.path)}>{f.path}</span>
                    <div className="git-file-actions">
                      <button onClick={() => handleStage(f.path)} title="Stage"><Check size={12} /></button>
                      {f.status !== 'untracked' && (
                        <button onClick={() => handleDiscard(f.path)} title="Discard"><Trash2 size={12} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Commit */}
              <div className="git-commit-section">
                <textarea
                  id="git-commit-msg"
                  name="git-commit-msg"
                  className="git-commit-input"
                  placeholder="Commit message..."
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  rows={2}
                />
                <button
                  className="git-btn git-btn-primary"
                  onClick={handleCommit}
                  disabled={loading || !commitMsg.trim() || stagedFiles.length === 0}
                >
                  <GitCommit size={14} /> Commit {stagedFiles.length > 0 && `(${stagedFiles.length})`}
                </button>
              </div>
            </div>
          )}

          {/* Branches Tab */}
          {activeTab === 'branches' && (
            <div className="git-section">
              <div className="git-branch-new">
                <input
                  id="git-branch-name"
                  name="git-branch-name"
                  type="text"
                  className="git-path-input"
                  placeholder="New branch name"
                  value={newBranchName}
                  onChange={e => setNewBranchName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNewBranch()}
                />
                <button className="git-btn git-btn-sm" onClick={handleNewBranch} disabled={loading}>
                  <Plus size={14} /> Create
                </button>
              </div>
              <div className="git-branch-list">
                {branches.map(branch => (
                  <div key={branch} className={`git-branch-item ${branch === currentBranch ? 'current' : ''}`}>
                    <GitBranch size={14} />
                    <span className="git-branch-name">{branch}</span>
                    {branch === currentBranch && <span className="git-branch-current">HEAD</span>}
                    {branch !== currentBranch && (
                      <div className="git-branch-actions">
                        <button onClick={() => handleCheckout(branch)} title="Switch"><Check size={12} /></button>
                        <button onClick={() => handleDeleteBranch(branch)} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log Tab */}
          {activeTab === 'log' && (
            <div className="git-section">
              <div className="git-log-list">
                {logs.length === 0 && <div className="git-empty">No commits found</div>}
                {logs.map(entry => (
                  <div key={entry.hash} className="git-log-item">
                    <div className="git-log-header">
                      <code className="git-log-hash">{entry.hash}</code>
                      <span className="git-log-date">{entry.date}</span>
                    </div>
                    <div className="git-log-msg">{entry.message}</div>
                    <div className="git-log-author">{entry.author}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remotes Tab */}
          {activeTab === 'remotes' && (
            <div className="git-section">
              <pre className="git-remotes-content">{remotes || 'No remotes configured'}</pre>
            </div>
          )}

          {/* Stash Tab */}
          {activeTab === 'stash' && (
            <div className="git-section">
              <div className="git-actions-bar">
                <button className="git-action-btn" onClick={handleStash} disabled={loading || !isTauriAvailable}>
                  <Download size={14} /> Stash
                </button>
                <button className="git-action-btn" onClick={handleStashPop} disabled={loading || !isTauriAvailable}>
                  <Upload size={14} /> Pop Stash
                </button>
              </div>
              <pre className="git-stash-content">{stashList || 'No stash entries'}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
