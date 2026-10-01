# Build from the repo root: docker build -t frontend -f frontend/Dockerfile .

# ---- Build stage ----
FROM node:22.23-trixie-slim AS build

WORKDIR /app

# Manifests only first, for dependency-cache reuse
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci -w frontend

COPY shared/ shared/
COPY frontend/ frontend/

RUN npm run build -w frontend

# ---- Runtime stage: static files only ----
FROM nginx:1.29-alpine

# Reverse-proxy /socket.io/ to the backend on the compose network.
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist/transcendence/browser /usr/share/nginx/html
