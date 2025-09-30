def buscar_por_sku(sku, inventario):
    for prod in inventario:
        if prod["sku"].upper() == sku.upper(): # Si el sku del producto es igual al sku que se busca
            return prod
    return None

def tipos_disponibles(inventario):
    return sorted(set(prod["tipo"] for prod in inventario))

def buscar_productos(nombre=None, marca=None, inventario=None):
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

def listar_por_tipo(tipo, inventario):
    tipo = tipo.strip().lower()
    return [p for p in inventario if p["tipo"].lower() == tipo]