import fs from 'fs'
import {
  loadCatalog,
  getSongById,
  getSongFilePath,
  getCoverFilePath
} from '../libs/catalog.js'

// GET /songs
const listSongs = (req, res) => {
  const catalog = loadCatalog()

  // formateamos la respuesta para no obligar al frontend a construir URLs
  const data = catalog.map(song => ({
    id: song.id,
    titulo: song.titulo,
    artista: song.artista,
    archivo: song.archivo, // nombre del mp3 en /UDP/music
    cover_url: `/songs/${song.id}/cover`,
    stream_url: `/songs/${song.id}/stream`
  }))

  res.status(200).json(data)
}

// GET /songs/:id/stream
const streamSong = (req, res) => {
  const id = Number(req.params.id)
  const song = getSongById(id)

  if (!song) {
    return res.status(404).json({ error: 'Musica no encontrada' })
  }

  const mp3Path = getSongFilePath(song)
  console.log(mp3Path)
  if (!fs.existsSync(mp3Path)) {
    return res.status(404).json({ error: 'Archivo MP3 no encontrado' })
  }

  // Cabecera correcta para MP3
  res.setHeader('Content-Type', 'audio/mpeg')

  // stream del archivo al response
  fs.createReadStream(mp3Path).pipe(res)
}

// GET /songs/:id/cover
function getCover(req, res) {
  const id = Number(req.params.id)
  const song = getSongById(id)

  if (!song) {
    return res.status(404).json({ error: 'Musica no encontrada' })
  }

  const coverPath = getCoverFilePath(song)

  if (!fs.existsSync(coverPath)) {
    return res.status(404).json({ error: 'Cover no encontrado' })
  }

  res.setHeader('Content-Type', 'image/jpeg')
  fs.createReadStream(coverPath).pipe(res)
}

export { listSongs, streamSong, getCover }
