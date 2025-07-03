import { randomUUID } from 'crypto'
import { broadcastSignedTx } from '../utils/broadcast.js'

export default async function (fastify, opts) {
  // Create new transaction
  fastify.post('/transactions', async (req, reply) => {
    const {
      wallet_id, amount, token, tx_type, destination
    } = req.body

    const id = randomUUID()
    const created_at = new Date().toISOString()

    await fastify.pg.query(
      `INSERT INTO transactions (id, wallet_id, amount, token, tx_type, destination, status, approvals_required, signed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', 3, ARRAY[]::TEXT[], $7)`,
      [id, wallet_id, amount, token, tx_type, destination, created_at]
    )

    return { id, status: 'pending' }
  })

  // Approve transaction
  fastify.post('/transactions/:id/approve', async (req, reply) => {
    const { id } = req.params
    const { signer_id } = req.body

    const result = await fastify.pg.query('SELECT * FROM transactions WHERE id = $1', [id])
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Transaction not found' })

    const tx = result.rows[0]
    const signedBy = tx.signed_by || []

    if (signedBy.includes(signer_id)) {
      return reply.code(400).send({ error: 'Already signed' })
    }

    signedBy.push(signer_id)
    const newStatus = signedBy.length >= tx.approvals_required ? 'approved' : 'pending'

    await fastify.pg.query(
      'UPDATE transactions SET signed_by = $1, status = $2 WHERE id = $3',
      [signedBy, newStatus, id]
    )

    // If fully approved, create ledger entries
    if (newStatus === 'approved') {
      const timestamp = new Date().toISOString()

      await fastify.pg.query(
        `INSERT INTO tx_ledger (ref_tx_id, wallet_id, token, amount, direction, ref_type, onchain, counterparty, timestamp)
         VALUES ($1, $2, $3, $4, 'debit', $5, false, $6, $7)`,
        [id, tx.wallet_id, tx.token, tx.amount, tx.tx_type, tx.destination, timestamp]
      )

      await fastify.pg.query(
        `INSERT INTO tx_ledger (ref_tx_id, wallet_id, token, amount, direction, ref_type, onchain, counterparty, timestamp)
         VALUES ($1, NULL, $2, $3, 'credit', $4, false, $5, $6)`,
        [id, tx.token, tx.amount, tx.tx_type, tx.destination, timestamp]
      )
    }

    return { id, signed_by: signedBy, status: newStatus }
  })

  // Broadcast transaction to blockchain
  fastify.post('/transactions/:id/broadcast', async (req, reply) => {
    const { id } = req.params
    const { raw_signed_tx } = req.body

    const { tx_hash, error } = await broadcastSignedTx(raw_signed_tx)

    if (error) {
      return reply.code(500).send({ error: `Broadcast failed: ${error}` })
    }

    // Optional: Mark ledger entries as onchain
    await fastify.pg.query(
      `UPDATE tx_ledger SET onchain = true, block_hash = $1 WHERE ref_tx_id = $2`,
      [tx_hash, id]
    )

    return { tx_hash, status: 'submitted' }
  })

  // List all transactions
  fastify.get('/transactions', async (req, reply) => {
    const { rows } = await fastify.pg.query('SELECT * FROM transactions ORDER BY created_at DESC')
    return rows
  })
}
