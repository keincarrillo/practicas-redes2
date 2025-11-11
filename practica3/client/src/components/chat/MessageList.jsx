import React, { useEffect, useRef } from 'react'
import Message from './Message'

export default function MessageList({ messages, currentUser, currentRoom }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 animate-[fadeIn_0.5s_ease-in]">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-800/50 rounded-full backdrop-blur-sm">
            <svg
              className="w-12 h-12 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              Selecciona una sala
            </h3>
            <p className="text-sm text-slate-500">
              Elige una sala existente o crea una nueva para comenzar a chatear
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 animate-[fadeIn_0.5s_ease-in]">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-500/10 rounded-full backdrop-blur-sm">
            <svg
              className="w-12 h-12 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              ¡Inicia la conversación!
            </h3>
            <p className="text-sm text-slate-500">
              Sé el primero en enviar un mensaje en esta sala
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
      {messages.map((msg, i) => (
        <Message key={i} message={msg} currentUser={currentUser} />
      ))}
      <div ref={endRef} />
    </div>
  )
}
