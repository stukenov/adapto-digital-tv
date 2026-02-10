ARG FFMPEG_BASE=jrottenberg/ffmpeg:6.1-ubuntu

FROM golang:1.22-bookworm AS builder
WORKDIR /src
ENV CGO_ENABLED=0
COPY go.mod ./
COPY scan_and_transcode.go ./
RUN go build -ldflags="-s -w" -o /usr/local/bin/scan_and_transcode ./scan_and_transcode.go

FROM ${FFMPEG_BASE}
WORKDIR /app
COPY --from=builder /usr/local/bin/scan_and_transcode /usr/local/bin/scan_and_transcode
VOLUME ["/srv", "/mnt", "/app/work"]
ENTRYPOINT ["/usr/local/bin/scan_and_transcode"]
