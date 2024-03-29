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
import Image from 'next/image'
import { DEBUG_HUB_OPTIONS } from './debug/constants'
import emojiRegex from 'emoji-regex'
import { base64 } from 'multiformats/bases/base64'
import * as Name from 'w3name'
import retry from 'p-retry'
import { initialData, Emoji, Emojis, createW3, putEmoji, emojisCache } from './lib'
import { gridSize, dataFileName, imageFileName, gatewayURL } from './constants'
import * as Grid from './Grid'

type State = {
  code: string
  row: number
  column: number
}

export const fetchCache = 'force-no-store'

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

const w3 = await createW3(process.env.W3_KEY ?? 'missing w3 signer key', process.env.W3_PROOF ?? 'missing w3 proof')
console.log(`📱 agent: ${w3.agent.did()}`)
console.log(`📦 space: ${w3.currentSpace()?.did()}`)

const name = await Name.from(base64.decode(process.env.IPNS_KEY ?? 'missing IPNS private key'))
console.log(`🔑 ref: /ipns/${name}`)

export default async function Home ({ searchParams }: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams)

  const frameMessage = await getFrameMessage(previousFrame.postBody, { ...DEBUG_HUB_OPTIONS })
  if (frameMessage && !frameMessage?.isValid) {
    throw new Error('Invalid frame payload')
  }

  const [state] = useFramesReducer<State>(reducer, initialState(), previousFrame)
  console.log('🧳 state:', state)

  const baseURL = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'

  let revision = await retry(async () => {
    try {
      console.log(`👀 resolving: /ipns/${name}`)
      return await Name.resolve(name)
    } catch (err: any) {
      if (!err.message.startsWith('record not found')) throw err

      console.warn('🆕 initializing data:', err)
      const emojis = initialData<Emoji>(gridSize)
      const dataFile = Object.assign(new Blob([JSON.stringify(emojis)]), { name: dataFileName })

      const root = await w3.uploadDirectory([dataFile])
      const revision = await Name.v0(name, `/ipfs/${root}`)

      await Name.publish(revision, name.key)
      emojisCache.set(revision.value, emojis)

      return revision
    }
  }, { onFailedAttempt: err => console.warn(`failed to resolve: ${err.message}, attempt: ${err.attemptNumber}`) })
  console.log(`🔢 revision: ${revision.value}`)

  let emojis = emojisCache.get(revision.value)
  if (!emojis) {
    const url = `${gatewayURL}${revision.value}/${dataFileName}`
    console.log(`🐶 fetching emojis: ${url}`)
    emojis = await retry(async () => {
      const res = await fetch(url, { next: { revalidate: 3600 * 24 /* 24 hours */ } })
      return await res.json() as Emojis
    }, { onFailedAttempt: err => console.warn(`failed to fetch emojis, attempt: ${err.attemptNumber}`) })
    emojisCache.set(revision.value, emojis)
  }
  console.log('💿 emojis data loaded')

  let updated = false
  try {
    if (!state.code || !state.row || !state.column) {
      throw new Error('missing state')
    }

    const { fid, messageHash } = previousFrame.postBody?.untrustedData ?? {}
    if (fid == null || messageHash == null) {
      throw new Error('missing untrustedData')
    }

    putEmoji(emojis, fid, messageHash, state.code, state.row - 1, state.column - 1)

    console.log(`💾 uploading data`)
    const dataFile = Object.assign(new Blob([JSON.stringify(emojis)]), { name: dataFileName })
    const root = await w3.uploadDirectory([dataFile])
    const value = `/ipfs/${root}`
    
    console.log(`🔑 updating IPNS ref`)
    revision = await Name.increment(revision, value)
    await Name.publish(revision, name.key)
    console.log(`🔢 new revision: ${value}`)

    emojisCache.clear()
    emojisCache.set(value, emojis)
    console.log('🎉 emojis updated')
    updated = true
  } catch (err: any) {
    if (err.message !== 'missing state') {
      console.error(`💥 failed to update emojis`, err)
    }
  }

  const src = new URL(`/image${updated ? `?load=${encodeURIComponent(revision.value)}` : ''}`, baseURL).toString()
  return (
    <div className='p-4'>
      <Link href={`/debug?url=${baseURL}`} className='underline float-right'>
        Debug
      </Link>
      <Image src={src} alt='framoji grid' width={Grid.getWidth(emojis)/2} height={Grid.getWidth(emojis)/2} />
      <FrameContainer
        postUrl='/frames'
        pathname='/'
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage aspectRatio='1:1' src={src} />
        <FrameInput text='emoji,row,column e.g. 😀,1,3' />
        <FrameButton>Place emoji</FrameButton>
      </FrameContainer>
    </div>
  )
}


