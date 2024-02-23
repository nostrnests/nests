FROM node:current as build
WORKDIR /src
COPY . .
RUN yarn --network-timeout 1000000 && yarn build

FROM nginxinc/nginx-unprivileged:mainline-alpine
ARG NGINX_CONF=nginx.conf
COPY docker/$NGINX_CONF /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
