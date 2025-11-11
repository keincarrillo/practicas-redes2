// Constantes de la aplicación

export const STICKERS = ['👍', '😂', '🔥', '❤️', '🎉', '✨', '👏', '💯']

export const AUDIOS = [
  { id: 'aplauso', label: 'Aplauso', emoji: '👏' },
  { id: 'risa', label: 'Risa', emoji: '😂' },
  { id: 'boo', label: 'Boo', emoji: '👎' },
  { id: 'wow', label: 'Wow', emoji: '😮' },
]

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
