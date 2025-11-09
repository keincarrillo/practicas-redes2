import { useRef, useState } from 'react'

export function useChat() {
  const [username, setUsername] = useState('')
  const [connected, setConnected] = useState(false)
  const [rooms, setRooms] = useState([])
  const [currentRoom, setCurrentRoom] = useState(null)
  const [messages, setMessages] = useState({})
  const [users, setUsers] = useState({})
  const socketRef = useRef(null)

  const reset = () => {
    setConnected(false)
    setRooms([])
    setCurrentRoom(null)
    setMessages({})
    setUsers({})
    setUsername('')
    socketRef.current = null
  }

  const connect = name => {
    if (socketRef.current) return

    const ws = new WebSocket('ws://localhost:8080/ws/chat')
    socketRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setUsername(name)
      send({ type: 'login', username: name })
    }

    ws.onmessage = event => {
      const msg = JSON.parse(event.data)
      handleServerMessage(msg)
    }

    ws.onclose = () => {
      reset()
    }

    ws.onerror = () => {
      console.error('WebSocket error')
    }
  }

  const send = payload => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(payload))
  }

  const handleServerMessage = msg => {
    switch (msg.type) {
      case 'login_ok':
        break
      case 'system':
      case 'message':
      case 'private_message':
      case 'sticker':
      case 'audio':
        appendMessage(msg.room || 'global', msg)
        break
      case 'rooms':
        setRooms(msg.rooms || [])
        break
      case 'users':
        setUsers(prev => ({
          ...prev,
          [msg.room]: msg.users || [],
        }))
        break
      case 'error':
        appendMessage(currentRoom || 'global', {
          type: 'system',
          room: currentRoom || 'global',
          content: `Error: ${msg.content}`,
        })
        break
      default:
        console.log('Mensaje desconocido', msg)
    }
  }

  const appendMessage = (room, msg) => {
    setMessages(prev => {
      const list = prev[room] || []
      return { ...prev, [room]: [...list, msg] }
    })
  }

  const createRoom = room => {
    if (!room) return
    send({ type: 'create_room', room })
  }

  const joinRoom = room => {
    if (!room) return
    setCurrentRoom(room)
    send({ type: 'join_room', room })
  }

  const leaveRoom = room => {
    if (!room) return
    send({ type: 'leave_room', room })
    if (currentRoom === room) setCurrentRoom(null)
  }

  const sendMessage = content => {
    if (!currentRoom || !content) return
    send({ type: 'message', room: currentRoom, content })
  }

  const sendPrivate = (to, content) => {
    if (!currentRoom || !to || !content) return
    send({ type: 'private_message', room: currentRoom, to, content })
  }

  const sendSticker = sticker => {
    if (!currentRoom) return
    send({ type: 'sticker', room: currentRoom, content: sticker })
  }

  const sendAudio = label => {
    if (!currentRoom) return
    send({ type: 'audio', room: currentRoom, content: label })
  }

  return {
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
  }
}
