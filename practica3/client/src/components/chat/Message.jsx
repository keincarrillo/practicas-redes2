import { useRef, useState } from 'react'
import Badge from '../ui/Badge'

export default function Message({ message, currentUser }) {
  const isOwn = message.from === currentUser
  const isSystem = message.type === 'system'
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-[fadeIn_0.3s_ease-in]">
        <Badge variant="info" className="backdrop-blur-sm">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {message.content}
        </Badge>
      </div>
    )
  }

  const isPrivate = message.type === 'private_message'
  const isSticker = message.type === 'sticker'
  const isAudio = message.type === 'audio'

  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        setIsPlaying(false)
      } else {
        audioRef.current.play().catch(error => {
          console.error('Error al reproducir audio:', error)
          alert('No se pudo reproducir el audio')
          setIsPlaying(false)
        })
        setIsPlaying(true)
      }
    }
  }

  return (
    <div
      className={`
        flex gap-3 mb-4 animate-[slideIn_0.3s_ease-out]
        ${isOwn ? 'flex-row-reverse' : 'flex-row'}
      `}
    >
      <div
        className={`
        flex-shrink-0 w-10 h-10 rounded-full
        flex items-center justify-center text-sm font-bold
        ${
          isOwn
            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white'
            : 'bg-gradient-to-br from-slate-600 to-slate-700 text-slate-300'
        }
        shadow-lg
      `}
      >
        {message.from[0].toUpperCase()}
      </div>

      {/* Message content */}
      <div
        className={`flex flex-col max-w-[70%] ${
          isOwn ? 'items-end' : 'items-start'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-semibold ${
              isOwn ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {message.from}
          </span>
          {isPrivate && (
            <Badge variant="warning" className="text-[10px]">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              → {message.to}
            </Badge>
          )}
        </div>

        <div
          className={`
          rounded-2xl px-4 py-2.5
          ${
            isOwn
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-tr-md'
              : 'bg-slate-700/50 backdrop-blur-sm text-slate-100 rounded-tl-md'
          }
          shadow-lg
          ${isSticker ? 'text-4xl p-3 bg-transparent shadow-none' : ''}
        `}
        >
          {isSticker ? (
            <span className="animate-[bounce_0.5s_ease-in-out]">
              {message.content}
            </span>
          ) : isAudio ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayAudio}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    transition-all hover:scale-110
                    ${
                      isOwn
                        ? 'bg-white/20 hover:bg-white/30'
                        : 'bg-slate-600/50 hover:bg-slate-600'
                    }
                  `}
                >
                  {isPlaying ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 ml-0.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium truncate max-w-[200px]">
                    {message.audioName || 'Audio'}
                  </p>
                  <p className="text-xs opacity-70">
                    {message.audioType?.split('/')[1]?.toUpperCase() || 'AUDIO'}
                  </p>
                </div>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              {isAudio && message.audioData && (
                <audio
                  ref={audioRef}
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  className="hidden"
                >
                  <source
                    src={`data:${message.audioType};base64,${message.audioData}`}
                    type={message.audioType}
                  />
                </audio>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed break-words">
              {message.content}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
