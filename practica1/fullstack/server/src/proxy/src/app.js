import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import { tcpRequest } from './libs/tcpReq.js'

const app = express()

// Middlewares
app.use(express.json())
app.use(morgan('dev'))
app.use(cors({ origin: true, credentials: true }))

// Test
app.get('/ping', (_req, res) => res.json({ ok: true, message: 'pong' }))

// RPC genérico: body -> TCP -> 1 línea -> HTTP
app.post('/api/rpc', async (req, res) => {
  try {
    const out = await tcpRequest(req.body || {})
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

// Endpoints "bonitos" (mapean a tu protocolo Python)
app.get('/api/types', async (_req, res) => {
  try {
    const out = await tcpRequest({ op: 'lt' })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

app.get('/api/by-type/:type', async (req, res) => {
  try {
    const out = await tcpRequest({
      op: 'lbt',
      tipo: decodeURIComponent(req.params.type)
    })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

app.get('/api/item/:sku', async (req, res) => {
  try {
    const out = await tcpRequest({
      op: 'gi',
      sku: decodeURIComponent(req.params.sku)
    })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

app.get('/api/search', async (req, res) => {
  try {
    const out = await tcpRequest({
      op: 'srch',
      q: String(req.query.q || '').trim()
    })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

// (Opcionales) carrito/checkout — OJO: con este proxy "stateless" no persisten entre llamadas.
// Funcionarán solo si tu servidor Python maneja estado SIN depender de la conexión.
app.post('/api/cart/add', async (req, res) => {
  console.log(req.body)
  const { sku, cant } = req.body || {}
  try {
    const out = await tcpRequest({ op: 'atc', sku, cant })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

app.get('/api/cart', async (_req, res) => {
  try {
    const out = await tcpRequest({ op: 'sc' })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

app.post('/api/checkout', async (req, res) => {
  const { cliente } = req.body || {}
  try {
    const out = await tcpRequest({ op: 'co', cliente })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

export default app
