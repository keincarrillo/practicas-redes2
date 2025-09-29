package org.example.client;

import java.io.*;
import java.net.Socket;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Scanner;

public class ShopClient {
    public static void main(String[] args) throws Exception {
        String host = "127.0.0.1"; // direccion del servidor
        int port = 5000;           // puerto del servidor

        // abre socket y streams (auto-flush en PrintWriter)
        try (Socket s = new Socket(host, port);
             BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream()));
             PrintWriter out = new PrintWriter(new OutputStreamWriter(s.getOutputStream()), true);
             Scanner sc = new Scanner(System.in)) {

            System.out.println(in.readLine()); // lee saludo inicial del servidor

            boolean running = true; // bandera de sesion
            while (running) {
                printMenu();                 // muestra menu local
                System.out.print("> ");      // prompt
                String cmd = sc.nextLine().trim(); // lee comando del usuario
                if (cmd.isEmpty()) continue; // ignora vacios

                out.println(cmd);            // envía comando al servidor
                String first = in.readLine();// primera linea de respuesta
                if (first == null) break;    // servidor cerro la conexion

                // bloque especial para ticket: junta resto de lineas y guarda archivo
                if (first.startsWith("OK TICKET")) {
                    StringBuilder rest = new StringBuilder();
                    String line;
                    while (in.ready() && (line = in.readLine()) != null) rest.append(line).append('\n');
                    String full = first + "\n" + rest.toString().trim();
                    System.out.println(full); // imprime ticket completo en consola

                    // nombre de archivo con timestamp y escritura a disco
                    String fname = "ticket_" + LocalDateTime.now()
                            .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".txt";
                    Files.writeString(Paths.get(fname), full);
                    System.out.println("[CLIENTE] Ticket guardado: " + fname);
                } else {
                    // respuesta normal de una o varias lineas
                    StringBuilder block = new StringBuilder(first);
                    String line;
                    while (in.ready() && (line = in.readLine()) != null) block.append('\n').append(line);
                    System.out.println(block);

                    // fin de sesion cuando el servidor responde BYE
                    if ("BYE".equals(first))
                        running = false;
                }
            }
        }
    }

    // imprime el menu local de ayuda de comandos
    private static void printMenu(){
        System.out.println("""
            ---- SOCKETESHOP ----
            1) SEARCH <termino>
            2) LIST <tipo>
            3) ADD <id> <cant>
            4) UPDATE <id> <cant>   (0 elimina)
            5) REMOVE <id>
            6) CART
            7) CHECKOUT
            8) HELP
            9) QUIT
            (Teclea el comando directamente)
            """);
    }
}
