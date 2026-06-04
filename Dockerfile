# --- Stage 1: Build Stage ---
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

RUN npm ci --legacy-peer-deps

# Increase memory limit to 4GB to prevent "JavaScript heap out of memory"
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy the rest of the source code
COPY . .

# Disable Source Maps to save even more memory during the build process
ENV GENERATE_SOURCEMAP=false

# Run the build
RUN npm run build

# --- Stage 2: Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install 'serve' globally to handle the SPA routing
RUN npm install -g serve

# Only copy the production-ready build folder from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE 3000

# Run the web server
CMD ["serve", "-s", "build", "-l", "3000"]
