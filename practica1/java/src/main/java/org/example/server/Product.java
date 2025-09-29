package org.example.server;

public class Product {
    public int id;
    public String name;
    public String brand;
    public String type;
    public double price;
    public int stock;

    public Product() {}
    public Product(int id, String name, String brand, String type, double price, int stock) {
        this.id = id;
        this.name = name;
        this.brand = brand;
        this.type = type;
        this.price = price;
        this.stock = stock;
    }

    public String line() { // formato en linea del producto
        return String.format("#%d | %-16s | %-10s | %-12s | $%.2f | stock:%d",
                id, name, brand, type, price, stock);
    }
}
