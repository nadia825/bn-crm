FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run test:data && npm run build

FROM nginx/nginx-unprivileged:stable-alpine AS runtime

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
