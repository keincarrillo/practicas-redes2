# Redes 2 — Repositorio de Prácticas (Resumen General)

**Profesor:** Axel Ernesto Moreno Cervantes  
**Materia:** Aplicaciones para Comunicaciones en Red

Este repositorio reúne una serie de prácticas para la materia **Redes 2**, enfocadas en implementar y entender, de manera práctica, distintos conceptos clave de redes: **sockets TCP/UDP**, **protocolos de aplicación**, **confiabilidad sobre UDP**, **servidores web**, **WebSockets**, **concurrencia** y **E/S no bloqueante**.

La idea general es ir construyendo proyectos cada vez más completos, pasando de comunicación básica cliente-servidor a sistemas con **múltiples capas**, **interfaz web**, y mecanismos más avanzados como **ventanas deslizantes**, **pool de hilos**, y **selectores NIO**.

---

## Prácticas incluidas

### Práctica 1 — Tienda por Sockets (TCP) + Proxy HTTP + Cliente Web

Se construye una "tienda" donde la lógica principal se maneja por **TCP (sockets)** y se integra con un **proxy HTTP** para que un **cliente web** pueda consumir el servicio como si fuera una API.  
En esencia, conecta el mundo "sockets puros" con el mundo "web".

---

### Práctica 2 — Música: Confiabilidad sobre UDP + API + Reproductor

Se desarrolla un flujo completo donde archivos (música) se transfieren usando **UDP con confiabilidad** (ventana deslizante / estilo Go-Back-N).  
Luego se integran esos archivos a una **API REST** y a un **reproductor web**.

---

### Práctica 3 — Chat Multiusuario (WebSocket) + UDP + Audios

Se implementa un sistema de chat por salas con mensajería en tiempo real usando **WebSockets**, además de una variante por **UDP**.  
Incluye soporte para funcionalidades más "sociales" como salas, mensajes privados, stickers y envío de audios.

---

### Práctica 4 — Servidor HTTP en Java con Concurrencia + Redirect por carga

Se crea un servidor HTTP desde cero en Java (sin frameworks), aplicando **concurrencia** con un **pool de hilos**.  
Se modela un escenario de "carga" donde el servidor puede **redireccionar** a un segundo servidor cuando está saturado.

---

### Práctica 5 — WGET/Crawler HTTP con Java NIO + Interfaz Swing

Se desarrolla un descargador tipo **WGET** / crawler capaz de manejar múltiples descargas de forma concurrente usando **Java NIO (Selector)**, acompañado de una GUI en **Swing** para facilitar pruebas y control del proceso.

---

## Objetivo del repositorio

Este repo busca demostrar el avance progresivo en el dominio de:

- Comunicación **cliente-servidor** (TCP/UDP)
- Modelos web: **HTTP**, **API**, **frontend web**
- **Concurrencia** y manejo de carga
- **Confiabilidad** sobre protocolos no confiables (UDP)
- Programación de red con **NIO** y enfoque escalable

---

## Cómo navegar el repo

Cada práctica vive en su carpeta (practica1/, practica2/, etc.) y usualmente incluye:

- server/ o lógica backend
- client/ si existe interfaz web o GUI
- Archivos de prueba (catálogos, audios, inventarios, etc.)

---

## Licencia

Uso académico (ESCOM/IPN).
