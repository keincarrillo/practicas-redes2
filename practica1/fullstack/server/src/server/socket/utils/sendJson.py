# src/socket/utils/sendJson.py
import json

def enviar_json(conn, obj):
    data = json.dumps(obj, ensure_ascii=False) + "\n"
    conn.sendall(data.encode("utf-8"))
