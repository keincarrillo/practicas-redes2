package org.example.server;

import java.io.*;
import java.net.Socket;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class ClientHandler {
    // maneja una sesion de un cliente
    private final Socket socket;         // socket del cliente
    private final Catalog catalog;       // referencia al catalogo
    private final Map<Integer,Integer> cart = new LinkedHashMap<>(); // carrito id -> cantidad

    public ClientHandler(Socket socket, Catalog catalog){
        this.socket = socket; this.catalog = catalog;
    }

    public void handle() {
        // crea streams de entrada/salida y auto flush
        try (BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
             PrintWriter out = new PrintWriter(new OutputStreamWriter(socket.getOutputStream()), true)) {

            out.println("Hola :) Escribe HELP para ver los comandos");
            String line;
            // bucle principal: leer comando, procesar y responder
            while ((line = in.readLine()) != null) {
                String resp = handleCommand(line.trim());
                out.println(resp);
                if ("BYE".equals(resp))
                    break; // termina sesion si servidor responde BYE
            }
        }
        catch (IOException ignored) {
        } finally {
            try { socket.close(); } catch (IOException ignored) {} // libera el socket
        }
    }

    private String handleCommand(String cmdline){
        // valida entrada vacia
        if (cmdline.isEmpty()) return "ERROR Comando vacio";
        String[] tok = cmdline.split("\\s+");          // separa por espacios
        String cmd = tok[0].toUpperCase(Locale.ROOT);  // normaliza comando

        switch (cmd) {
            case "HELP":
                // muestra ayuda y formato de comandos
                return """
                       Comandos:
                       HELP | 
                       SEARCH <termino> (buscar producto por id) | 
                       LIST <tipo> (listar productos por tipo) |
                       ADD <id> <cant> (añadir productos) | 
                       UPDATE <id> <cant> (actualizar cantidad de producto) | 
                       REMOVE <id> (eliminar del carrito) |
                       CART (ver el carrito) | 
                       CHECKOUT (ticket) | 
                       QUIT (terminar la conexion)
                       """;
            case "SEARCH":
                // busca por nombre o marca segun termino
                if (tok.length < 2)
                    return "ERROR Uso: SEARCH <termino>";
                String term = cmdline.substring(cmdline.indexOf(' ') + 1);
                var results = catalog.search(term);
                if (results.isEmpty())
                    return "Ok 0 resultados";
                StringBuilder sb = new StringBuilder("Ok resultados:\n");
                for (var p : results)
                    sb.append(p.line()).append('\n'); // imprime una linea por producto
                return sb.toString().trim();

            case "LIST":
                // lista productos por tipo
                if (tok.length != 2)
                    return "ERROR Uso: LIST <tipo>";
                var list = catalog.listByType(tok[1]);
                if (list.isEmpty())
                    return "ERROR Tipo desconocido o sin productos";
                StringBuilder sb2 = new StringBuilder("Ok Lista:\n");
                for (var p : list)
                    sb2.append(p.line()).append('\n');
                return sb2.toString().trim();

            case "ADD":
                // agrega un producto al carrito
                if (tok.length != 3)
                    return "ERROR Uso: ADD <id> <cant>";
                try {
                    int id = Integer.parseInt(tok[1]);   // parsea id
                    int qty = Integer.parseInt(tok[2]);  // parsea cantidad
                    var p = catalog.get(id);             // obtiene producto
                    if (p == null)
                        return "ERROR Producto no existe";
                    if (qty <= 0)
                        return "ERROR La cantidad debe ser > 0";
                    if (p.stock < qty)
                        return "ERROR Stock insuficiente (disp: " + p.stock + ")";
                    cart.merge(id, qty, Integer::sum);   // suma si ya estaba en carrito
                    return "Ok Agregado: " + p.name + " x" + qty;
                } catch (NumberFormatException e) {
                    return "ERROR id/cant invalidos";    // valida numeros
                }

            case "UPDATE":
                // actualiza cantidad; si qty <= 0 elimina del carrito
                if (tok.length != 3)
                    return "ERROR Uso: UPDATE <id> <cant>";
                try {
                    int id = Integer.parseInt(tok[1]);
                    int qty = Integer.parseInt(tok[2]);
                    if (!cart.containsKey(id))
                        return "ERROR Ese producto no esta en el carrito";
                    var p = catalog.get(id);
                    if (p == null)
                        return "ERROR Producto no existe";
                    if (qty <= 0) {
                        cart.remove(id);                 // elimina item
                        return "Ok Eliminado del carrito";
                    }
                    if (p.stock < qty)
                        return "ERROR Stock insuficiente (disp: " + p.stock + ")";
                    cart.put(id, qty);                   // setea nueva cantidad
                    return "Ok Cantidad actualizada";
                } catch (NumberFormatException e){
                    return "ERROR id/cant invalidos";
                }

            case "REMOVE":
                // elimina un item del carrito
                if (tok.length != 2)
                    return "ERROR Uso: REMOVE <id>";
                try {
                    int id = Integer.parseInt(tok[1]);
                    if (cart.remove(id) != null)
                        return "Ok Eliminado";
                    return "ERROR No esta en el carrito";
                } catch (NumberFormatException e){
                    return "ERROR id invalido";
                }

            case "CART":
                // muestra contenido del carrito y total
                if (cart.isEmpty())
                    return "Ok Carrito vacío";
                return renderCart();

            case "CHECKOUT":
                // intenta comprar: valida stock, descuenta y genera ticket
                if (cart.isEmpty())
                    return "ERROR Carrito vacio";
                var req = new LinkedHashMap<>(cart); // copia inmutable de la peticion
                boolean ok = catalog.tryPurchase(req);
                if (!ok)
                    return "ERROR La compra no pudo completarse (el stock cambio)";
                String ticket = buildTicket(req);
                cart.clear(); // limpia carrito tras comprar
                return "Ok TICKET\n" + ticket;

            case "QUIT":
                // termina sesion
                return "BYE";
            default:
                // comando no reconocido
                return "ERROR Comando desconocido (HELP)";
        }
    }

    private String renderCart(){
        // construye vista de carrito y suma total
        StringBuilder sb = new StringBuilder("Ok Carrito:\n");
        double total = 0.0;
        for (var e : cart.entrySet()) {
            var p = catalog.get(e.getKey());
            int qty = e.getValue();
            double sub = p.price * qty;  // subtotal por producto
            total += sub;
            sb.append(String.format("#%d %-16s x%-3d  $%.2f\n", p.id, p.name, qty, sub));
        }
        sb.append(String.format("TOTAL: $%.2f", total));
        return sb.toString();
    }

    private String buildTicket(Map<Integer,Integer> req){
        // arma un ticket simple con fecha y total
        double total = 0.0;
        StringBuilder items = new StringBuilder();
        for (var e : req.entrySet()){
            var p = catalog.get(e.getKey());
            int qty = e.getValue();
            double sub = p.price * qty;
            total += sub;
            items.append(String.format("#%d %-16s x%-3d  $%.2f\n", p.id, p.name, qty, sub));
        }
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")); // timestamp
        return "==== TICKET ====\n" + ts + "\n" + items + String.format("TOTAL: $%.2f\n", total) + "============";
    }
}
