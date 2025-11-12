import { useChat } from './hooks/useChat'
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'

export default function App() {
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

  if (!connected) {
    return <LoginPage onLogin={connect} />
  }

  return (
    <ChatPage
      username={username}
      rooms={rooms}
      currentRoom={currentRoom}
      messages={messages}
      users={users}
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      onLeaveRoom={leaveRoom}
      onSendMessage={sendMessage}
      onSendPrivate={sendPrivate}
      onSendSticker={sendSticker}
      onSendAudio={sendAudio}
    />
  )
}
