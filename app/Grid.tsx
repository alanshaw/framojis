import { ImageResponse } from 'next/og'
import { Emojis } from './lib'

export const cellSize = 32

const Logo = () => <svg width={cellSize/2} viewBox="0 0 27.2 27.18" xmlns="http://www.w3.org/2000/svg"><path d="M13.6 27.18A13.59 13.59 0 1127.2 13.6a13.61 13.61 0 01-13.6 13.58zM13.6 2a11.59 11.59 0 1011.6 11.6A11.62 11.62 0 0013.6 2z" fill="currentColor"></path><path d="M12.82 9.9v2.53h1.6V9.9l2.09 1.21.77-1.21-2.16-1.32 2.16-1.32-.77-1.21-2.09 1.21V4.73h-1.6v2.53l-2-1.21L10 7.26l2.2 1.32L10 9.9l.78 1.21zM18 17.79v2.52h1.56v-2.52L21.63 19l.78-1.2-2.16-1.33 2.16-1.28-.78-1.19-2.08 1.2v-2.58H18v2.56L15.9 14l-.77 1.2 2.16 1.32-2.16 1.33.77 1.15zM8.13 17.79v2.52h1.56v-2.52L11.82 19l.77-1.2-2.16-1.33 2.12-1.28-.73-1.24-2.13 1.23v-2.56H8.13v2.56L6.05 14l-.78 1.2 2.16 1.3-2.16 1.33.78 1.17z" fill="currentColor"></path></svg>

export function Grid ({ emojis, title }: { emojis: Emojis, title: string }) {
  const width = getWidth(emojis)
  const height = width
  const gridSize = emojis.length
  const rowStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', width, height: cellSize }
  const cellStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', width: cellSize, height: cellSize, fontSize: cellSize, color: 'black' }
  const indexCellStyle = { ...cellStyle, fontSize: 14, fontFamily: 'sans-serif', color: 'black', paddingTop: 2 }

  const rows = []
  rows.push(<div style={rowStyle}>{title}</div>)
  for (let i = 0; i < gridSize + 1; i++) {
    const items = []
    if (i === 0) {
      items.push(<div style={cellStyle}><Logo /></div>)
      for (let j = 1; j < gridSize + 1; j++) {
        items.push(<div style={indexCellStyle}>{j}</div>)
      }
    } else {
      items.push(<div style={indexCellStyle}>{i}</div>)
      for (let j = 1; j < gridSize + 1; j++) {
        items.push(<div style={cellStyle}>{emojis[i - 1]?.[j - 1]?.code || '·'}</div>)
      }
    }
    // items.push(<div style={indexCellStyle}></div>)
    rows.push(<div style={rowStyle}>{items}</div>)
  }
  rows.push(<div style={rowStyle}></div>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width, height, backgroundColor: 'white' }}>
      {rows}
    </div>
  )
}

export const render = async (emojis: Emojis, title: string) => {
  const width = getWidth(emojis)
  const height = width
  const res = new ImageResponse(<Grid emojis={emojis} title={title} />, { width, height })
  return new Uint8Array(await res.arrayBuffer())
}

export const getWidth = (emojis: Emojis) => ((emojis.length + 3) * cellSize)
