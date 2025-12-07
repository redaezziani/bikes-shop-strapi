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
RUN npm ci --legacy-peer-deps

# Copy all application files
COPY . .

# Build the admin panel
RUN npm run build

# Create necessary directories
RUN mkdir -p public/uploads .tmp data && \
    chmod -R 777 .tmp data public/uploads

# Expose port
EXPOSE 1337

# Set environment
ENV NODE_ENV=production

# Use dumb-init and start Strapi
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]