import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import ensureSession from './middlewares/session.js'
import routerProxy from './routes/proxy.routes.js'
import routerHealth from './routes/health.routes.js'

const app = express()

// Middlewares
app.use(express.json())
app.use(morgan('dev'))

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: corsOrigin, credentials: true }))

// Cookies
app.use(cookieParser())

app.use(routerHealth)

// Middleware: asegura que exista un sid
app.use(ensureSession)

app.use('/api', routerProxy)

export default app
