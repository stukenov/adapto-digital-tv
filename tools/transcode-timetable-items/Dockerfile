# Используем образ с FFmpeg и NVIDIA драйверами
FROM jrottenberg/ffmpeg:4.4-nvidia

# Устанавливаем Node.js
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Создаем рабочую директорию
WORKDIR /app

# Копируем файлы проекта
COPY package.json ./
COPY index.js ./
COPY batch-week.js ./

# Создаем директорию для входных данных
RUN mkdir -p /data

# Точка входа
ENTRYPOINT ["node", "index.js"]
