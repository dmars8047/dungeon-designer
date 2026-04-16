# Stage 1: install dependencies
FROM node:lts-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: nginx serving
FROM nginx:stable-trixie

# Copy static assets into nginx web root
COPY landing.html main.html /usr/share/nginx/html/
COPY landing.js renderer.js styles.css /usr/share/nginx/html/
COPY Assets/ /usr/share/nginx/html/Assets/
COPY modules/ /usr/share/nginx/html/modules/

# Copy only the jszip runtime file from the deps stage
COPY --from=deps /app/node_modules/jszip/dist/jszip.min.js \
     /usr/share/nginx/html/node_modules/jszip/dist/jszip.min.js

# Custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
