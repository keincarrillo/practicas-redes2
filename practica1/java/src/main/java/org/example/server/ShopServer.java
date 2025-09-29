package org.example.server;

import java.io.InputStream;
import java.net.ServerSocket;
import java.net.Socket;

public class ShopServer {
    public static void main(String[] args) throws Exception {
        int port = 5000; // puerto fijo
        Catalog catalog = loadCatalog(); // carga los productos

        try (ServerSocket server = new ServerSocket(port)) {
            System.out.println("Escuchando en el puerto " + port);
            while (true) {
                Socket socket = server.accept();    // bloquea hasta que llegue un cliente
                new ClientHandler(socket, catalog).handle();
            }
        }
    }

    private static Catalog loadCatalog() {
        try (InputStream in = ShopServer.class.getResourceAsStream("/products.json")) {
            if (in != null) {
                System.out.println("Productos cargado desde resources:/products.json");
                return Catalog.fromJson(in);
            }
            System.out.println("products.json no encontrado");
        } catch (Exception e) {
            System.out.println("ERROR al cargar JSON: " + e.getMessage());
            System.out.println("Usando productos de ejemplo");
        }
        return Catalog.sample();
    }
}
