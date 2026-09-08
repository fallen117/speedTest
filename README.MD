SpeedTest.

### Correr app (docker)
# Levantar la app (desde la raíz del proyecto)
docker compose up --build

# Abrir
# → http://localhost:8080

# Ver logs del backend / nginx
docker compose logs -f node
docker compose logs -f nginx

# Detener
docker compose down

# Detener y borrar imágenes/volúmenes
docker compose down --rmi all