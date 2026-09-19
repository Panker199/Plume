import { useState } from 'react'
import './ColorPicker.css'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

export default function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [hex, setHex] = useState(color)

  const handleHex = (val: string) => {
    setHex(val)
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      onChange(val)
    }
  }

  const presets = [
    '#0078d4', '#0099bc', '#7a7574', '#767676',
    '#ff8c00', '#e81123', '#0063b1', '#6b69d6',
    '#038387', '#00b294', '#c239b3', '#9a0089',
  ]

  return (
    <div className="color-picker">
      <div className="color-input-row">
        <div className="color-preview-lg" style={{ background: color }} />
        <input
          id="color-picker"
          name="color-picker"
          type="color"
          value={color}
          onChange={e => { setHex(e.target.value); onChange(e.target.value) }}
          className="color-native-input"
        />
      </div>
      <div className="color-presets">
        {presets.map(c => (
          <button
            key={c}
            className={`color-swatch ${color === c ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => { setHex(c); onChange(c) }}
          />
        ))}
      </div>
      <div className="color-hex">
        <span className="hex-label">HEX</span>
        <input
          id="color-hex"
          name="color-hex"
          className="hex-input"
          value={hex}
          onChange={e => handleHex(e.target.value)}
          maxLength={7}
          autoComplete="off"
        />
      </div>
    </div>
  )
}
