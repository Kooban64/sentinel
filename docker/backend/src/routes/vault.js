import axios from 'axios'

export default async function (fastify, opts) {
  fastify.post('/vault/:wallet_id/sign', async (req, reply) => {
    const { wallet_id } = req.params
    const { unsigned_tx } = req.body

    // 1. Find latest approved transaction
    const { rows: txRows } = await fastify.pg.query(
      'SELECT * FROM transactions WHERE wallet_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
      [wallet_id, 'approved']
    )
    if (txRows.length === 0) {
      return reply.code(400).send({ error: 'No approved tx found for wallet' })
    }

    const tx = txRows[0]

    // 2. Get vault path
    const { rows: keyRows } = await fastify.pg.query(
      'SELECT * FROM vault_keys WHERE wallet_id = $1 AND is_active = true',
      [wallet_id]
    )
    if (keyRows.length === 0) {
      return reply.code(404).send({ error: 'No active vault key found' })
    }

    const vaultPath = keyRows[0].vault_path || 'transit/keys/treasury-eth'

    // 3. Base64 encode tx data
    const inputB64 = Buffer.from(unsigned_tx).toString('base64')

    try {
      // 4. Call Vault Transit sign
      const res = await axios.post(
        `${process.env.VAULT_ADDR}/v1/transit/sign/treasury-eth`,
        { input: inputB64 },
        { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } }
      )

      const signature = res.data.data.signature

      // 5. Optional: Audit log
      await fastify.pg.query(
        `INSERT INTO audit_logs (actor_id, action_type, scope, ref_id, outcome, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [null, 'vault_sign', 'wallet', wallet_id, 'success',
          JSON.stringify({ vault_path: vaultPath, tx_id: tx.id, sig: signature })]
      )

      return {
        tx_signed: signature,
        vault_path: vaultPath,
        tx_id: tx.id
      }
    } catch (err) {
      return reply.code(500).send({ error: 'Vault signing failed', details: err.message })
    }
  })
}
