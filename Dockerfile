# Syntax: https://docs.docker.com/reference/dockerfile/

FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# API server only (frontend estático lo sirve nginx)
COPY server.js ./

ENV NODE_ENV=production

# Run as non-root user
USER node

EXPOSE 3000

CMD ["node", "server.js"]