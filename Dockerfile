# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

ENV NODE_ENV=production

# GIF encoding (not included in the Playwright base image)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg git \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY src ./src
COPY templates ./templates

RUN mkdir -p output

# Long-running schedulers: activity + stats GIFs on cron, optionally publish to gists.
# Override CMD for one-off runs, e.g. ["node", "src/index.js"] or ["node", "src/upload.js", "output/your-username-activity.gif"]
CMD ["node", "src/schedulers.js"]
