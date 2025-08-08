# Multi-stage build for optimization
FROM node:20-alpine AS builder

# Install security updates and clean package cache
RUN apk update && apk upgrade && apk add --no-cache dumb-init && rm -rf /var/cache/apk/*

# Create app directory and user
WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./

# Install dependencies with npm ci for faster, reliable builds
RUN npm ci --only=production --no-audit --no-fund && npm cache clean --force

# Production stage
FROM node:20-alpine AS production

ENV NODE_ENV=production

ARG PORT=3000
ENV PORT=$PORT
EXPOSE $PORT

# Install security updates and dumb-init for proper signal handling
RUN apk update && apk upgrade && apk add --no-cache dumb-init && rm -rf /var/cache/apk/*

USER node

# Set working directory
WORKDIR /home/node/

# Copy node_modules from builder stage
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

COPY --chown=node:node package.json ./
COPY --chown=node:node ./src ./src

# Use dumb-init for proper signal handling and direct node execution for better performance
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "-r", "esm", "src/index.js"]
