import { base64 } from 'multiformats/bases/base64'
import * as Name from 'w3name'
import { redirect } from 'next/navigation'
import retry from 'p-retry'
import { imageFileName, dataFileName, gatewayURL } from '../constants'
import { Emojis, createW3, emojisCache } from '../lib'
import * as Grid from '../Grid'

export const revalidate = 1

const imageCache = new Map()

export async function GET (request: Request) {
  const name = await Name.from(base64.decode(process.env.IPNS_KEY ?? 'missing IPNS private key'))
  console.log(`🔑 ref: /ipns/${name}`)

  let url: string
  try {
    const revision = await retry(async () => {
      console.log(`👀 resolving: /ipns/${name}`)
      return await Name.resolve(name)
    }, {
      onFailedAttempt: err => console.warn(`failed to resolve, attempt: ${err.attemptNumber}`),
      retries: 3
    })
    console.log(`🔢 revision: ${revision.value}`)

    if (imageCache.has(revision.value)) {
      url = `${gatewayURL}${imageCache.get(revision.value)}/${imageFileName}`
    } else {
      const w3 = await createW3(process.env.W3_KEY ?? 'missing w3 signer key', process.env.W3_PROOF ?? 'missing w3 proof')
      console.log(`📱 agent: ${w3.agent.did()}`)
      console.log(`📦 space: ${w3.currentSpace()?.did()}`)

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

      console.log(`🎨 rendering image`)
      const imageFile = Object.assign(new Blob([await Grid.render(emojis, revision.value.replace('/ipfs/', ''))]), { name: imageFileName })

      console.log(`💾 uploading new data`)
      const root = await w3.uploadDirectory([imageFile])
      const value = `/ipfs/${root}`

      await retry(async () => {
        const url = `${gatewayURL}${value}`
        console.log(`🐶 HEAD ${url}`)
        const res = await fetch(url, { method: 'HEAD' })
        if (res.status !== 200) throw new Error(`not yet available on gateway: ${url}`)
      }, {
        onFailedAttempt: err => console.warn(err.message),
        retries: 5
      })

      imageCache.clear()
      imageCache.set(revision.value, value)

      url = `${gatewayURL}${value}/${imageFileName}`
    }
  } catch (err) {
    console.warn(err)
    return new Response(null, { status: 404 })
  }

  console.log(`🔀 redirecting to: ${url}`)
  redirect(url)
}
