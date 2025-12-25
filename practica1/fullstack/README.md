# Tienda por Sockets (TCP) + Proxy HTTP + Cliente Web

Implementación fullstack de una tienda en línea donde la lógica de negocio vive en un servidor TCP (Python) y el frontend (React) se comunica a través de un proxy HTTP (Express).

---

## Arquitectura

```
[React (Vite)]
       ↓
  | HTTP (fetch) + cookies (sid)
       ↓
[Proxy Express]
       ↓
  | TCP (JSON por línea)
       ↓
[Servidor TCP Python] ──→ server/data/productos.json (inventario)
```

- El proxy maneja una cookie `sid` por usuario para mantener una "sesión" (carrito)
- El servidor TCP usa mensajes JSON delimitados por salto de línea (`\n`)
- Todas las operaciones (búsqueda, carrito, checkout) pasan por el protocolo TCP

---

## Estructura

```
fullstack/
├── client/                     # React + Vite (UI)
│   ├── src/
│   │   ├── api/api.js         # Llamadas al proxy
│   │   └── ...                # Componentes React
│   └── .env                    # VITE_API_BASE
├── server/
│   ├── data/productos.json    # Inventario (JSON)
│   ├── src/
│   │   ├── socket/server.py   # Servidor TCP Python
│   │   └── proxy/             # Proxy HTTP Express
│   │       ├── index.js
│   │       └── .env
│   └── .env                    # Config del servidor Python
└── README.md
```

---

## Requisitos

- Python 3.10+
- Pip (para `python-dotenv`)
- Bun (recomendado) o Node.js 18+
- (Opcional) `git`, `curl`

---

## Instalación y Ejecución

### Orden recomendado: 1) TCP Python → 2) Proxy Express → 3) Cliente React

---

### 1. Servidor TCP (Python)

**1. Entra a la carpeta del servidor:**

```bash
cd fullstack/server
```

**2. (Opcional pero recomendado) Crea y activa un entorno virtual:**

```bash
python -m venv .venv
source .venv/bin/activate
```

**3. Instala dependencias:**

```bash
pip install python-dotenv
```

**4. Crea un archivo `.env` en `fullstack/server/.env`:**

```env
HOST_PY=0.0.0.0
PORT_PY=5000
ARCHIVO_PRODUCTOS=data/productos.json
```

**5. Ejecuta el servidor:**

```bash
python src/socket/server.py
```

Debe mostrar:

```
Servidor en 0.0.0.0:5000
```

---

### 2. Proxy HTTP (Express)

**1. Entra a la carpeta del proxy:**

```bash
cd fullstack/server/src/proxy
```

**2. Instala dependencias:**

Con Bun (recomendado):

```bash
bun install
```

Con Node/NPM (alternativa):

```bash
npm install
```

**3. Crea un archivo `.env` en `fullstack/server/src/proxy/.env`:**

```env
PORT_PROXY=3000
HOST_PY=127.0.0.1
PORT_PY=5000
CORS_ORIGIN=http://localhost:5173
SESSION_IDLE_MS=120000
```

**4. Levanta el proxy:**

Con Bun:

```bash
bun run start
```

Con Node:

```bash
node index.js
```

Prueba rápida:

```bash
curl http://localhost:3000/ping
```

Debe responder:

```json
{ "ok": true, "message": "pong" }
```

---

### 3. Cliente Web (React)

**1. Entra a la carpeta del cliente:**

```bash
cd fullstack/client
```

**2. Instala dependencias:**

Con Bun:

```bash
bun install
```

Con Node/NPM:

```bash
npm install
```

**3. (Opcional) Crea `.env` en `fullstack/client/.env`:**

```env
VITE_API_BASE=http://localhost:3000
```

**4. Ejecuta el cliente:**

Con Bun:

```bash
bun run dev
```

Con NPM:

```bash
npm run dev
```

**5. Abre en tu navegador:**

http://localhost:5173

---

## Endpoints del Proxy (HTTP)

**Base URL:** `http://localhost:3000`

| Método | Endpoint                     | Descripción                            | Body                                    |
| ------ | ---------------------------- | -------------------------------------- | --------------------------------------- |
| `GET`  | `/ping`                      | Healthcheck                            | -                                       |
| `GET`  | `/api/types`                 | Lista tipos (subcategorías/categorías) | -                                       |
| `GET`  | `/api/by-type/:type`         | Lista productos por tipo               | -                                       |
| `GET`  | `/api/search?nombre=<marca>` | Búsqueda por nombre/marca              | -                                       |
| `GET`  | `/api/item/:sku`             | Obtener producto por SKU               | -                                       |
| `POST` | `/api/cart/add`              | Agrega al carrito                      | `{ "sku": "P0001", "cant": 2 }`         |
| `GET`  | `/api/cart`                  | Ver carrito                            | -                                       |
| `POST` | `/api/checkout`              | Generar ticket y descontar stock       | `{ "cliente": { "nombre": "Benjir" } }` |

