# ---------- build ----------
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY tsconfig.json nest-cli.json ./
COPY src ./src/
RUN pnpm prisma generate && pnpm nest build

# ---------- production ----------
FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache tini
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY package.json pnpm-lock.yaml* ./
COPY --from=build /app/node_modules ./node_modules/
COPY --from=build /app/dist ./dist/
COPY --from=build /app/generated ./generated/
COPY --from=build /app/prisma ./prisma/
COPY prisma.config.ts ./

USER app
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/main.js"]
