import React from 'react'

export default function RoomItem({ room, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 rounded-xl
        transition-all duration-200
        flex items-center gap-3
        group relative
        overflow-hidden
        ${
          isActive
            ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
            : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-700/50 hover:border-slate-600 hover:shadow-lg'
        }
      `}
    >
      {/* Animated background effect */}
      <div
        className={`
        absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-teal-500/0
        transition-all duration-300
        ${
          !isActive &&
          'group-hover:from-emerald-500/5 group-hover:to-teal-500/5'
        }
      `}
      />

      {/* Room icon */}
      <div
        className={`
        relative z-10 w-10 h-10 rounded-lg flex items-center justify-center
        transition-all duration-200
        ${
          isActive
            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/50'
            : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600 group-hover:scale-110'
        }
      `}
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
            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
          />
        </svg>
      </div>

      {/* Room info */}
      <div className="relative z-10 flex-1 min-w-0">
        <p
          className={`
          font-semibold truncate transition-colors
          ${
            isActive
              ? 'text-emerald-400'
              : 'text-slate-300 group-hover:text-slate-100'
          }
        `}
        >
          {room}
        </p>
        <p
          className={`
          text-xs transition-colors
          ${
            isActive
              ? 'text-emerald-400/70'
              : 'text-slate-500 group-hover:text-slate-400'
          }
        `}
        >
          {isActive ? 'Sala actual' : 'Click para unirte'}
        </p>
      </div>

      {/* Active indicator / Arrow */}
      {isActive ? (
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <svg
            className="w-5 h-5 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      ) : (
        <svg
          className="relative z-10 w-5 h-5 text-slate-500 group-hover:text-slate-400 transition-all transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </button>
  )
}
