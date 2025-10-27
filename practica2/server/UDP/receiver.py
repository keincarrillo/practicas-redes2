import socket      # Para crear sockets UDP y recibir datagramas.
import struct      # Para desempaquetar bytes crudos 
import json        # Para leer/escribir el catalog.json
import os          # Para manejar rutas de archivos/carpetas.
import argparse    # Para leer parametros del CLI

parser = argparse.ArgumentParser(
    description="Receptor UDP Go-Back-N: recibe canción, la guarda y actualiza catalog.json"
)

parser.add_argument("--listen-port", type=int, default=6000,
                    help="Puerto local donde este receptor escucha (UDP)")
parser.add_argument("--sender-ip", default="127.0.0.1",
                    help="IP del sender")
parser.add_argument("--sender-port", type=int, default=5000,
                    help="Puerto UDP del sender")

# Metadatos de la canción a registrar
parser.add_argument("--song-id", type=int, required=True,
                    help="ID de la canción en el catalogo")
parser.add_argument("--title", required=True,
                    help="Título de la cancion")
parser.add_argument("--artist", required=True,
                    help="Artista / autor")
parser.add_argument("--mp3-name", required=True,
                    help="Nombre con el que se va a guardar el MP3 en musicReceiver")
parser.add_argument("--cover-name", required=True,
                    help="Nombre del cover (imagen) que se va a guardar en musicReceiver")

# Parseamos todos los argumentos anteriores en 'args'
args = parser.parse_args()

# Carpeta base = donde esta este archivo receiver.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Carpeta donde vamos a guardar fisicamente las canciones recibidas (MP3)
MUSIC_DIR = os.path.join(BASE_DIR, "musicReceiver")

# Archivo JSON que guarda el catalogo de canciones 
CATALOG_FILE = os.path.join(BASE_DIR, "catalog.json")

# Dirección (IP, puerto) del SENDER UDP al que le mandamos READY y ACKs
SENDER_ADDR = (args.sender_ip, args.sender_port)

# Dirección (IP, puerto) local donde este receptor va a hacer bind() y escuchar
RECEIVER_ADDR = ("0.0.0.0", args.listen_port)

# Verifica que existan las carpetas donde vamos a guardar la canción y el catálogo
def ensure_dirs():
    os.makedirs(MUSIC_DIR, exist_ok=True)
    if not os.path.exists(CATALOG_FILE): # Si no existe, lo creamos
        with open(CATALOG_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)

# Recibe los bytes crudos reconstruidos de la canción (bytearray) y lo guarda en musicReceiver con el nombre de la cancion
def save_track_file(bytes_data, filename):
    ensure_dirs()
    dest_path = os.path.join(MUSIC_DIR, filename)
    with open(dest_path, "wb") as f:
        f.write(bytes_data)
    print(f"[RECV] Cancion guardada en {dest_path}")
    return dest_path

# Lee catalog.json y devuelve la lista de canciones
def load_catalog():
    ensure_dirs()
    with open(CATALOG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# Guarda la nueva versión del catálogo
def save_catalog(catalog):
    with open(CATALOG_FILE, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    print("[RECV] catalog.json actualizado.")

# Inserta o actualiza la entrada de esta cancion en catalog.json
def register_song(song_id, titulo, artista, mp3_filename, cover_filename):
    catalog = load_catalog()
    found = False

    for s in catalog:
        if s["id"] == song_id:
            # actualizamos la cancion existente
            s["titulo"]  = titulo
            s["artista"] = artista
            s["archivo"] = mp3_filename
            s["cover"]   = cover_filename
            found = True
            break

    if not found:
        # si no estaba, la agregamos nueva
        catalog.append({
            "id": song_id,
            "titulo": titulo,
            "artista": artista,
            "archivo": mp3_filename,
            "cover": cover_filename
        })

    save_catalog(catalog)

# Convierte el datagrama crudo en seq, is_last y data
def parse_packet(pkt_bytes):
    if len(pkt_bytes) < 5:
        return None, None, None
    
    seq, last_flag = struct.unpack("!IB", pkt_bytes[:5])

    # El resto del datagrama son bytes del MP3
    data = pkt_bytes[5:]

    # last_flag == 1 => este es el último chunk del archivo
    return seq, (last_flag == 1), data

# Manda un ACK al sender, esto le permite al sender saber hasta donde deslizar la ventana.
def send_ack(sock, addr, seq):
    msg = f"ACK {seq}\n".encode()
    sock.sendto(msg, addr)
    print(f"[RECV] -> ACK {seq}")

def main():
    # Crea socket UDP y ponerlo a escuchar
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(RECEIVER_ADDR)
    # Timeout de 2s para que recvfrom() no se quede bloqueado infinito
    sock.settimeout(2.0)

    print(f"[RECV] Escuchando en {RECEIVER_ADDR}")

    # Handshake inicial, mandamos "READY" al sender
    sock.sendto(b"READY", SENDER_ADDR)
    print(f"[RECV] READY enviado a {SENDER_ADDR}")

    # Variables de control para Go-Back-N
    esperado = 0          # proximo numero de secuencia que espero recibir en orden
    ultimo_ok = -1        # ultimo paquete consecutivo valido que ya tengo
    file_bytes = bytearray()  # buffer donde voy armando todo el MP3
    termino = False       # lo ponemos True cuando llega el ultimo paquete

    # Recibir paquetes hasta terminar la canción
    while not termino:
        try:
            # recvfrom() regresa (datos, addr_remota)
            pkt, srv_addr = sock.recvfrom(65535)
        except socket.timeout:
            # Si aun no terminamos, seguimos intentando recibir
            if termino:
                break
            else:
                continue

        # Interpretar el paquete recibido segun nuestro formato
        seq, is_last, data = parse_packet(pkt)
        if seq is None:
            # Paquete invalido/dañado
            continue

        # Muestra el paquete recibido
        print(f"[RECV] <- pkt {seq}  bytes={len(data)}  last={is_last}")

        # Aceptamos SOLO si este paquete es EXACTAMENTE el que esperabamos, esto es Go-Back-N
        if seq == esperado:
            # Agregamos los bytes al buffer final del MP3 en el orden correcto
            file_bytes.extend(data)

            # Actualizamos 
            ultimo_ok = seq

            # Ahora espero el siguiente paquete
            esperado += 1

            # Si este paquete es el ultimo
            if is_last:
                termino = True

        # Mandamos ACK acumulativo.
        ack_to_send = ultimo_ok if ultimo_ok >= 0 else -1
        send_ack(sock, srv_addr, ack_to_send)

        # Si llego el ultimo paquete, termino
        if is_last and seq <= ultimo_ok:
            termino = True

    # Cerramos el socket UDP
    sock.close()
    print("[RECV] Transferencia terminada, guardando archivo...")

    # Guardamos el MP3
    save_track_file(file_bytes, args.mp3_name)

    # Actualizamos el catalogo
    register_song(
        song_id=args.song_id,
        titulo=args.title,
        artista=args.artist,
        mp3_filename=args.mp3_name,
        cover_filename=args.cover_name
    )

    print("[RECV] Listo. Esta cancion ya esta en el catalogo")

if __name__ == "__main__":
    main()
