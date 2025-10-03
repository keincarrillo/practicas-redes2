# client_min.py
# Cliente mínimo para probar el servidor de sockets (TCP) con JSON-por-línea.
# Funciona en Windows, macOS o Linux con Python 3.9+.
#
# Uso rápido:
#   python client_min.py            # conecta a 127.0.0.1:5000
#   python client_min.py 192.168.1.50 5000
#
# Protocolo esperado:
#   - El servidor envía una línea JSON de bienvenida al conectar.
#   - Cada mensaje del cliente es un JSON **terminado con salto de línea \n**.
#   - Operaciones implementadas típicas: lt (list_types), lbt (list_by_type),
#     srch (search), gi (get_item), atc (add_to_cart), sc (show_cart).
#
# Este cliente hace 4 pruebas automáticas y luego deja un mini-REPL para enviar JSONs.
import sys, socket, json

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 5000

def send_json_line(wr, obj):
    wr.write(json.dumps(obj, ensure_ascii=False) + "\n")
    wr.flush()

def recv_json_line(rd):
    line = rd.readline()
    if not line:
        raise ConnectionError("Conexión cerrada por el servidor.")
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        return {"raw": line.strip()}

def quick_tests(rd, wr):
    print("\n== Prueba 1: lt (list types) ==")
    send_json_line(wr, {"op": "lt"})
    print(recv_json_line(rd))

    # Ajusta 'P0001' si tu inventario usa otros SKUs
    sku_demo = "P0001"
    print("\n== Prueba 2: gi (get item) ==")
    send_json_line(wr, {"op": "gi", "sku": sku_demo})
    print(recv_json_line(rd))

    print("\n== Prueba 3: atc (add to cart) ==")
    send_json_line(wr, {"op": "atc", "sku": sku_demo, "qty": 1})
    print(recv_json_line(rd))

    print("\n== Prueba 4: sc (show cart) ==")
    send_json_line(wr, {"op": "sc"})
    print(recv_json_line(rd))

def repl(rd, wr):
    print("\nListo. Modo interactivo. Escribe JSON y Enter. Comandos sugeridos:")
    print('  {"op":"srch","nombre":"laptop"}')
    print('  {"op":"lbt","tipo":"Laptops"}')
    print('  {"op":"gi","sku":"P0001"}')
    print('  {"op":"atc","sku":"P0001","qty":2}')
    print('  {"op":"sc"}')
    print("Ctrl+C para salir.\n")
    while True:
        try:
            s = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nSaliendo…")
            break
        if not s:
            continue
        try:
            obj = json.loads(s)
        except Exception as e:
            print("JSON inválido:", e)
            continue
        try:
            send_json_line(wr, obj)
            print(recv_json_line(rd))
        except Exception as e:
            print("Error:", e)
            break

def main():
    host = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_HOST
    try:
        port = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_PORT
    except ValueError:
        print("El puerto debe ser entero.")
        sys.exit(2)

    print(f"Conectando a {host}:{port} …")
    with socket.create_connection((host, port), timeout=5) as sock:
        rd = sock.makefile("r", encoding="utf-8", newline="\n")
        wr = sock.makefile("w", encoding="utf-8", newline="\n")

        # Mensaje de bienvenida del server (si lo hay)
        try:
            welcome = recv_json_line(rd)
            print("Bienvenida del servidor:", welcome)
        except Exception as e:
            print("No se recibió bienvenida (no es crítico):", e)

        # Pruebas rápidas
        try:
            quick_tests(rd, wr)
        except Exception as e:
            print("Pruebas rápidas fallaron/omitidas:", e)

        # REPL
        repl(rd, wr)

if __name__ == "__main__":
    main()
