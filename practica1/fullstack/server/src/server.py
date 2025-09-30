import socket
import threading

from config.configurations import HOST, PORT
from handlers.handlerClient import manejar_cliente

def iniciar():
    print(f"Servidor en {HOST}:{PORT}")
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s: # Se crea el socket: AF_INET = IPv4, SOCK_STREAM = TCP
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1) # Opciones del socket: Permite reutilizar el puerto sin esperar el TIME_WAIT
        s.bind((HOST, PORT)) # Enlaza el socket con la IP y el puerto
        s.listen() # Escucha las conexiones
        while True:
            conn, addr = s.accept() # Acepta las conexiones y espera a que lleguen. conn = conexion, addr = direccion
            threading.Thread(target=manejar_cliente, args=(conn, addr), daemon=True).start() # Crea un hilo para manejar la conexion

if __name__ == "__main__":
    iniciar() # Funcion principal
