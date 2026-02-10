<div align="center">

# Adapto Digital TV

**Open-source platform for TV content management and live streaming**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)]()

</div>

---

Adapto Digital TV is a self-hosted platform for managing TV channels, video-on-demand content, live streaming, and schedule automation. Deploy your own digital TV infrastructure with a single command.

## Features

- **Live Streaming** — RTSP, RTMP, HLS, WebRTC via MediaMTX
- **Content Management** — Django-powered admin panel for channels, programs, and VOD
- **Multi-Platform Apps** — Web (Next.js), Smart TV, Mobile (Expo)
- **Schedule Automation** — Automatic playlist and timetable generation
- **S3 Storage** — SeaweedFS for scalable media storage
- **Multilingual** — Kazakh, Russian, English
- **Docker-First** — Full production stack in one `docker compose up`

<!-- screenshots here -->

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Make](https://www.gnu.org/software/make/) (optional, for convenience commands)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/adapto-digital-tv/adapto.git
cd adapto

# Configure environment
cp env.example .env
# Edit .env with your values

# Deploy
make deploy-prod
```

After launch:

| Service | URL |
|---------|-----|
| Site | http://localhost |
| Admin Panel | http://localhost/admin/django/ |
| API | http://localhost/api/v1/ |
| Swagger | http://localhost/swagger/ |

See [Quick Start Guide](docs/setup/QUICK_START.md) for detailed instructions.

## Architecture

```
adapto/
├── apps/
│   ├── back/           # Django REST API
│   ├── back.js/        # Express.js API (high-performance)
│   ├── front/          # Next.js frontend + admin
│   ├── hlsx/           # HLS proxy (Go)
│   ├── smarttv/        # Smart TV app
│   └── mobapp/         # Mobile app (Expo)
├── tools/              # Utilities and scripts
├── docs/               # Documentation
├── docker-compose.yml  # Docker configuration
├── Caddyfile           # Reverse proxy
└── mediamtx.yml        # Streaming server
```

### Tech Stack

| Component | Technologies |
|-----------|------------|
| **Backend** | Django 5.x, Django REST Framework, PostgreSQL |
| **API** | Express.js (high-load requests) |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Streaming** | MediaMTX (RTSP, RTMP, HLS, WebRTC) |
| **Storage** | SeaweedFS (S3-compatible) |
| **Proxy** | Caddy (automatic SSL) |

## Documentation

| Section | Description |
|---------|-------------|
| [Quick Start](docs/setup/QUICK_START.md) | Minimal steps to run |
| [Environment](docs/setup/ENVIRONMENT.md) | `.env` configuration |
| [Docker](docs/setup/DOCKER.md) | Docker and deployment |
| [Architecture](docs/architecture/OVERVIEW.md) | Project structure |
| [Admin](docs/guides/ADMIN.md) | Django admin setup |
| [Streaming](docs/guides/STREAMING.md) | MediaMTX configuration |
| [Storage](docs/guides/STORAGE.md) | SeaweedFS S3 |
| [API](docs/api/ENDPOINTS.md) | REST API endpoints |
| [Troubleshooting](docs/troubleshooting/COMMON_ISSUES.md) | Common issues |

## Domains

Configure domains via environment variables in the Caddyfile:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DOMAIN` | `example.com` | Main site |
| `DASH_DOMAIN` | `dash.example.com` | Django Admin & API |
| `STREAM_DOMAIN` | `stream.example.com` | HLS streaming |
| `HLSX_DOMAIN` | `hlsx.example.com` | HLS proxy |

## Tools

| Tool | Purpose |
|------|---------|
| `timetable-generate` | Schedule/playlist generation |
| `timetable-humanize` | AI-powered program descriptions |
| `normalize` | Video normalization |
| `ffplayout` | Playout engine |
| `transcode-timetable-items` | Video transcoding |

## Contributing

We welcome contributions! Please see:

- [Contributing Guide](CONTRIBUTING.md) — how to get started
- [Code of Conduct](CODE_OF_CONDUCT.md) — community standards
- [Security Policy](SECURITY.md) — reporting vulnerabilities

## License

This project is licensed under the GNU General Public License v3.0 — see the [LICENSE](LICENSE) file for details.

Note: `tools/ffplayout/` contains code with its own GPL license.

## Support

- **Issues**: [GitHub Issues](https://github.com/adapto-digital-tv/adapto/issues)
- **Documentation**: See [`docs/`](docs/) folder
