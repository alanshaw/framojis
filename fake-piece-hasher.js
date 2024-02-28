import { CAR } from '@ucanto/transport'

/** @param {Uint8Array} bytes */
export const digest = async (bytes) => {
  const cid = await CAR.codec.link(bytes)
  return cid.multihash
}
