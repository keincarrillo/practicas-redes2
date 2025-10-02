def buscar_por_sku(sku, inventario):
    for prod in inventario:
        if str(prod.get("sku","")).upper() == str(sku).upper():
            return prod
    return None

def tipos_disponibles(inventario):
    tipos = set()
    for prod in inventario:
        t = (prod.get("subcategoria") or prod.get("categoria") or "").strip()
        if t:
            tipos.add(t)
    return sorted(tipos)

def buscar_productos(nombre=None, marca=None, inventario=None):
    nombre = (nombre or "").strip().lower()
    marca  = (marca  or "").strip().lower()
    encontrados = []
    for prod in inventario or []:
        ok = True
        if nombre:
            ok = ok and (nombre in str(prod.get("nombre","")).lower())
        if marca:
            ok = ok and (marca in str(prod.get("marca","")).lower())
        if ok:
            encontrados.append(prod)
    return encontrados

def listar_por_tipo(tipo, inventario):
    t = (tipo or "").strip().lower()
    def tipo_de(p):
        return (p.get("subcategoria") or p.get("categoria") or "").strip().lower()
    return [p for p in (inventario or []) if tipo_de(p) == t]