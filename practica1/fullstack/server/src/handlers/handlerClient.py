import json
import datetime
import uuid
import threading

from utils.loadProducts import guardar_inventario, inventario
from utils.utils import buscar_por_sku, tipos_disponibles, buscar_productos, listar_por_tipo
from utils.sendJson import enviar_json

lock_inventario = threading.Lock() # Bloque el hilo principal para no modificar el inventario con varios clientes a la vez

def manejar_cliente(conn, addr):
    carrito = {}

    def total_carrito():
        total = 0.0
        lineas = []
        for sku, cant in carrito.items():
            prod = buscar_por_sku(sku) # Busca el producto en el inventario
            if not prod:
                continue
            subtotal = prod["precio"] * cant # Calcula el subtotal
            total += subtotal # Suma el subtotal al total
            lineas.append({ # Agrega la linea al carrito
                "sku": prod["sku"], "nombre": prod["nombre"], "cantidad": cant,
                "precio_unitario": prod["precio"], "subtotal": round(subtotal, 2)
            })
        return round(total, 2), lineas # Devuelve el total y las lineas

    try:
        enviar_json(conn, {"ok": True, "msg": "Bienvenido. Usa op=help para ver comandos."}) # Envia el mensaje
        buffer = b"" # Se crea un buffer para recibir los datos vacio
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