import React, { useState } from 'react'
import Sidebar from '../components/sidebar/Sidebar'
import ChatHeader from '../components/chat/ChatHeader'
import MessageList from '../components/chat/MessageList'
import ChatInput from '../components/chat/ChatInput'
import UserList from '../components/chat/UserList'

export default function ChatPage({
  username,
  rooms,
  currentRoom,
  messages,
  users,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onSendMessage,
  onSendPrivate,
  onSendSticker,
  onSendAudio,
}) {
  const [pmTarget, setPmTarget] = useState('')

  const currentMessages = currentRoom ? messages[currentRoom] || [] : []
  const currentUsers = currentRoom ? users[currentRoom] || [] : []

  const handleSend = text => {
    if (pmTarget) {
      onSendPrivate(pmTarget, text)
    } else {
      onSendMessage(text)
    }
  }

  const handleSelectUser = user => {
    setPmTarget(prev => (prev === user ? '' : user))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative flex w-full">
        {/* Sidebar */}
        <Sidebar
          username={username}
          rooms={rooms}
          currentRoom={currentRoom}
          onCreateRoom={onCreateRoom}
          onJoinRoom={onJoinRoom}
        />

        {/* Main chat area */}
        <main className="flex-1 flex flex-col">
          <ChatHeader
            currentRoom={currentRoom}
            userCount={currentUsers.length}
            onLeave={() => onLeaveRoom(currentRoom)}
          />

          <div className="flex-1 flex overflow-hidden">
            {/* Messages */}
            <MessageList
              messages={currentMessages}
              currentUser={username}
              currentRoom={currentRoom}
            />

            {/* User list */}
            {currentRoom && (
              <aside className="w-64 border-l border-slate-700/50 bg-slate-800/20 backdrop-blur-sm flex flex-col animate-[slideIn_0.3s_ease-out]">
                <div className="p-4 border-b border-slate-700/50">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
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
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    Usuarios en sala
                  </h3>
                  {pmTarget && (
                    <button
                      onClick={() => setPmTarget('')}
                      className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Cancelar mensajes privados
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  <UserList
                    users={currentUsers}
                    currentUser={username}
                    pmTarget={pmTarget}
                    onSelectUser={handleSelectUser}
                  />
                </div>
              </aside>
            )}
          </div>

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            onSticker={onSendSticker}
            onAudio={onSendAudio}
            disabled={!currentRoom}
            pmTarget={pmTarget}
            currentRoom={currentRoom}
          />
        </main>
      </div>
    </div>
  )
}
