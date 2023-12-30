FROM --platform=linux/amd64 node:20-slim AS base

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY prisma prisma

CMD ["npx", "prisma", "migrate", "deploy"]
