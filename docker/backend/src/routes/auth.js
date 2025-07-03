export default async function (fastify, opts) {
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body
    // Dummy login simulation
    if (email === 'admin@sentinel.io' && password === 'secret') {
      return { token: 'fake-jwt-token', role: 'super_admin' }
    }
    reply.code(401).send({ error: 'Invalid credentials' })
  })
}
