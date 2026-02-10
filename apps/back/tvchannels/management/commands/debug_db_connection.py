from django.core.management.base import BaseCommand
from django.db import connection, connections
from django.conf import settings
import os


class Command(BaseCommand):
    help = "Отладка подключения к базе данных"

    def handle(self, *args, **options):
        self.stdout.write("🔍 ОТЛАДКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ")
        self.stdout.write("=" * 60)
        
        # Информация о настройках Django
        self.stdout.write(f"📁 DEBUG: {settings.DEBUG}")
        self.stdout.write(f"📁 ENVIRONMENT: {os.environ.get('DJANGO_SETTINGS_MODULE', 'не установлено')}")
        
        # Информация о базах данных
        self.stdout.write("\n💾 НАСТРОЙКИ БАЗ ДАННЫХ:")
        for db_name, db_config in settings.DATABASES.items():
            self.stdout.write(f"  📊 База: {db_name}")
            self.stdout.write(f"     ENGINE: {db_config.get('ENGINE', 'не указан')}")
            self.stdout.write(f"     NAME: {db_config.get('NAME', 'не указано')}")
            self.stdout.write(f"     HOST: {db_config.get('HOST', 'не указан')}")
            self.stdout.write(f"     PORT: {db_config.get('PORT', 'не указан')}")
            self.stdout.write(f"     USER: {db_config.get('USER', 'не указан')}")
        
        # Проверка подключения к базе данных
        self.stdout.write("\n🔌 ПРОВЕРКА ПОДКЛЮЧЕНИЯ:")
        try:
            with connection.cursor() as cursor:
                # Проверяем, какие таблицы существуют
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name LIKE '%channel%'
                    ORDER BY name;
                """)
                tables = cursor.fetchall()
                
                self.stdout.write("✅ Подключение к базе данных успешно")
                self.stdout.write(f"📋 Таблицы с 'channel' в названии:")
                for table in tables:
                    self.stdout.write(f"   - {table[0]}")
                
                # Проверяем структуру таблицы tvchannels_channel
                if any('tvchannels_channel' in str(table) for table in tables):
                    cursor.execute("PRAGMA table_info(tvchannels_channel);")
                    columns = cursor.fetchall()
                    self.stdout.write(f"\n📊 Структура таблицы tvchannels_channel:")
                    for col in columns:
                        self.stdout.write(f"   - {col[1]} ({col[2]})")
                
                # Проверяем количество записей в таблице каналов
                try:
                    cursor.execute("SELECT COUNT(*) FROM tvchannels_channel;")
                    count = cursor.fetchone()[0]
                    self.stdout.write(f"\n📈 Количество каналов в БД: {count}")
                    
                    if count > 0:
                        cursor.execute("SELECT id, name, slug FROM tvchannels_channel LIMIT 5;")
                        channels = cursor.fetchall()
                        self.stdout.write("📺 Первые 5 каналов:")
                        for channel in channels:
                            self.stdout.write(f"   ID: {channel[0]}, Название: {channel[1]}, Slug: {channel[2]}")
                            
                except Exception as e:
                    self.stdout.write(f"⚠️ Ошибка при запросе каналов: {str(e)}")
                
        except Exception as e:
            self.stdout.write(f"❌ Ошибка подключения к базе данных: {str(e)}")
        
        # Проверка переменных окружения
        self.stdout.write("\n🌍 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:")
        db_vars = ['DATABASE_URL', 'DB_NAME', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD']
        for var in db_vars:
            value = os.environ.get(var, 'не установлено')
            if 'PASSWORD' in var and value != 'не установлено':
                value = '*' * len(value)  # Скрываем пароль
            self.stdout.write(f"  {var}: {value}")
        
        # Информация о файле базы данных (для SQLite)
        db_name = settings.DATABASES['default'].get('NAME', '')
        if db_name and os.path.exists(db_name):
            stat = os.stat(db_name)
            self.stdout.write(f"\n📁 Файл базы данных: {db_name}")
            self.stdout.write(f"   Размер: {stat.st_size} байт")
            self.stdout.write(f"   Последнее изменение: {stat.st_mtime}")
        elif db_name:
            self.stdout.write(f"\n❌ Файл базы данных не найден: {db_name}")
