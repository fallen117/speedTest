# SpeedTest.

## Descripción general

SpeedTest es una aplicación web para medir la velocidad de conexión del cliente a través de pruebas de latencia, subida y descarga. La solución está dividida en dos capas principales:

- Frontend: interfaz web desarrollada con React y Vite.
- Backend: API REST desarrollada con Node.js y Express.
- Proxy inverso: NGINX encarga de servir el frontend y enrutar las peticiones a la API.

El objetivo del sistema es ofrecer una experiencia simple para ejecutar pruebas de rendimiento desde el navegador, sin depender de servicios externos ni de configuración compleja en el cliente.

## ¿Cómo funciona la aplicación?

La aplicación se compone de tres flujos principales:

1. Interacción del usuario
   - El cliente accede a la interfaz web.
   - Desde la UI se dispara una prueba de velocidad que solicita datos al backend.

2. Backend de medición
   - El servicio Node.js expone endpoints para:
     - ping: mide la latencia de respuesta del servidor.
     - upload: valida el rendimiento de subida.
     - download: proxy de descarga para simular transferencia de datos.
   - La lógica de medición se ejecuta en el servidor para mantener un control centralizado del comportamiento de la red y la respuesta del sistema.

3. Servidor web y entrega de contenido
   - NGINX sirve los archivos estáticos compilados por React.
   - Además, actúa como reverse proxy para redirigir las llamadas a la API del backend (`/api`) a `node:3000`.
   - Esto permite que el frontend y la API compartan una misma exposición de red para el usuario final.

## Componentes del sistema

### Frontend

La parte visual se encuentra en `client/` y está construida con React + Vite. Su responsabilidad es:

- mostrar la interfaz de usuario;
- iniciar las pruebas de velocidad;
- presentar resultados de rendimiento en formato legible;
- comunicar la información con el backend a través de peticiones HTTP.

### Backend

La capa de servicios se encarga de atender las solicitudes de la aplicación. Se basa en Express y corre en un contenedor dedicado llamado `node`.

Funciones principales:

- exponer APIs para pruebas de red;
- responder a solicitudes de ping, upload y download;
- proporcionar una capa de negocio centrada en el rendimiento de la conexión;
- actuar como punto de integración entre la UI y la infraestructura del servidor.

### NGINX

NGINX es el componente de acceso y entrega. Su papel es doble:

- servir los archivos estáticos generados por el frontend;
- redirigir las llamadas de la API al servicio backend.

Esto simplifica la arquitectura y permite un despliegue más limpio, con una sola entrada HTTP para la aplicación.

## Arquitectura docker

```text
docker-compose.yml  ← orquestador (une ambos)
   │
   ├── servicio "node"
   │     └── Dockerfile (raíz)      → imagen speedtest-node
   │          base: node:20-alpine
   │          contenido: Express + server.js  (solo API)
   │          papel: backend (ping, upload, download-proxy)
   │
   └── servicio "nginx"
         └── client/Dockerfile      → imagen speedtest-nginx
              etapa 1: node:20-alpine → compila React (Vite → dist/)
              etapa 2: nginx:alpine  → sirve los estáticos
              papel: frontend + reverse proxy /api → node:3000
```

## Estructura funcional de la aplicación

La organización del proyecto responde a una separación clara de responsabilidades:

- `Dockerfile`: define la imagen del backend en Node.
- `docker-compose.yml`: orquesta los servicios de la aplicación.
- `client/Dockerfile`: prepara el frontend y lo entrega a NGINX.
- `server.js`: lógica del servidor y endpoints de la API.
- `client/`: código fuente del frontend.

