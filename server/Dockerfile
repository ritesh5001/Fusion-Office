# Backend image for Render: Node API + LibreOffice (Office → PDF) + Chromium
# (HTML → PDF) + fonts for Latin, Indic, CJK and Arabic scripts.
# Build context is the repo root (npm workspaces share one lockfile):
#   docker build -f server/Dockerfile -t fusion-office-server .
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates openssl \
      libreoffice-writer-nogui libreoffice-calc-nogui libreoffice-impress-nogui \
      chromium \
      fonts-dejavu-core fonts-liberation2 fonts-crosextra-carlito fonts-crosextra-caladea \
      fonts-noto-core fonts-noto-cjk \
 && rm -rf /var/lib/apt/lists/*

# Chromium's own sandbox needs kernel features container hosts rarely allow
# (CHROME_NO_SANDBOX). Pages still run in isolated, throwaway contexts and can
# only reach the public internet, through the egress proxy in lib/netGuard.ts.
ENV NODE_ENV=production \
    SOFFICE_PATH=/usr/bin/soffice \
    CHROME_PATH=/usr/bin/chromium \
    CHROME_NO_SANDBOX=1

WORKDIR /app

# Dependencies first so they cache between deploys. The Prisma schema is
# needed by the server's postinstall (prisma generate).
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY server/prisma server/prisma
RUN npm ci --workspace server --include=dev

COPY server server
RUN npm run build -w server

EXPOSE 4000
# Applies pending database migrations, then starts the API.
CMD ["npm", "run", "start:prod", "-w", "server"]
