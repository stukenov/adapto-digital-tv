FROM golang:1.24 as builder

WORKDIR /app

COPY go.mod ./
COPY main.go ./

RUN go build -o hlsx main.go

FROM debian:stable-slim

WORKDIR /app

COPY --from=builder /app/hlsx /app/hlsx
COPY config.json /app/config.json

EXPOSE 8080

CMD ["/app/hlsx", "-config", "config.json"]
