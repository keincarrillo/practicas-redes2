import { useState, useEffect, useRef } from 'react'

const API_URL = 'http://localhost:8000/api'

function App() {
  const [songs, setSongs] = useState([])
  const [currentSong, setCurrentSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [songDurations, setSongDurations] = useState({})
  const [status, setStatus] = useState('loading') // 'loading' | 'empty' | 'ready' | 'error'

  const audioRef = useRef(null)

  // Utilidad: pre-cargar una canción y ver si de verdad existe el audio
  const preloadSong = song => {
    return new Promise(resolve => {
      const audio = new Audio(`${API_URL}${song.stream_url}`)

      const handleLoaded = () => {
        const dur = audio.duration
        cleanup()
        resolve({
          ok: true,
          song,
          duration: dur
        })
      }

      const handleError = () => {
        cleanup()
        resolve({
          ok: false,
          song
        })
      }

      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', handleLoaded)
        audio.removeEventListener('error', handleError)
      }

      audio.addEventListener('loadedmetadata', handleLoaded)
      audio.addEventListener('error', handleError)
    })
  }

  // Cargar canciones (y validar cuáles tienen audio real)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/songs`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        // si el backend devuelve algo raro tipo null, nos aseguramos de tener arreglo
        const rawSongs = Array.isArray(data) ? data : []

        // Intentar precargar TODAS las canciones para ver cuáles sí tienen audio real
        const checks = await Promise.all(rawSongs.map(preloadSong))

        // Filtrar solo las que cargaron metadata (audio válido)
        const playable = checks.filter(item => item.ok)

        if (playable.length === 0) {
          // No hay audios reales disponibles todavía
          setSongs([])
          setCurrentSong(null)
          setIsPlaying(false)
          setSongDurations({})
          setStatus('empty')
          return
        }

        // Tenemos al menos una canción reproducible
        const playableSongs = playable.map(p => p.song)

        // Duraciones dict { id: duration }
        const durationsMap = {}
        playable.forEach(p => {
          durationsMap[p.song.id] = p.duration
        })

        setSongs(playableSongs)
        setSongDurations(durationsMap)
        setCurrentSong(playableSongs[0])
        setStatus('ready')
      } catch (err) {
        console.error('Error cargando canciones:', err)
        setSongs([])
        setCurrentSong(null)
        setIsPlaying(false)
        setSongDurations({})
        setStatus('error')
      }
    }

    load()
  }, [])

  // Sincronizar progreso/duración de la canción actual
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateProgress = () => {
      setProgress(audio.currentTime)
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      playNext()
    }

    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('loadedmetadata', updateProgress)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('loadedmetadata', updateProgress)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentSong, songs])

  const playSong = song => {
    setCurrentSong(song)
    setIsPlaying(true)

    // pequeña espera para que cambie src en <audio> antes de llamar .play()
    setTimeout(() => {
      audioRef.current?.play()
    }, 100)
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current?.pause()
    } else {
      audioRef.current?.play()
    }
    setIsPlaying(!isPlaying)
  }

  const playNext = () => {
    if (!currentSong || songs.length === 0) return
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id)
    const nextIndex = (currentIndex + 1) % songs.length
    playSong(songs[nextIndex])
  }

  const playPrevious = () => {
    if (!currentSong || songs.length === 0) return
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id)
    const prevIndex = currentIndex === 0 ? songs.length - 1 : currentIndex - 1
    playSong(songs[prevIndex])
  }

  const handleProgressChange = e => {
    const newTime = parseFloat(e.target.value)
    if (!audioRef.current) return
    audioRef.current.currentTime = newTime
    setProgress(newTime)
  }

  const handleVolumeChange = e => {
    const newVolume = parseFloat(e.target.value)
    if (!audioRef.current) return
    audioRef.current.volume = newVolume
    setVolume(newVolume)
  }

  const formatTime = seconds => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Estados derivados bonitos
  const isLoading = status === 'loading'
  const isEmpty = status === 'empty'
  const isReady = status === 'ready'
  const isError = status === 'error'

  return (
    <div className="h-screen bg-black text-white flex flex-col p-2 gap-2">
      <div className="flex flex-1 gap-2 overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside className="w-64 bg-neutral-900 rounded-lg p-6 flex flex-col gap-6 flex-shrink-0 transition-all duration-300">
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-8 h-8 text-green-500 animate-pulse"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
            <h1 className="text-xl font-bold">MusicPlayer</h1>
          </div>

          <nav className="flex flex-col gap-2">
            <a
              href="#"
              className="flex items-center gap-4 px-4 py-3 text-white rounded-md bg-neutral-800 transition-all duration-200 font-semibold hover:scale-105"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              Inicio
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-gradient-to-b from-neutral-800 to-neutral-900 rounded-lg overflow-hidden flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-8">
            <header className="mb-8">
              <h2 className="text-4xl font-bold">Tu Biblioteca</h2>
            </header>

            {/* LOADING */}
            {isLoading && (
              <div className="mt-24 text-center text-neutral-400">
                Cargando tu biblioteca...
              </div>
            )}

            {/* ERROR */}
            {isError && (
              <div className="mt-24 text-center">
                <p className="text-red-400 font-semibold">
                  Error al cargar tu biblioteca.
                </p>
                <p className="text-neutral-400 text-sm">
                  Intenta de nuevo más tarde.
                </p>
              </div>
            )}

            {/* VACÍO (no hay ningún audio reproducible todavía) */}
            {isEmpty && (
              <div className="flex flex-col items-center justify-center text-center mt-24 opacity-80">
                <div className="w-32 h-32 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center mb-6">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-12 h-12 text-neutral-500"
                  >
                    <path
                      d="M9 18V5l12-2v13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="6"
                      cy="18"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="18"
                      cy="16"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                <p className="text-xl font-semibold text-white">
                  No hay canciones todavía
                </p>
                <p className="text-sm text-neutral-400 max-w-md">
                  Agrega archivos de audio a tu servidor y vuelve a cargar para
                  ver tu música aquí.
                </p>
              </div>
            )}

            {/* LISTA / REPRODUCTOR SUPERIOR (solo cuando hay audios reales) */}
            {isReady && currentSong && (
              <>
                {/* Current Song Display */}
                <div className="flex items-end gap-6 mb-12 pb-6 border-b border-neutral-700 animate-in fade-in duration-500">
                  <div className="flex-shrink-0 relative group">
                    <img
                      src={`${API_URL}${currentSong.cover_url}`}
                      alt={currentSong.titulo}
                      className="w-56 h-56 rounded-lg object-cover shadow-2xl transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Overlay SOLO en hover */}
                    <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {isPlaying ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-16 h-16 text-white drop-shadow-lg"
                        >
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-16 h-16 text-white drop-shadow-lg"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-end gap-3 pb-2 min-w-0">
                    <span className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
                      Reproduciendo
                    </span>
                    <h2 className="text-5xl font-black leading-tight">
                      {currentSong.titulo}
                    </h2>
                    <p className="text-xl text-neutral-300 font-semibold">
                      {currentSong.artista}
                    </p>
                  </div>
                </div>

                {/* Song List */}
                <div className="mt-8">
                  <div className="grid grid-cols-[50px_2fr_1fr_100px] gap-4 px-4 py-3 text-neutral-400 text-sm font-semibold border-b border-neutral-800 mb-2">
                    <span className="text-center">#</span>
                    <span>TÍTULO</span>
                    <span className="text-center">ARTISTA</span>
                    <span className="text-center">DURACIÓN</span>
                  </div>

                  {songs.map((song, index) => (
                    <div
                      key={song.id}
                      className={`grid grid-cols-[50px_2fr_1fr_100px] gap-4 px-4 py-3 rounded-md cursor-pointer transition-all duration-200 items-center group ${
                        currentSong?.id === song.id
                          ? 'bg-green-900 bg-opacity-30 scale-100'
                          : 'hover:bg-neutral-800 hover:bg-opacity-50 hover:scale-[1.02]'
                      }`}
                      onClick={() => playSong(song)}
                    >
                      {/* Número / ícono play */}
                      <div className="text-center flex items-center justify-center">
                        <span
                          className={`text-base transition-all duration-200 ${
                            currentSong?.id === song.id
                              ? 'text-green-400'
                              : 'text-neutral-400 group-hover:hidden'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-5 h-5 hidden group-hover:block text-white animate-in fade-in zoom-in duration-200"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>

                      {/* Portada pequeña + título */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative">
                          <img
                            src={`${API_URL}${song.cover_url}`}
                            alt={song.titulo}
                            className="w-12 h-12 rounded object-cover flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                          />

                          {/* Indicador de 'reproduciendo' sin oscurecer */}
                          {currentSong?.id === song.id && isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center rounded ring-2 ring-green-500/70 ring-offset-1 ring-offset-neutral-900 bg-transparent pointer-events-none">
                              <div className="flex gap-0.5">
                                <div className="w-0.5 h-3 bg-green-400 animate-pulse"></div>
                                <div className="w-0.5 h-4 bg-green-400 animate-pulse delay-75"></div>
                                <div className="w-0.5 h-3 bg-green-400 animate-pulse delay-150"></div>
                              </div>
                            </div>
                          )}
                        </div>

                        <span
                          className={`font-medium truncate transition-colors duration-200 ${
                            currentSong?.id === song.id
                              ? 'text-green-400'
                              : 'text-white'
                          }`}
                        >
                          {song.titulo}
                        </span>
                      </div>

                      {/* Artista */}
                      <span className="text-neutral-400 text-base truncate text-center">
                        {song.artista}
                      </span>

                      {/* Duración */}
                      <span className="text-neutral-400 text-base text-center">
                        {songDurations[song.id]
                          ? formatTime(songDurations[song.id])
                          : '--:--'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Player Controls */}
      {isReady && currentSong && (
        <footer className="bg-neutral-900 rounded-lg px-6 py-4 flex-shrink-0 backdrop-blur-lg">
          <audio
            ref={audioRef}
            src={`${API_URL}${currentSong.stream_url}`}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          <div className="flex items-center justify-between gap-8">
            {/* Player Left - Song Info */}
            <div className="flex items-center gap-4 w-80 min-w-0">
              <div className="relative">
                <img
                  src={`${API_URL}${currentSong.cover_url}`}
                  alt={currentSong.titulo}
                  className="w-14 h-14 rounded object-cover flex-shrink-0 shadow-lg"
                />
                {isPlaying && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-neutral-900"></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate text-white">
                  {currentSong.titulo}
                </div>
                <div className="text-xs text-neutral-400 truncate">
                  {currentSong.artista}
                </div>
              </div>
            </div>

            {/* Player Center - Controls */}
            <div className="flex flex-col gap-2 items-center flex-1 max-w-3xl">
              <div className="flex items-center gap-6">
                <button
                  onClick={playPrevious}
                  className="text-neutral-400 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                <button
                  onClick={togglePlayPause}
                  className="bg-white text-black rounded-full w-10 h-10 flex items-center justify-center hover:scale-110 transition-all duration-200 active:scale-95 shadow-lg"
                >
                  {isPlaying ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5 ml-0.5"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={playNext}
                  className="text-neutral-400 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-3 w-full">
                <span className="text-xs text-neutral-400 min-w-[45px] text-right">
                  {formatTime(progress)}
                </span>

                <div className="relative flex-1 h-1 bg-neutral-700 rounded-full group cursor-pointer">
                  <div
                    className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-100"
                    style={{
                      width: `${(progress / (duration || 1)) * 100}%`
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                    style={{
                      left: `calc(${(progress / (duration || 1)) * 100}% - 6px)`
                    }}
                  />
                  <input
                    type="range"
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    min="0"
                    max={duration || 0}
                    value={progress}
                    onChange={handleProgressChange}
                  />
                </div>

                <span className="text-xs text-neutral-400 min-w-[45px]">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Player Right - Volume */}
            <div className="flex items-center gap-3 w-80 justify-end">
              <button className="text-neutral-400 hover:text-white transition-all duration-200 hover:scale-110">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </button>

              <div className="relative w-28 h-1 bg-neutral-700 rounded-full group cursor-pointer">
                <div
                  className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-100"
                  style={{ width: `${volume * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                  style={{ left: `calc(${volume * 100}% - 6px)` }}
                />
                <input
                  type="range"
                  className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                />
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

export default App
