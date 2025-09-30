import socket
import threading
import json
import uuid
import os
from datetime import datetime

HOST = "0.0.0.0"
PORT = 5000
ARCHIVO_PRODUCTOS = "data/productos.json"

lock_inventario = threading.Lock()

# Cargar productos desde JSON externo
def cargar_inventario():
    if not os.path.exists(ARCHIVO_PRODUCTOS):
        raise FileNotFoundError(f"No existe {ARCHIVO_PRODUCTOS}")
    with open(ARCHIVO_PRODUCTOS, "r", encoding="utf-8") as f:
        return json.load(f)

def guardar_inventario(inventario):
    with open(ARCHIVO_PRODUCTOS, "w", encoding="utf-8") as f:
        json.dump(inventario, f, ensure_ascii=False, indent=2)

inventario = cargar_inventario()

def buscar_por_sku(sku):
    for prod in inventario:
        if prod["sku"].upper() == sku.upper():
            return prod
    return None

def tipos_disponibles():
    return sorted(set(prod["tipo"] for prod in inventario))

def buscar_productos(nombre=None, marca=None):
    nombre = (nombre or "").strip().lower()
    marca = (marca or "").strip().lower()
    encontrados = []
    for prod in inventario:
        ok = True
        if nombre:
            ok = ok and (nombre in prod["nombre"].lower())
        if marca:
            ok = ok and (marca in prod["marca"].lower())
        if ok:
            encontrados.append(prod)
    return encontrados

def listar_por_tipo(tipo):
    tipo = tipo.strip().lower()
    return [p for p in inventario if p["tipo"].lower() == tipo]

def enviar_json(conn, obj):
    data = (json.dumps(obj, ensure_ascii=False) + "\n").encode("utf-8")
    conn.sendall(data)

def manejar_cliente(conn, addr):
    carrito = {}

    def total_carrito():
        total = 0.0
        lineas = []
        for sku, cant in carrito.items():
            prod = buscar_por_sku(sku)
            if not prod:
                continue
            subtotal = prod["precio"] * cant
            total += subtotal
            lineas.append({
                "sku": prod["sku"], "nombre": prod["nombre"], "cantidad": cant,
                "precio_unitario": prod["precio"], "subtotal": round(subtotal, 2)
            })
        return round(total, 2), lineas

    try:
        enviar_json(conn, {"ok": True, "msg": "Bienvenido. Usa op=help para ver comandos."})
        buffer = b""
        while True:
            chunk = conn.recv(4096)
            if not chunk:
                break
            buffer += chunk
            while b"\n" in buffer:
                linea, buffer = buffer.split(b"\n", 1)
                if not linea.strip():
                    continue
                try:
                    req = json.loads(linea.decode("utf-8"))
                except Exception as e:
                    enviar_json(conn, {"ok": False, "error": f"JSON inválido: {e}"})
                    continue

                op = (req.get("op") or "").lower()

                if op == "list_types":
                    enviar_json(conn, {"ok": True, "tipos": tipos_disponibles()}); continue

                if op == "search":
                    res = buscar_productos(req.get("name"), req.get("brand"))
                    enviar_json(conn, {"ok": True, "resultados": res}); continue

                if op == "list_by_type":
                    t = req.get("type")
                    enviar_json(conn, {"ok": True, "resultados": listar_por_tipo(t)}); continue

                if op == "get_item":
                    prod = buscar_por_sku(req.get("sku"))
                    if prod: enviar_json(conn, {"ok": True, "producto": prod})
                    else: enviar_json(conn, {"ok": False, "error": "No encontrado"}); continue

                if op == "add_to_cart":
                    sku, cant = req.get("sku"), req.get("qty")
                    if not sku or not isinstance(cant, int) or cant <= 0:
                        enviar_json(conn, {"ok": False, "error": "Parámetros inválidos"}); continue
                    with lock_inventario:
                        prod = buscar_por_sku(sku)
                        if not prod: enviar_json(conn, {"ok": False, "error": "SKU inválido"}); continue
                        existente = carrito.get(sku, 0)
                        if cant + existente > prod["stock"]:
                            enviar_json(conn, {"ok": False, "error": f"Stock insuficiente, disponible {prod['stock']-existente}"}); continue
                        carrito[sku] = existente + cant
                    total, lineas = total_carrito()
                    enviar_json(conn, {"ok": True, "carrito": lineas, "total": total}); continue

                if op == "show_cart":
                    total, lineas = total_carrito()
                    enviar_json(conn, {"ok": True, "carrito": lineas, "total": total}); continue

                if op == "checkout":
                    cliente = req.get("customer", "invitado")
                    with lock_inventario:
                        for sku, cant in carrito.items():
                            prod = buscar_por_sku(sku)
                            if not prod or cant > prod["stock"]:
                                enviar_json(conn, {"ok": False, "error": f"Sin stock en {sku}"}); break
                        else:
                            for sku, cant in carrito.items():
                                buscar_por_sku(sku)["stock"] -= cant
                            guardar_inventario(inventario)
                            total, lineas = total_carrito()
                            ticket = {
                                "orden": str(uuid.uuid4())[:8],
                                "fecha": datetime.now().isoformat(),
                                "cliente": cliente,
                                "items": lineas,
                                "total": total
                            }
                            carrito.clear()
                            enviar_json(conn, {"ok": True, "ticket": ticket})
                    continue

                enviar_json(conn, {"ok": False, "error": f"Operación desconocida: {op}"})

    finally:
        conn.close()

def iniciar():
    print(f"Servidor en {HOST}:{PORT}")
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((HOST, PORT)); s.listen(5)
        while True:
            conn, addr = s.accept()
            threading.Thread(target=manejar_cliente, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    iniciar()
