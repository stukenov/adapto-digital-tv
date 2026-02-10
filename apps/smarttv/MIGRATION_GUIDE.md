# Migration Guide: API-First Smart TV Application

## Обзор изменений

Проект теперь **полностью зависит от реального REST API** и имеет современную дизайн-систему в стиле iOS. Все mock данные удалены, приложение работает исключительно с живыми данными из Django API.

## Новые возможности

### 🎨 iOS-Style Design System
- Glassmorphism эффекты и современная типографика
- Централизованные дизайн-токены
- Плавные анимации (60 FPS)

### 🔌 API-First Architecture
- REST API клиент с полной типизацией
- Автоматическая обработка ошибок и загрузки
- **Нет fallback на mock-данные**
- Platform-specific оптимизации

## Структура проекта

```
adapto-tv/
├── packages/
│   ├── app-core/                 # 🔌 API интеграция + дизайн-система
│   │   ├── src/
│   │   │   ├── api/             # API клиент и адаптеры
│   │   │   ├── config/          # Конфигурация сред
│   │   │   ├── hooks/           # useChannels, usePrograms
│   │   │   ├── components/ui/   # Компоненты UI
│   │   │   └── styles/          # designTokens.ts
│   │   ├── DESIGN_SYSTEM.md     # Документация дизайна
│   │   └── API_INTEGRATION.md   # Документация API
│   ├── renderer-web/            # 🌐 Веб-рендерер
│   ├── renderer-rn-tv/          # 📱 React Native TV
│   └── shared-config/           # ⚙️ Общие конфигурации
├── MIGRATION_GUIDE.md           # 📖 Данный файл
└── PROJECT_README.md            # 🚀 Быстрый старт
```

## КРИТИЧЕСКИЕ изменения

### ❌ Удалено
- **Все mock данные файлы**
  - `packages/app-core/src/data/mockChannels.ts` - УДАЛЕН
  - `packages/renderer-rn-tv/src/data/mockChannels.ts` - УДАЛЕН
- **Fallback механизмы**
  - Нет автоматического переключения на mock данные
  - Нет offline режима с локальными данными
- **Feature flag `useRealAPI`** - больше не существует

### ✅ Обязательно требуется
- **Django API сервер** должен быть запущен
- **База данных** с активными каналами
- **Сетевое подключение** для всех функций

## API Интеграция

### Обязательные Endpoints

```
# Channels API (REQUIRED)
GET /channels/                    # Список каналов (paginated)
GET /channels/{slug}/             # Детали канала
GET /channels/{slug}/schedule/    # Программа канала

# Programs API (REQUIRED)
GET /programs/                    # Список программ
GET /programs/{id}/               # Детали программы
```

### Новые React Hooks

```tsx
// Загрузка каналов - ОБЯЗАТЕЛЬНО требует API
const { channels, status, error, refetch, isLoading, isEmpty } = useChannels({
  autoFetch: true,     // Автоматически загружает при монтировании
  activeOnly: true,    // Фильтрует только активные каналы
  sortByName: true,    // Сортирует по имени
});

// Состояния:
// - isLoading: true во время загрузки
// - status: 'error' при ошибке API
// - isEmpty: true если API вернул пустой список
// - channels: массив каналов или пустой массив при ошибке
```

### API Клиент

```tsx
import { apiClient } from 'adapto-app-core';

// Все вызовы могут выбросить исключения
try {
  const channels = await apiClient.getChannels({ page: 1 });
  const channel = await apiClient.getChannel('first-channel');
  const schedule = await apiClient.getChannelSchedule('first-channel');
} catch (error) {
  // Обязательная обработка ошибок
  console.error('API Error:', error.message);
}
```

## Ключевые изменения

### 1. Обработка состояний

**До (с fallback):**
```tsx
// Автоматический fallback на mock данные
const [channels, setChannels] = useState(mockChannels);
```

**После (API-only):**
```tsx
// Обязательная обработка всех состояний API
const { channels, status, error, refetch, isLoading, isEmpty } = useChannels();

if (isLoading) return <LoadingSpinner />;
if (status === 'error') return <ErrorMessage error={error} onRetry={refetch} />;
if (isEmpty) return <EmptyState />;

// Только при status === 'success' рендерим данные
return <ChannelsList channels={channels} />;
```

### 2. Обязательная конфигурация

**Environment Variables - ТРЕБУЮТСЯ:**

```env
# API сервер (обязательно)
REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api/v1

# Опциональные настройки
REACT_APP_API_TIMEOUT=10000
REACT_APP_DEBUG_API=true
```

### 3. Запуск приложения

**Новый workflow:**

```bash
# 1. ОБЯЗАТЕЛЬНО: Запуск Django API сервера
python manage.py runserver 127.0.0.1:8000

# 2. Проверка API соединения
curl http://127.0.0.1:8000/api/v1/channels/

# 3. Запуск приложения с API
REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api/v1 yarn dev
```

## Миграция компонентов

### HomePage

**До:**
```tsx
// Загрузка mock данных
useEffect(() => {
  setChannels(mockChannels);
}, []);
```

