package org.example;

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

public class HttpServerPool {

    // numero de hilos que usara el servidor en el pool
    static int poolSize;
    // puerto principal donde escucha el servidor 1
    static int primaryPort;
    // puerto donde escuchara el servidor secundario, -1 indica sin inicializar
    static volatile int secondaryPort = -1;
    // bandera atomica para saber si el servidor secundario ya se inicio
    static final AtomicBoolean secondaryServerStarted = new AtomicBoolean(false);

    // cache para no leer la imagen en cada peticion y reutilizar la misma cadena
    private static String cachedInlineImage;

    public static void main(String[] args) throws IOException {
        // obtiene el puerto desde la variable de entorno port o usa 8080 por defecto
        String portEnv = System.getenv("PORT");
        primaryPort = (portEnv != null && !portEnv.isBlank())
                ? Integer.parseInt(portEnv)
                : 8080;

        // obtiene el tamanio del pool desde la variable de entorno pool_size o usa 4
        String poolEnv = System.getenv("POOL_SIZE");
        poolSize = (poolEnv != null && !poolEnv.isBlank())
                ? Integer.parseInt(poolEnv)
                : 4;

        // crea el socket del servidor principal
        ServerSocket serverSocket = new ServerSocket(primaryPort);
        // crea el pool de hilos para atender las conexiones
        ExecutorService executor = Executors.newFixedThreadPool(poolSize);
        // contador de conexiones activas en el servidor principal
        AtomicInteger activeConnections = new AtomicInteger(0);

        System.out.println("\n===========================================");
        System.out.println("Servidor 1 escuchando en http://0.0.0.0:" + primaryPort);
        System.out.println("Rutas: /texto, /html, /json, /xml");
        System.out.println("Pool size: " + poolSize);
        System.out.println("===========================================\n");

        // bucle infinito que acepta clientes y los delega al pool
        while (true) {
            Socket clientSocket = serverSocket.accept();
            executor.submit(new ClientHandler(clientSocket, true, activeConnections));
        }
    }

    // inicia el servidor secundario en otro puerto en un hilo separado
    static void startSecondaryServer() {
        new Thread(() -> {
            try {
                // si secondaryPort es menor o igual a cero deja que el sistema asigne un puerto libre
                int portToUse = (secondaryPort <= 0) ? 0 : secondaryPort;
                ServerSocket serverSocket2 = new ServerSocket(portToUse);
                // guarda el puerto real donde quedo escuchando el servidor secundario
                secondaryPort = serverSocket2.getLocalPort();
                // pool de hilos para atender conexiones del servidor secundario
                ExecutorService executor2 = Executors.newFixedThreadPool(poolSize);

                System.out.println("\n===========================================");
                System.out.println("Servidor 2 iniciado en http://localhost:" + secondaryPort);
                System.out.println("===========================================\n");

                // bucle que acepta conexiones para el servidor secundario
                while (true) {
                    Socket clientSocket = serverSocket2.accept();
                    executor2.submit(new ClientHandler(clientSocket, false, null));
                }
            } catch (IOException e) {
                System.err.println("Error al iniciar el segundo servidor: " + e.getMessage());
                e.printStackTrace();
            }
        }, "SecondaryServerThread").start();
    }

    // genera la etiqueta img con la imagen jerry.png codificada en base64 y la guarda en cache
    private static String getInlineImageTag() {
        // si ya se construyo antes se reutiliza la cadena
        if (cachedInlineImage != null) {
            return cachedInlineImage;
        }

        // intenta leer el recurso jerry.png desde el classpath
        try (InputStream in = HttpServerPool.class.getResourceAsStream("/jerry.png")) {
            if (in == null) {
                System.err.println("[WARN] No se encontró jerry.png en src/main/resources; se omitirá la imagen en /html.");
                cachedInlineImage = "";
                return cachedInlineImage;
            }

            // lee todos los bytes de la imagen
            byte[] bytes = in.readAllBytes();
            // codifica la imagen en base64
            String base64 = Base64.getEncoder().encodeToString(bytes);

            // arma la etiqueta img con data url lista para incrustarse en el html
            cachedInlineImage =
                    "<img src=\"data:image/png;base64," + base64 + "\" " +
                            "alt=\"Imagen enviada desde el servidor\" " +
                            "style=\"max-width: 100%; height: auto; border-radius: 16px; " +
                            "box-shadow: 0 10px 25px rgba(0,0,0,0.3);\"/>";

            return cachedInlineImage;
        } catch (IOException e) {
            // en caso de error se imprime la traza y se devuelve cadena vacia
            e.printStackTrace();
            cachedInlineImage = "";
            return cachedInlineImage;
        }
    }

