FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS dev
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 3000

FROM base AS build
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ENV NODE_ENV=production
RUN npx prisma generate && npm run build

FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["npm", "run", "start"]
