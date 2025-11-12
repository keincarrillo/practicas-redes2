// Constantes de la aplicación

export const STICKERS = ['👍', '😂', '🔥', '❤️', '🎉', '✨', '👏', '💯']

export const WS_URL = 'ws://localhost:8080/ws/chat'

export const MESSAGE_TYPES = {
  SYSTEM: 'system',
  MESSAGE: 'message',
  PRIVATE: 'private_message',
  STICKER: 'sticker',
  AUDIO: 'audio',
}

export const ANIMATIONS = {
  fadeIn: 'animate-[fadeIn_0.3s_ease-in]',
  slideUp: 'animate-[slideUp_0.3s_ease-out]',
  slideIn: 'animate-[slideIn_0.3s_ease-out]',
  bounce: 'animate-[bounce_0.5s_ease-in-out]',
  pulse: 'animate-[pulse_1s_ease-in-out_infinite]',
}

// Formatos de audio soportados
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/flac',
  'audio/m4a',
]

// Tamaño máximo de archivo de audio (5MB)
export const MAX_AUDIO_SIZE = 5 * 1024 * 1024
