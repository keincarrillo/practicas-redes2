# src/socket/server.py
import socket
import threading
from dotenv import load_dotenv
from handlers.handlerClient import manejar_cliente
from config.configurations import PORT_PY, HOST_PY

load_dotenv()

DEBUG = True
def log(*a):
    if DEBUG:
        print(*a, flush=True)

def iniciar():
    print(f"Servidor en {HOST_PY}:{PORT_PY}")

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((HOST_PY, PORT_PY))
        s.listen()
        while True:
            conn, addr = s.accept()
            log("Cliente conectado:", addr)
            threading.Thread(target=manejar_cliente, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    iniciar()
