import { ImageResponse } from 'next/og'
import { Grid, getWidth } from '../Grid'
import { initialData, Emoji } from '../lib'
import { gridSize } from '../constants'
 
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
    row[colIndex] = { code: randomEmoji() }
  }
}
 
export async function GET (request: Request) {
  try {
    const emojis = initialData<Emoji>(gridSize)
    addRandomEmojis(20, emojis)

    const width = getWidth(emojis)
    const height = width
 
    const res = new ImageResponse(
      <Grid emojis={emojis} title='bafybeifaaltd4ebllccjd3dhkh5ek6ycdrmjkwstfsoe5tosff3ejy2rpi' />,
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
