FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Almaty

RUN apt-get update \ 
    && apt-get install -y --no-install-recommends ca-certificates curl tzdata gnupg \ 
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \ 
    && apt-get update \ 
    && apt-get install -y --no-install-recommends nodejs \ 
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./

# Use npm only; prefer ci when lockfile exists
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY index.js ./

CMD ["node", "index.js"]


