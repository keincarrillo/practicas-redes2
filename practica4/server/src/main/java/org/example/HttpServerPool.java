package org.example;

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

public class HttpServerPool {

    // tamanio del pool del servidor principal
    static int poolSize;

    // puerto del servidor principal
    static int primaryPort;

    // puerto del segundo servidor (se asigna despues si es 0 o -1)
    static volatile int secondaryPort = -1;

    // bandera para saber si el segundo servidor ya se inicio
    static final AtomicBoolean secondaryServerStarted = new AtomicBoolean(false);

    public static void main(String[] args) throws IOException {
        // lee configuracion desde consola
        Scanner scanner = new Scanner(System.in);

        System.out.print("Puerto del servidor 1 [8080]: ");
        String line = scanner.nextLine().trim();
        primaryPort = line.isEmpty() ? 8080 : Integer.parseInt(line);

        System.out.print("Puerto del servidor 2 [auto]: ");
        line = scanner.nextLine().trim();
        secondaryPort = line.isEmpty() ? -1 : Integer.parseInt(line);

        System.out.print("Tamaño del pool de conexiones del servidor 1 [4]: ");
        line = scanner.nextLine().trim();
        poolSize = line.isEmpty() ? 4 : Integer.parseInt(line);

        // crea socket servidor y pool de hilos para el servidor 1
        ServerSocket serverSocket = new ServerSocket(primaryPort);
        ExecutorService executor = Executors.newFixedThreadPool(poolSize);

        // contador de conexiones activas en el servidor 1
        AtomicInteger activeConnections = new AtomicInteger(0);

        System.out.println("Servidor 1 escuchando en http://localhost:" + primaryPort);
        System.out.println("Rutas disponibles: /texto, /html, /json, /xml");

        // ciclo principal que acepta conexiones y las manda al pool
        while (true) {
            Socket clientSocket = serverSocket.accept();
            executor.submit(new ClientHandler(clientSocket, true, activeConnections));
        }
    }

    // inicia el segundo servidor en un hilo separado
    static void startSecondaryServer() {
        new Thread(() -> {
            try {
                // si el puerto es menor o igual a cero el sistema elige uno libre
                int portToUse = (secondaryPort <= 0) ? 0 : secondaryPort;

                // servidor 2 escuchando
                ServerSocket serverSocket2 = new ServerSocket(portToUse);

                // guarda el puerto real que se uso
                secondaryPort = serverSocket2.getLocalPort();

                // pool de hilos para el servidor 2
                ExecutorService executor2 = Executors.newFixedThreadPool(poolSize);
                System.out.println("Servidor 2 iniciado en http://localhost:" + secondaryPort);

                // acepta conexiones y las manda al pool del servidor 2
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

    // envia una respuesta http 307 para redirigir al segundo servidor
    static void sendRedirect(BufferedWriter out, String path) throws IOException {
        String location = "http://localhost:" + secondaryPort + path;
        String body = "<html><body><h1>Redireccionado al segundo servidor</h1>"
                + "<p>Reintenta en: <a href='" + location + "'>" + location + "</a></p></body></html>";

        byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);

        out.write("HTTP/1.1 307 Temporary Redirect\r\n");
        out.write("Access-Control-Allow-Origin: *\r\n");
        out.write("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n");
        out.write("Access-Control-Allow-Headers: Content-Type\r\n");
        out.write("Content-Type: text/html; charset=utf-8\r\n");
        out.write("Content-Length: " + bodyBytes.length + "\r\n");
        out.write("Connection: close\r\n");
        out.write("\r\n");
        out.write(body);
        out.flush();
    }

    // atiende una peticion http y construye la respuesta segun metodo y ruta
    static void handleRequest(BufferedWriter out, String method,
                              String path, String serverName) throws IOException {

        // maneja metodo options para preflight de cors
        if ("OPTIONS".equals(method)) {
            out.write("HTTP/1.1 204 No Content\r\n");
            out.write("Access-Control-Allow-Origin: *\r\n");
            out.write("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n");
            out.write("Access-Control-Allow-Headers: Content-Type\r\n");
            out.write("Access-Control-Max-Age: 3600\r\n");
            out.write("Connection: close\r\n");
            out.write("\r\n");
            out.flush();
            return;
        }

        // verifica que el metodo sea uno de los permitidos
        if (!( "GET".equals(method) || "POST".equals(method)
                || "PUT".equals(method) || "DELETE".equals(method))) {

            String body = "Metodo no permitido";
            byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);

            out.write("HTTP/1.1 405 Method Not Allowed\r\n");
            out.write("Access-Control-Allow-Origin: *\r\n");
            out.write("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n");
            out.write("Access-Control-Allow-Headers: Content-Type\r\n");
            out.write("Content-Type: text/plain; charset=utf-8\r\n");
            out.write("Content-Length: " + bodyBytes.length + "\r\n");
            out.write("Connection: close\r\n\r\n");
            out.write(body);
            out.flush();
            return;
        }

        // selecciona tipo mime y cuerpo segun la ruta solicitada
        String mimeType;
        String body;

        switch (path) {
            case "/texto":
                mimeType = "text/plain";
                body = "[" + serverName + "] Metodo " + method + " - MIME text/plain";
                break;
            case "/html":
                mimeType = "text/html";
                body = "<html><body><h1>" + serverName
                        + "</h1><p>Metodo " + method + " - MIME text/html</p></body></html>";
                break;
            case "/json":
                mimeType = "application/json";
                body = "{\"servidor\":\"" + serverName
                        + "\",\"metodo\":\"" + method
                        + "\",\"mime\":\"application/json\"}";
                break;
            case "/xml":
                mimeType = "application/xml";
                body = "<?xml version='1.0' encoding='UTF-8'?>"
                        + "<respuesta><servidor>" + serverName
                        + "</servidor><metodo>" + method
                        + "</metodo><mime>application/xml</mime></respuesta>";
                break;
            default:
                mimeType = "text/plain";
                body = "Recurso no encontrado. Usa /texto, /html, /json o /xml";
        }

        // envia respuesta http 200 con el mime correspondiente
        byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);

        out.write("HTTP/1.1 200 OK\r\n");
        out.write("Access-Control-Allow-Origin: *\r\n");
        out.write("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n");
        out.write("Access-Control-Allow-Headers: Content-Type\r\n");
        out.write("Content-Type: " + mimeType + "; charset=utf-8\r\n");
        out.write("Content-Length: " + bodyBytes.length + "\r\n");
        out.write("Connection: close\r\n");
        out.write("\r\n");
        out.write(body);
        out.flush();
    }
}
