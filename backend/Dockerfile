# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle ./drizzle
# drizzle.config.ts is deliberately NOT copied. It imports ./src/env.js, and
# this stage ships dist/ rather than src/, so it can only ever fail here -
# which it did, on every deploy from 2026-08-29 (#64). Migrations run from
# dist/migrate.js, which is built from the same sources as the server.

# Production dependencies only. The second install this replaced -
# `npm install drizzle-kit tsx`, which ran before NODE_ENV=production and so
# reinstalled every devDependency - was the only reason dotenv was present,
# since src/env.ts imports it and it was declared as a devDependency. It is a
# runtime dependency now, which is what it always was in practice. Dropping the
# install also stops shipping eslint, vitest, typescript, tsx and drizzle-kit
# into production.
RUN npm install --omit=dev && \
    npm cache clean --force

USER nodejs

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
