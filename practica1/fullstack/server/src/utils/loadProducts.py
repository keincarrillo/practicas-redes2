import os
import json
from config.configurations import ARCHIVO_PRODUCTOS

def cargar_inventario():
    if not os.path.exists(ARCHIVO_PRODUCTOS): # Si no existe la ruta del archivo
        raise FileNotFoundError(f"No existe {ARCHIVO_PRODUCTOS}") 
    with open(ARCHIVO_PRODUCTOS, "r", encoding="utf-8") as f: # abre un archivo mediante un administrador de contexto with, que se asegura de cerrar el archivo cuando se salga del bloque. Abre el archivo en modo de lectura y lo pasa a la variable f
        return json.load(f)

def guardar_inventario(inventario):
    with open(ARCHIVO_PRODUCTOS, "w", encoding="utf-8") as f:
        json.dump(inventario, f, ensure_ascii=False, indent=2)

inventario = cargar_inventario() # aqui se guardan los productos