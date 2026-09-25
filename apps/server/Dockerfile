FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN npm ci

# Copy sources
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Build shared and server packages
RUN npm run build:shared
RUN npm run build --workspace=apps/server

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY apps/server/migrations ./apps/server/migrations

EXPOSE 3001

CMD ["node", "apps/server/dist/index.js"]
