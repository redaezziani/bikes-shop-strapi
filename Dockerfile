FROM node:22-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all application files
COPY . .

# Create necessary directories
RUN mkdir -p public/uploads .tmp data build && \
    chmod -R 777 .tmp data public/uploads build

# Expose port
EXPOSE 1337

# Set environment
ENV NODE_ENV=production

# Use dumb-init and start Strapi
# Build will happen on first start
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npm run build && npm start"]