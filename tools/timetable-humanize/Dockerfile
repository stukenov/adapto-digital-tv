# База с glibc + tc
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -qq > /dev/null && \
    apt-get install -y --no-install-recommends ca-certificates iproute2 tzdata golang-go > /dev/null && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем исходник Go
COPY ttb-hum.go /app/ttb-hum.go

# Собираем бинарник внутри контейнера
RUN go build -o /app/ttb-hum /app/ttb-hum.go

# Точка входа (скрипт последовательно запускает каталоги 1..10)
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Значения по умолчанию (можно переопределять в compose)
ENV BIN=/app/ttb-hum \
    BASE_DIR=/data \
    START=1 \
    END=10 \
    LANG=kk \
    PROMPT=program_name \
    MODEL=gpt-4o \
    # сетевые лимиты (kbit). 0/пусто = без ограничения
    UP_KBIT=0 \
    DOWN_KBIT=0 \
    NET_DEV=eth0

ENTRYPOINT ["/app/entrypoint.sh"]
