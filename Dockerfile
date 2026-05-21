# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.60.0-noble AS runner

WORKDIR /app

ENV NODE_ENV=production

# GIF encoding (not included in the Playwright base image)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg git \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY templates ./templates

RUN mkdir -p output

# Long-running scheduler: generate GIF on cron, then upload to R2.
# Override CMD for one-off runs, e.g. ["node", "dist/index.js"] or ["node", "dist/upload.js", "output/your-username-activity.gif"]
CMD ["node", "dist/scheduler.js"]
