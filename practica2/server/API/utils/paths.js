import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url) // archivo actual
const __dirname = path.dirname(__filename) // carpeta actual

const UDP_DIR = path.join(__dirname, '..', '..', 'UDP')

// rutas importantes
const CATALOG_FILE = path.join(UDP_DIR, 'catalog.json') // UDP/catalog.json
const MUSIC_DIR = path.join(UDP_DIR, 'musicReceiver') // UDP/musicServer

if (!fs.existsSync(UDP_DIR)) {
  console.warn('[paths] No se encontro carpeta UDP en', UDP_DIR)
}

export { UDP_DIR, CATALOG_FILE, MUSIC_DIR }
