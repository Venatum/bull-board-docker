# Multi-stage build for optimization
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install --frozen-lockfile --production

# Production stage
FROM oven/bun:1-alpine AS production

ENV NODE_ENV=production

ARG PORT=3000
ENV PORT=$PORT
EXPOSE $PORT

RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

USER bun

WORKDIR /home/bun/

# Copy node_modules from builder stage
COPY --from=builder --chown=bun:bun /app/node_modules ./node_modules

COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun ./src ./src

# Use dumb-init for proper signal handling and direct bun execution for better performance
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "start"]
