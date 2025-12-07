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

# Build admin panel HERE (during image build)
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache dumb-init

# Copy built files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/config ./config
COPY --from=builder /app/database ./database
COPY --from=builder /app/src ./src

# Create necessary directories
RUN mkdir -p public/uploads .tmp data && \
    chmod -R 777 .tmp data public/uploads

EXPOSE 1337
ENV NODE_ENV=production

# Just start - NO building!
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]