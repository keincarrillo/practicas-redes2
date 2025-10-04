// Utilidad de llamadas HTTP al proxy (Express) con cookies de sesión
const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000'

async function req(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined
  })
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}`)
  return r.json()
}

export const API = {
  get: path => req('GET', path),
  post: (path, body) => req('POST', path, body)
}