**После:**
```tsx
// API-интеграция с обработкой ошибок
const { channels, status, error, refetch } = useChannels();

if (status === 'error') {
  return <ErrorMessage error={error} onRetry={refetch} />;
}
```

### ChannelPage

**До:**
```tsx
// Поиск в mock данных
const channel = mockChannels.find(c => c.id === channelId);
```

**После:**
```tsx
// Загрузка через API с расписанием
const { getChannelWithSchedule } = useChannels();
const [channel, setChannel] = useState(null);

useEffect(() => {
  const loadChannel = async () => {
    try {
      const fullChannel = await getChannelWithSchedule(channelId);
      setChannel(fullChannel);
    } catch (error) {
      setError(`API Error: ${error.message}`);
    }
  };
  loadChannel();
}, [channelId]);
```

## Обработка ошибок

### Типы ошибок API

1. **Сервер недоступен** - `Request timeout` или `Network error`
2. **Канал не найден** - `HTTP 404`
3. **Некорректные данные** - `HTTP 400`
4. **Сервер перегружен** - `HTTP 503`

### Стратегия обработки

```tsx
const { status, error, refetch } = useChannels();

switch (status) {
  case 'loading':
    return <LoadingSpinner message="Подключаемся к Adapto Digital TV API..." />;
    
  case 'error':
    return (
      <ErrorContainer>
        <ErrorMessage>Ошибка подключения к API</ErrorMessage>
        <ErrorDetails>{error}</ErrorDetails>
        <Button onClick={refetch}>Повторить попытку</Button>
      </ErrorContainer>
    );
    
  case 'success':
    if (isEmpty) {
      return <EmptyState message="API не вернул активных каналов" />;
    }
    return <ChannelsList channels={channels} />;
}
```

## Конфигурация среды

### Разработка

```bash
# Django API (обязательно)
python manage.py runserver 127.0.0.1:8000

# Фронтенд с API
REACT_APP_API_BASE_URL=http://127.0.0.1:8000/api/v1 yarn dev
```

### Продакшн

```bash
# API сервер
REACT_APP_API_BASE_URL=https://api.example.com/api/v1

# Сборка
yarn build:all
```

## Требования к Django Backend

### 1. Модели данных

```python
# models.py
class Channel(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=50, unique=True)
    is_active = models.BooleanField(default=True)
    logo = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True)
    stream_url = models.URLField()
    
class Program(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
```

### 2. API Views

```python
# views.py - требуется пагинация
class ChannelListView(generics.ListAPIView):
    queryset = Channel.objects.filter(is_active=True)
    serializer_class = ChannelSerializer
    pagination_class = StandardResultsSetPagination
```

### 3. CORS настройки

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",        # Разработка
    "https://your-tv-domain.com",   # Продакшн
]
```

## Команды для работы

### Разработка

```bash
# Запуск API (в отдельном терминале)
python manage.py runserver 127.0.0.1:8000

# Проверка API
curl http://127.0.0.1:8000/api/v1/channels/

# Веб-разработка с API
yarn dev

# React Native TV
yarn dev:android-tv
yarn dev:tvos
```

### Сборка

```bash
# Сборка всех платформ (требует API для тестирования)
yarn build:all

# Отдельные платформы
yarn build:tizen     # Samsung
yarn build:webos     # LG  
yarn build:pwa       # Web/PWA
```

## Troubleshooting

### API сервер не запущен

```bash
# Ошибка: "Failed to fetch channels from API"
# Решение: Запустить Django сервер
python manage.py runserver 127.0.0.1:8000
```

### Пустая база данных

```bash
# Ошибка: "API не вернул активных каналов"
# Решение: Заполнить базу данных через Django admin
python manage.py createsuperuser
# Добавить каналы с is_active=True
```

### CORS ошибки

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://your-smart-tv-domain.com",
]
```

### Медленная сеть Smart TV

```env
# Увеличить timeout
REACT_APP_API_TIMEOUT=20000
```

## Roadmap

### Ближайшие обновления
- [ ] Roku рендерер с API support
- [ ] Offline-first архитектура с кэшированием
- [ ] Real-time обновления через WebSocket
- [ ] Push уведомления для программ

### API Enhancements
- [ ] Authentication & Authorization
- [ ] Content recommendations
- [ ] User favorites & watchlists
- [ ] Analytics & tracking

## Получение помощи

1. **API интеграция**: [packages/app-core/API_INTEGRATION.md](packages/app-core/API_INTEGRATION.md)
2. **Дизайн-система**: [packages/app-core/DESIGN_SYSTEM.md](packages/app-core/DESIGN_SYSTEM.md)
3. **Быстрый старт**: [PROJECT_README.md](PROJECT_README.md)
4. **API клиент**: `packages/app-core/src/api/`

## Заключение

Новая архитектура предоставляет:

✅ **Живые данные** - Реальный API без fallback  
✅ **Надёжность** - Полная обработка ошибок API  
✅ **Производительность** - Кэширование и оптимизации для Smart TV  
✅ **Типизация** - Полная TypeScript поддержка API  
✅ **Консистентность** - Данные всегда актуальны  
✅ **Качество** - iOS дизайн + современная архитектура

⚠️ **Важно**: Приложение полностью зависит от API. Без работающего сервера приложение покажет ошибки подключения. 