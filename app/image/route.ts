import { base64 } from 'multiformats/bases/base64'
import * as Name from 'w3name'
import { redirect } from 'next/navigation'
import retry from 'p-retry'
import { dataFileName, gatewayURL } from '../constants'
import { Emojis, emojisCache } from '../lib'
import * as Grid from '../Grid'

export const maxDuration = 60
export const revalidate = 1

const imageCache = new Map<string, Uint8Array>()

export async function GET (request: Request) {
  const name = await Name.from(base64.decode(process.env.IPNS_KEY ?? 'missing IPNS private key'))
  console.log(`🔑 ref: /ipns/${name}`)

  try {
    const revision = await retry(async () => {
      console.log(`👀 resolving: /ipns/${name}`)
      return await Name.resolve(name)
    }, {
      onFailedAttempt: err => console.warn(`failed to resolve, attempt: ${err.attemptNumber}`),
      retries: 3
    })
    console.log(`🔢 revision: ${revision.value}`)

    let imageData = imageCache.get(revision.value)
    if (!imageData) {
      let emojis = emojisCache.get(revision.value)
      if (!emojis) {
        const url = `${gatewayURL}${revision.value}/${dataFileName}`
        console.log(`🐶 fetching emojis: ${url}`)
        emojis = await retry(async () => {
          const res = await fetch(url, { next: { revalidate: 3600 * 24 /* 24 hours */ } })
          return await res.json() as Emojis
        }, { onFailedAttempt: err => console.warn(`failed to fetch emojis, attempt: ${err.attemptNumber}`) })

        emojisCache.clear()
        emojisCache.set(revision.value, emojis)
      }
      console.log('💿 emojis data loaded')

      console.log(`🎨 rendering image`)
      imageData = await Grid.render(emojis, `source: ${revision.value.replace('/ipfs/', '')}`)

      imageCache.clear()
      imageCache.set(revision.value, imageData)
    }

    console.log(`📩 sending image`)
    return new Response(imageData, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-cache, no-store, max-age=0'
      }
    })
  } catch (err) {
    console.warn(err)
    return new Response(null, { status: 404 })
  }
}
