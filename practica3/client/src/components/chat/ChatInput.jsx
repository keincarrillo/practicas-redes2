import { useState, useRef } from 'react'
import Button from '../ui/Button'
import { STICKERS, MAX_AUDIO_SIZE } from '../../utils/constants'

export default function ChatInput({
  onSend,
  onSticker,
  onAudio,
  disabled,
  pmTarget,
  currentRoom,
}) {
  const [message, setMessage] = useState('')
  const [showStickers, setShowStickers] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const audioInputRef = useRef(null)

  const handleSubmit = e => {
    e.preventDefault()
    const text = message.trim()
    if (text) {
      onSend(text)
      setMessage('')
    }
  }

  const handleSticker = sticker => {
    onSticker(sticker)
    setShowStickers(false)
  }

  const formatFileSize = bytes => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const handleAudioSelect = async e => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      alert('Por favor selecciona un archivo de audio válido')
      return
    }

    if (file.size > MAX_AUDIO_SIZE) {
      const maxSizeMB = (MAX_AUDIO_SIZE / (1024 * 1024)).toFixed(0)
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      alert(
        `El archivo es demasiado grande (${fileSizeMB} MB).\n` +
          `Tamaño maximo: ${maxSizeMB} MB`
      )
      return
    }

    setIsProcessing(true)

    try {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        const sizeKB = ((base64.length * 0.75) / 1024).toFixed(2)

        console.log('[ChatInput] Audio cargado:')
        console.log('  - Nombre:', file.name)
        console.log('  - Tipo:', file.type)
        console.log('  - Tamaño original:', formatFileSize(file.size))
        console.log('  - Tamaño base64:', sizeKB, 'KB')

        onAudio({
          name: file.name,
          type: file.type,
          data: base64,
        })

        setIsProcessing(false)
      }
      reader.onerror = () => {
        console.error('[ChatInput] Error al leer el archivo')
        alert('Error al leer el archivo de audio')
        setIsProcessing(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('[ChatInput] Error al procesar el audio:', error)
      alert('Error al cargar el archivo de audio')
      setIsProcessing(false)
    }

    e.target.value = ''
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm"
    >
      <div className="flex items-end gap-3">
        {/* Stickers */}
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="relative"
            onClick={() => {
              setShowStickers(!showStickers)
            }}
            disabled={disabled || isProcessing}
          >
            <span className="text-xl">😊</span>
          </Button>

          {showStickers && (
            <div className="absolute bottom-full left-0 mb-2 p-4 bg-slate-800/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700 animate-[slideUp_0.2s_ease-out] z-50 w-96">
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-400">Stickers</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {STICKERS.map(s => (
                  <button
                    key={s}
                    type="button"
                    className="text-4xl p-2 hover:bg-slate-700/50 rounded-xl transition-all hover:scale-110 active:scale-100 flex items-center justify-center"
                    onClick={() => handleSticker(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioSelect}
            className="hidden"
            disabled={disabled || isProcessing}
          />
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => audioInputRef.current?.click()}
            disabled={disabled || isProcessing}
            title="Enviar archivo de audio (hasta 30MB)"
          >
            {isProcessing ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
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
            )}
          </Button>
        </div>

        {/* Message input */}
        <div className="flex-1 relative">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={
              !currentRoom
                ? 'Selecciona una sala primero...'
                : isProcessing
                ? 'Procesando audio...'
                : pmTarget
                ? `Mensaje privado para ${pmTarget}...`
                : 'Escribe un mensaje...'
            }
            disabled={disabled || isProcessing}
            className="w-full px-4 py-3 rounded-xl bg-slate-700/50 backdrop-blur-sm border-2 border-slate-600/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
            autoComplete="off"
          />
          {pmTarget && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/50 flex items-center gap-1">
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
                Privado
              </span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={disabled || !message.trim() || isProcessing}
          size="md"
          className="px-6"
        >
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </Button>
      </div>

      {!disabled && !isProcessing && (
        <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
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
        </div>
      )}
    </form>
  )
}
