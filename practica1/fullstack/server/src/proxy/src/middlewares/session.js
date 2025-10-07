import { randomUUID } from 'crypto'

// Opciones de cookie
const cookieOpts = {
  httpOnly: true, // no accesible desde JS
  sameSite: 'Lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 24 * 7, // 1 semana
  path: '/'
}

const ensureSession = (req, res, next) => {
  let sid = req.cookies.sid
  if (!sid) {
    sid = randomUUID()
    res.cookie('sid', sid, cookieOpts)
  }
  req.sid = sid
  next()
}

export default ensureSession
