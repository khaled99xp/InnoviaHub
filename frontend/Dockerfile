FROM node:20-alpine AS builder

WORKDIR /app

# Set npm config
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
ENV NODE_ENV=production
ENV CI=false

# Install dependencies with verbose output
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps --verbose || \
    (echo "npm ci failed, trying npm install..." && \
     npm install --legacy-peer-deps --verbose)

# Copy source code
COPY frontend/ ./

# Verify files are present
RUN ls -la && \
    echo "Package.json content:" && \
    cat package.json | head -20

# Build with detailed error output
RUN echo "=== Starting build process ===" && \
    npm run build || \
    (echo "✗ npm run build failed, attempting direct vite build..." && \
     npx vite build) && \
    echo "✓ Build completed!" && \
    ls -la dist/

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config for SPA
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

