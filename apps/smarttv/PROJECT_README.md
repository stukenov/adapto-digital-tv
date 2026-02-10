# Adapto Digital TV Smart TV Project

## 🎯 Overview

**API-First Smart TV application** with iOS-style design system. Requires Django REST API backend. Supports Samsung Tizen, LG webOS, Android TV, Apple tvOS, Amazon Fire TV, and Web PWA.

## ⚠️ Prerequisites

**REQUIRED for operation:**
- Django API server running on `http://127.0.0.1:8000` (development)
- Database with active channels and program data
- Network connectivity

## ✨ Features

### 🎨 iOS-Style Design System
- **Glassmorphism effects** - Beautiful blur and transparency
- **iOS animations** - Smooth spring-based transitions (60 FPS)
- **Design tokens** - Consistent spacing, colors, typography
- **Smart TV optimized** - Performance & accessibility focused

### 🔌 API-First Architecture
- **REST API integration** - Real-time channel and program data
- **No mock data** - Requires live API connection
- **Error handling** - Robust retry mechanisms
- **TypeScript** - Fully typed API responses

## 🚀 Quick Commands

### Prerequisites Setup
```bash
# 1. REQUIRED: Start Django API server
python manage.py runserver 127.0.0.1:8000

# 2. Verify API is working
curl http://127.0.0.1:8000/api/v1/channels/
# Should return JSON with channels data
```

### Development
```bash
# Configure API endpoint
export REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api/v1

# Web development
yarn dev

# React Native TV
yarn dev:android-tv
yarn dev:tvos
```

### Building
```bash
# Build all platforms (requires API for testing)
yarn build:all

# Build specific platforms
yarn build:tizen      # Samsung Tizen
yarn build:webos      # LG webOS
yarn build:pwa        # Web PWA
yarn build:android-tv # Android TV
yarn build:tvos       # Apple tvOS
```

### Testing & Quality
```bash
# API integration tests
yarn test

# Code quality
yarn lint
yarn format

# Type checking
yarn typecheck
```

### Documentation
```bash
# API integration guide
yarn migration

# Design system guide  
yarn docs
```

## 🔧 Configuration

### Required Environment Variables

```env
# API Configuration (REQUIRED)
REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api/v1

# Optional Settings
REACT_APP_API_TIMEOUT=10000
REACT_APP_DEBUG_API=true
REACT_APP_ANALYTICS=false
```

### Django API Requirements

Your Django backend must provide these endpoints:

```
GET /api/v1/channels/                # List channels (paginated)
GET /api/v1/channels/{slug}/         # Channel details
GET /api/v1/channels/{slug}/schedule/ # Channel schedule
GET /api/v1/programs/                # List programs
GET /api/v1/programs/{id}/           # Program details
```

## 🏗️ Architecture

```
adapto-tv/
├── packages/
│   ├── app-core/          # 🔌 API integration + Design system
│   │   ├── src/api/       # REST client, adapters, types
│   │   ├── src/hooks/     # useChannels, usePrograms
│   │   ├── src/components/ui/ # Button, Card, Badge, Grid
│   │   └── src/config/    # Environment configuration
│   ├── renderer-web/      # 🌐 Tizen, webOS, PWA
│   ├── renderer-rn-tv/    # 📱 Android TV, tvOS, Fire TV
│   └── shared-config/     # ⚙️ Common configs
```

## 📡 API Integration

### React Hooks

```tsx
// Auto-loading channels with error handling
const { channels, status, error, refetch, isLoading, isEmpty } = useChannels({
  autoFetch: true,
  activeOnly: true,
  sortByName: true,
});

// Handle all possible states
if (isLoading) return <LoadingSpinner />;
if (status === 'error') return <ErrorMessage error={error} onRetry={refetch} />;
if (isEmpty) return <EmptyState message="No active channels" />;

// Render channels only when successfully loaded
return <ChannelsList channels={channels} />;
```

### Direct API Usage

```tsx
import { apiClient } from 'adapto-app-core';

try {
  // All API calls can throw exceptions
  const channels = await apiClient.getChannels({ page: 1 });
  const channel = await apiClient.getChannel('first-channel');
  const schedule = await apiClient.getChannelSchedule('first-channel');
} catch (error) {
  // Required error handling
  console.error('API Error:', error.message);
}
```

## 🎯 Getting Started

1. **Install dependencies**
   ```bash
   yarn install
   ```

2. **Start Django API server** (REQUIRED)
   ```bash
   python manage.py runserver 127.0.0.1:8000
   ```

3. **Verify API connection**
   ```bash
   curl http://127.0.0.1:8000/api/v1/channels/
   # Must return valid JSON response
   ```

4. **Configure environment**
   ```bash
   echo "REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api/v1" > .env
   ```

