import { base64 } from 'multiformats/bases/base64'
import { parse as parseLink } from 'multiformats/link'
import { create as createClient } from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory'
import * as Signer from '@ucanto/principal/ed25519'
import { importDAG } from '@ucanto/core/delegation'
import { CarBufferReader } from '@ipld/car'

export type Emojis = Array<Array<Emoji|null>>

export interface Emoji {
  code: string
  fid: number
  messageHash: string
}

export const defaultGridSize = 25

export function initialData<T> (size: number) {
  const data: (T|null)[][] = []
  for (let i = 0; i < size; i++) {
    const items = []
    for (let j = 0; j < size; j++) {
      items.push(null)
    }
    data.push(items)
  }
  return data
}

export const createW3 = async (key: string, proof: string) => {
  const client = await createClient({ principal: Signer.parse(key), store: new StoreMemory() })
  // await client.addSpace(await parseProof(proof))
  return client
}

export const parseProof = async (data: string) => {
  const link = parseLink(data, base64)
  const reader = CarBufferReader.fromBytes(link.multihash.digest)
  // @ts-expect-error
  return importDAG(reader.blocks())
}

export const putEmoji = (emojis: Emojis, fid: number, messageHash: string, code: string, rowIndex: number, columnIndex: number) => {
  for (const row of emojis) {
    for (const col of row) {
      if (col && col.fid === fid) {
        throw new Error(`already put: ${fid} @ ${row},${col}`)
      }
    }
  }
  const row = emojis[rowIndex]
  if (!row) {
    throw new RangeError('invalid row number')
  }
  if (row[columnIndex] === undefined) {
    throw new RangeError('invalid column number')
  }
  if (row[columnIndex] !== null) {
    throw new Error(`not empty: ${rowIndex},${columnIndex}`)
  }
  row[columnIndex] = { code, fid, messageHash }
}
