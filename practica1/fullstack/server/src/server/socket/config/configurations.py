# src/socket/config/configurations.py
import os
from dotenv import load_dotenv

load_dotenv()

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "5000"))
ARCHIVO_PRODUCTOS = os.getenv("ARCHIVO_PRODUCTOS", "data/productos.json")