    // construye y envia una respuesta http 307 que redirige al servidor secundario
    static void sendRedirect(BufferedWriter out, String path) throws IOException {
        // url completa de destino en el servidor secundario
        String location = "http://localhost:" + secondaryPort + path;

        // cuerpo html que muestra un mensaje y hace redireccion automatica por javascript
        String body = """
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Redirección - Servidor 2</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        padding: 40px;
                        max-width: 500px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        text-align: center;
                        animation: slideIn 0.5s ease-out;
                    }
                    @keyframes slideIn {
                        from {
                            opacity: 0;
                            transform: translateY(-30px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                        animation: bounce 1s infinite;
                    }
                    @keyframes bounce {
                        0%%, 100%% { transform: translateY(0); }
                        50%% { transform: translateY(-10px); }
                    }
                    h1 {
                        color: #333;
                        font-size: 28px;
                        margin-bottom: 15px;
                    }
                    p {
                        color: #666;
                        line-height: 1.6;
                        margin-bottom: 25px;
                    }
                    .redirect-link {
                        display: inline-block;
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        color: white;
                        padding: 15px 30px;
                        border-radius: 30px;
                        text-decoration: none;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    }
                    .redirect-link:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
                    }
                    .info {
                        margin-top: 20px;
                        padding: 15px;
                        background: #f8f9fa;
                        border-radius: 10px;
                        font-size: 14px;
                        color: #666;
                    }
                    .countdown {
                        font-weight: bold;
                        color: #667eea;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">🔄</div>
                    <h1>Redireccionando al Servidor 2</h1>
                    <p>El servidor principal está ocupado. Tu petición será procesada por el servidor secundario.</p>
                    <a href="%s" class="redirect-link">Ir al Servidor 2 →</a>
                    <div class="info">
                        <p>Serás redirigido automáticamente en <span class="countdown" id="countdown">5</span> segundos</p>
                    </div>
                </div>
                <script>
                    let seconds = 5;
                    const countdownElement = document.getElementById('countdown');
                    const interval = setInterval(() => {
                        seconds--;
                        countdownElement.textContent = seconds;
                        if (seconds <= 0) {
                            clearInterval(interval);
                            window.location.href = '%s';
                        }
                    }, 1000);
                </script>
            </body>
            </html>
            """.formatted(location, location);

        // convierte el cuerpo a bytes para poder calcular content-length
        byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);

        // escribe la linea de estado y los encabezados de redireccion
        out.write("HTTP/1.1 307 Temporary Redirect\r\n");
        out.write("Access-Control-Allow-Origin: *\r\n");
        out.write("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n");
        out.write("Access-Control-Allow-Headers: Content-Type\r\n");
        out.write("Content-Type: text/html; charset=utf-8\r\n");
        out.write("Content-Length: " + bodyBytes.length + "\r\n");
        out.write("Location: " + location + "\r\n");
        out.write("Connection: close\r\n");
        out.write("\r\n");
        out.write(body);
        out.flush();

