FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -qq > /dev/null && \
    apt-get install -y --no-install-recommends ca-certificates iproute2 tzdata golang-go ffmpeg > /dev/null && \
    rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Almaty
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Копируем исходник Go
COPY ttb-gen.go /app/ttb-gen.go

# Собираем бинарник внутри контейнера
RUN go build -o /app/ttb-gen /app/ttb-gen.go

# Точка входа (скрипт пробегает по диапазону директорий START..END)
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Значения по умолчанию (можно переопределять в compose)
ENV BIN=/app/ttb-gen \
    BASE_DIR=/data \
    OUT_DIR=/out \
    CHANNEL=ADAPTO \
    START=1 \
    END=10 \
    LANG=ru \
    PERIOD=today \
    WEEK=0 \
    YEAR=0 \
    RECURSIVE=true \
    NO_ABS=false \
    EPISODES=4 \
    SERIES=true \
    TIMESLOTS=true \
    HOST_MEDIA_PREFIX=/srv/ffplayout-media \
    # сетевые лимиты (kbit). 0/пусто = без ограничения
    UP_KBIT=2000 \
    DOWN_KBIT=2000 \
    NET_DEV=eth0

ENTRYPOINT ["/app/entrypoint.sh"]


