package org.example.server;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.util.*;

public class Catalog {
    // almacena productos en memoria e indexa por id
    private final Map<Integer, Product> productsById = new HashMap<>();

    // crea un catalogo a partir de un JSON (lista de productos)
    public static Catalog fromJson(InputStream in) throws Exception {
        ObjectMapper mapper = new ObjectMapper(); // parser JSON
        List<Product> items = mapper.readValue(in, new TypeReference<List<Product>>() {}); // lee lista
        Catalog c = new Catalog(); // nuevo catalogo vacio
        for (Product p : items) {
            if (p == null) continue; // ignora entradas nulas
            // valida campos requeridos minimos
            if (p.name == null || p.brand == null || p.type == null)
                throw new IllegalArgumentException("Producto invalido en JSON (faltan campos requeridos)");
            p.type = p.type.toUpperCase(Locale.ROOT); // normaliza tipo a mayusculas
            // detecta ids duplicados
            if (c.productsById.putIfAbsent(p.id, p) != null)
                throw new IllegalArgumentException("ID de producto duplicado en JSON: " + p.id);
        }
        return c; // devuelve el catalogo cargado
    }

    // catalogo de ejemplo cuando no hay JSON
    public static Catalog sample() {
        Catalog c = new Catalog();
        c.add(new Product(101, "Auriculares", "Sony", "ELECTRONICA", 899.0, 8));
        c.add(new Product(201, "Playera", "Adidas", "ROPA", 399.0, 20));
        c.add(new Product(301, "Sartén 28cm", "T-fal", "HOGAR", 559.0, 12));
        c.add(new Product(401, "Café 500g", "Gourmet", "ALIMENTOS", 169.0, 30));
        return c;
    }

    // agrega o reemplaza un producto por id
    public void add(Product p){ productsById.put(p.id, p); }

    // obtiene un producto por id, o null si no existe
    public Product get(int id){ return productsById.get(id); }

    // busca por nombre o marca (case-insensitive) y ordena por id
    public List<Product> search(String term){
        String t = term.toLowerCase(Locale.ROOT); // normaliza termino
        List<Product> out = new ArrayList<>();
        for (Product p : productsById.values())
            if (p.name.toLowerCase().contains(t) || p.brand.toLowerCase().contains(t))
                out.add(p);
        out.sort(Comparator.comparingInt(pp -> pp.id)); // orden estable por id
        return out;
    }

    // lista productos por tipo (case-insensitive) y ordena por id
    public List<Product> listByType(String type){
        String wanted = type.toUpperCase(Locale.ROOT); // normaliza tipo
        List<Product> out = new ArrayList<>();
        for (Product p : productsById.values())
            if (p.type.equals(wanted))
                out.add(p);
        out.sort(Comparator.comparingInt(pp -> pp.id));
        return out;
    }

    // intenta comprar: valida stock y descuenta si todo es valido
    public boolean tryPurchase(Map<Integer,Integer> req){
        // primera pasada: validar disponibilidad
        for (var e : req.entrySet()) {
            Product p = productsById.get(e.getKey());
            int qty = e.getValue();
            if (p == null || qty <= 0 || p.stock < qty) return false; // falla si no alcanza
        }
        // segunda pasada: descontar existencias
        for (var e : req.entrySet())
            productsById.get(e.getKey()).stock -= e.getValue();
        return true; // exito
    }
}
