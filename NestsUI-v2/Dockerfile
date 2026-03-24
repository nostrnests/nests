FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_MOQ_RELAY_URL=https://moq.nostrnests.com
ARG VITE_MOQ_AUTH_URL=https://moq-auth.nostrnests.com
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
