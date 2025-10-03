# src/socket/config/configurations.py
import os
from dotenv import load_dotenv

load_dotenv()

# Red: host/puerto del socket
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "5000"))

# Ruta del inventario: RELATIVA (no se resuelve a absoluta)
# Si ejecutas desde server/, esto apunta a server/data/productos.json
ARCHIVO_PRODUCTOS = os.getenv("ARCHIVO_PRODUCTOS", "data/productos.json")
