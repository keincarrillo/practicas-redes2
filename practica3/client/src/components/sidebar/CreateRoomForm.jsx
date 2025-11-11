import React, { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function CreateRoomForm({ onCreateRoom }) {
  const [roomName, setRoomName] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = e => {
    e.preventDefault()
    const name = roomName.trim()
    if (name) {
      onCreateRoom(name)
      setRoomName('')
    }
  }

  return (
    <div
      className={`
      p-4 border-b border-slate-700/50
      transition-all duration-300
      ${isFocused ? 'bg-slate-800/20' : ''}
    `}
    >
      <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
        Crear sala nueva
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="Ej: General, Memes, Trabajo..."
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          icon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
              />
            </svg>
          }
        />

        <Button
          type="submit"
          size="sm"
          className="w-full group"
          disabled={!roomName.trim()}
        >
          <span className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4 transition-transform group-hover:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Crear sala
          </span>
        </Button>
      </form>

      {roomName.trim() && (
        <div className="mt-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg animate-[slideUp_0.2s_ease-out]">
          <p className="text-xs text-emerald-400 flex items-center gap-1">
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
            La sala "{roomName}" será visible para todos
          </p>
        </div>
      )}
    </div>
  )
}
