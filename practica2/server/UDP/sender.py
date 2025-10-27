import socket
import argparse
import struct
import os
import time

# Sender udp que manda un mp3 usando go back n con ventana deslizante

parser = argparse.ArgumentParser(
    description="Sender UDP con ventana deslizante Go-Back-N"
)

# Donde el sender se queda escuchando READY del receiver
parser.add_argument("--host", default="0.0.0.0",
                    help="IP local donde el sender escucha READY")
parser.add_argument("--port", type=int, default=5000,
                    help="Puerto udp del sender")

# Archivo a mandar
parser.add_argument("--file", required=True,
                    help="Ruta del mp3 que vamos a mandar")

# Parametros del protocolo
parser.add_argument("-m", "--mtu", type=int, default=1024,
                    help="Tamaño de payload por paquete")
parser.add_argument("-k", "--window", type=int, default=5,
                    help="Tamaño de la ventana deslizante")
parser.add_argument("--timeout", type=float, default=0.2,
                    help="Segundos de timeout antes de retransmitir")

args = parser.parse_args()

SENDER_ADDR = (args.host, args.port) # Donde escucha el sender
CHUNK_SIZE = args.mtu # Tamaño de los paquetes
WINDOW_SIZE = args.window # Tamaño de la ventana
TIMEOUT = args.timeout # Segundos de timeout

# Lee el archivo binario completo y lo corta en bloques fijos
def load_file_chunks(path, chunk_size):
    data = open(path, "rb").read()
    chunks = []
    for i in range(0, len(data), chunk_size):
        chunks.append(data[i:i+chunk_size])
    return chunks

# arma paquete udp [SEQ 4 bytes][LAST 1 byte][DATA]
def make_packet(seq, is_last, payload):
    header = struct.pack("!IB", seq, 1 if is_last else 0)
    return header + payload

# parsea "ACK N" que manda el receiver
def parse_ack(msg_bytes):
    try:
        text = msg_bytes.decode().strip()
        if text.startswith("ACK"):
            parts = text.split()
            return int(parts[1])
    except:
        return None
    return None

def main():
    # Valida que el archivo exista
    if not os.path.exists(args.file):
        print(f"[SEND] No existe el archivo {args.file}")
        return

    # Crear socket udp y hacer bind para escuchar READY
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(SENDER_ADDR)
    sock.settimeout(None)

    print(f"[SEND] Esperando receptor en {SENDER_ADDR} ...")

    # Esperar READY del receiver para conocer su addr real
    msg, client_addr = sock.recvfrom(1024)
    print(f"[SEND] Recibido '{msg}' de {client_addr}")

    # Cortar el archivo en bloques
    bloques = load_file_chunks(args.file, CHUNK_SIZE)
    total_pkts = len(bloques)
    print(f"[SEND] Archivo '{args.file}' dividido en {total_pkts} paquetes.")

    # Variables go back n
    base = 0                 # primer paquete pendiente de ack
    next_seq = 0             # siguiente seq a enviar
    send_time = {}           # marca de tiempo de cada envio
    acked = [False] * total_pkts

    # A partir de aqui usamos timeout corto para detectar perdida
    sock.settimeout(TIMEOUT)

    # Loop principal mientras queden paquetes sin confirmar
    while base < total_pkts:

        # Enviar paquetes nuevos mientras haya ventana
        while next_seq < total_pkts and next_seq < base + WINDOW_SIZE:
            pkt = make_packet(
                seq=next_seq,
                is_last=(next_seq == total_pkts - 1),
                payload=bloques[next_seq]
            )
            sock.sendto(pkt, client_addr)
            send_time[next_seq] = time.time()
            print(f"[SEND] -> pkt {next_seq} (ventana {base}-{next_seq})")
            next_seq += 1

        try:
            # Leer ack del receiver
            data, _ = sock.recvfrom(1024)
            acknum = parse_ack(data)

            if acknum is not None:
                print(f"[SEND] <- ACK {acknum}")

                # marcar como confirmados todos los paquetes hasta acknum
                for i in range(base, acknum + 1):
                    if i < total_pkts:
                        acked[i] = True

                # deslizar ventana avanzando base
                while base < total_pkts and acked[base]:
                    base += 1

        except socket.timeout:
            # No llego ack a tiempo  posible perdida  retransmitir ventana
            now = time.time()
            if base < total_pkts:
                if now - send_time.get(base, 0) >= TIMEOUT:
                    print(f"[SEND] TIMEOUT en pkt {base}, retransmitiendo desde {base} hasta {next_seq-1}")
                    for seq_r in range(base, next_seq):
                        pkt = make_packet(
                            seq=seq_r,
                            is_last=(seq_r == total_pkts - 1),
                            payload=bloques[seq_r]
                        )
                        sock.sendto(pkt, client_addr)
                        send_time[seq_r] = time.time()
                        print(f"[SEND] -> RE-TX pkt {seq_r}")

    # Si salimos del while significa que todos los paquetes fueron acked
    print("[SEND] Transferencia completa. Cerrando socket.")
    sock.close()

if __name__ == "__main__":
    main()
