# Adapto Digital TV Web Dockerfile
# Используем официальный Node.js образ в качестве базового
FROM node:20-alpine AS base

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем только package.json (yarn.lock может отсутствовать в репозитории)
COPY package.json ./

# Включаем Corepack и активируем Yarn Classic
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Этап установки зависимостей
FROM base AS deps
# Устанавливаем только production-зависимости для кэширования (fallback без lockfile)
RUN yarn install --frozen-lockfile --production=true || yarn install --production=true \
  && yarn cache clean

# Этап сборки приложения
FROM base AS builder
# Устанавливаем все зависимости (включая dev) — с fallback, если lockfile отсутствует
RUN yarn install --frozen-lockfile || yarn install

# Копируем исходный код (включая yarn.lock, если он есть)
COPY . .

# Создаем переменные окружения для сборки
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Устанавливаем build-time переменные с fallback значениями
# Эти значения будут перезаписаны в runtime через env_file
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000  
ARG NEXT_PUBLIC_DEBUG=0
ARG NEXT_PUBLIC_GA_ID=""

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_DEBUG=$NEXT_PUBLIC_DEBUG
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID

# Собираем приложение
RUN yarn build

# Production этап
FROM node:20-alpine AS runner

# Устанавливаем рабочую директорию
WORKDIR /app

# Создаем пользователя nextjs для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем standalone server файлы для production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Переключаемся на пользователя nextjs
USER nextjs

# Открываем порт 3000
EXPOSE 3000

# Запускаем standalone server
CMD ["node", "server.js"]