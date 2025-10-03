# src/socket/server.py
import socket
import os
import threading
from dotenv import load_dotenv
from handlers.handlerClient import manejar_cliente

load_dotenv()

DEBUG = True
def log(*a):
    if DEBUG:
        print(*a, flush=True)

def iniciar():
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5000"))
    print(f"Servidor en {host}:{port}")

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((host, port))
        s.listen()
        while True:
            conn, addr = s.accept()
            log("Cliente conectado:", addr)
            threading.Thread(target=manejar_cliente, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    iniciar()
