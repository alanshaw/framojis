import { CAR } from '@ucanto/transport'

/** @param {Uint8Array} bytes */
export const digest = async (bytes: Uint8Array) => {
  const cid = await CAR.codec.link(bytes)
  return cid.multihash
}
