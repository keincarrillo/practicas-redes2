import { useRef, useState } from 'react'
import { WS_URL } from '../utils/constants'

export function useChat() {
  const [username, setUsername] = useState('')
  const [connected, setConnected] = useState(false)
  const [rooms, setRooms] = useState([])
  const [currentRoom, setCurrentRoom] = useState(null)
  const [messages, setMessages] = useState({})
  const [users, setUsers] = useState({})
  const socketRef = useRef(null)

  // Estado para transferencias de audio activas
  const audioTransfersRef = useRef({})

  const reset = () => {
    setConnected(false)
    setRooms([])
    setCurrentRoom(null)
    setMessages({})
    setUsers({})
    setUsername('')
    socketRef.current = null
    audioTransfersRef.current = {}
  }

  const connect = name => {
    if (socketRef.current) return

    const ws = new WebSocket(WS_URL)
    socketRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Conectado al servidor')
      setConnected(true)
      setUsername(name)
      send({ type: 'login', username: name })
    }

    ws.onmessage = event => {
      const msg = JSON.parse(event.data)
      handleServerMessage(msg)
    }

    ws.onclose = () => {
      console.log('[WS] Desconectado del servidor')
      reset()
    }

    ws.onerror = error => {
      console.error('[WS] Error de conexión:', error)
    }
  }

  const send = payload => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] No se puede enviar, conexión no abierta')
      return
    }
    ws.send(JSON.stringify(payload))
  }

  const handleServerMessage = msg => {
    console.log('[WS] Mensaje recibido:', msg.type)

    switch (msg.type) {
      case 'login_ok':
        console.log('[WS] Login exitoso:', msg.username)
        break
      case 'system':
      case 'message':
      case 'private_message':
      case 'sticker':
        appendMessage(msg.room || 'global', msg)
        break
      case 'audio_start':
        handleAudioStart(msg)
        break
      case 'audio_chunk':
        handleAudioChunk(msg)
        break
      case 'audio_complete':
        handleAudioComplete(msg)
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
        console.error('[WS] Error del servidor:', msg.content)
        appendMessage(currentRoom || 'global', {
          type: 'system',
          room: currentRoom || 'global',
          content: `❌ Error: ${msg.content}`,
        })
        break
      default:
        console.warn('[WS] Tipo de mensaje desconocido:', msg.type)
    }
  }

  const handleAudioStart = msg => {
    const { transferId, room, from, audioName, audioType, totalChunks } = msg

    // Si el audio lo mandé yo, no preparo transferencia (uso mi copia local)
    if (from === username) {
      return
    }

    console.log(`[AUDIO] 📥 Iniciando recepción de "${audioName}"`)
    console.log(`[AUDIO] Total de chunks: ${totalChunks}`)

    audioTransfersRef.current[transferId] = {
      room,
      from,
      audioName,
      audioType,
      totalChunks,
      chunks: new Array(totalChunks),
      receivedChunks: 0,
      startTime: Date.now(),
    }

    appendMessage(room, {
      type: 'system',
      room,
      content: `📥 ${from} está enviando "${audioName}" (${totalChunks} paquetes)...`,
      transferId,
    })
  }

  const handleAudioChunk = msg => {
    const { transferId, seq, data, total, isLast } = msg
    const transfer = audioTransfersRef.current[transferId]

    if (!transfer) {
      console.warn('[AUDIO] ⚠️ Transfer no encontrado:', transferId)
      return
    }

    // Guardar chunk si no lo teníamos
    if (!transfer.chunks[seq]) {
      transfer.chunks[seq] = data
      transfer.receivedChunks++

      // Log de progreso
      const progress = (
        (transfer.receivedChunks / transfer.totalChunks) *
        100
      ).toFixed(1)
      console.log(
        `[AUDIO] 📦 Chunk ${seq + 1}/${total} recibido (${progress}%)`
      )
    }

    // Enviar ACK
    send({
      type: 'audio_ack',
      transferId,
      seq,
    })

    // Si tenemos todos los chunks, reconstruir
    if (transfer.receivedChunks === transfer.totalChunks) {
      console.log('[AUDIO] ✅ Todos los chunks recibidos, reconstruyendo...')
      reconstructAudio(transferId, transfer)
    }
  }

  const handleAudioComplete = msg => {
    const { transferId } = msg
    const transfer = audioTransfersRef.current[transferId]

    if (transfer) {
      console.log('[AUDIO] 🏁 Servidor notificó transferencia completa')
      if (transfer.receivedChunks === transfer.totalChunks) {
        reconstructAudio(transferId, transfer)
      } else {
        console.warn(
          '[AUDIO] Faltan chunks:',
          transfer.totalChunks - transfer.receivedChunks
        )
      }
    }
  }

  const reconstructAudio = (transferId, transfer) => {
    try {
      // Verificar que tengamos todos los chunks
      const missingChunks = []
      transfer.chunks.forEach((chunk, i) => {
        if (!chunk) missingChunks.push(i)
      })

      if (missingChunks.length > 0) {
        console.error('[AUDIO] Faltan chunks:', missingChunks)
        appendMessage(transfer.room, {
          type: 'system',
          room: transfer.room,
          content: `Error: faltan ${missingChunks.length} paquetes del audio "${transfer.audioName}"`,
        })
        delete audioTransfersRef.current[transferId]
        return
      }

      let binaryString = ''
      for (const chunkBase64 of transfer.chunks) {
        binaryString += atob(chunkBase64)
      }

      const base64Complete = btoa(binaryString)

      const elapsed = Date.now() - transfer.startTime
      const sizeKB = ((base64Complete.length * 0.75) / 1024).toFixed(2)

      console.log('[AUDIO] Audio reconstruido exitosamente:')
      console.log('  - Nombre:', transfer.audioName)
      console.log('  - Tamaño:', sizeKB, 'KB')
      console.log('  - Tiempo:', `${elapsed}ms`)
      console.log('  - Chunks:', transfer.totalChunks)

      appendMessage(transfer.room, {
        type: 'audio',
        room: transfer.room,
        from: transfer.from,
        audioName: transfer.audioName,
        audioType: transfer.audioType,
        audioData: base64Complete,
        content: transfer.audioName,
      })

      appendMessage(transfer.room, {
        type: 'system',
        room: transfer.room,
        content: `Audio "${transfer.audioName}" recibido correctamente (${sizeKB} KB en ${elapsed}ms)`,
      })

      delete audioTransfersRef.current[transferId]
    } catch (error) {
      console.error('[AUDIO] Error al reconstruir:', error)
      appendMessage(transfer.room, {
        type: 'system',
        room: transfer.room,
        content: `Error al procesar audio de ${transfer.from}: ${error.message}`,
      })
      delete audioTransfersRef.current[transferId]
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
    console.log('[WS] Creando sala:', room)
    send({ type: 'create_room', room })
  }

  const joinRoom = room => {
    if (!room) return
    console.log('[WS] Uniéndose a sala:', room)
    setCurrentRoom(room)
    send({ type: 'join_room', room })
  }

  const leaveRoom = room => {
    if (!room) return
    console.log('[WS] Saliendo de sala:', room)
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

  const sendAudio = audioData => {
    if (!currentRoom) return

    const sizeKB = ((audioData.data.length * 0.75) / 1024).toFixed(2)
    console.log('[AUDIO] 📤 Enviando archivo:', audioData.name)
    console.log('[AUDIO] Tamaño:', sizeKB, 'KB')
    console.log('[AUDIO] Tipo:', audioData.type)

    send({
      type: 'audio',
      room: currentRoom,
      audioName: audioData.name,
      audioType: audioData.type,
      audioData: audioData.data,
    })

    appendMessage(currentRoom, {
      type: 'audio',
      room: currentRoom,
      from: username,
      audioName: audioData.name,
      audioType: audioData.type,
      audioData: audioData.data,
      content: audioData.name,
    })

    appendMessage(currentRoom, {
      type: 'system',
      room: currentRoom,
      content: `📤 Enviando "${audioData.name}" (${sizeKB} KB)...`,
    })
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
