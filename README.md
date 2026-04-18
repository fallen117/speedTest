# SpeedTest - Powered by: Cloudflare

Medidor de velocidad de internet que corre completamente en tu equipo.  
Mide: **Latencia (ping)**, **Jitter**, **Descarga** y **Subida**.

- Uso de tecnología Cloudeflare para medición de elementos en la conexión.
Alojamiento en Web Service de Render.

https://netpulse-speedtest.onrender.com
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
