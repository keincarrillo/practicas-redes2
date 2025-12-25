# Práctica 5 - WGET/Crawler HTTP con Java NIO (Selector) + GUI Swing

Esta práctica implementa una **aplicación tipo WGET** que descarga páginas web y recursos.

Incluye una **interfaz gráfica (Swing)** para configurar y lanzar el "crawl" (recorrido) desde una URL inicial.

> **Importante:** el motor **solo soporta `http://`** (no `https://`) porque el fetch NIO no maneja SSL. Si usas sitios reales, busca alguno que aún sirva HTTP puro.

---

## Qué hace

- Descarga contenido desde una **URL inicial**.
- Sigue enlaces (crawl) con una **profundidad máxima** (`maxDepth`).
- Limita el número de **conexiones concurrentes** (`maxConnections`).
- Opción de **solo seguir enlaces del mismo host** (`sameHostOnly`).
- Guarda archivos en un directorio de salida (por defecto en tu HOME: `~/DescargasWget/`).
- Si el contenido es HTML, extrae enlaces (`href`, `src`, `url(...)`) y:
  - Encola nuevas descargas (si aplica por profundidad/host)
  - **Reescribe enlaces** a rutas locales para poder navegar el sitio descargado de forma offline.

---

## Estructura

```text
practica5/
└── client/
    └── src/main/java/org/example/
        ├── Main.java                # UI Swing (configuración + logs + start/stop)
        ├── CrawlEngine.java         # Motor NIO con Selector + cola/visitados + escritura a disco
        ├── NioHttpFetcher.java      # HTTP GET no bloqueante (solo http://)
        ├── HtmlUtils.java           # Extraer enlaces + reescritura HTML a rutas locales
        ├── PathUtils.java           # Utilidades de rutas locales/relativas/host
        └── DownloadConfig.java      # Configuración del crawl
        └── EngineListener.java      # Callbacks para UI (log/progreso/fin)
```

---

## Requisitos

- JDK (según `pom.xml` puede estar configurado a una versión alta).
  Si tu JDK es distinto, ajusta en `client/pom.xml`:

```xml
<maven.compiler.source>...</maven.compiler.source>
<maven.compiler.target>...</maven.compiler.target>
```

- Maven

---

## Cómo ejecutar

### Opción A) Compilar y ejecutar con Maven (recomendado)

Desde:

```bash
cd practica5/client
mvn -DskipTests clean package
java -cp target/classes org.example.Main
```

### Opción B) Ejecutar desde IDE (IntelliJ / NetBeans)

- Abre `practica5/client` como proyecto Maven
- Ejecuta la clase:
  - `org.example.Main`

---

## Uso de la aplicación (GUI)

Al abrir verás un panel de **Configuración**:

- **URL:** URL inicial del crawl (ej: `http://example.com/`)
- **Depth (Profundidad):** cuántos niveles de enlaces seguir (0 = solo descarga la página inicial)
- **Connections (Conexiones):** máximo de descargas concurrentes
- **Solo mismo host:** si está activo, solo sigue enlaces del mismo dominio
- **Carpeta de salida:** dónde guardar los archivos (default: `~/DescargasWget/`)

**Botones:**

- **Iniciar:** comienza el crawl
- **Detener:** solicita detener el proceso (stop)

**La parte inferior muestra:**

- **Logs** (qué se descarga / errores / redirects)
- **Progreso** (Intentados, OK, Fallidos, En cola, En vuelo)

---

## Detalles técnicos (HTTP + NIO)

### HTTP (NIO)

El fetcher construye una petición:

```http
GET /ruta?query HTTP/1.1
Host: dominio
User-Agent: Mozilla/5.0
Accept: */*
Connection: close
```

Soporta:

- Lectura de headers
- Respuesta con `Transfer-Encoding: chunked`
- Redirect básico 3xx (si trae `Location`)

Si el redirect apunta a `https://`, el motor puede encolarlo pero **fallará** porque solo se soporta `http://`.

---

## Salida / Descargas

Los archivos se guardan dentro de la carpeta de salida, organizados por host y ruta, por ejemplo:

```txt
DescargasWget/
└── example.com/
    ├── index.html
    └── images/
        └── logo.png
```

Si un enlace termina en `/`, se guarda como `index.html`.

Para visualizar offline:

1. Entra a tu carpeta de salida
2. Abre el `index.html` descargado en el navegador

---

## Sitios para probar (HTTP)

Como muchos sitios hoy fuerzan HTTPS, para que funcione sin problemas puedes:

### 1) Levantar un sitio local (recomendado)

En cualquier carpeta con un `index.html`:

```bash
python -m http.server 8000
```

Y usa como URL:

- `http://localhost:8000/`

---

## Troubleshooting

### No descarga / falla rápido

- Verifica que la URL sea `http://` y no redireccione a `https://`.

### Errores de compilación por versión de Java

- Ajusta `maven.compiler.source/target` en `pom.xml` a tu JDK instalado.

### Parece "lento"

- Aumenta `connections` (máx conexiones concurrentes)
- Reduce `Depth` si estás descargando del mismo host con muchos enlaces
