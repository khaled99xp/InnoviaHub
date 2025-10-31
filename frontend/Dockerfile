FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Create .npmrc with legacy peer deps config
RUN echo "legacy-peer-deps=true" > .npmrc && \
    echo "audit=false" >> .npmrc && \
    echo "fund=false" >> .npmrc

# Install dependencies
RUN npm install

# Copy all frontend files
COPY frontend/ ./

# Build using vite directly (skips TypeScript check)
RUN npx vite build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Configure nginx for SPA routing
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

