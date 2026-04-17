# --- Build Stage ---
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Runtime Stage ---
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Nginx config could be copied here too
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
