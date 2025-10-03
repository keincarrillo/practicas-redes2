# client.py - Cliente interactivo (REPL) para servidor TCP JSONL
# - Reconexión automática con backoff
# - Timeouts por operación (configurables)
# - Comandos: lt, gi <sku>, lbt <tipo>, srch [nombre=..] [marca=..],
#             atc <sku> <qty>, sc, co [nombre=..], help, exit

from __future__ import annotations
import os, sys, json, time, socket, shlex
from typing import Any, Dict, Optional

DEFAULT_HOST = os.getenv("HOST", "127.0.0.1")
DEFAULT_PORT = int(os.getenv("PORT", "5000"))

class JsonlSocketClient:
    def __init__(
        self,
        host: str,
        port: int,
        *,
        conn_timeout: float = 5.0,
        rw_timeout: float = 8.0,
        max_retries: int = 2,
        backoff_base: float = 0.3,
        print_welcome: bool = True,
    ) -> None:
        self.host = host
        self.port = port
        self.conn_timeout = conn_timeout
        self.rw_timeout = rw_timeout
        self.max_retries = max_retries
        self.backoff_base = backoff_base
        self.print_welcome = print_welcome
        self._sock: Optional[socket.socket] = None
        self._rd = None
        self._wr = None

    # ---- conexión ----
    def _connect(self) -> None:
        self.close()
        s = socket.create_connection((self.host, self.port), timeout=self.conn_timeout)
        s.settimeout(self.rw_timeout)
        self._sock = s
        self._rd = s.makefile("r", encoding="utf-8", newline="\n")
        self._wr = s.makefile("w", encoding="utf-8", newline="\n")
        # bienvenida no bloqueante
        try:
            s.settimeout(0.8)
            line = self._rd.readline()
            if line and self.print_welcome:
                try:
                    print("WELCOME:", json.loads(line.strip()))
                except Exception:
                    print("WELCOME(raw):", line.strip())
        except Exception:
            pass
        finally:
            s.settimeout(self.rw_timeout)

    def _ensure_connected(self) -> None:
        if self._sock is None:
            self._connect()

    # ---- E/S ----
    def _send_line(self, obj: Dict[str, Any]) -> None:
        assert self._wr is not None
        self._wr.write(json.dumps(obj, ensure_ascii=False) + "\n")
        self._wr.flush()

    def _recv_line(self) -> str:
        assert self._rd is not None
        line = self._rd.readline()
        if not line:
            raise ConnectionError("Socket cerrado por el servidor.")
        return line

    # ---- request con reintentos ----
    def request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        last_err: Optional[Exception] = None
        for attempt in range(self.max_retries + 1):
            try:
                self._ensure_connected()
                self._send_line(payload)
                raw = self._recv_line()
                return json.loads(raw)
            except (socket.timeout, TimeoutError) as e:
                last_err = e
                self._reconnect_backoff(attempt, "timeout")
            except (BrokenPipeError, ConnectionError, OSError, json.JSONDecodeError) as e:
                last_err = e
                self._reconnect_backoff(attempt, "conn")
        raise RuntimeError(f"Fallo al solicitar {payload!r}: {last_err}")

    def _reconnect_backoff(self, attempt: int, reason: str) -> None:
        self.close()
        if attempt < self.max_retries:
            time.sleep(self.backoff_base * (2 ** attempt))
            self._connect()

    def close(self) -> None:
        try:
            if self._wr: self._wr.close()
        except: pass
        try:
            if self._rd: self._rd.close()
        except: pass
        try:
            if self._sock: self._sock.close()
        except: pass
        self._sock = self._rd = self._wr = None

# --------- REPL ---------

HELP = """\
Comandos disponibles:
  lt
  gi <SKU>
  lbt <TIPO>
  srch [nombre=Texto] [marca=Texto]
  atc <SKU> <QTY>
  sc
  co [nombre=NombreCliente]
  json {...}    # enviar JSON crudo
  help
  exit | quit
Ejemplos:
  lt
  gi P0001
  lbt Laptops
  srch nombre=laptop marca=Dell
  atc P0001 2
  sc
  co nombre=Benji
"""

def parse_kv_args(tokens):
    # convierte ["nombre=foo","marca=bar"] -> {"nombre":"foo","marca":"bar"}
    out = {}
    for t in tokens:
        if "=" in t:
            k, v = t.split("=", 1)
            out[k.strip()] = v.strip()
    return out

def main():
    host = DEFAULT_HOST
    port = DEFAULT_PORT
    if len(sys.argv) >= 2 and ":" in sys.argv[1]:
        # permite "python client.py 127.0.0.1:5000"
        h, p = sys.argv[1].split(":", 1)
        host, port = h, int(p)
    elif len(sys.argv) >= 3:
        host = sys.argv[1]
        port = int(sys.argv[2])

    print(f"Conectando a {host}:{port} … (Ctrl+C para salir)")
    client = JsonlSocketClient(host, port, print_welcome=True)

    try:
        while True:
            try:
                line = input("> ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\nSaliendo…")
                break
            if not line:
                continue

            # permite pegar JSON crudo
            if line.startswith("json "):
                try:
                    payload = json.loads(line[5:].strip())
                except Exception as e:
                    print("JSON inválido:", e)
                    continue
                try:
                    resp = client.request(payload)
                    print(json.dumps(resp, ensure_ascii=False, indent=2))
                except Exception as e:
                    print("Error:", e)
                continue

            args = shlex.split(line)
            cmd = args[0].lower()

            try:
                if cmd in ("exit", "quit"):
                    break
                elif cmd == "help":
                    print(HELP)
                elif cmd == "lt":
                    print(json.dumps(client.request({"op":"lt"}), ensure_ascii=False, indent=2))
                elif cmd == "gi" and len(args) >= 2:
                    print(json.dumps(client.request({"op":"gi","sku":args[1]}), ensure_ascii=False, indent=2))
                elif cmd == "lbt" and len(args) >= 2:
                    print(json.dumps(client.request({"op":"lbt","tipo":args[1]}), ensure_ascii=False, indent=2))
                elif cmd == "srch":
                    kv = parse_kv_args(args[1:])
                    payload = {"op":"srch"}
                    if "nombre" in kv: payload["nombre"] = kv["nombre"]
                    if "marca"  in kv: payload["marca"]  = kv["marca"]
                    print(json.dumps(client.request(payload), ensure_ascii=False, indent=2))
                elif cmd == "atc" and len(args) >= 3:
                    sku, qty = args[1], int(args[2])
                    print(json.dumps(client.request({"op":"atc","sku":sku,"qty":qty}), ensure_ascii=False, indent=2))
                elif cmd == "sc":
                    print(json.dumps(client.request({"op":"sc"}), ensure_ascii=False, indent=2))
                elif cmd == "co":
                    kv = parse_kv_args(args[1:])
                    nombre = kv.get("nombre","anonimo")
                    print(json.dumps(client.request({"op":"co","cliente":{"nombre":nombre}}), ensure_ascii=False, indent=2))
                else:
                    print("Comando desconocido o argumentos insuficientes. Escribe 'help'.")
            except ValueError as e:
                print("Argumento inválido:", e)
            except Exception as e:
                print("Error:", e)

    finally:
        client.close()

if __name__ == "__main__":
    main()
