FROM node:22-alpine AS deps

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++

# Copy only package files first (for caching)
COPY package*.json ./

# Install dependencies - this layer will be cached
RUN npm install --legacy-peer-deps

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files
COPY package*.json ./

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p public/uploads .tmp data build && \
    chmod -R 777 .tmp data public/uploads build

# Expose port
EXPOSE 1337

# Set environment
ENV NODE_ENV=production

# Build and start
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npm run build && npm start"]