import json

def enviar_json(conn, obj):
    data = (json.dumps(obj, ensure_ascii=False) + "\n").encode("utf-8") # Convierte el objeto a JSON y lo codifica en bytes
    conn.sendall(data) # Envia los datos por la conexion