import { sendWithSession } from '../libs/connectionManager.js'

export const types = async (req, res) => {
  try {
    const out = await sendWithSession(req.sid, { op: 'lt' })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
}

export const byType = async (req, res) => {
  try {
    const out = await sendWithSession(req.sid, {
      op: 'lbt',
      tipo: decodeURIComponent(req.params.type)
    })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
}

export const bySku = async (req, res) => {
  try {
    const out = await sendWithSession(req.sid, {
      op: 'gi',
      sku: decodeURIComponent(req.params.sku)
    })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
}

export const search = async (req, res) => {
  try {
    const out = await sendWithSession(req.sid, {
      op: 'srch',
      q: String(req.query.q || '').trim()
    })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
}

export const addCart = async (req, res) => {
  const { sku, cant } = req.body || {}

  if (!sku || !Number.isInteger(cant) || cant <= 0) {
    return res.status(400).json({ ok: false, error: 'Parámetros inválidos' })
  }

  try {
    const out = await sendWithSession(req.sid, {
      op: 'atc',
      sku,
      cant
    })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
}

export const cart = async (req, res) => {
  try {
    const out = await sendWithSession(req.sid, { op: 'sc' })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
}

export const checkout = async (req, res) => {
  const { cliente } = req.body || {}
  try {
    const out = await sendWithSession(req.sid, { op: 'co', cliente })
    res.json(out ?? null)
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || String(e) })
  }
}
