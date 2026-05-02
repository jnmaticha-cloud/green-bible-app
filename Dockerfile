# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies
RUN npm install

# Copy source code and assets
COPY . .

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev && npm install -g tsx

# Copy built assets and source from builder
COPY --from=builder /app .

# Create seed data from repo data
RUN mkdir -p seed-data && cp -r data/* seed-data/ || true

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["sh", "-c", "tsx scripts/bootstrap.ts && tsx scripts/init-database.ts && tsx server.ts"]
