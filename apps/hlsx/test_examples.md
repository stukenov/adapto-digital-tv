# Примеры использования HLX сервера

## Новые сокращенные параметры

### 1. Получение манифеста потока
**Старый формат:**
```
GET /manifest?stream=stream1
```

**Новый формат:**
```
GET /manifest?s=stream1
```

### 2. Удаление даты/времени
**Старый формат:**
```
GET /manifest?stream=stream1&delete_datetime=1
```

**Новый формат:**
```
GET /manifest?s=stream1&dt=1
```

### 3. Удаление последнего сегмента (новый параметр)
```
GET /manifest?s=stream1&rl=1
```

### 4. Корректировка времени для всех сегментов (новый параметр)
```
GET /manifest?s=stream1&at=1
```

### 5. Очистка устаревших тегов (новый параметр)
```
GET /manifest?s=stream1&ct=1
```

### 6. Комбинированное использование
```
GET /manifest?s=stream1&dt=1&rl=1&at=1&ct=1
```

## Новый формат URL сегментов

**Старый формат:**
```
/segment?stream=stream1&file=22306abe87cb_main_seg195.ts
```

**Новый формат:**
```
/segment?s=stream1&f=22306abe87cb_main_seg195.ts
```

## Примеры ответов

### Без параметров (базовый манифест)
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:16
#EXT-X-MEDIA-SEQUENCE:195
#EXTINF:10.00000,
/segment?s=stream1&f=22306abe87cb_main_seg195.ts
#EXTINF:6.68000,
/segment?s=stream1&f=22306abe87cb_main_seg196.ts
#EXTINF:13.24000,
/segment?s=stream1&f=22306abe87cb_main_seg197.ts
```

### С удалением последнего сегмента (rl=1)
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:16
#EXT-X-MEDIA-SEQUENCE:195
#EXTINF:10.00000,
/segment?s=stream1&f=22306abe87cb_main_seg195.ts
#EXTINF:6.68000,
/segment?s=stream1&f=22306abe87cb_main_seg196.ts
```

### С корректировкой времени (at=1) - исправляет дублирование PDT
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:16
#EXT-X-MEDIA-SEQUENCE:195
#EXT-X-PROGRAM-DATE-TIME:2025-08-21T21:48:59.417Z
#EXTINF:10.00000,
/segment?s=stream1&f=22306abe87cb_main_seg195.ts
#EXT-X-PROGRAM-DATE-TIME:2025-08-21T21:49:09.417Z
#EXTINF:6.68000,
/segment?s=stream1&f=22306abe87cb_main_seg196.ts
#EXT-X-PROGRAM-DATE-TIME:2025-08-21T21:49:16.097Z
#EXTINF:13.24000,
/segment?s=stream1&f=22306abe87cb_main_seg197.ts
```

### С очисткой тегов (ct=1) - убирает устаревшие теги
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:16
#EXT-X-MEDIA-SEQUENCE:195
#EXTINF:10.00000,
/segment?s=stream1&f=22306abe87cb_main_seg195.ts
#EXTINF:6.68000,
/segment?s=stream1&f=22306abe87cb_main_seg196.ts
#EXTINF:13.24000,
/segment?s=stream1&f=22306abe87cb_main_seg197.ts
```

### Комбинированно (dt=1&rl=1&at=1&ct=1)
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:16
#EXT-X-MEDIA-SEQUENCE:195
#EXTINF:10.00000,
/segment?s=stream1&f=22306abe87cb_main_seg195.ts
#EXTINF:6.68000,
/segment?s=stream1&f=22306abe87cb_main_seg196.ts
```

## Решение проблем HLS

### 1. Дублирование PROGRAM-DATE-TIME
**Проблема:** Между сегментами может быть несколько PDT строк
**Решение:** Параметр `at=1` автоматически устраняет дублирование и корректно рассчитывает время

### 2. Несоответствие длительностей
**Проблема:** Разница между PDT ~12 секунд, а EXTINF везде 6.00000
**Решение:** Автоматически корректируется TARGETDURATION и время сегментов

### 3. Устаревшие теги
**Проблема:** `#EXT-X-ALLOW-CACHE:NO` игнорируется современными плеерами
**Решение:** Параметр `ct=1` удаляет устаревшие теги

## Тестирование

Для тестирования можно использовать curl:

```bash
# Базовый манифест
curl "http://localhost:8280/manifest?s=stream1"

# С удалением последнего сегмента
curl "http://localhost:8280/manifest?s=stream1&rl=1"

# С корректировкой времени (исправляет дублирование PDT)
curl "http://localhost:8280/manifest?s=stream1&at=1"

# С очисткой тегов
curl "http://localhost:8280/manifest?s=stream1&ct=1"

# Комбинированно (все исправления)
curl "http://localhost:8280/manifest?s=stream1&dt=1&rl=1&at=1&ct=1"
```

## Ожидаемые результаты

- **Без параметров:** Оригинальный манифест с переписанными URL
- **rl=1:** Манифест без последнего сегмента
- **at=1:** Манифест с корректным временем сегментов (без дублирования PDT)
- **ct=1:** Манифест без устаревших тегов
- **Комбинированно:** Полностью исправленный манифест


