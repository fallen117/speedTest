# SpeedTest - Powered by: Cloudflare

Medidor de velocidad de internet que corre completamente en tu equipo.  
Mide: **Latencia (ping)**, **Jitter**, **Descarga** y **Subida**.

---

## Requisitos

- **Node.js** v16 o superior → https://nodejs.org
- Conexión a internet activa

---

## Instalación y ejecución

### 1. Descomprime el archivo ZIP

Extrae la carpeta `speedtest` en cualquier lugar de tu equipo.

### 2. Abre una terminal en esa carpeta

```bash
cd speedtest
```

### 3. Instala las dependencias (solo la primera vez)

```bash
npm install
```

### 4. Inicia el servidor

```bash
npm start
```

Verás este mensaje:

```
🚀  Speed Test Server corriendo en http://localhost:3000
```

### 5. Abre el navegador

Ve a: **http://localhost:3000**

Haz clic en **INICIAR TEST** y espera unos segundos. ✅

---

## ¿Qué mide?

| Métrica       | Descripción                                                   |
|---------------|---------------------------------------------------------------|
| **Latencia**  | Tiempo de ida y vuelta al servidor (ping) en ms               |
| **Jitter**    | Variación en la latencia — a menor valor, más estable         |
| **Descarga**  | Velocidad real de bajada de datos en Mbps                     |
| **Subida**    | Velocidad real de subida de datos en Mbps                     |

También muestra información del navegador, tipo de conexión (si el navegador lo soporta), IP detectada y hora del servidor.

---

## 🛑 Detener el servidor

Presiona `Ctrl + C` en la terminal.

---

## 📁 Estructura del proyecto

```
speedtest/
├── server.js          ← Servidor Node.js/Express
├── package.json       ← Dependencias
└── public/
    ├── index.html     ← Interfaz principal
    ├── style.css      ← Estilos
    └── app.js         ← Lógica de medición
```

---

## ❓ Preguntas frecuentes

**¿Por qué necesita un servidor?**  
Para medir velocidades reales, el navegador necesita descargar y subir datos reales a un servidor. El servidor local actúa como punto de referencia. La velocidad medida es respecto a tu red local/internet según la ruta del servidor.

**¿Por qué los resultados difieren de Speedtest.net?**  
Este servidor está en tu propia máquina (localhost). Es ideal para medir la consistencia de tu conexión y latencia real. Para comparar con servidores externos, usa speedtest.net adicionalmente.

**¿Funciona en Windows, Mac y Linux?**  
Sí, Node.js es multiplataforma.
