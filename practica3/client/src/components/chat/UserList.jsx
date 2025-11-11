import React from 'react'
import Badge from '../ui/Badge'

export default function UserList({
  users,
  currentUser,
  pmTarget,
  onSelectUser,
}) {
  if (users.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800/50 rounded-full mb-3">
          <svg
            className="w-8 h-8 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <p className="text-xs text-slate-500">Solo tú en esta sala</p>
      </div>
    )
  }

  return (
    <div className="space-y-1 p-2">
      {users.map(user => {
        const isCurrentUser = user === currentUser
        const isSelected = user === pmTarget

        return (
          <button
            key={user}
            onClick={() => !isCurrentUser && onSelectUser(user)}
            disabled={isCurrentUser}
            className={`
              w-full text-left px-3 py-2.5 rounded-xl
              transition-all duration-200
              flex items-center gap-3
              ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/50'
                  : isCurrentUser
                  ? 'bg-slate-800/30 border border-slate-700/50 cursor-default'
                  : 'bg-slate-800/50 border border-transparent hover:bg-slate-700/50 hover:border-slate-600 cursor-pointer'
              }
              group
            `}
          >
            {/* Avatar */}
            <div
              className={`
              flex-shrink-0 w-8 h-8 rounded-full
              flex items-center justify-center text-xs font-bold
              transition-all duration-200
              ${
                isSelected
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white ring-2 ring-emerald-500/50'
                  : isCurrentUser
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 text-slate-300'
                  : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'
              }
            `}
            >
              {user[0].toUpperCase()}
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`
                  text-sm font-medium truncate
                  ${isSelected ? 'text-emerald-400' : 'text-slate-300'}
                `}
                >
                  {user}
                </span>
                {isCurrentUser && (
                  <Badge variant="success" className="text-[10px]">
                    Tú
                  </Badge>
                )}
              </div>
              {isSelected && (
                <p className="text-[10px] text-emerald-400/70 flex items-center gap-1">
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
                  Mensajes privados
                </p>
              )}
            </div>

            {/* Online indicator */}
            <div
              className={`
              w-2 h-2 rounded-full
              ${isCurrentUser ? 'bg-emerald-500' : 'bg-slate-600'}
              ${!isCurrentUser && 'group-hover:bg-emerald-500'}
              transition-colors duration-200
            `}
            />
          </button>
        )
      })}
    </div>
  )
}
