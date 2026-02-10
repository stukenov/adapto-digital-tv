# Adapto Digital TV API Integration

Этот проект интегрирован с реальным API Adapto Digital TV для получения данных о телеканалах и программах передач.


## Настройка API

### 1. Конфигурация

API настроен в файлах:
- `services/adapto-api.ts` - основной сервис API
- `config/api.ts` - конфигурация подключения

### 2. Аутентификация

API использует базовую HTTP аутентификацию. Для настройки добавьте учетные данные в `services/adapto-api.ts`:

```typescript
const API_USERNAME = 'your_username';
const API_PASSWORD = 'your_password';
```

**Важно**: В продакшене используйте переменные окружения для хранения учетных данных.

### 3. Endpoints

API предоставляет следующие endpoints:

#### Каналы
- `GET /channels/` - получить список активных каналов
- `GET /channels/{slug}/` - получить детали канала по slug
- `GET /channels/{slug}/schedule/` - получить расписание канала

#### Программы
- `GET /programs/` - получить список программ
- `GET /programs/{id}/` - получить детали программы

### 4. Структура данных

#### Channel (Канал)
```typescript
interface APIChannel {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  logo?: string;
  description?: string;
  stream_url: string;
  created_at: string;
  updated_at: string;
}
```

#### Program (Программа)
```typescript
interface APIProgram {
  id: number;
  channel: number;
  channel_name: string;
  name: string;
  description?: string;
  start_time: string; // ISO DateTime
  end_time: string;   // ISO DateTime
  duration: string;
}
```

## Использование в компонентах

### Хуки для работы с данными

```typescript
import { useChannels } from '@/hooks/useChannels';
import { useChannelSchedule } from '@/hooks/useSchedule';

// Получение списка каналов
const { channels, loading, refreshChannels } = useChannels();

// Получение расписания канала
const { schedule, loading } = useChannelSchedule(channelSlug, date);
```

### API сервис

```typescript
import { adaptoAPI } from '@/services/adapto-api';

// Прямые вызовы API
const channels = await adaptoAPI.getChannels();
const channel = await adaptoAPI.getChannelBySlug('channel-slug');
const schedule = await adaptoAPI.getChannelSchedule('channel-slug', '2024-01-01');
```

## Обработка ошибок

Все API вызовы включают обработку ошибок:

1. **LoadingSpinner** - отображается во время загрузки
2. **ErrorMessage** - показывает ошибки с возможностью повтора
3. **RefreshControl** - позволяет обновить данные потягиванием

## Состояния загрузки

Каждый хук возвращает объект `loading`:

```typescript
interface LoadingState {
  isLoading: boolean;
  error?: string;
}
```

## Offline режим

В случае отсутствия подключения к API, приложение показывает соответствующие сообщения об ошибках с возможностью повтора запроса.

## Тестирование

Для тестирования API убедитесь, что:

1. Сервер Adapto Digital TV запущен на `http://127.0.0.1:8000`
2. API доступно по адресу `/api/v1`
3. Настроены правильные учетные данные
4. Каналы помечены как активные (`is_active: true`)

## Производительность

- API использует встроенный `fetch` для HTTP запросов
- Реализовано кэширование на уровне React хуков
- Pull-to-refresh для обновления данных
- Lazy loading для больших списков

## Безопасность

⚠️ **Важные замечания по безопасности:**

1. Никогда не храните учетные данные в коде
2. Используйте HTTPS в продакшене
3. Настройте CORS на сервере правильно
4. Используйте переменные окружения для секретных данных 