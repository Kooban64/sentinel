import axios from 'axios'

export async function broadcastSignedTx(unsignedTxHex, provider = 'alchemy') {
  const network = 'mainnet' // Change to 'goerli' or 'sepolia' for testnets
  const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY

  if (!ALCHEMY_API_KEY) {
    throw new Error('Missing ALCHEMY_API_KEY in .env')
  }

  const url = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_sendRawTransaction',
    params: [unsignedTxHex],
  }

  try {
    const res = await axios.post(url, payload)
    return res.data
  } catch (err) {
    console.error('[Broadcast Error]', err?.response?.data || err.message)
    throw new Error('Broadcast failed')
  }
}
