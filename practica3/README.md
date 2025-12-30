# Práctica 3 - Chat multiusuario (WebSocket) + Chat UDP + Transferencia de audio (Go-Back-N)

Proyecto de **Redes 2** que implementa un **chat por salas** con:

- **WebSocket (Spring Boot)** para mensajería en tiempo real desde un **cliente web (React + Vite)**.
- **UDP** para un chat por comandos (texto plano).
- **Envío de audios** por sala usando **fragmentación en paquetes** y un esquema tipo **Go-Back-N** con **ACKs**.

---

## Estructura del proyecto

```text
practica3/
├─ client/         # React + Vite + Tailwind (interfaz del chat)
├─ server/         # Spring Boot (WebSocket + UDP + lógica de salas)
└─ audios/         # Audios de prueba (.mp3)
```

---

## Requisitos

### Server (Java)

- **Java 17**
- **Maven**

### Client (Web)

- **Node.js 18+** (recomendado **20 LTS**)
- npm

---

## Ejecución

### 1) Levantar el servidor (WebSocket + UDP)

Desde `practica3/server`:

```bash
mvn spring-boot:run
```

Esto levanta:

- **WebSocket:** `ws://localhost:8080/ws/chat`
- **UDP:** `localhost:5000`

> Si cambias host/puerto del server, ajusta el cliente en:  
> `client/src/utils/constants.js` (const `WS_URL`).

---

### 2) Levantar el cliente web

Desde `practica3/client`:

```bash
npm install
npm run dev
```

Abre la app en el navegador (Vite normalmente usa):

- `http://localhost:5173`

---

## Funcionalidades (Cliente Web)

- Login por nombre de usuario
- Crear salas / ver salas
- Unirse / salir de una sala
- Mensajes a sala
- Mensajes privados (entre usuarios conectados)
- Stickers (emoji)
- Envío y recepción de audio con reproducción en la interfaz

---

## Protocolo WebSocket (JSON)

**Endpoint:** `ws://localhost:8080/ws/chat`

### Tipos principales que envía el cliente

#### Login

```json
{ "type": "login", "username": "user" }
```

#### Crear sala

```json
{ "type": "create_room", "room": "general" }
```

#### Unirse a sala

```json
{ "type": "join_room", "room": "general" }
```

#### Salir de sala

```json
{ "type": "leave_room", "room": "general" }
```

#### Mensaje a sala

```json
{ "type": "message", "room": "general", "content": "hola :)" }
```

#### Sticker (se envía como mensaje tipo `sticker`)

```json
{ "type": "sticker", "room": "general", "content": "🔥" }
```

#### Mensaje privado

```json
{
  "type": "private_message",
  "room": "general",
  "to": "OtroUser",
  "content": "qué onda"
}
```

#### Enviar audio

El cliente manda el **audio completo en Base64** y el servidor se encarga de fragmentarlo para distribuirlo.

```json
{
  "type": "audio",
  "room": "general",
  "audioName": "mi_audio.mp3",
  "audioType": "audio/mpeg",
  "audioData": "<BASE64_SIN_PREFIJO_DATA_URL>"
}
```

### Mensajes que emite el servidor (lo más importante)

- `login_ok`
- `rooms` (lista de salas)
- `users` (usuarios por sala)
- `system` (mensajes del sistema: join/leave, etc.)
- `error`
- **audio_start** / **audio_chunk** / **audio_complete**
- **audio_ack** (lo envía el cliente como confirmación)

---

## Transferencia de audio (Go-Back-N + ACK)

Al recibir un `audio`:

1. El servidor valida tamaño (máx aprox. **30MB**).
2. Divide el archivo en chunks de **32KB**.
3. Transmite por sala con una ventana tipo **Go-Back-N**:
   - **WINDOW_SIZE = 10**
   - **TIMEOUT = 2000ms**
4. El cliente responde ACK por chunk:

```json
{ "type": "audio_ack", "transferId": "<id>", "seq": 7 }
```

Eventos del lado receptor:

- `audio_start`: metadata (nombre, tipo, total de chunks)
- `audio_chunk`: paquete con `seq` y `data`
- `audio_complete`: notifica fin

El cliente reconstruye el audio concatenando los chunks y lo muestra como mensaje tipo `audio` (con botón de reproducción).

---

## Chat UDP (texto plano)

**Servidor UDP:** `localhost:5000`

Formato general: el primer token es el comando.

Comandos soportados (según el servidor):

- `LOGIN <usuario>`
- `CREATE <sala>`
- `JOIN <sala> <usuario>`
- `LEAVE <sala> <usuario>`
- `LIST`
- `USERS <sala>`
- `MSG <sala> <usuario> <mensaje...>`
- `PRIV <sala> <from> <to> <mensaje...>`
- `STK <sala> <usuario> <emoji>`
- `AUD <sala> <usuario> <nombre>|<tipo>|<base64>`

Ejemplo rápido con `nc` (netcat) (en otra terminal):

```bash
# Enviar comandos UDP al servidor:
echo "LOGIN user" | nc -u -w1 localhost 5000
echo "CREATE general" | nc -u -w1 localhost 5000
echo "JOIN general user" | nc -u -w1 localhost 5000
echo "MSG general user hola_desde_udp" | nc -u -w1 localhost 5000
```

> Nota: UDP depende del socket/puerto origen para que el servidor "sepa" a dónde responder (por eso a veces conviene usar una herramienta o script que mantenga el socket).

---

## Audios de prueba

Puedes usar los archivos en:

- `practica3/audios/`

Desde la UI, selecciona un archivo de audio y envíalo a una sala.

---

## Notas importantes

- **WS URL** del cliente está en: `client/src/utils/constants.js`
- El servidor permite mensajes grandes (buffers WS hasta ~50MB), pero el audio se limita a ~30MB para evitar saturación.
- Para pruebas en red (no localhost), cambia `WS_URL` y asegúrate de abrir puertos (8080 y 5000/udp).
