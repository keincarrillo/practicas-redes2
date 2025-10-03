# src/socket/utils/loadProducts.py
import json
from config.configurations import ARCHIVO_PRODUCTOS

def cargar_inventario():
    try:
        with open(ARCHIVO_PRODUCTOS, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        # Mensaje claro para recordar el cwd correcto
        raise FileNotFoundError(
            f"No se encontró '{ARCHIVO_PRODUCTOS}'. "
            f"Ejecuta el server desde la carpeta 'server/' "
            f"o define ARCHIVO_PRODUCTOS en tu .env"
        )

def guardar_inventario(inv):
    with open(ARCHIVO_PRODUCTOS, "w", encoding="utf-8") as f:
        json.dump(inv, f, ensure_ascii=False, indent=2)

inventario = cargar_inventario()
