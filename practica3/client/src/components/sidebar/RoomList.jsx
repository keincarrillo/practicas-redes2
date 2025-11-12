import RoomItem from './RoomItem'

export default function RoomList({ rooms, currentRoom, onJoinRoom }) {
  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 px-4 animate-[fadeIn_0.5s_ease-in]">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800/50 rounded-2xl mb-4 backdrop-blur-sm">
          <svg
            className="w-10 h-10 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>

        <h4 className="text-base font-semibold text-slate-300 mb-2">
          No hay salas disponibles
        </h4>

        <p className="text-sm text-slate-500 mb-4">
          Sé el primero en crear una sala
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
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
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span className="text-xs text-emerald-400">
            Usa el formulario de arriba
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 animate-[fadeIn_0.3s_ease-in]">
      {rooms.map((room, index) => (
        <div
          key={room}
          className="animate-[slideUp_0.3s_ease-out]"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <RoomItem
            room={room}
            isActive={room === currentRoom}
            onClick={() => onJoinRoom(room)}
          />
        </div>
      ))}
    </div>
  )
}
