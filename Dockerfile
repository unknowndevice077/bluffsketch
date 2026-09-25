# All-in-one image: the game server also serves the built client, so one
# service and one URL is the whole deployment (Render, Fly.io, Railway, any VPS).
#   docker build -t bluffsketch .  &&  docker run -p 3001:3001 bluffsketch
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --ignore-scripts
COPY shared shared
COPY server server
COPY client client
# Empty VITE_SERVER_URL = the client talks to the same origin it was served from.
RUN npm run build -w @bluffsketch/shared && npm run build -w @bluffsketch/server && npm run build -w @bluffsketch/client

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3001 SERVE_CLIENT_DIR=/app/client/dist
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --ignore-scripts --workspace @bluffsketch/server && npm cache clean --force
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
COPY server/data server/data
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1
CMD ["node", "server/dist/index.js"]
