import express from 'express'

const app = express()

app.get('/', (req, res) => {
  res.send('Hello via Express!')
})

export default app
