import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, RefreshCw, X } from 'lucide-react'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

const API_BASE = 'http://localhost:3001'

export default function FileExplorer({ onFileClick, onClose }: { onFileClick?: (path: string) => void; onClose?: () => void }) {
  const [tree, setTree] = useState<FileNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [cwd, setCwd] = useState('.')

  const fetchTree = async (dir: string = '.') => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/shell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `powershell -Command "Get-ChildItem -Path '${dir}' -Recurse -Force | Select-Object FullName, PSIsContainer | ConvertTo-Json -Compress"` }),
      })
      const data = await res.json()
      const items = JSON.parse(data.output || '[]')
      const arr = Array.isArray(items) ? items : [items]
      setTree(buildTree(arr))
    } catch { setTree([]) }
    setLoading(false)
  }

  useEffect(() => { fetchTree(cwd) }, [cwd])

  const buildTree = (items: any[]): FileNode[] => {
    const map = new Map<string, FileNode>()
    items.forEach((item: any) => {
      const fullPath = item.FullName || item.name
      const name = fullPath.split(/[/\\]/).pop() || ''
      const type = item.PSIsContainer ? 'directory' : 'file'
      if (name.startsWith('.')) return
      map.set(fullPath.toLowerCase(), { name, path: fullPath, type, children: type === 'directory' ? [] : undefined })
    })

    const roots: FileNode[] = []
    map.forEach((node) => {
      const parentPath = node.path.substring(0, Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\')))
      const parent = map.get(parentPath.toLowerCase())
      if (parent && parent.children) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name)
        return a.type === 'directory' ? -1 : 1
      })
      nodes.forEach(n => { if (n.children) sortNodes(n.children) })
    }
    sortNodes(roots)
    return roots
  }

  const toggleDir = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.path)
    return (
      <div key={node.path}>
        <div
          className="fe-item"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => {
            if (node.type === 'directory') toggleDir(node.path)
            else onFileClick?.(node.path)
          }}
        >
          <span className="fe-icon">
            {node.type === 'directory' ? (
              isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />
            ) : (
              <File size={14} />
            )}
          </span>
          <span className="fe-name">{node.name}</span>
          {node.type === 'directory' && (
            <span className="fe-chevron">
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
        </div>
        {node.type === 'directory' && isExpanded && node.children && (
          <div className="fe-children">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="file-explorer">
      <div className="fe-header">
        <span className="fe-title">Files</span>
        <div className="fe-actions">
          <button className="fe-btn" onClick={() => fetchTree(cwd)} title="Refresh"><RefreshCw size={12} /></button>
          <button className="fe-btn" onClick={onClose} title="Close"><X size={12} /></button>
        </div>
      </div>
      <div className="fe-input-row">
        <input
          id="fe-path"
          name="fe-path"
          className="fe-path-input"
          value={cwd}
          onChange={e => setCwd(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') fetchTree(cwd) }}
          placeholder="Path..."
          autoComplete="off"
        />
      </div>
      <div className="fe-tree">
        {loading ? (
          <div className="fe-loading"><span className="dot-typing"><span></span></span></div>
        ) : tree.length === 0 ? (
          <div className="fe-empty">No files found</div>
        ) : (
          tree.map(node => renderNode(node))
        )}
      </div>
    </div>
  )
}
