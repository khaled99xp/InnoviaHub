FROM node:20-alpine AS builder

WORKDIR /app

# Set npm config
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# Copy and install dependencies
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source code
COPY frontend/ ./

# Build
ENV NODE_ENV=production
RUN npm run build || npx vite build

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

