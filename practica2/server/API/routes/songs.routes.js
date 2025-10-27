import { Router } from 'express'
import {
  listSongs,
  streamSong,
  getCover
} from '../controllers/songs.controller.js'

const router = Router()

// GET /songs
router.get('/songs', listSongs)

// GET /songs/:id/stream
router.get('/songs/:id/stream', streamSong)

// GET /songs/:id/cover
router.get('/songs/:id/cover', getCover)

export default router