### Ejemplo de uso (JavaScript):

```javascript
// Agregar al carrito
fetch('http://localhost:3000/api/cart/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ sku: 'P0001', cant: 2 }),
})
```

**Nota:** el proxy usa cookies (`sid`) con `credentials: "include"` para mantener la sesión.

---

## Protocolo TCP (JSON por línea)

El servidor TCP recibe y responde con JSON delimitado por `\n`.

### Formato general

**Request (cliente → servidor):**

```json
{ "op": "...", "...": "..." }
```

**Response (servidor → cliente):**

```json
{"ok":true, ...}
```

### Operaciones disponibles

#### `lt` - Listar tipos disponibles

**Request:**

```json
{ "op": "lt" }
```

**Response:**

```json
{"ok": true, "tipos": ["Laptops", "Computadoras", ...]}
```

---

#### `lbt` - Listar por tipo

**Request:**

```json
{ "op": "lbt", "tipos": "Laptops" }
```

**Response:**

```json
{"ok": true, "resultados": [{...}]}
```

---

#### `srch` - Buscar por nombre/marca

**Request:**

```json
{ "op": "srch", "nombre": "zenix", "marca": "zenix" }
```

**Response:**

```json
{"ok": true, "resultados": [{...}]}
```

---

#### `gi` - Get item por SKU

**Request:**

```json
{ "op": "gi", "sku": "P0001" }
```

**Response:**

```json
{"ok": true, "item": {...}}
```

---

#### `atc` - Add to cart

**Request:**

```json
{ "op": "atc", "sku": "P0001", "cant": 2 }
```

**Response:**

```json
{"ok": true, "carrito": [{...}], "total": 123.45}
```

---

#### `sc` - Show cart

**Request:**

```json
{ "op": "sc" }
```

**Response:**

```json
{"ok": true, "carrito": [{...}], "total": 123.45}
```

---

#### `co` - Checkout

**Request:**

```json
{ "op": "co", "cliente": { "nombre": "Benjir" } }
```

**Response:**

```json
{
  "ok": true,
  "ticket": {
    "orden": "...",
    "fecha": "...",
    "cliente": {...},
    "items": [{...}],
    "total": 123.45
  }
}
```

---

## Inventario

**Archivo:** `fullstack/server/data/productos.json`

Cada producto tiene los siguientes campos:

```json
{
  "sku": "P0001",
  "categoria": "Computadoras",
  "subcategoria": "Laptops",
  "nombre": "Laptop Zenix 17",
  "marca": "Zenix",
  "precio": 15367.19,
  "stock": 15,
  "calificacion": 4.5,
  "tags": ["gaming", "high-performance"]
}
```

**Campos principales:**

- `sku` - Identificador único del producto
- `categoria` - Categoría principal
- `subcategoria` - Tipo específico
- `nombre` - Nombre del producto
- `marca` - Marca del producto
- `precio` - Precio unitario
- `stock` - Cantidad disponible
- `calificacion` - Rating (opcional)
- `tags` - Etiquetas de búsqueda (opcional)

---

## Troubleshooting

### CORS / Cookies no guardan sesión

**Problema:** El frontend no mantiene la sesión (carrito se pierde)

**Solución:**

- Verifica que el proxy tenga `CORS_ORIGIN=http://localhost:5173` en `.env`
- Asegúrate que el frontend use `credentials: "include"` en fetch (revisa `client/src/api/api.js`)

---

### No encuentra `data/productos.json`

**Problema:** Error "No se encontró el archivo de productos"

**Solución:**

- Corre Python desde `fullstack/server/`:
  ```bash
  cd fullstack/server
  python src/socket/server.py
  ```
- Verifica que `.env` tenga `ARCHIVO_PRODUCTOS=data/productos.json`

---

### Puertos ocupados

**Problema:** Error "Address already in use"

**Solución:**

- Cambia `PORT_PY` o `PORT_PROXY` en los respectivos `.env`
- Ajusta `VITE_API_BASE` en el cliente si cambias el puerto del proxy

---

### Python no encuentra el módulo `dotenv`

**Solución:**

```bash
pip install python-dotenv
```

---
