// Envía un objeto JSON al servidor TCP y obtiene UNA línea como respuesta.
// Abre socket, envía JSON+"\n", lee hasta '\n', cierra y devuelve JSON parseado.
import net from 'net'

export const tcpRequest = (
  obj,
  {
    host = process.env.HOST_PY || '127.0.0.1',
    port = parseInt(process.env.PORT_PY || '5000', 10),
    timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || '10000', 10)
  } = {}
) =>
  new Promise((resolve, reject) => {
    let buffer = ''
    let settled = false

    const socket = net.createConnection({ host, port }, () => {
      // Creamos el socket TCP
      socket.setEncoding('utf8') // Convierte los bytes en texto
      socket.setNoDelay(true) // Desactiva el buffer
      socket.setKeepAlive(true) // Mantiene la conexión abierta
      const line = JSON.stringify(obj) + '\n' // Convierte el objeto a JSON
      socket.write(line, 'utf8') // Envia el JSON
    })

    const cleanup = () => {
      // Se cierra el socket cada vez que se resuelve
      socket.removeAllListeners()
      try {
        socket.end()
      } catch {}
      try {
        socket.destroy()
      } catch {}
    }

    socket.on('data', chunk => {
      if (settled) return
      buffer += chunk // Se acumula el buffer
      const idx = buffer.indexOf('\n') // Busca el \n
      if (idx >= 0) {
        const line = buffer.slice(0, idx) // Extrae la linea
        settled = true
        cleanup()
        try {
          resolve(JSON.parse(line)) // Si es valido parsea a JSON
        } catch {
          resolve({ ok: false, error: 'Respuesta no JSON', raw: line }) // Si no es valido
        }
      }
    })

    socket.on('error', err => {
      // Si se genera un evento de error
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    })

    socket.setTimeout(timeoutMs, () => {
      // Si se pasa el timeout
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('TCP req timeout :(('))
    })
  })
