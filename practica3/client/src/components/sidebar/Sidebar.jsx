import React from 'react'
import CreateRoomForm from './CreateRoomForm'
import RoomList from './RoomList'
import Badge from '../ui/Badge'

export default function Sidebar({
  username,
  rooms,
  currentRoom,
  onCreateRoom,
  onJoinRoom,
}) {
  return (
    <aside className="w-80 border-r border-slate-700/50 bg-slate-800/30 backdrop-blur-sm flex flex-col">
      {/* User info */}
      <div className="p-6 border-b border-slate-700/50 animate-[slideIn_0.3s_ease-out]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/30">
            {username[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-400">Conectado como</p>
            <p className="font-semibold text-slate-100 truncate">{username}</p>
          </div>
          <Badge variant="success" className="animate-pulse">
            <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block mr-1"></span>
            En línea
          </Badge>
        </div>
      </div>

      {/* Create room form */}
      <CreateRoomForm onCreateRoom={onCreateRoom} />

      {/* Rooms list */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-teal-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          Salas disponibles
          <Badge variant="info" className="ml-auto">
            {rooms.length}
          </Badge>
        </h3>

        <RoomList
          rooms={rooms}
          currentRoom={currentRoom}
          onJoinRoom={onJoinRoom}
        />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600">
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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          Práctica 3 - Aplicaciones para Sistemas en Red
        </div>
      </div>
    </aside>
  )
}
