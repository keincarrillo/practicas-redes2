# Práctica 2 - Música por UDP (Go-Back-N) + API REST + Reproductor Web

Esta práctica implementa un sistema tipo "Mini-Spotify" con 3 capas:

1. Transmisión confiable por UDP (Go-Back-N + ventana deslizante) para enviar archivos mp3
2. API REST (Express/Bun) que lee el `catalog.json` y expone endpoints para listar canciones
3. Cliente Web (React + Vite + Tailwind) que consume la API y reproduce la música en el navegador

---

## Arquitectura

```
(UDP + Go-Back-N)

[musicSender/.mp3] → sender.py ⇒ receiver.py → [musicReceiver/.mp3]
       |
       v
catalog.json (actualizado)
       |
       v
[API Express/Bun]
/api/songs /stream /cover
       |
       v
[React Player (Vite)]
```

---

## Estructura

```
practica2/
├── client/                          # React + Vite + Tailwind (reproductor)
├── server/
│   ├── API/                         # API REST (Express + Bun)
│   ├── UDP/                         # Sender/Receiver UDP (Go-Back-N)
│   │   ├── sender.py
│   │   ├── receiver.py
│   │   └── sync_all.py
│   ├── catalog.json
│   ├── covers/                      # portadas .jpg
│   ├── musicSender/                 # mp3 ORIGEN (sender)
│   └── musicReceiver/               # mp3 DESTINO (receiver)
└── README.md
```

---

## Requisitos

### UDP (Python)

- Python 3.10+

### API

- Bun (recomendado) o Node.js 18+

### Cliente

- Bun (recomendado) o Node.js 18+

---

## Instalación y Ejecución

### 1. Sincronizar canciones por UDP (Go-Back-N)

Esto envía las canciones listadas en `server/UDP/catalog.json` desde `musicSender/` hacia `musicReceiver/` usando el protocolo UDP confiable.

**Entra a la carpeta del servidor:**

```bash
cd practica2/server/UDP
```

**Ejecuta:**

```bash
python sync_all.py
```

Al terminar deberías ver que existen mp3 en:

```
practica2/server/UDP/musicReceiver/<archivo>
```

---

### 2. Levantar API (Express + Bun)

La API corre en http://localhost:8000 y expone rutas bajo `/api`.

**Entra a la carpeta del API:**

```bash
cd practica2/server/API
bun install
bun run dev
```

**Prueba rápida:**

```bash
curl http://localhost:8000/api/songs
```

---

### 3. Levantar Cliente (React + Vite)

**Entra a la carpeta del cliente:**

```bash
cd practica2/client
bun install
bun run dev
```

**Abre en tu navegador:**

http://localhost:5173

El cliente ya está configurado para usar: `http://localhost:8000/api`

---

## Endpoints de la API

**Base:** `http://localhost:8000/api`

| Método | Endpoint            | Descripción                                               |
| ------ | ------------------- | --------------------------------------------------------- |
| `GET`  | `/songs`            | Lista catálogo completo (desde `server/UDP/catalog.json`) |
| `GET`  | `/songs/:id/stream` | Stream del mp3 (`Content-Type: audio/mpeg`)               |
| `GET`  | `/songs/:id/cover`  | Portada jpg (`Content-Type: image/jpeg`)                  |

La API toma los archivos desde:

- MP3: `server/UDP/musicReceiver/<archivo>`
- Cover: `server/UDP/covers/<cover>`

---

## Protocolo UDP (Go-Back-N)

### Handshake

- El sender hace `bind(host, port)` y se queda esperando.
- El receiver envía `READY` a `(sender-ip, sender-port)` para iniciar la transmisión.

### Paquetes

Cada datagrama UDP es:

**Header (5 bytes):**

- `seq` (4 bytes, `uint32`, network order)
- `last_flag` (1 byte) → `1` si es el último chunk

**Payload:** bytes del mp3

En código:

- Sender: `struct.pack("!IB", seq, last_flag) + data`
- Receiver: `struct.unpack("!IB", pkt[:5])`

### ACK

El receiver responde con:

```bash
ACK <seq>\n
```

- `seq` representa el último paquete recibido en orden
- Sender usa ventana deslizante y, si expira el `timeout`, retransmite desde base (Go-Back-N).

---

## Agregar una canción nueva

### A) Preparar archivos

1. Copia el mp3 a:

```
practica2/server/UDP/musicSender/miCancion.mp3
```

2. Copia el cover a:

```
practica2/server/UDP/covers/miCancion.jpg
```

### B) Editar `catalog.json`

Agrega un objeto similar (mínimo para `sync_all.py`):

```json
{
  "id": 1,
  "title": "Mi Canción",
  "artist": "Mi Artista",
  "url": "musicSender/miCancion.mp3",
  "mp3_name": "miCancion.mp3",
  "cover_name": "miCancion.jpg",

  "titulo": "Mi Canción",
  "artista": "Mi Artista",
  "archivo": "miCancion.mp3",
  "cover": "miCancion.jpg"
}
```

### C) Sincronizar por UDP

```bash
cd practica2/server/UDP
python sync_all.py
```

Luego refresca el cliente o vuelve a pedir:

```bash
curl http://localhost:8000/api/songs
```

---

## Ejecutar UDP manual (1 canción)

Útil si quieres probar sender/receiver sin `sync_all.py`.

**Terminal 1 (sender):**

```bash
cd practica2/server/UDP
python sender.py --host 0.0.0.0 --port 5000 --file musicSender/normal.mp3 -m 1024 -k 5 --timeout 2
```

**Terminal 2 (receiver):**

```bash
cd practica2/server/UDP
python receiver.py --listen-port 6000 --sender-ip 127.0.0.1 --sender-port 5000 \
  --song-id 99 --title "Normal" --artist "Frosk" --mp3-name normal.mp3 --cover-name normal.jpg
```

---

## Troubleshooting rápido

### El cliente no carga canciones

- Verifica que la API esté arriba: `http://localhost:8000/api/songs`
- Asegúrate de tener mp3 en `server/UDP/musicReceiver/`
- Si faltan mp3: corre `python server/UDP/sync_all.py`

### Cover no aparece

- El archivo debe existir en `server/UDP/covers/` con el mismo nombre que `cover` en el catálogo.

### Puertos ocupados

- UDP: sender usa `5000`, receiver `6000`
- API: `8000`
- Cliente: `5173`

Cambia `PORT_PY` o `PORT_PROXY` en los respectivos `.env` y ajusta `VITE_API_BASE`.
