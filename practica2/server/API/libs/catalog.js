import fs from 'fs'
import path from 'path'
import { CATALOG_FILE, COVER_DIR, MUSIC_DIR } from '../utils/paths.js'

// Lee y parsea catalog.json
const loadCatalog = () => {
  if (!fs.existsSync(CATALOG_FILE)) {
    // si no existe, devolvemos un array vacio
    return []
  }
  try {
    const raw = fs.readFileSync(CATALOG_FILE, 'utf-8') // lee el archivo
    return JSON.parse(raw)
  } catch (err) {
    console.error('[catalog] Error leyendo/parsing catalog.json:', err)
    return []
  }
}

// Busca una cancion por id
const getSongById = id => {
  const catalog = loadCatalog()
  return catalog.find(song => song.id === id)
}

// Dado un objeto cancion, devuelve la ruta absoluta al MP3
const getSongFilePath = song => {
  // en catalog.json esperamos:
  // { archivo: "normal.mp3", cover: "lofi.jpg", ... }
  return path.join(MUSIC_DIR, song.archivo)
}

// Dado un objeto cancion, devuelve la ruta absoluta al cover(portada de la cancion)
const getCoverFilePath = song => {
  return path.join(COVER_DIR, song.cover || '')
}

export { loadCatalog, getSongById, getSongFilePath, getCoverFilePath }
