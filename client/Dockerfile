# Build from the repository root:  docker build -f client/Dockerfile -t bluffsketch-client .
# VITE_SERVER_URL is baked in at build time. Leave it empty to use nginx's /socket.io proxy.
FROM node:22-alpine AS build
ARG VITE_SERVER_URL=""
ENV VITE_SERVER_URL=$VITE_SERVER_URL
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --ignore-scripts
COPY shared shared
COPY client client
RUN npm run build -w @bluffsketch/client

FROM nginx:1.27-alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
