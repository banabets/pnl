# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for TypeScript)
RUN npm ci && npm cache clean --force

# Copy source code
COPY server ./server
COPY src ./src
COPY web ./web

# Build TypeScript server
RUN npm run build:server

# Build web (if web directory exists and has package.json)
RUN if [ -f "web/package.json" ]; then \
      cd web && \
      npm ci && \
      npm run build; \
    fi

# Stage 2: Production
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling and build tools for native modules
RUN apk add --no-cache dumb-init python3 make g++

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Remove build tools after installation (native modules are already compiled)
RUN apk del python3 make g++

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy web build (if exists) - vite builds to 'build' directory
RUN mkdir -p /app/web && \
    if [ -d "/app/web/build" ]; then \
      cp -r /app/web/build /app/web/build; \
    fi
COPY --from=builder --chown=nodejs:nodejs /app/web/build ./web/build

# Create logs directory
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server/index.js"]
