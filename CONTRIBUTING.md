# Contributing to Adapto Digital TV

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating. We expect all contributors to follow these guidelines.

## Getting Started

### Good First Issues

Look for issues labeled `good first issue` — these are beginner-friendly tasks that help you learn the codebase.

### Project Structure

```
adapto/
├── apps/
│   ├── back/           # Django REST API (Python)
│   ├── back.js/        # Express.js API (Node.js)
│   ├── front/          # Next.js frontend (TypeScript)
│   ├── hlsx/           # HLS proxy (Go)
│   ├── smarttv/        # Smart TV app (TypeScript)
│   └── mobapp/         # Mobile app — Expo (TypeScript)
├── tools/              # CLI utilities
├── docs/               # Documentation
└── docker-compose.yml  # Docker orchestration
```

### Development Setup

```bash
cp env.example .env
# Edit .env with your local settings
make deploy-prod
```

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add my feature'`)
6. Push to the branch (`git push origin feature/my-feature`)
7. Open a Pull Request

## Code Style

- **Python**: Follow PEP 8
- **TypeScript/JavaScript**: ESLint configuration in each app
- **Go**: `gofmt`

## Commit Messages

Use clear, descriptive commit messages. Examples:
- `Add user authentication endpoint`
- `Fix HLS stream reconnection logic`
- `Update Docker configuration for production`

## Pull Request Process

1. Fill out the PR template completely
2. Link related issues using `Closes #123`
3. Ensure CI checks pass
4. Wait for at least one maintainer review
5. Address review comments promptly
6. Squash commits if requested

## Reporting Issues

When reporting bugs, please use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Docker version, etc.)

## Feature Requests

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) to propose new features.

## License

By contributing, you agree that your contributions will be licensed under the GPL-3.0 License.
