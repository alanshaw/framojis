import { Emojis } from './lib'

export const cellSize = 32

export function Grid ({ emojis }: { emojis: Emojis }) {
  const gridSize = emojis.length
  const rowStyle = { display: 'flex' }
  const cellStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', width: cellSize, height: cellSize, fontSize: cellSize }
  const indexCellStyle = { ...cellStyle, fontSize: 14, fontFamily: 'sans-serif', paddingTop: 2 }

  const rows = []
  for (let i = 0; i < gridSize + 1; i++) {
    const items = []
    if (i === 0) {
      items.push(<div style={cellStyle}></div>)
      for (let j = 1; j < gridSize + 1; j++) {
        items.push(<div style={indexCellStyle}>{j}</div>)
      }
    } else {
      items.push(<div style={indexCellStyle}>{i}</div>)
      for (let j = 1; j < gridSize + 1; j++) {
        items.push(<div style={cellStyle}>{emojis[i - 1]?.[j - 1]?.code || '·'}</div>)
      }
    }
    rows.push(<div style={rowStyle}>{items}</div>)
  }

  const width = getWidth(emojis)
  const height = width

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width, height }}>
      {rows}
    </div>
  )
}

export const getWidth = (emojis: Emojis) => (emojis.length + 1) * cellSize
