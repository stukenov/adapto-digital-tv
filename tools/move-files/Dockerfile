FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates tzdata golang-go && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy source
COPY move-files.go ./

# Build the Go binary directly in the Ubuntu container
ENV CGO_ENABLED=0
RUN go mod init local/movefiles && \
    go build -ldflags="-s -w" -o /usr/local/bin/move-files ./move-files.go

# Default mount points
VOLUME ["/srv", "/mnt", "/app/sources"]
ENTRYPOINT ["/usr/local/bin/move-files"]
