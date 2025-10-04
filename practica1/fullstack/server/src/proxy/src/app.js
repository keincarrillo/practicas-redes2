import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'crypto'
import { sendWithSession } from './libs/connectionManager.js'

const app = express()

// -------- Middlewares base --------
app.use(express.json())
app.use(morgan('dev'))

// CORS con credenciales (¡origin específico, no '*')
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: corsOrigin, credentials: true }))

// Cookies
app.use(cookieParser())

// Opciones de cookie
const cookieOpts = {
  httpOnly: true, // no accesible desde JS
  sameSite: 'Lax', // para localhost está bien; si usas otro dominio, usa 'None' + secure
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
  path: '/'
}

// Middleware: asegura que exista un sid (y lo adjunta a req.sid)
const ensureSession = (req, res, next) => {
  let sid = req.cookies.sid
  if (!sid) {
    sid = randomUUID()
    res.cookie('sid', sid, cookieOpts)
  }
  req.sid = sid
  next()
}

app.get('/ping', (_req, res) => res.json({ ok: true, message: 'pong' }))

app.use(ensureSession)

app.get('/api/types', async (req, res) => {
  try {
    const out = await sendWithSession(req.sid, { op: 'lt' })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

app.get('/api/by-type/:type', async (req, res) => {
  try {
    const out = await sendWithSession(req.sid, {
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
    const out = await sendWithSession(req.sid, {
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
    const out = await sendWithSession(req.sid, {
      op: 'srch',
      q: String(req.query.q || '').trim()
    })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

// ---- Carrito / Checkout (persisten en la MISMA sesión por cookie.sid) ----
app.post('/api/cart/add', async (req, res) => {
  const { sku, cant } = req.body || {}

  if (!sku || !Number.isInteger(cant) || cant <= 0) {
    return res.status(400).json({ ok: false, error: 'Parámetros inválidos' })
  }

  try {
    // tu servidor Python espera 'qty'
    const out = await sendWithSession(req.sid, {
      op: 'atc',
      sku,
      cant
    })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

app.get('/api/cart', async (req, res) => {
  try {
    const out = await sendWithSession(req.sid, { op: 'sc' })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

app.post('/api/checkout', async (req, res) => {
  const { cliente } = req.body || {}
  try {
    // tu server usa 'co' para checkout
    const out = await sendWithSession(req.sid, { op: 'co', cliente })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
})

export default app
