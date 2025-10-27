import os
import json
import subprocess
import sys
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PLAN_FILE = os.path.join(BASE_DIR, "catalog.json")
SENDER_SCRIPT = os.path.join(BASE_DIR, "sender.py")
RECEIVER_SCRIPT = os.path.join(BASE_DIR, "receiver.py")

def main():
    # Cargar catalog.json
    if not os.path.exists(PLAN_FILE):
        print("[SYNC] No existe catalog.json")
        return

    with open(PLAN_FILE, "r", encoding="utf-8") as f:
        plan = json.load(f)

    if not isinstance(plan, list) or len(plan) == 0:
        print("[SYNC] catalog.json esta vacío o no es lista")
        return

    print(f"[SYNC] Se van a transferir {len(plan)} canciones en orden...")

    for song in plan:
        # extraemos campos esperados
        song_id    = song["id"]
        title      = song["title"]
        artist     = song["artist"]
        file_path  = song["file"]        # ruta local del mp3 de origen
        mp3_name   = song["mp3_name"]    # nombre final en /music
        cover_name = song["cover_name"]  # nombre de la portada en /music

        print("")
        print(f"[SYNC] ***** Cancion ID={song_id} *****")
        print(f"       title: {title}")
        print(f"       artist: {artist}")
        print(f"       source file: {file_path}")
        print(f"       dest mp3_name: {mp3_name}")
        print(f"       cover: {cover_name}")

        # Lanzar sender.py
        sender_cmd = [
            sys.executable,          # el mismo python
            SENDER_SCRIPT,
            "--host", "0.0.0.0",
            "--port", "5000",
            "--file", file_path,
            "-m", "1024",
            "-k", "5",
            "--timeout", "0.2",
        ]
        print(f"[SYNC] Lanzando sender: {' '.join(sender_cmd)}")
        sender_proc = subprocess.Popen(sender_cmd)

        # Pequeña pausa para que el sender haga bind() y se ponga en modo 'esperando READY'
        time.sleep(0.2)

        # Lanzar receiver.py
        receiver_cmd = [
            sys.executable,
            RECEIVER_SCRIPT,
            "--listen-port", "6000",
            "--sender-ip", "127.0.0.1",
            "--sender-port", "5000",
            "--song-id", str(song_id),
            "--title", title,
            "--artist", artist,
            "--mp3-name", mp3_name,
            "--cover-name", cover_name,
        ]
        print(f"[SYNC] Lanzando receiver: {' '.join(receiver_cmd)}")
        receiver_proc = subprocess.Popen(receiver_cmd)

        # Esperar a que ambos terminen
        receiver_ret = receiver_proc.wait()
        sender_ret = sender_proc.wait()
        print(f"[SYNC] receiver termino con {receiver_ret}, sender termino con {sender_ret}")
        print(f"[SYNC] Cancion ID={song_id} terminada y registrada.\n")

    print("[SYNC] TODAS LAS CANCIONES LISTAS")

if __name__ == "__main__":
    main()
