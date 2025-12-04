package org.example;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

// clase que maneja una conexion individual dentro del pool de hilos
class ClientHandler implements Runnable {

    // socket del cliente
    private final Socket clientSocket;

    // indica si la conexion viene del servidor principal
    private final boolean fromPrimaryServer;

    // contador de conexiones activas (solo se usa en servidor 1)
    private final AtomicInteger activeConnections;

    ClientHandler(Socket socket, boolean fromPrimaryServer, AtomicInteger activeConnections) {
        this.clientSocket = socket;
        this.fromPrimaryServer = fromPrimaryServer;
        this.activeConnections = activeConnections;
    }

    @Override
    public void run() {
        boolean shouldRedirect = false;

        // try-with-resources para cerrar socket y flujos automaticamente
        try (Socket socket = this.clientSocket;
             BufferedReader in = new BufferedReader(
                     new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
             BufferedWriter out = new BufferedWriter(
                     new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8))) {

            System.out.println((fromPrimaryServer ? "[S1]" : "[S2]") +
                    " Nueva conexion desde " + socket.getRemoteSocketAddress());

            // pausa opcional para simular trabajo y acumular conexiones
            try {
                Thread.sleep(500);
            } catch (InterruptedException ignored) {}

            // logica de conteo y arranque de servidor 2 solo en servidor principal
            if (fromPrimaryServer && activeConnections != null) {
                int inUse = activeConnections.incrementAndGet();

                int threshold = Math.max(1, HttpServerPool.poolSize / 2);
                System.out.println("[S1] Conexiones activas = " + inUse +
                        " (umbral = " + threshold + ")");

                // si se supera el umbral se intenta iniciar el servidor 2 una sola vez
                if (inUse > threshold &&
                        HttpServerPool.secondaryServerStarted.compareAndSet(false, true)) {

                    System.out.println("Pool del servidor 1 supero la mitad. Iniciando servidor 2...");
                    HttpServerPool.startSecondaryServer();
                }

                // si el servidor 2 ya esta iniciado y seguimos sobre el umbral se marca redireccion
                if (HttpServerPool.secondaryServerStarted.get()
                        && inUse > threshold
                        && HttpServerPool.secondaryPort > 0) {

                    System.out.println("[S1] Redireccionando esta peticion al servidor 2");
                    shouldRedirect = true;
                }
            }

            // lee la primera linea de la peticion http
            String requestLine = in.readLine();
            if (requestLine == null || requestLine.isEmpty()) {
                return;
            }

            // separa metodo y ruta de la linea de peticion
            String[] parts = requestLine.split(" ");
            String method = parts.length > 0 ? parts[0] : "";
            String path = parts.length > 1 ? parts[1] : "/";

            // lee encabezados restantes hasta linea vacia
            String line;
            while ((line = in.readLine()) != null && !line.isEmpty()) {
                // encabezados ignorados en este ejemplo
            }

            // decide si redirige o atiende localmente
            if (shouldRedirect) {
                HttpServerPool.sendRedirect(out, path);
            } else {
                HttpServerPool.handleRequest(out, method, path,
                        fromPrimaryServer ? "Servidor 1" : "Servidor 2");
            }

            // por si acaso, nos aseguramos de enviar todo
            out.flush();

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            // al cerrar la conexion se decrementa el contador del servidor 1
            if (fromPrimaryServer && activeConnections != null) {
                int remaining = activeConnections.decrementAndGet();
                System.out.println("[S1] Conexiones activas despues de cerrar = " + remaining);
            }
        }
    }
}
