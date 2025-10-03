import app from './src/proxy/app.js'

app.listen(process.env.PORT_PROXY, () => {
  console.log(`Proxy running on port ${process.env.PORT_PROXY}`)
})
