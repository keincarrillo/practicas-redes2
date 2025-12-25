# Práctica 4 - Servidor HTTP en Java con Pool de Hilos + "Auto-escalado" a Servidor 2 (Redirect)

En esta práctica se implementa un **servidor HTTP desde cero en Java** (sin frameworks) que:

- Atiende peticiones con un **pool de hilos**.
- Expone respuestas en `/texto`, `/html`, `/json`, `/xml`.
- Maneja **CORS** (incluye `OPTIONS` para preflight).
- Cuando el servidor 1 supera un **umbral de carga** (más de la mitad del pool ocupado), inicia automáticamente el **Servidor 2** y redirige nuevas peticiones (mientras siga sobre el umbral) con `307 Temporary Redirect`.

Además incluye un **cliente web (React + TS + Vite)** para enviar peticiones (GET/POST/PUT/DELETE) y consumir la API fácilmente.

---

## Estructura

```text
practica4/
├── client/                          # React + TypeScript + Vite (cliente HTTP)
└── server/                          # Java (HTTP server con pool + redirect)
    └── src/main/java/org/example/
        ├── HttpServerPool.java
        └── ClientHandler.java
```

---

## Requisitos

### Server

- Java 17
- Maven

### Client

- Node.js 18+ (recomendado 20 LTS) o Bun
- npm (si usas Node)

---

## Ejecución

### 1) Levantar el servidor (Servidor 1 + pool)

Desde `practica4/server`:

```bash
mvn -DskipTests package
java -cp target/classes org.example.HttpServerPool
```

Por defecto:

- **Servidor 1:** `http://localhost:8080`
- **Pool size:** `2`

### Variables de entorno (opcional)

El servidor lee estas variables:

- `PORT` - puerto del Servidor 1 (default: `8080`)
- `POOL_SIZE` - tamaño del pool (default: `2`)

Ejemplo:

**Linux/Mac**

```bash
# Linux/Mac
export PORT=8080
export POOL_SIZE=4
mvn -DskipTests package
java -cp target/classes org.example.HttpServerPool
```

**PowerShell**

```powershell
# Windows PowerShell
$env:PORT="8080"
$env:POOL_SIZE="4"
mvn -DskipTests package
java -cp target/classes org.example.HttpServerPool
```

---

### 2) Levantar el cliente web (HTTP Cliente)

El cliente ya trae base URL por defecto en `client/src/config/config.ts`:

```
http://localhost:8080
```

Desde `practica4/client`:

```bash
npm install
npm run dev
```

Abrir:

- `http://localhost:5173`

---

## Rutas del servidor

El servidor responde con **200 OK** y el contenido depende de la ruta:

- `GET /texto` - `text/plain`
- `GET /html` - `text/html` (incluye imagen embebida en Base64 `jerry.png`)
- `GET /json` - `application/json`
- `GET /xml` - `application/xml`

Si pides otra ruta, responde con texto:

```
"Recurso no encontrado. Usa /texto, /html, /json o /xml"
```

---

## Métodos HTTP soportados + CORS

Métodos: `GET`, `POST`, `PUT`, `DELETE`

Preflight: `OPTIONS` devuelve `204 No Content` y headers CORS:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Accept`

Si llega un método distinto:

- Responde `405 Method Not Allowed`

---

## Pool + Auto-arranque del Servidor 2 + Redirect

El servidor 1 lleva un conteo de conexiones activas.

**Umbral:**

```txt
threshold = max(1, POOL_SIZE / 2)
```

**Cuando conexiones activas > threshold:**

1. Se inicia el Servidor 2 en `http://localhost:8081` (una sola vez).
2. Las nuevas peticiones (mientras siga sobre el umbral) se responden con:
   - `HTTP/1.1 307 Temporary Redirect`
   - `Location: http://localhost:8081/<ruta>`

Esto simula un escenario de "balanceo" básico por redirección.

---

## Cómo forzar el redirect (prueba rápida)

Como el server hace un `sleep(500ms)` por conexión, es fácil saturarlo con requests concurrentes:

```bash
# Lanza varias requests al mismo tiempo
for i in {1..6}; do
  curl -s -o /dev/null http://localhost:8080/html &
done
wait
```

Luego prueba el redirect (puede ocurrir si el umbral está superado):

```bash
curl -i http://localhost:8080/texto
```

Busca:

- `307 Temporary Redirect`
- `Location: http://localhost:8081/texto`

---

## Uso del cliente web

1. Selecciona método: `GET/POST/PUT/DELETE`
2. Escribe la ruta (ej): `/html`, `/xml`, `/json`, `/texto`
3. Click Enviar
4. Si es HTML/XML, puedes alternar:
   - **Rendered** - vista renderizada
   - **Source Code** - cuerpo crudo
