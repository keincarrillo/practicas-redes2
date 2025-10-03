import app from './src/api/app.js'
import { PORT } from './src/config.js'

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`)
})
