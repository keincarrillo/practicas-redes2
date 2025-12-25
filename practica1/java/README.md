# Tienda por Sockets TCP - Versión Java (Consola)

Implementación de una tienda en línea usando sockets TCP con servidor y cliente en Java. La comunicación se realiza mediante JSON delimitado por saltos de línea.

---

## Arquitectura

```
[Cliente TCP Java (Consola)]
          ↓
     | TCP Socket
          ↓
[Servidor TCP Java] ──→ src/main/resources/products.json (inventario)
```

- Servidor y cliente se comunican mediante sockets TCP
- Protocolo: JSON delimitado por saltos de línea (`\n`)
- Cliente de consola interactivo con menú de opciones
- El servidor gestiona múltiples clientes de forma concurrente

---

## Estructura

```
java/
├── src/main/java/org/example/
│   ├── server/
│   │   └── ShopServer.java          # Servidor TCP
│   ├── client/
│   │   └── ShopClient.java          # Cliente TCP (consola)
│   └── ...
├── src/main/resources/
│   └── products.json                 # Inventario
├── pom.xml                           # Configuración Maven
└── README.md
```

---

## Requisitos

- JDK 17+
- Maven 3+

---

## Instalación y Ejecución

### 1. Compilar el proyecto

Entra a la carpeta del proyecto:

```bash
cd java
```

Compila con Maven:

```bash
mvn -DskipTests package
```

---

### 2. Ejecutar el Servidor

En una terminal, ejecuta:

```bash
java -cp target/classes org.example.server.ShopServer
```

Debe mostrar:

```
Servidor TCP iniciado en puerto 5000
Esperando conexiones...
```

---

### 3. Ejecutar el Cliente

En otra terminal, ejecuta:

```bash
java -cp target/classes org.example.client.ShopClient
```

Verás un menú interactivo:

```
=== TIENDA TCP ===
1. Listar tipos
2. Listar por tipo
3. Buscar producto
4. Obtener producto por SKU
5. Agregar al carrito
6. Ver carrito
7. Checkout
8. Salir
Selecciona una opción:
```

---

## Protocolo TCP (JSON por línea)

El servidor recibe y responde con JSON delimitado por `\n`.

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

**Archivo:** `src/main/resources/products.json`

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

## Uso del Cliente (Consola)

### Ejemplo de flujo de compra:

1. **Listar tipos disponibles** (opción 1)

   - Muestra todas las categorías/subcategorías

2. **Listar por tipo** (opción 2)

   - Ingresa: `Laptops`
   - Muestra todos los productos de ese tipo

3. **Agregar al carrito** (opción 5)

   - Ingresa SKU: `P0001`
   - Ingresa cantidad: `2`

4. **Ver carrito** (opción 6)

   - Muestra productos agregados y total

5. **Checkout** (opción 7)
   - Ingresa nombre del cliente
   - Genera ticket y descuenta stock

---

## Configuración

### Cambiar puerto del servidor

Edita `ShopServer.java`:

```java
private static final int PORT = 5000;  // Cambia aquí
```

### Cambiar host/puerto del cliente

Edita `ShopClient.java`:

```java
private static final String HOST = "localhost";
private static final int PORT = 5000;
```

---

## Troubleshooting

### Error: "Address already in use"

**Problema:** El puerto 5000 está ocupado

**Solución:**

- Cambia el puerto en `ShopServer.java`
- O libera el puerto:

  ```bash
  # En Linux/Mac
  lsof -ti:5000 | xargs kill -9

  # En Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```

---

### Error: "Connection refused"

**Problema:** El servidor no está corriendo

**Solución:**

- Asegúrate de ejecutar primero el servidor
- Verifica que el puerto sea el correcto en ambos lados

---

### Error: "No se encontró products.json"

**Problema:** El archivo de inventario no se encuentra

**Solución:**

- Verifica que `src/main/resources/products.json` existe
- Recompila con Maven: `mvn clean package`

---

### Error de compilación Maven

**Solución:**

```bash
# Limpia y recompila
mvn clean install

# Si persiste, verifica versión de Java
java -version  # Debe ser 17+
```

---

## Características

- Servidor multi-hilo (maneja múltiples clientes simultáneamente)
- Cada cliente tiene su propia sesión de carrito
- Validación de stock en tiempo real
- Persistencia de inventario (se actualiza el JSON al hacer checkout)
- Manejo de errores y respuestas consistentes

---

## Autor / Equipo

(Pon aquí tus nombres / grupo)

---

## Licencia

Uso académico (ESCOM/IPN). Ajusta según tu entrega.
