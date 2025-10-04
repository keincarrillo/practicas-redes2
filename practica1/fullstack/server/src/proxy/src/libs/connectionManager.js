import net from 'net'
import { LineReader } from './lineReader.js'

const HOST = process.env.HOST_PY || '127.0.0.1'
const PORT = parseInt(process.env.PORT_PY || '5000', 10)
const SESSION_IDLE_MS = parseInt(process.env.SESSION_IDLE_MS || '120000', 10)

const sessions = new Map()

const isHandshake = line => {
  try {
    const j = JSON.parse(line)
    if (j && typeof j === 'object') {
      if (typeof j.message === 'string' && /bienvenido/i.test(j.message))
        return true
      if (j.event === 'welcome') return true
    }
  } catch {}
  return false
}

const createSession = sid => {
  const state = {
    id: sid,
    socket: null,
    reader: null,
    queue: [], // [{ payload, resolve, reject, timeout }]
    busy: false,
    lastUsed: Date.now(),
    connecting: null
  }

  const failAll = err => {
    while (state.queue.length) {
      const q = state.queue.shift()
      clearTimeout(q.timeout)
      q.reject(err)
    }
    state.busy = false
    try {
      state.socket?.destroy()
    } catch {}
    state.socket = null
    state.reader = null
  }

  const ensureConnected = async () => {
    if (state.socket && !state.socket.destroyed) return
    if (state.connecting) return state.connecting

    state.connecting = new Promise((resolve, reject) => {
      const sock = net.createConnection({ host: HOST, port: PORT }, () => {
        state.socket = sock
        state.reader = new LineReader(sock)

        state.reader.on('line', line => {
          if (isHandshake(line)) return

          const current = state.queue[0]
          if (!current) return

          state.queue.shift()
          clearTimeout(current.timeout)
          state.busy = false

          try {
            current.resolve(JSON.parse(line))
          } catch {
            current.resolve({
              ok: false,
              error: 'Respuesta no JSON',
              raw: line
            })
          }

          drain()
        })

        state.reader.on('error', e => failAll(e))
        sock.on('error', e => failAll(e))
        sock.on('close', () => failAll(new Error('TCP cerrado')))
        resolve()
      })

      sock.setNoDelay(true)
      sock.setKeepAlive(true)
      sock.setEncoding('utf8')
      sock.on('error', reject)
    }).finally(() => {
      state.connecting = null
    })

    return state.connecting
  }

  const drain = () => {
    if (state.busy) return
    const item = state.queue[0]
    if (!item) return
    state.busy = true
    try {
      state.socket.write(item.payload, 'utf8')
    } catch (e) {
      clearTimeout(item.timeout)
      state.queue.shift()
      state.busy = false
      item.reject(e)
      drain()
    }
  }

  const send = async (obj, { timeoutMs = 10000 } = {}) => {
    await ensureConnected()
    state.lastUsed = Date.now()
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(obj) + '\n'
      const item = { payload, resolve, reject, timeout: null }
      item.timeout = setTimeout(() => {
        const idx = state.queue.indexOf(item)
        if (idx >= 0) state.queue.splice(idx, 1)
        state.busy = false
        reject(new Error('TCP request timed out'))
        drain()
      }, timeoutMs)
      state.queue.push(item)
      drain()
    })
  }

  const destroy = () => failAll(new Error('Sesión destruida'))

  return {
    send,
    destroy,
    get lastUsed() {
      return state.lastUsed
    },
    set lastUsed(v) {
      state.lastUsed = v
    }
  }
}

setInterval(
  () => {
    const now = Date.now()
    for (const [sid, sess] of sessions.entries()) {
      if (now - sess.lastUsed > SESSION_IDLE_MS) {
        sess.destroy()
        sessions.delete(sid)
      }
    }
  },
  Math.min(SESSION_IDLE_MS, 60000)
)

export const sendWithSession = async (sid, obj, opts) => {
  let sess = sessions.get(sid)
  if (!sess) {
    sess = createSession(sid)
    sessions.set(sid, sess)
  }
  try {
    return await sess.send(obj, opts)
  } finally {
    sess.lastUsed = Date.now()
  }
}
