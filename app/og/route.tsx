import { ImageResponse } from 'next/og'
import { Grid, cellSize } from '../Grid'
import { initialData, defaultGridSize, Emoji } from '../lib'
 
export const runtime = 'edge'

function addRandomEmojis (num: number, data: Array<Array<Emoji|null>>) {
  const randomInt = (min: number, max: number) => {
    const minCeiled = Math.ceil(min)
    const maxFloored = Math.floor(max)
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled)
  }
  const emojis = ['🤣', '🤭', '👋', '💡', '😱', '🥶', '🧠', '🚧', '📱', '🤬', '🤣', '🤭', '👋', '💡', '😱', '🥶', '🧠', '🚧', '📱', '🤬', '🤣', '🤭', '👋', '💡', '😱', '🥶', '🧠', '🚧', '📱', '🤬', '🤣', '🤭', '👋', '💡', '😱', '🥶', '🧠', '🚧', '📱', '🤬', '🤣', '🤭', '👋', '💡', '😱', '🥶', '🧠', '🚧', '📱']
  const randomEmoji = () => emojis[Math.floor(Math.random() * emojis.length)]

  for (let i = 0; i < num; i++) {
    const rowIndex = randomInt(0, data.length)
    const row = data[rowIndex] ?? []
    const colIndex = randomInt(0, data.length)
    // @ts-expect-error
    row[colIndex] = { emoji: randomEmoji() }
  }
}
 
export async function GET (request: Request) {
  try {
    const width = ((defaultGridSize + 1) * cellSize) + 10
    const height = width

    const emojis = initialData<Emoji>(defaultGridSize)
    addRandomEmojis(20, emojis)
 
    const res = new ImageResponse(
      <Grid emojis={emojis} />,
      { width, height },
    )
    const buf = new Uint8Array(await res.arrayBuffer())
    return new Response(buf)
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    })
  }
}
