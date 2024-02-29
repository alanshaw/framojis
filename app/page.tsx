import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  NextServerPageProps,
  getFrameMessage,
  getPreviousFrame,
  useFramesReducer,
} from 'frames.js/next/server'
import Link from 'next/link'
import { ImageResponse } from 'next/og'
import { DEBUG_HUB_OPTIONS } from './debug/constants'
import emojiRegex from 'emoji-regex'
import { base64 } from 'multiformats/bases/base64'
import * as Name from 'w3name'
import retry from 'p-retry'
import { initialData, defaultGridSize, Emoji, Emojis, createW3, putEmoji } from './lib'
import { Grid, cellSize, getWidth } from './Grid'
import Image from 'next/image'

type State = {
  code: string
  row: number
  column: number
}

const gridSize = defaultGridSize
const dataFileName = 'data.json'
const imageFileName = 'image.png'
const gatewayURL = 'https://w3s.link'

const emojisCache = new Map<string, Emojis>()

const initialState = () => ({ code: '', row: 0, column: 0 })

const reducer: FrameReducer<State> = (state, action) => {
  const data = action.postBody?.untrustedData
  if (!data) return state

  const [rawCode, rawRow, rawColumn] = (data.inputText ?? '').split(',')

  const matches = emojiRegex().exec(rawCode ?? '')
  const code = matches?.[0] ?? ''

  const row = parseInt(rawRow ?? '0')
  const column = parseInt(rawColumn ?? '0')

  return { code, row: isNaN(row) ? 0 : row, column: isNaN(column) ? 0 : column }
}

export default async function Home ({ searchParams }: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams)

  const frameMessage = await getFrameMessage(previousFrame.postBody, { ...DEBUG_HUB_OPTIONS })
  if (frameMessage && !frameMessage?.isValid) {
    throw new Error('Invalid frame payload')
  }

  const [state] = useFramesReducer<State>(reducer, initialState(), previousFrame)
  console.log('🧳 state:', state)

  const w3 = await createW3(process.env.W3_KEY ?? 'missing w3 signer key', process.env.W3_PROOF ?? 'missing w3 proof')
  console.log(`📱 agent: ${w3.agent.did()}`)
  console.log(`📦 space: ${w3.currentSpace()?.did()}`)

  const name = await Name.from(base64.decode(process.env.IPNS_KEY ?? 'missing IPNS private key'))
  console.log(`🔑 ref: /ipns/${name}`)

  const baseURL = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'

  let revision = await retry(async () => {
    try {
      console.log(`👀 resolving: /ipns/${name}`)
      return await Name.resolve(name)
    } catch (err: any) {
      if (!err.message.startsWith('record not found')) throw err

      console.warn('🆕 initializing data:', err)
      const emojis = initialData<Emoji>(gridSize)
      const dataFile = new File([JSON.stringify(emojis)], dataFileName)
      const imageFile = new File([await renderGrid(emojis)], imageFileName)

      const root = await w3.uploadDirectory([dataFile, imageFile])
      const value = `/ipfs/${root}`

      const revision = await Name.v0(name, value)
      await Name.publish(revision, name.key)

      emojisCache.set(value, emojis)
      return revision
    }
  }, { onFailedAttempt: err => console.warn(`failed to resolve, attempt: ${err.attemptNumber}`) })
  console.log(`🔢 revision: ${revision.value}`)

  let emojis = emojisCache.get(revision.value)
  if (!emojis) {
    const url = `${gatewayURL}${revision.value}/${dataFileName}`
    console.log(`🌍 fetching emojis: ${url}`)
    emojis = await retry(async () => {
      const res = await fetch(url, { next: { revalidate: 3600 * 24 /* 24 hours */ } })
      return await res.json() as Emojis
    }, { onFailedAttempt: err => console.warn(`failed to fetch emojis, attempt: ${err.attemptNumber}`) })
    emojisCache.set(revision.value, emojis)
  }
  console.log('💿 emojis data loaded')

  try {
    if (!state.code || !state.row || !state.column) {
      throw new Error('missing state')
    }

    const { fid, messageHash } = previousFrame.postBody?.untrustedData ?? {}
    if (fid == null || messageHash == null) {
      throw new Error('missing untrustedData')
    }

    putEmoji(emojis, fid, messageHash, state.code, state.row - 1, state.column - 1)

    console.log(`🎨 rendering image`)
    const dataFile = Object.assign(new Blob([JSON.stringify(emojis)]), { name: dataFileName })
    const imageFile = Object.assign(new Blob([await renderGrid(emojis)]), { name: imageFileName })

    console.log(`💾 uploading new data`)
    const root = await w3.uploadDirectory([dataFile, imageFile])
    const value = `/ipfs/${root}`
    
    console.log(`🔑 updating IPNS ref`)
    revision = await Name.increment(revision, value)
    await Name.publish(revision, name.key)
    console.log(`🔢 new revision: ${value}`)

    emojisCache.set(value, emojis)
    console.log('🎉 emojis updated')
  } catch (err: any) {
    if (err.message !== 'missing state') {
      console.error(`💥 failed to update emojis`, err)
    }
  }

  return (
    <div className='p-4'>
      <Link href={`/debug?url=${baseURL}`} className='underline float-right'>
        Debug
      </Link>
      <Image src={`${gatewayURL}${revision.value}/${imageFileName}`} alt='framjoi grid' width={getWidth(emojis)/2} height={getWidth(emojis)/2} />
      <FrameContainer
        postUrl='/frames'
        pathname='/'
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage aspectRatio='1:1' src={`${gatewayURL}${revision.value}/${imageFileName}`} />
        <FrameInput text='emoji,row,column e.g. 😀,1,3' />
        <FrameButton>Place emoji</FrameButton>
      </FrameContainer>
    </div>
  )
}

const renderGrid = async (emojis: Emojis) => {
  const width = ((defaultGridSize + 1) * cellSize) + 10
  const height = width
  const res = new ImageResponse(<Grid emojis={emojis} />, { width, height })
  return new Uint8Array(await res.arrayBuffer())
}
