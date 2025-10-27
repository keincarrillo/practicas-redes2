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
  const audioRef = useRef(null)

  useEffect(() => {
    fetch(`${API_URL}/songs`)
      .then(res => res.json())
      .then(data => {
        setSongs(data)
        if (data.length > 0) {
          setCurrentSong(data[0])
        }
        // Cargar duraciones de todas las canciones
        data.forEach(song => {
          const audio = new Audio(`${API_URL}${song.stream_url}`)
          audio.addEventListener('loadedmetadata', () => {
            setSongDurations(prev => ({
              ...prev,
              [song.id]: audio.duration,
            }))
          })
        })
      })
      .catch(err => console.error('Error cargando canciones:', err))
  }, [])

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
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id)
    const nextIndex = (currentIndex + 1) % songs.length
    playSong(songs[nextIndex])
  }

  const playPrevious = () => {
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id)
    const prevIndex = currentIndex === 0 ? songs.length - 1 : currentIndex - 1
    playSong(songs[prevIndex])
  }

  const handleProgressChange = e => {
    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setProgress(newTime)
  }

  const handleVolumeChange = e => {
    const newVolume = parseFloat(e.target.value)
    audioRef.current.volume = newVolume
    setVolume(newVolume)
  }

  const formatTime = seconds => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercent = (progress / (duration || 1)) * 100
  const volumePercent = volume * 100

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

            {/* Current Song Display */}
            {currentSong && (
              <div className="flex items-end gap-6 mb-12 pb-6 border-b border-neutral-700 animate-in fade-in duration-500">
                <div className="flex-shrink-0 relative group">
                  <img
                    src={`${API_URL}${currentSong.cover_url}`}
                    alt={currentSong.titulo}
                    className="w-56 h-56 rounded-lg object-cover shadow-2xl transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg"
                    >
                      {isPlaying ? (
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
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
            )}

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

                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative">
                      <img
                        src={`${API_URL}${song.cover_url}`}
                        alt={song.titulo}
                        className="w-12 h-12 rounded object-cover flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                      />
                      {currentSong?.id === song.id && isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded">
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

                  <span className="text-neutral-400 text-base truncate text-center">
                    {song.artista}
                  </span>
                  <span className="text-neutral-400 text-base text-center">
                    {songDurations[song.id]
                      ? formatTime(songDurations[song.id])
                      : '--:--'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Player Controls */}
      <footer className="bg-neutral-900 rounded-lg px-6 py-4 flex-shrink-0 backdrop-blur-lg">
        <audio
          ref={audioRef}
          src={currentSong ? `${API_URL}${currentSong.stream_url}` : ''}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        <div className="flex items-center justify-between gap-8">
          {/* Player Left - Song Info */}
          <div className="flex items-center gap-4 w-80 min-w-0">
            {currentSong && (
              <>
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
              </>
            )}
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
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                  style={{ left: `calc(${progressPercent}% - 6px)` }}
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
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            </button>
            <div className="relative w-28 h-1 bg-neutral-700 rounded-full group cursor-pointer">
              <div
                className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-100"
                style={{ width: `${volumePercent}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                style={{ left: `calc(${volumePercent}% - 6px)` }}
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
    </div>
  )
}

export default App
