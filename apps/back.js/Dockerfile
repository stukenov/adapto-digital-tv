FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Открываем порт
EXPOSE 8001

# Запускаем приложение
CMD ["node", "src/index.js"]
