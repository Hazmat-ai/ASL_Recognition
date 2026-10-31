FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm test && npm run test:unit && npm run build
FROM node:24.22.1-bookworm-slim
ENV NODE_ENV=production PORT=3000 DB_PATH=/app/data/palm.sqlite
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/content ./content
COPY --from=build --chown=node:node /app/scripts/healthcheck.mjs ./scripts/healthcheck.mjs
RUN mkdir data && chown node:node data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=6s --start-period=15s CMD ["node","scripts/healthcheck.mjs"]
CMD ["node","server/app.mjs"]
