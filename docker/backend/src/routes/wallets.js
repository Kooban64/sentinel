import { randomUUID } from 'crypto'

export default async function (fastify, opts) {
  fastify.get('/wallets', async (req, reply) => {
    const { rows } = await fastify.pg.query('SELECT * FROM wallets ORDER BY created_at DESC')
    return rows
  })

  fastify.post('/wallets', async (req, reply) => {
    const {
      label, chain, type, address, risk_level, custody, use_case
    } = req.body

    const id = randomUUID()
    await fastify.pg.query(
      `INSERT INTO wallets (id, label, chain, type, address, risk_level, custody, use_case)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, label, chain, type, address, risk_level, custody, use_case]
    )

    return { id, status: 'created' }
  })
}
