FROM node:20-alpine AS builder

WORKDIR /app

# Set npm config
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
ENV NODE_ENV=production
ENV CI=false

# Verify we're in the right directory and show structure
RUN echo "Current directory: $(pwd)" && ls -la || true

# Install dependencies first (better caching)
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit || \
    npm install --legacy-peer-deps --prefer-offline --no-audit

# Copy all source files
COPY frontend/ ./

# Verify critical files exist
RUN echo "Verifying files..." && \
    test -f package.json && echo "✓ package.json exists" || (echo "✗ package.json missing" && exit 1) && \
    test -f vite.config.ts && echo "✓ vite.config.ts exists" || (echo "✗ vite.config.ts missing" && exit 1) && \
    test -d src && echo "✓ src directory exists" || (echo "✗ src directory missing" && exit 1)

# Build the application
RUN echo "=== Starting build ===" && \
    npm run build; \
    BUILD_EXIT_CODE=$?; \
    echo "Build exit code: $BUILD_EXIT_CODE"; \
    if [ $BUILD_EXIT_CODE -ne 0 ]; then \
        echo "✗ Build failed with exit code $BUILD_EXIT_CODE"; \
        exit $BUILD_EXIT_CODE; \
    fi; \
    echo "=== Build completed ===" && \
    if [ ! -d "dist" ]; then \
        echo "✗ ERROR: dist directory was not created"; \
        exit 1; \
    fi; \
    if [ ! -f "dist/index.html" ]; then \
        echo "✗ ERROR: dist/index.html is missing"; \
        ls -la dist/ || true; \
        exit 1; \
    fi; \
    echo "✓ Build successful! Artifacts:" && \
    ls -lah dist/

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

