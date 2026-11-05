# Multi-stage build for optimization
FROM node:26-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production --no-audit --no-fund

# Production stage
FROM node:26-alpine AS production

ENV NODE_ENV=production

ARG PORT=3000
ENV PORT=$PORT
EXPOSE $PORT

# npm is not needed at runtime; removing it drops the CVEs of its bundled dependencies
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

USER node

WORKDIR /home/node/

# Copy node_modules from builder stage
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

COPY --chown=node:node package.json ./
COPY --chown=node:node ./src ./src

# Use dumb-init for proper signal handling and direct node execution for better performance
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "."]
