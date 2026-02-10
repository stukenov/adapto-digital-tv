# Adapto Digital TV API Integration Guide

## Overview


The Adapto Digital TV Smart TV app is **fully integrated** with a real REST API based on the provided Swagger schema. The application depends entirely on live API data and does not use mock data fallbacks.

## API Endpoints

### Base URL
- **Development**: `http://127.0.0.1:8000/api/v1`
- **Production**: `https://api.example.com/api/v1`

### Available Endpoints

#### Channels
- `GET /channels/` - List all active channels (paginated)
- `GET /channels/{slug}/` - Get channel details by slug
- `GET /channels/{slug}/schedule/` - Get channel schedule

#### Programs  
- `GET /programs/` - List programs (with filters)
- `GET /programs/{id}/` - Get program details

## Architecture

```
app-core/
├── src/
│   ├── api/
│   │   ├── client.ts          # API client with fetch wrapper
│   │   └── adapters.ts        # Data transformation utilities
│   ├── hooks/
│   │   ├── useChannels.ts     # Channels data management
│   │   └── usePrograms.ts     # Programs data management
│   ├── config/
│   │   └── api.ts             # Environment configuration
│   └── types/
│       └── api.ts             # API response types
```

## Usage Examples

### Using Channels Hook

```tsx
import { useChannels } from 'adapto-app-core';

function ChannelsList() {
  const { channels, status, error, refetch, isLoading, isEmpty } = useChannels({
    autoFetch: true,
    activeOnly: true,
    sortByName: true,
  });

  if (isLoading) return <LoadingSpinner />;
  if (status === 'error') return <ErrorMessage error={error} onRetry={refetch} />;
  if (isEmpty) return <EmptyState message="No channels available" />;

  return (
    <div>
      {channels.map(channel => (
        <ChannelCard key={channel.id} channel={channel} />
      ))}
    </div>
  );
}
```

### Using Programs Hook

```tsx
import { usePrograms } from 'adapto-app-core';

function ProgramsList({ channelId }: { channelId: number }) {
  const { programs, fetchProgramsForChannel, isLoading } = usePrograms();

  useEffect(() => {
    fetchProgramsForChannel(channelId, new Date());
  }, [channelId]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {programs.map(program => (
        <ProgramCard key={program.id} program={program} />
      ))}
    </div>
  );
}
```

### Direct API Client Usage

```tsx
import { apiClient } from 'adapto-app-core';

// Get all channels
const channels = await apiClient.getChannels({ page: 1 });

// Get specific channel with schedule
const channel = await apiClient.getChannel('first-channel');
const schedule = await apiClient.getChannelSchedule('first-channel', { 
  date: '2024-01-15' 
});
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# API Configuration (REQUIRED)
REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api/v1
REACT_APP_API_TIMEOUT=10000
REACT_APP_VERSION=1.0.0

# Feature Flags
REACT_APP_DEBUG_API=true
REACT_APP_OFFLINE_MODE=false
REACT_APP_ANALYTICS=false
```

### Platform Detection

The API client automatically detects Smart TV platforms:

```tsx
import { platform } from 'adapto-app-core/config/api';

if (platform.isTizen) {
  // Samsung Tizen-specific logic
}

if (platform.isWebOS) {
  // LG webOS-specific logic  
}

if (platform.isAndroidTV) {
  // Android TV-specific logic
}
```

## Data Transformation

### API to Domain Types

API responses are automatically transformed to domain types:

```tsx
// API Response
interface APIChannel {
  id: number;
  name: string;
  slug: string;
  stream_url: string;
  // ... other API fields
}

// Domain Type (used in app)
interface Channel {
  id: string;              // converted from number
  name: string;
  slug?: string;
  streamUrl: string;       // mapped from stream_url
  currentProgram: Program; // computed from schedule
  schedule: Program[];     // fetched separately
}
```

### Adapters

```tsx
import { 
  adaptChannel, 
  adaptProgram, 
  filterActiveChannels, 
  sortChannelsByName 
} from 'adapto-app-core';

// Transform API channel to domain channel
const channel = adaptChannel(apiChannel, schedule);

// Utility functions
const activeChannels = filterActiveChannels(channels);
const sortedChannels = sortChannelsByName(channels);
```

## Error Handling

### API Client Errors

