# Multi-stage build for optimization
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production --no-audit --no-fund

# Production stage
FROM node:24-alpine AS production

ENV NODE_ENV=production

ARG PORT=3000
ENV PORT=$PORT
EXPOSE $PORT

RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

USER node

WORKDIR /home/node/

# Copy node_modules from builder stage
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

COPY --chown=node:node package.json ./
COPY --chown=node:node ./src ./src

# Use dumb-init for proper signal handling and direct node execution for better performance
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
