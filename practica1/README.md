# Práctica 1 - Tienda por Sockets (TCP) + Proxy HTTP + Cliente Web

Implementación de una **tienda** donde la lógica vive en un **servidor TCP** (sockets) y el frontend se comunica a través de un **proxy HTTP** (Express).

Este repo incluye **2 variantes** dentro de `practica1/`:

- **fullstack/** ➜ Servidor TCP en **Python** + Proxy HTTP en **Express (Bun/Node)** + Cliente **React**
- **java/** ➜ Servidor TCP en **Java** + Cliente TCP en **Java** (consola)

---

## Arquitectura (fullstack)

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

- El **proxy** maneja una cookie `sid` por usuario para mantener una "sesión" (carrito) comunicándose con el servidor TCP.
- El **servidor TCP** usa mensajes **JSON delimitados por salto de línea** (`\n`).

---

## Estructura

```
practica1/
├── fullstack/
│   ├── client/           # React + Vite (UI)
│   ├── server/
│   │   ├── data/productos.json  # Inventario (JSON)
│   │   └── src/socket/server.py # Servidor TCP Python
│   └── src/
│       └── proxy/        # Proxy HTTP (Express)
└── java/
    └── src/main/java/org/example/
        ├── server/       # Servidor TCP Java
        └── client/       # Cliente TCP Java (consola)
```

---

## Requisitos

### Para `fullstack/`

- **Python 3.10+**
- **Pip** (para `python-dotenv`)
- **Bun** (recomendado) o **Node.js 18+**
- **(Opcional)** `git`, `curl`

### Para `java/`

- **JDK 17+**
- **Maven 3+**

---

## Cómo correr (fullstack)

### Orden recomendado: **1) TCP Python ➜ 2) Proxy ➜ 3) Cliente React**

---

### Servidor TCP (Python)

**Entra a la carpeta del servidor:**

```bash
cd practica1/fullstack/server
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

**4. Crea un archivo `.env` aquí mismo (`practica1/fullstack/server/.env`):**

```env
HOST_PY=0.0.0.0
PORT_PY=5000
ARCHIVO_PRODUCTOS=data/productos.json
```

**5. Ejecuta el servidor:**

```bash
python src/socket/server.py
```

✅ **Debe mostrar algo como:**

```
Servidor en 0.0.0.0:5000
```

---

### Proxy HTTP (Express)

**1. Entra a la carpeta del proxy:**

```bash
cd practica1/fullstack/server/src/proxy
```

**2. Instala dependencias:**

**Con Bun (recomendado):**

```bash
bun install
```

**Con Node/NPM (alternativa):**

```bash
npm install
```

**3. Crea un archivo `.env` en `practica1/fullstack/server/src/proxy/.env`:**

```env
PORT_PROXY=3000
HOST_PY=127.0.0.1
PORT_PY=5000
CORS_ORIGIN=http://localhost:5173
SESSION_IDLE_MS=120000
```

**4. Levanta el proxy:**

**Con Bun:**

```bash
bun run start
```

**Con Node (si no usarás Bun):**

```bash
node index.js
```

✅ **Prueba rápida:**

```bash
curl http://localhost:3000/ping
```

Debe responder:

```json
{ "ok": true, "message": "pong" }
```

---

### Cliente Web (React)

**1. Entra a la carpeta del cliente:**

```bash
cd practica1/fullstack/client
```

**2. Instala dependencias:**

**Con Bun:**

```bash
bun install
```

**Con Node/NPM:**

```bash
npm install
```

**3. (Opcional) Crea `.env` en `practica1/fullstack/client/.env` para configurar el proxy:**

```env
VITE_API_BASE=http://localhost:3000
```

**4. Ejecuta el cliente:**

**Con Bun:**

```bash
bun run dev
```

**Con NPM:**

```bash
npm run dev
```

**Abre:**

- **http://localhost:5173**

---

## 🛠️ Endpoints del Proxy (HTTP)

**Base URL:** `https://localhost:3000`

- `GET /ping` ➜ healthcheck
- `GET /api/types` ➜ lista tipos (subcategorías/categorías)
- `GET /api/by-type/:type` ➜ lista productos por tipo
- `GET /api/search?nombre=<marca>` ➜ búsqueda
- `GET /api/item/:sku` ➜ obtener producto por SKU
- `POST /api/cart/add` ➜ agrega al carrito
  ```json
  { "sku": "P0001", "cant": 2 }
  ```
- `GET /api/cart` ➜ ver carrito
- `POST /api/checkout` ➜ generar ticket y descontar stock
  ```json
  { "cliente": { "nombre": "Benjir" } }
  ```

📌 **Nota:** el proxy usa cookies (`sid`) con `credentials: "include"`, por eso el frontend mantiene sesión.

---

## Protocolo TCP (JSON por línea)

El servidor TCP recibe y responde con **JSON delimitado por `\n`**.

### Formato general

- **Request (cliente → servidor):**

  ```json
  { "op": "...", "...": "..." }
  ```

- **Response (servidor → cliente):**

  ```json
  {"ok":true, ...}
  ```

### Operaciones (`op`)

- `lt` ➜ listar tipos disponibles  
  **Resp:** `{ ok, tipos: [...] }`

- `lbt` ➜ listar por tipo  
  **Req:** `{ op:"lbt", tipos:"Laptops" }`  
  **Resp:** `{ ok, resultados:[...] }`

- `srch` ➜ buscar por nombre/marca  
  **Req:** `{ op:"srch", nombre:"zenix", marca:"zenix" }`  
  **Resp:** `{ ok, resultados:[...] }`

- `gi` ➜ get item por sku  
  **Req:** `{ op:"gi", sku:"P0001" }`  
  **Resp:** `{ ok, item:{...} }`

- `atc` ➜ add to cart  
  **Req:** `{ op:"atc", sku:"P0001", cant:2 }`  
  **Resp:** `{ ok, carrito:[...], total:123.45 }`

- `sc` ➜ show cart  
  **Resp:** `{ ok, carrito:[...], total:123.45 }`

- `co` ➜ checkout  
  **Req:** `{ op:"co", cliente:{...} }`  
  **Resp:** `{ ok, ticket:{ orden, fecha, cliente, items, total } }`

---

## Inventario

**Archivo:** `practica1/fullstack/server/data/productos.json`

Cada producto tiene campos como:

- `sku`, `categoria`, `subcategoria`, `nombre`, `marca`, `precio`, `stock`, `calificacion`, `tags`, etc.

**Ejemplo:**

```json
{
  "sku": "P0001",
  "categoria": "Computadoras",
  "subcategoria": "Laptops",
  "nombre": "Laptop Zenix 17",
  "marca": "Zenix",
  "precio": 15367.19,
  "stock": 15
}
```

---

## ☕ Cómo correr (java)

Variante consola: servidor TCP en Java + cliente TCP en Java.

**1. Entra a la carpeta:**

```bash
cd practica1/java
```

**2. Compila con Maven:**

```bash
mvn -DskipTests package
```

**3. Ejecuta servidor (terminal 1):**

```bash
java -cp target/classes org.example.server.ShopServer
```

**4. Ejecuta cliente (terminal 2):**

```bash
java -cp target/classes org.example.client.ShopClient
```

📌 **Puerto usado por defecto:** `5000`.

---

## Troubleshooting rápido

### **CORS / Cookies no guardan sesión**

- Asegúrate que el proxy tenga:
  ```js
  CORS_ORIGIN=http://localhost:5173
  ```
- El frontend use `credentials: "include"` (`client/src/api/api.js`).

### **No encuentra `data/productos.json`**

- Corre Python desde `practica1/fullstack/server/`:
  ```bash
  cd practica1/fullstack/server
  python src/socket/server.py
  ```
- Verifica `.env` con `ARCHIVO_PRODUCTOS=data/productos.json`.

### **Puertos ocupados**

- Cambia `PORT_PY` o `PORT_PROXY` en `.env` y ajusta `VITE_API_BASE`.

---

## Autor / Equipo

(Pon aquí tus nombres / grupo)

---
