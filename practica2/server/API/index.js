import express from 'express'
import songsRouter from './routes/songs.routes.js'
import corsMiddleware from './middleware/cors.js'
import notFoundMiddleware from './middleware/notFound.js'
import errorHandlerMiddleware from './middleware/errorHandler.js'

const app = express()
const PORT = 8000

app.use(corsMiddleware)

// Routes
app.use('/api', songsRouter)

// 404
app.use(notFoundMiddleware)

// Manejo de errores
app.use(errorHandlerMiddleware)

// Levantar server
app.listen(PORT, () => {
  console.log(`[API] Escuchando en http://localhost:${PORT}`)
})
