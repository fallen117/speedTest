# SpeedTest.

## Correr app (docker)
### Levantar la app (desde la raíz del proyecto)
docker compose up --build

### Ver logs del backend / nginx
docker compose logs -f node
docker compose logs -f nginx

### Detener
docker compose down

### Detener y borrar imágenes/volúmenes
docker compose down --rmi all

## Arquitectura docker
```
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