5. **Start development**
   ```bash
   yarn dev  # Web development
   # or
   yarn dev:android-tv  # Android TV
   yarn dev:tvos        # Apple tvOS
   ```

6. **Build for production**
   ```bash
   yarn build:all
   ```

## 📱 Platform Support

| Platform | Status | Package | API Support |
|----------|---------|---------|-------------|
| Samsung Tizen | ✅ Ready | `renderer-web` | ✅ Full |
| LG webOS | ✅ Ready | `renderer-web` | ✅ Full |
| Android TV | ✅ Ready | `renderer-rn-tv` | ✅ Full |
| Apple tvOS | ✅ Ready | `renderer-rn-tv` | ✅ Full |
| Amazon Fire TV | ✅ Ready | `renderer-rn-tv` | ✅ Full |
| Web PWA | ✅ Ready | `renderer-web` | ✅ Full |
| Roku | 🚧 Planned | `renderer-roku` | 🚧 Planned |

## 🔄 Data Flow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Django API  │────│  app-core    │────│  Renderers  │
│ (REQUIRED)  │    │              │    │             │
│ - Channels  │    │ - API Client │    │ - Web       │
│ - Programs  │    │ - Hooks      │    │ - RN TV     │
│ - Schedule  │    │ - Adapters   │    │ - Roku      │
└─────────────┘    └──────────────┘    └─────────────┘
```

### Error Handling Strategy

1. **API Available** → Live data from Django
2. **API Unavailable** → Show error state with retry
3. **Network Issues** → Display timeout message
4. **Empty Database** → Show empty state

## 🚀 Performance

### Optimizations
- **Automatic pagination** - Seamless data loading
- **Smart caching** - React state management
- **Platform timeouts** - TV-specific network handling
- **Bundle splitting** - Optimized loading

### Metrics
- Bundle size: ≤ 5 MB per platform
- API response: < 2s on average
- 60 FPS animations on all devices
- Memory usage: ≤ 500 MB

## 🔧 Development Tools

### Debug Mode
```env
REACT_APP_DEBUG_API=true  # API request logging
```

### Health Check
```tsx
import { apiClient } from 'adapto-app-core';
const health = await apiClient.healthCheck();
// { status: 'ok', timestamp: '...' }
```

### Error States
Built-in error boundaries with user-friendly messages and retry options.

## 📚 Documentation

- **[API Integration](packages/app-core/API_INTEGRATION.md)** - Complete API guide
- **[Migration Guide](MIGRATION_GUIDE.md)** - API-first architecture
- **[Design System](packages/app-core/DESIGN_SYSTEM.md)** - UI components & tokens

## 🔧 Troubleshooting

### Common Issues

1. **"Failed to fetch channels from API"**
   ```bash
   # Check Django server is running
   python manage.py runserver 127.0.0.1:8000
   curl http://127.0.0.1:8000/api/v1/channels/
   ```

2. **"API returned no active channels"**
   ```bash
   # Check database has active channels
   python manage.py shell
   >>> from myapp.models import Channel
   >>> Channel.objects.filter(is_active=True).count()
   ```

3. **CORS Errors on Smart TV**
   ```python
   # Django settings.py
   CORS_ALLOWED_ORIGINS = ["https://your-tv-domain.com"]
   ```

4. **Slow Network on TV**
   ```env
   REACT_APP_API_TIMEOUT=20000  # Increase timeout
   ```

### Debug Commands

```bash
# API logs
REACT_APP_DEBUG_API=true yarn dev

# Network diagnostics
curl -v http://127.0.0.1:8000/api/v1/channels/

# Health check
yarn workspace adapto-app-core test
```

## 🛣️ Roadmap

### Near Term
- [ ] Roku renderer with API support
- [ ] Offline-first architecture with caching
- [ ] WebSocket real-time updates
- [ ] User authentication

### Long Term
- [ ] Content recommendations API
- [ ] Multi-language support
- [ ] Analytics dashboard
- [ ] Push notifications

## ⚠️ Important Notes

### API Dependency
- **No mock data fallbacks** - Application requires working API
- **Real-time data only** - Content always reflects API state
- **Error states** - Graceful handling when API unavailable
- **Network required** - All features depend on connectivity

### Production Deployment
- Ensure API server is running and accessible
- Configure CORS for Smart TV domains
- Set appropriate timeouts for target networks
- Monitor API health and response times

## 🤝 Contributing

1. **API Integration** - Extend hooks in `packages/app-core/src/hooks/`
2. **Design System** - Add UI components in `packages/app-core/src/components/ui/`
3. **Platform Support** - Create new renderers in `packages/`

## 📄 License

MIT License - see LICENSE file for details.

---

**Ready to stream with live API data!** 🎬✨📡 