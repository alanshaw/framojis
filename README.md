# framojis

Colaboratve griddled emojis all framed up.

## Usage

### Developers

Create an IPNS key:

```js
import * as Name from 'w3name'
import { base64 } from 'multiformats/bases/base64'

const name = await Name.create()
console.log(base64.encode(name.key.bytes))
```

Install w3 CLI:

```console
npm install -g @web3-storage/w3cli
```

Create a web3.storage signer key:

```console
w3 key create
# did:key:z6MkuxojKbmgj3oWSxAEPTzBeamih1NBTJNEfRthCCxvMprd
MgCZCg4LL3IEsmV1/blIlcrxWALmg9OVH+MCCXPSfG1c4mu0B5nD5RNmwrjKfD2S87eisu23wwR5tdp6l4FV05bY7R+o=
```

Delegate to the created key:

```console
w3 delegation create <did_from_w3_key_create_command_above> --base64 --can store/add --can upload/add
```

Set the following environment variables:

```
export IPNS_KEY=...
export W3_KEY=...
export W3_PROOF=...
```

(or rename `.env.sample` to `.env` and set in there).
