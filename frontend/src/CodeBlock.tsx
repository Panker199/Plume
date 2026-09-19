import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  language: string
  children: string
}

export default function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{language || 'code'}</span>
        <button className="code-copy" onClick={handleCopy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="code-pre"><code>{children}</code></pre>
    </div>
  )
}
