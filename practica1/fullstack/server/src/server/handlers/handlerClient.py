import json
from datetime import datetime
import uuid
import threading

from utils.loadProducts import guardar_inventario, inventario
from utils.utils import (
    buscar_por_sku, tipos_disponibles, buscar_productos, listar_por_tipo
)
from utils.sendJson import enviar_json

lock_inventario = threading.Lock()

def manejar_cliente(conn, addr):
    carrito = {}

    def total_carrito():
        total = 0.0
        lineas = []
        for sku, cant in carrito.items():
            prod = buscar_por_sku(sku, inventario)
            if not prod:
                continue
            precio = float(prod.get("precio", 0))
            lineas.append({"sku": sku, "nombre": prod.get("nombre"), "qty": cant, "precio": precio, "subtotal": precio * cant})
            total += precio * cant
        return total, lineas

    try:
        enviar_json(conn, {"ok": True, "message": "Bienvenido :)"})
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
                except Exception:
                    enviar_json(conn, {"ok": False, "error": "JSON inválido"})
                    continue

                op = (req.get("op") or "").strip()

                # ---- list types ----
                if op == "lt":
                    enviar_json(conn, {"ok": True, "tipos": tipos_disponibles(inventario)})
                    continue

                # ---- list by type ----
                if op == "lbt":
                    t = req.get("tipo") or req.get("subcategoria") or req.get("categoria")
                    if not t or not str(t).strip():
                        enviar_json(conn, {"ok": False, "error": "Falta 'tipo' (subcategoria/categoria)"})
                        continue
                    res = listar_por_tipo(str(t), inventario)
                    enviar_json(conn, {"ok": True, "resultados": res})
                    continue

                # ---- search ----
                if op == "srch":
                    nombre = req.get("nombre")
                    marca  = req.get("marca")
                    res = buscar_productos(nombre=nombre, marca=marca, inventario=inventario)
                    enviar_json(conn, {"ok": True, "resultados": res})
                    continue

                # ---- get item ----
                if op == "gi":
                    sku = req.get("sku")
                    if not sku:
                        enviar_json(conn, {"ok": False, "error": "Falta 'sku'"})
                        continue
                    prod = buscar_por_sku(sku, inventario)
                    if not prod:
                        enviar_json(conn, {"ok": False, "error": "SKU inválido"})
                        continue
                    enviar_json(conn, {"ok": True, "item": prod})
                    continue

                # ---- add to cart ----
                if op == "atc":
                    sku = req.get("sku")
                    cant = req.get("qty")
                    if not sku or not isinstance(cant, int) or cant <= 0:
                        enviar_json(conn, {"ok": False, "error": "Parámetros inválidos"})
                        continue
                    with lock_inventario:
                        prod = buscar_por_sku(sku, inventario)
                        if not prod:
                            enviar_json(conn, {"ok": False, "error": "SKU inválido"})
                            continue
                        existente = carrito.get(sku, 0)
                        stock = int(prod.get("stock", 0))
                        if cant + existente > stock:
                            enviar_json(conn, {"ok": False, "error": f"Stock insuficiente, disponible {stock - existente}"})
                            continue
                        carrito[sku] = existente + cant
                    total, lineas = total_carrito()
                    enviar_json(conn, {"ok": True, "carrito": lineas, "total": total})
                    continue

                # ---- show cart ----
                if op == "sc":
                    total, lineas = total_carrito()
                    enviar_json(conn, {"ok": True, "carrito": lineas, "total": total})
                    continue

                # ---- checkout ----
                if op == "co":
                    cliente = req.get("cliente") or {"nombre": "anonimo"}
                    with lock_inventario:
                        # validar stock
                        for sku, cant in carrito.items():
                            p = buscar_por_sku(sku, inventario)
                            if not p or int(cant) > int(p.get("stock", 0)):
                                enviar_json(conn, {"ok": False, "error": f"Sin stock en {sku}"})
                                break
                        else:
                            # descontar y guardar
                            for sku, cant in carrito.items():
                                p = buscar_por_sku(sku, inventario)
                                p["stock"] = int(p.get("stock", 0)) - int(cant)
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

                # ---- op desconocida ----
                enviar_json(conn, {"ok": False, "error": f"Operación desconocida: {op}"})

    finally:
        conn.close()
