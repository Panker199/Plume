interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNum?: number
}

export default function InlineDiff({ oldText, newText }: { oldText: string; newText: string }) {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  const computeDiff = (): DiffLine[] => {
    const result: DiffLine[] = []
    let i = 0, j = 0

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length) {
        if (oldLines[i] === newLines[j]) {
          result.push({ type: 'unchanged', content: oldLines[i], lineNum: j + 1 })
          i++; j++
        } else {
          result.push({ type: 'removed', content: oldLines[i] })
          result.push({ type: 'added', content: newLines[j], lineNum: j + 1 })
          i++; j++
        }
      } else if (i < oldLines.length) {
        result.push({ type: 'removed', content: oldLines[i] })
        i++
      } else {
        result.push({ type: 'added', content: newLines[j], lineNum: j + 1 })
        j++
      }
    }
    return result
  }

  const diff = computeDiff()
  const added = diff.filter(d => d.type === 'added').length
  const removed = diff.filter(d => d.type === 'removed').length

  return (
    <div className="diff-view">
      <div className="diff-header">
        <span className="diff-stats">
          <span className="diff-added">+{added}</span>
          <span className="diff-removed">-{removed}</span>
        </span>
      </div>
      <div className="diff-content">
        {diff.map((line, i) => (
          <div key={i} className={`diff-line ${line.type}`}>
            <span className="diff-gutter">
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            <span className="diff-line-num">{line.lineNum || ''}</span>
            <pre className="diff-code">{line.content}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}
