import { base64 } from 'multiformats/bases/base64'
import * as Name from 'w3name'
import { redirect } from 'next/navigation'
import retry from 'p-retry'
import { imageFileName, gatewayURL } from '../constants'

export const revalidate = 1

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

    await retry(async () => {
      const url = `${gatewayURL}${revision.value}`
      console.log(`🐶 HEAD ${url}`)
      const res = await fetch(url, { method: 'HEAD' })
      if (res.status !== 200) throw new Error(`not yet available on gateway: ${url}`)
    }, {
      onFailedAttempt: err => console.warn(err.message),
      retries: 5
    })

    console.log(`🔀 redirecting to: ${gatewayURL}${revision.value}/${imageFileName}`)
    redirect(`${gatewayURL}${revision.value}/${imageFileName}`)
  } catch (err) {
    console.warn(err)
    return new Response(null, { status: 404 })
  }
}
