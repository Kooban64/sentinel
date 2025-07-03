export default async function (fastify, opts) {
  fastify.get('/ledger', async (req, reply) => {
    const { rows } = await fastify.pg.query(
      'SELECT * FROM tx_ledger ORDER BY timestamp DESC LIMIT 100'
    )
    return rows
  })
}
