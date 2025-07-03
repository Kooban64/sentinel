import Fastify from 'fastify'
import dotenv from 'dotenv'
import pg from '@fastify/postgres'

import authRoutes from './src/routes/auth.js'
import walletRoutes from './src/routes/wallets.js'
import txRoutes from './src/routes/transactions.js'
import ledgerRoutes from './src/routes/ledger.js'
import vaultRoutes from './src/routes/vault.js'

dotenv.config()

const fastify = Fastify({ logger: true })

// PostgreSQL connection
fastify.register(pg, {
  connectionString: process.env.DATABASE_URL
})

// Register routes
fastify.register(authRoutes, { prefix: '/auth' })
fastify.register(walletRoutes, { prefix: '/' })
fastify.register(txRoutes, { prefix: '/' })
fastify.register(ledgerRoutes, { prefix: '/' })
fastify.register(vaultRoutes, { prefix: '/' })

// Health check
fastify.get('/', async (request, reply) => {
  return { status: 'Sentinel API Running' }
})

// Start server
fastify.listen({ port: process.env.PORT, host: '0.0.0.0' })
