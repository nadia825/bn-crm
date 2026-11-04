ARG NODE_IMAGE=node:22-bookworm-slim
ARG UI_RUNTIME_IMAGE=nginx/nginx-unprivileged:stable-alpine
FROM ${NODE_IMAGE} AS build

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run test:data && npm run build

FROM ${NODE_IMAGE} AS api
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 BN_CRM_DB_PATH=/data/bn-crm.sqlite
COPY --chown=node:node server ./server
COPY --chown=node:node src/lib ./src/lib
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--experimental-strip-types", "server/index.ts"]

FROM ${UI_RUNTIME_IMAGE} AS runtime

ARG SOURCE_REVISION=unknown
LABEL org.opencontainers.image.title="BN CRM" \
      org.opencontainers.image.description="Bottle Nexus CRM local interactive prototype" \
      org.opencontainers.image.revision="${SOURCE_REVISION}"

COPY docker/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

ENTRYPOINT ["nginx", "-g", "daemon off;"]
