FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install ALL dependencies (Strapi needs devDependencies to handle TypeScript)
RUN npm install

# Copy all application files
COPY . .

# Build the admin panel
RUN npm run build || true

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