FROM node:20-bullseye

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -qq > /dev/null && \
    apt-get install -y --no-install-recommends ca-certificates iproute2 tzdata ffmpeg > /dev/null && \
    rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Almaty
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

COPY package.json /app/package.json
COPY src /app/src
COPY bin /app/bin
COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/bin/timetable-generate.js /app/entrypoint.sh

# Значения по умолчанию (можно переопределять в compose)
ENV BIN=/app/bin/timetable-generate.js \
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


