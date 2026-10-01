FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY prisma prisma
# Generate does not connect. Compose replaces this at runtime.
ENV DATABASE_URL=mysql://koma:koma@mysql:3306/koma
RUN npm ci
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npx prisma generate \
  && npm run build -w @koma/shared \
  && npm run build -w @koma/api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node apps/api/dist/main.js"]
