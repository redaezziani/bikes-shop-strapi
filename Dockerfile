FROM node:22-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build admin panel
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache dumb-init

# Copy everything from builder
COPY --from=builder /app ./

# Create necessary directories with correct permissions
RUN mkdir -p public/uploads .tmp data && \
    chmod -R 777 .tmp data public/uploads

EXPOSE 1337
ENV NODE_ENV=production

# Just start - NO building!
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]