```tsx
try {
  const channels = await apiClient.getChannels();
} catch (error) {
  if (error.message === 'Request timeout') {
    // Handle timeout
  } else if (error.message.includes('HTTP 404')) {
    // Handle not found
  } else {
    // Handle other API errors
  }
}
```

### Hook Error States

```tsx
const { channels, status, error, refetch } = useChannels();

if (status === 'error') {
  return (
    <ErrorContainer>
      <ErrorMessage>{error}</ErrorMessage>
      <Button onClick={refetch}>Retry API Connection</Button>
    </ErrorContainer>
  );
}
```

## Performance Optimizations

### Caching

- Channels are cached in React state
- Automatic refetch on focus/mount
- Manual refetch available via `refetch()`

### Pagination

```tsx
// Automatic pagination handling
const { channels } = useChannels(); // Fetches all pages automatically

// Manual pagination
const response = await apiClient.getChannels({ page: 2 });
```

### Platform-Specific Timeouts

- **Tizen/webOS**: 15 seconds (slower networks)
- **Desktop/Mobile**: 10 seconds
- **Configurable via environment**

## Development Workflow

1. **Start Django API Server** (Required)
   ```bash
   python manage.py runserver 127.0.0.1:8000
   ```

2. **Configure Environment**
   ```bash
   REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api/v1
   REACT_APP_DEBUG_API=true
   ```

3. **Test API Integration**
   ```bash
   yarn dev  # Check browser console for API logs
   ```

4. **Verify API Connection**
   ```bash
   curl http://127.0.0.1:8000/api/v1/channels/
   ```

## Deployment

### Environment-Specific Builds

```bash
# Development
REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api/v1 yarn build

# Staging  
REACT_APP_API_BASE_URL=https://staging-api.example.com/api/v1 yarn build

# Production
REACT_APP_API_BASE_URL=https://api.example.com/api/v1 yarn build
```

### Smart TV Platforms

- **Tizen**: API works in Samsung TVs (check CORS)
- **webOS**: API works in LG TVs (check CSP headers)
- **Android TV**: Full API support
- **Browser PWA**: Full API support

## Troubleshooting

### Common Issues

1. **API Server Not Running**
   ```bash
   # Check if Django server is running
   curl http://127.0.0.1:8000/api/v1/channels/
   # Should return JSON response
   ```

2. **CORS Errors**
   ```python
   # Django settings.py
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:3000",
       "https://your-tv-domain.com",
   ]
   ```

3. **Network Timeouts** 
   ```env
   # Increase timeout for slow TV networks
   REACT_APP_API_TIMEOUT=20000
   ```

4. **Empty Channels Response**
   ```python
   # Check Django admin for active channels
   # Ensure channels have is_active=True
   ```

### Debug Tools

```tsx
// Enable debug logging
REACT_APP_DEBUG_API=true

// Check API health
const health = await apiClient.healthCheck();
// { status: 'ok', timestamp: '...' }

// Manual API test
const channels = await apiClient.getChannels();
console.log('Channels:', channels);
```

## API Requirements

### Django Backend Setup

The application requires a Django backend with:

1. **Channels model** with fields: `id`, `name`, `slug`, `is_active`, `logo`, `description`, `stream_url`
2. **Programs model** with fields: `id`, `channel`, `name`, `description`, `start_time`, `end_time`
3. **API endpoints** as per Swagger schema
4. **CORS configuration** for Smart TV domains
5. **Pagination** support for large datasets

### Database Population

Ensure your Django database has:
- Active channels (`is_active=True`)
- Valid stream URLs
- Current program schedule data
- Proper channel slugs for URL routing

## Production Checklist

### Before Deployment

- [ ] API server is running and accessible
- [ ] Database contains active channels
- [ ] CORS is configured for production domains
- [ ] API timeout is appropriate for target network
- [ ] Error handling covers all API failure scenarios
- [ ] Health checks are implemented

### Performance Monitoring

```tsx
// Monitor API performance
import { features } from 'adapto-app-core/config/api';

if (features.performanceMonitoring) {
  // Track API response times
  // Monitor error rates
  // Alert on timeout issues
}
```

## No Fallback Strategy

**Important**: This application requires a working API connection. There are no mock data fallbacks:

- ❌ No mock data files
- ❌ No offline mode data
- ❌ No static JSON fallbacks

If the API is unavailable:
- Application shows error states
- Users can retry API connection
- Graceful error messages are displayed

This ensures the application always reflects real-time data from your content management system. 