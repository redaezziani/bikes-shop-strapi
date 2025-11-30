# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy package files from builder
COPY package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/types ./types

# Create non-root user for security
RUN addgroup -g 1001 -S strapi && \
    adduser -S strapi -u 1001 && \
    chown -R strapi:strapi /app

USER strapi

# Expose port
EXPOSE 1337

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]