        System.out.println("[REDIRECT] Enviada redirección a: " + location);
    }

    // procesa una peticion http y genera la respuesta segun el metodo y la ruta
    static void handleRequest(BufferedWriter out, String method,
                              String path, String serverName) throws IOException {

        System.out.println("[" + serverName + "] Petición: " + method + " " + path);

        // maneja las peticiones options usadas para preflight de cors
        if ("OPTIONS".equals(method)) {
            out.write("HTTP/1.1 204 No Content\r\n");
            out.write("Access-Control-Allow-Origin: *\r\n");
            out.write("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n");
            out.write("Access-Control-Allow-Headers: Content-Type, Accept\r\n");
            out.write("Access-Control-Max-Age: 86400\r\n");
            out.write("Connection: close\r\n");
            out.write("\r\n");
            out.flush();
            System.out.println("[" + serverName + "] Respondido OPTIONS (preflight)");
            return;
        }

        // si el metodo no es uno de los permitidos responde 405
        if (!("GET".equals(method) || "POST".equals(method)
                || "PUT".equals(method) || "DELETE".equals(method))) {

            String body = "Metodo no permitido: " + method;
            byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);

            out.write("HTTP/1.1 405 Method Not Allowed\r\n");
            out.write("Access-Control-Allow-Origin: *\r\n");
            out.write("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n");
            out.write("Access-Control-Allow-Headers: Content-Type\r\n");
            out.write("Content-Type: text/plain; charset=utf-8\r\n");
            out.write("Content-Length: " + bodyBytes.length + "\r\n");
            out.write("Connection: close\r\n");
            out.write("\r\n");
            out.write(body);
            out.flush();
            System.out.println("[" + serverName + "] Error 405: Método no permitido");
            return;
        }

        String mimeType;
        String body;

        // selecciona el contenido que se devolvera segun la ruta
        switch (path) {
            case "/texto":
                // respuesta simple en texto plano
                mimeType = "text/plain";
                body = "[" + serverName + "] Metodo " + method + " - MIME text/plain";
                break;

            case "/html":
                // respuesta html con informacion del servidor e imagen incrustada
                mimeType = "text/html";
                body = """
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>%s - HTTP Response</title>
                        <style>
                            * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                            }
                            
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                                background: linear-gradient(135deg, #e5f6e2 0%%, #ccebc7 100%%);
                                min-height: 100vh;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                padding: 20px;
                            }
                            
                            .container {
                                background: white;
                                border-radius: 16px;
                                padding: 48px;
                                max-width: 560px;
                                width: 100%%;
                                box-shadow: 0 4px 20px rgba(62, 135, 50, 0.08);
                                animation: slideUp 0.6s ease-out;
                            }
                            
                            @keyframes slideUp {
                                from {
                                    opacity: 0;
                                    transform: translateY(20px);
                                }
                                to {
                                    opacity: 1;
                                    transform: translateY(0);
                                }
                            }
                            
                            .header {
                                text-align: center;
                                margin-bottom: 32px;
                            }
                            
                            .status-icon {
                                width: 64px;
                                height: 64px;
                                background: linear-gradient(135deg, #50a542, #3e8732);
                                border-radius: 50%%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                margin: 0 auto 20px;
                                animation: pulse 2s ease-in-out infinite;
                            }
                            
                            @keyframes pulse {
                                0%%, 100%% {
                                    transform: scale(1);
                                    box-shadow: 0 0 0 0 rgba(80, 165, 66, 0.4);
                                }
                                50%% {
                                    transform: scale(1.05);
                                    box-shadow: 0 0 0 10px rgba(80, 165, 66, 0);
                                }
                            }
                            
                            .status-icon svg {
                                width: 32px;
                                height: 32px;
                                stroke: white;
                                stroke-width: 3;
                                fill: none;
                                stroke-linecap: round;
                                stroke-linejoin: round;
                            }
                            
                            h1 {
                                color: #2b5625;
                                font-size: 28px;
                                font-weight: 600;
                                margin-bottom: 8px;
                            }
                            
                            .subtitle {
                                color: #73c167;
                                font-size: 14px;
                                font-weight: 500;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            }
                            
                            .info-grid {
                                display: grid;
                                gap: 12px;
                                margin-bottom: 32px;
                            }
                            
                            .info-item {
                                background: #f5faf3;
                                border-left: 3px solid #50a542;
                                padding: 16px;
                                border-radius: 8px;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                transition: all 0.3s ease;
                            }
                            
                            .info-item:hover {
                                background: #e5f6e2;
                                transform: translateX(4px);
                            }
                            
                            .info-label {
                                color: #336b2a;
                                font-size: 14px;
                                font-weight: 500;
                            }
                            
                            .info-value {
                                color: #2b5625;
                                font-size: 14px;
                                font-weight: 600;
                                font-family: 'Courier New', monospace;
                            }
                            
                            .features {
                                border-top: 1px solid #e5f6e2;
                                padding-top: 24px;
                            }
                            
                            .features-title {
                                color: #2b5625;
                                font-size: 14px;
                                font-weight: 600;
                                margin-bottom: 16px;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            }
                            
                            .feature-list {
                                display: grid;
                                grid-template-columns: repeat(2, 1fr);
                                gap: 12px;
                            }
                            
                            .feature-item {
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                color: #336b2a;
                                font-size: 13px;
                            }
                            
                            .feature-dot {
                                width: 6px;
                                height: 6px;
                                background: #50a542;
                                border-radius: 50%%;
                                animation: blink 2s ease-in-out infinite;
                            }
                            
                            @keyframes blink {
                                0%%, 100%% { opacity: 1; }
                                50%% { opacity: 0.3; }
                            }
                            
                            .footer {
                                margin-top: 24px;
                                padding-top: 24px;
                                border-top: 1px solid #e5f6e2;
                                text-align: center;
                                color: #91d386;
                                font-size: 12px;
                            }
                            
                            @media (max-width: 600px) {
                                .container {
                                    padding: 32px 24px;
                                }
                                
                                .feature-list {
                                    grid-template-columns: 1fr;
                                }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <div class="status-icon">
                                    <svg viewBox="0 0 24 24">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                                <h1>%s</h1>
                                <p class="subtitle">Respuesta Exitosa</p>
                            </div>
                            
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Servidor</span>
                                    <span class="info-value">%s</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Método HTTP</span>
                                    <span class="info-value">%s</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Content-Type</span>
                                    <span class="info-value">text/html</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Status Code</span>
                                    <span class="info-value">200 OK</span>
                                </div>
                            </div>
                            
                            <div class="features">
                                <div class="features-title">Características</div>
                                <div class="feature-list">
                                    <div class="feature-item">
                                        <span class="feature-dot"></span>
                                        <span>Pool de conexiones</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-dot"></span>
                                        <span>Headers CORS</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-dot"></span>
                                        <span>Diseño responsivo</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-dot"></span>
                                        <span>Servidor secundario</span>
                                    </div>
                                </div>
                            </div>

                            <div style="margin-top: 24px; display: flex; justify-content: center;">
                                %s
                            </div>
                            
                            <div class="footer">
                                <span id="timestamp"></span>
                            </div>
                        </div>
                        
                        <script>
                            document.getElementById('timestamp').textContent = 
                                'Generado: ' + new Date().toLocaleString('es-MX', {
                                    dateStyle: 'short',
                                    timeStyle: 'medium'
                                });
                        </script>
                    </body>
                    </html>
                    """.formatted(serverName, serverName, serverName, method, getInlineImageTag());
                break;

            case "/json":
                // construye una respuesta json simple con datos del servidor
                mimeType = "application/json";
                body = "{\"servidor\":\"" + serverName
                        + "\",\"metodo\":\"" + method
                        + "\",\"mime\":\"application/json\"}";
                break;

            case "/xml":
                // construye una respuesta xml de ejemplo con varias etiquetas
                mimeType = "application/xml";
                body = """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <respuesta>
                        <servidor>%s</servidor>
                        <metodo>%s</metodo>
                        <mime>application/xml</mime>
                        <timestamp>%s</timestamp>
                        <caracteristicas>
                            <caracteristica id="1">Pool de conexiones</caracteristica>
                            <caracteristica id="2">Manejo de CORS</caracteristica>
                            <caracteristica id="3">Multiples formatos</caracteristica>
                            <caracteristica id="4">Servidor secundario dinamico</caracteristica>
                        </caracteristicas>
                    </respuesta>
                    """.formatted(serverName, method, java.time.LocalDateTime.now().toString());
                break;

            default:
                // mensaje por defecto cuando la ruta no existe
                mimeType = "text/plain";
                body = "Recurso no encontrado. Usa /texto, /html, /json o /xml";
        }

        // convierte el cuerpo a bytes para fijar content-length
        byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);

        // escribe la respuesta http completa en el socket del cliente
        out.write("HTTP/1.1 200 OK\r\n");
        out.write("Access-Control-Allow-Origin: *\r\n");
        out.write("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n");
        out.write("Access-Control-Allow-Headers: Content-Type, Accept\r\n");
        out.write("Content-Type: " + mimeType + "; charset=utf-8\r\n");
        out.write("Content-Length: " + bodyBytes.length + "\r\n");
        out.write("Connection: close\r\n");
        out.write("\r\n");
        out.write(body);
        out.flush();

        System.out.println("[" + serverName + "] Respuesta 200 OK - " + mimeType);
    }
}
