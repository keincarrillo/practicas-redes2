import app from './src/app.js'

const port = process.env.PORT_PROXY || 3000

app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`)
})
