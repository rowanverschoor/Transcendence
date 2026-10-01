# Build from the repo root: docker build -t backend -f backend/Dockerfile .
FROM node:22.23-trixie-slim

WORKDIR /app

# Manifests only first, for dependency-cache reuse
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY backend/package.json backend/package.json

RUN npm ci -w backend --omit=dev

COPY shared/ shared/
COPY backend/ backend/

WORKDIR /app/backend
ENTRYPOINT ["npm", "run", "serve"]
