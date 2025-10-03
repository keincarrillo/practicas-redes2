# src/socket/config/configurations.py
import os
from dotenv import load_dotenv

load_dotenv()

HOST_PY = os.getenv("HOST_PY", "0.0.0.0")
PORT_PY = int(os.getenv("PORT_PY", "5000"))
ARCHIVO_PRODUCTOS = os.getenv("ARCHIVO_PRODUCTOS", "data/productos.json")
