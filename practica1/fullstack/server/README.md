# Servidor TCP en Python

Este proyecto implementa un servidor TCP en **Python** utilizando sockets.  
El servidor carga su configuración desde un archivo `.env` y utiliza la librería [`python-dotenv`](https://pypi.org/project/python-dotenv/) para manejar variables de entorno.

---

## 📋 Requisitos

- Python 3.10 o superior (probado en Python 3.11+)
- Librería [`python-dotenv`](https://pypi.org/project/python-dotenv/)

En Arch Linux puedes instalarla con:

```bash
sudo pacman -S python-dotenv
```

# Configuración del entorno

- Crea un archivo llamado .env dentro de la carpeta server.
- Define las siguientes variables:

  PORT: Puerto en el que el servidor escuchará.
  HOST: Dirección IP del servidor.
  ARCHIVO_PRODUCTOS: Nombre del archivo JSON con los productos.

Es importante que el archivo .env esté en la misma carpeta que server.py.
