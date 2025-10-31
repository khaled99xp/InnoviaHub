FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from frontend directory
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy frontend source code
COPY frontend/ ./
RUN npm run build

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

