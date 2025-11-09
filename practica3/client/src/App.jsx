import React, { useState } from 'react'
import { useChat } from './hooks/useChat'

const stickers = ['👍', '😂', '🔥', '❤️']
const audios = ['aplauso', 'risa', 'boo']

export default function App() {
  const [nameInput, setNameInput] = useState('')
  const [roomInput, setRoomInput] = useState('')
  const [pmTarget, setPmTarget] = useState('')

  const {
    username,
    connected,
    rooms,
    currentRoom,
    messages,
    users,
    connect,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendPrivate,
    sendSticker,
    sendAudio,
  } = useChat()

  const currentMessages = currentRoom ? messages[currentRoom] || [] : []
  const currentUsers = currentRoom ? users[currentRoom] || [] : []

  const handleConnect = e => {
    e.preventDefault()
    const name = nameInput.trim()
    if (!name) return
    connect(name)
  }

  const handleCreateRoom = e => {
    e.preventDefault()
    const room = roomInput.trim()
    if (!room) return
    createRoom(room)
    setRoomInput('')
  }

  const handleSend = e => {
    e.preventDefault()
    if (!currentRoom) return
    const text = e.target.elements.msg.value.trim()
    if (!text) return
    if (pmTarget) {
      sendPrivate(pmTarget, text)
    } else {
      sendMessage(text)
    }
    e.target.reset()
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-50">
        <form
          onSubmit={handleConnect}
          className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md space-y-4"
        >
          <h1 className="text-2xl font-semibold text-center">
            Práctica 3 - Chat
          </h1>
          <p className="text-sm text-slate-400 text-center">
            Inicia sesión con un nombre para entrar al chat.
          </p>
          <input
            className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Tu nombre..."
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
          />
          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold"
          >
            Entrar
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex">
      {/* Sidebar salas */}
      <aside className="w-64 border-r border-slate-800 p-4 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold mb-1">Sesión</h2>
          <p className="text-sm text-slate-400">
            Conectado como{' '}
            <span className="text-emerald-400 font-semibold">{username}</span>
          </p>
        </div>

        <form onSubmit={handleCreateRoom} className="space-y-2">
          <h3 className="text-sm text-slate-400">Crear sala</h3>
          <input
            className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Nombre de sala"
            value={roomInput}
            onChange={e => setRoomInput(e.target.value)}
          />
          <button
            type="submit"
            className="w-full py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-slate-900"
          >
            Crear
          </button>
        </form>

        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm text-slate-400 mb-1">Salas</h3>
          <div className="space-y-1">
            {rooms.length === 0 && (
              <p className="text-xs text-slate-500">
                Aún no hay salas creadas.
              </p>
            )}
            {rooms.map(room => (
              <button
                key={room}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-sm ${
                  currentRoom === room
                    ? 'bg-emerald-500 text-slate-900 font-semibold'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
                onClick={() => joinRoom(room)}
              >
                #{room}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <header className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">
              {currentRoom
                ? `Sala #${currentRoom}`
                : 'Selecciona o crea una sala'}
            </h2>
            <p className="text-xs text-slate-500">
              Mensajes públicos, privados, stickers y audios (simulados).
            </p>
          </div>
          {currentRoom && (
            <button
              onClick={() => leaveRoom(currentRoom)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500 hover:text-white text-xs"
            >
              Salir
            </button>
          )}
        </header>

        <section className="flex-1 flex overflow-hidden">
          {/* Mensajes */}
          <div className="flex-1 flex flex-col p-4 space-y-2 overflow-y-auto">
            {currentMessages.length === 0 ? (
              <p className="text-sm text-slate-500">
                {currentRoom
                  ? 'No hay mensajes todavía. Escribe algo abajo 👇'
                  : 'Elige una sala para empezar.'}
              </p>
            ) : (
              currentMessages.map((m, i) => (
                <div key={i} className="text-sm">
                  {m.type === 'system' ? (
                    <span className="text-slate-500 italic">
                      [{m.room || currentRoom}] {m.content}
                    </span>
                  ) : (
                    <span>
                      <span className="font-semibold text-emerald-400">
                        {m.from}
                        {m.type === 'private_message' && ` → ${m.to} (privado)`}
                      </span>
                      <span className="text-slate-400">: </span>
                      {m.type === 'sticker' ? (
                        <span className="text-xl">{m.content}</span>
                      ) : m.type === 'audio' ? (
                        <span className="italic text-sky-400">
                          [audio: {m.content}]
                        </span>
                      ) : (
                        <span>{m.content}</span>
                      )}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Usuarios */}
          <aside className="w-56 border-l border-slate-800 p-3 flex flex-col">
            <h3 className="text-sm text-slate-400 mb-1">Usuarios en sala</h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {currentRoom && currentUsers.length === 0 && (
                <p className="text-xs text-slate-500">Solo tú en esta sala.</p>
              )}
              {currentUsers.map(u => (
                <button
                  key={u}
                  className={`w-full text-left px-2 py-1 rounded-lg text-xs ${
                    pmTarget === u
                      ? 'bg-emerald-500 text-slate-900 font-semibold'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                  onClick={() => setPmTarget(prev => (prev === u ? '' : u))}
                >
                  {u === username ? `${u} (tú)` : u}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Click en un usuario para mandar privado.
            </p>
          </aside>
        </section>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="px-4 py-3 border-t border-slate-800 flex items-center gap-2"
        >
          <div className="flex gap-1">
            {stickers.map(s => (
              <button
                key={s}
                type="button"
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-lg"
                onClick={() => sendSticker(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {audios.map(a => (
              <button
                key={a}
                type="button"
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px]"
                onClick={() => sendAudio(a)}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            name="msg"
            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder={
              !currentRoom
                ? 'Primero selecciona una sala.'
                : pmTarget
                ? `Privado para ${pmTarget}...`
                : 'Escribe un mensaje...'
            }
            disabled={!currentRoom}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!currentRoom}
            className="px-4 py-2 rounded-xl bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-semibold text-sm"
          >
            Enviar
          </button>
        </form>
      </main>
    </div>
  )
}
