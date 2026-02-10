import json
import os
import tempfile
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

import paramiko
import pytz
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_datetime

from tvchannels.models import Channel, Program


class Command(BaseCommand):
    help = "Импорт программ из JSON файлов через SSH соединение"

    def add_arguments(self, parser):
        # Параметры базы данных
        parser.add_argument(
            "--database-url",
            type=str,
            help="URL базы данных PostgreSQL (например: postgresql://user:pass@host:port/db)"
        )
        parser.add_argument(
            "--list-channels-only",
            action="store_true",
            help="Только показать список доступных каналов и выйти"
        )
        
        # SSH параметры
        parser.add_argument(
            "--ssh-host",
            type=str,
            help="SSH хост для подключения"
        )
        parser.add_argument(
            "--ssh-user",
            type=str,
            help="SSH пользователь"
        )
        parser.add_argument(
            "--ssh-password",
            type=str,
            help="SSH пароль"
        )
        parser.add_argument(
            "--ssh-port",
            type=int,
            default=22,
            help="SSH порт (по умолчанию: 22)"
        )
        
        # Параметры файлов
        parser.add_argument(
            "--remote-path",
            type=str,
            help="Путь к файлу или папке на удаленном сервере"
        )
        parser.add_argument(
            "--recursive",
            action="store_true",
            help="Рекурсивный поиск JSON файлов в подпапках"
        )
        
        # Параметры канала
        parser.add_argument(
            "--channel-id",
            type=int,
            help="ID телеканала"
        )
        parser.add_argument(
            "--channel-slug",
            type=str,
            help="Slug телеканала"
        )
        
        # Параметры JSON полей
        parser.add_argument(
            "--title-field",
            type=str,
            default="title",
            help="Поле для названия программы (по умолчанию: title)"
        )
        parser.add_argument(
            "--start-time-field",
            type=str,
            default="start_minute_pretty",
            help="Поле для времени начала (по умолчанию: start_minute_pretty)"
        )
        parser.add_argument(
            "--programs-array-field",
            type=str,
            default="program",
            help="Поле массива программ в JSON (по умолчанию: program)"
        )
        
        # Параметры импорта
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Количество записей для импорта за раз (по умолчанию: 100)"
        )
        parser.add_argument(
            "--max-records",
            type=int,
            help="Максимальное количество записей для импорта"
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Проверочный запуск без сохранения в БД"
        )

    def handle(self, *args, **options):
        # Установка переменной DATABASE_URL если указана
        database_url = options.get('database_url')
        if database_url:
            import os
            os.environ['DATABASE_URL'] = database_url
            self.stdout.write(f"🔄 Устанавливаем DATABASE_URL для PostgreSQL подключения")
            
            # Пересоздаем подключение к базе данных
            from django.db import connections
            from django.conf import settings
            try:
                import dj_database_url
                # Обновляем настройки Django
                settings.DATABASES['default'] = dj_database_url.parse(database_url)
                
                # Закрываем существующие подключения
                connections.close_all()
            except ImportError:
                raise CommandError("Для работы с PostgreSQL нужна библиотека dj-database-url. Установите: pip install dj-database-url")
            
            self.stdout.write("✅ База данных переконфигурирована")
        
        # Если нужно только показать каналы
        if options['list_channels_only']:
            self.list_channels()
            return
        
        # Проверка обязательных параметров для импорта
        required_params = ['ssh_host', 'ssh_user', 'ssh_password', 'remote_path']
        missing_params = [param for param in required_params if not options.get(param)]
        
        if missing_params:
            missing_str = ', '.join([f'--{param.replace("_", "-")}' for param in missing_params])
            raise CommandError(f"Для импорта необходимы параметры: {missing_str}")
        
        try:
            # Получение канала
            channel = self.get_channel(options)
            
            # SSH подключение и получение файлов
            json_files = self.fetch_json_files(options)
            
            if not json_files:
                self.stdout.write(
                    self.style.WARNING("JSON файлы не найдены")
                )
                return
            
            self.stdout.write(
                self.style.SUCCESS(f"Найдено {len(json_files)} JSON файлов")
            )
            
            # Парсинг и импорт данных
            programs_data = self.parse_json_files(json_files, options)
            
            if not programs_data:
                self.stdout.write(
                    self.style.WARNING("Данные программ не найдены")
                )
                return
            
            # Сортировка по времени начала для правильного вычисления времени окончания
            programs_data.sort(key=lambda x: x['start_time'])
            
            # Вычисление времени окончания
            self.calculate_end_times(programs_data)
            
            # Импорт в базу данных
            imported_count = self.import_programs(channel, programs_data, options)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Импорт завершен. Обработано записей: {imported_count}"
                )
            )
            
        except Exception as e:
            raise CommandError(f"Ошибка при импорте: {str(e)}")

    def list_channels(self):
        """Показать список доступных каналов"""
        try:
            channels = Channel.objects.all().order_by('id')
            
            if not channels.exists():
                self.stdout.write(
                    self.style.WARNING("❌ Каналы не найдены в базе данных")
                )
                return
            
            self.stdout.write(
                self.style.SUCCESS(f"📺 Найдено каналов: {channels.count()}")
            )
            self.stdout.write("=" * 80)
            
            for channel in channels:
                # Количество программ
                program_count = channel.programs.count()
                
                self.stdout.write(
                    f"🆔 ID: {channel.id} | "
                    f"📛 {channel.name} | "
                    f"🔗 {channel.slug} | "
                    f"📋 Программ: {program_count}"
                )
            
            self.stdout.write("\n💡 Примеры использования:")
            for channel in channels[:3]:  # Показываем первые 3 канала как примеры
                self.stdout.write(
                    f"   python manage.py import_json_programs --channel-id {channel.id} --ssh-host ... --remote-path ..."
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Ошибка при получении каналов: {str(e)}")
            )

    def get_channel(self, options: Dict[str, Any]) -> Channel:
        """Получение канала по ID или slug"""
        channel_id = options.get('channel_id')
        channel_slug = options.get('channel_slug')
        
        if not channel_id and not channel_slug:
            raise CommandError("Необходимо указать --channel-id или --channel-slug")
        
        try:
            if channel_id:
                channel = Channel.objects.get(id=channel_id)
            else:
                channel = Channel.objects.get(slug=channel_slug)
            
            self.stdout.write(
                self.style.SUCCESS(f"Канал найден: {channel.name}")
            )
            return channel
            
        except Channel.DoesNotExist:
            raise CommandError(
                f"Канал не найден (ID: {channel_id}, slug: {channel_slug})"
            )

    def fetch_json_files(self, options: Dict[str, Any]) -> List[str]:
        """Получение JSON файлов через SSH"""
        ssh_host = options['ssh_host']
        ssh_user = options['ssh_user']
        ssh_password = options['ssh_password']
        ssh_port = options['ssh_port']
        remote_path = options['remote_path']
        recursive = options['recursive']
        
        self.stdout.write(f"Подключение к {ssh_user}@{ssh_host}:{ssh_port}")
        
        try:
            # Создание SSH клиента
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(
                hostname=ssh_host,
                port=ssh_port,
                username=ssh_user,
                password=ssh_password,
                timeout=30
            )
            
            # Создание SFTP клиента
            sftp = ssh.open_sftp()
            
            # Поиск JSON файлов
            json_files = []
            
            try:
                # Проверяем, является ли remote_path файлом или папкой
                stat = sftp.stat(remote_path)
                
                if stat.st_mode & 0o170000 == 0o100000:  # Обычный файл
                    if remote_path.endswith('.json'):
                        json_files.append(self.download_file(sftp, remote_path))
                else:  # Папка
                    json_files.extend(
                        self.find_json_files(sftp, remote_path, recursive)
                    )
                    
            except FileNotFoundError:
                raise CommandError(f"Путь не найден: {remote_path}")
            
            finally:
                sftp.close()
                ssh.close()
            
            return json_files
            
        except paramiko.AuthenticationException:
            raise CommandError("Ошибка аутентификации SSH")
        except paramiko.SSHException as e:
            raise CommandError(f"Ошибка SSH соединения: {str(e)}")
        except Exception as e:
            raise CommandError(f"Ошибка при подключении: {str(e)}")

    def find_json_files(self, sftp, remote_dir: str, recursive: bool) -> List[str]:
        """Поиск JSON файлов в директории"""
        json_files = []
        
        try:
            for item in sftp.listdir_attr(remote_dir):
                item_path = os.path.join(remote_dir, item.filename).replace('\\', '/')
                
                if item.st_mode & 0o170000 == 0o040000:  # Папка
                    if recursive:
                        json_files.extend(
                            self.find_json_files(sftp, item_path, recursive)
                        )
                elif item.filename.endswith('.json'):  # JSON файл
                    json_files.append(self.download_file(sftp, item_path))
                    
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f"Ошибка при обходе папки {remote_dir}: {str(e)}")
            )
        
        return json_files

    def download_file(self, sftp, remote_file_path: str) -> str:
        """Скачивание файла во временную папку"""
        try:
            # Создание временного файла
            temp_file = tempfile.NamedTemporaryFile(
                mode='w+b', suffix='.json', delete=False
            )
            
            # Скачивание файла
            sftp.get(remote_file_path, temp_file.name)
            temp_file.close()
            
            self.stdout.write(f"Скачан файл: {remote_file_path}")
            return temp_file.name
            
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(
                    f"Ошибка при скачивании {remote_file_path}: {str(e)}"
                )
            )
            return None

    def parse_json_files(self, json_files: List[str], options: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Парсинг JSON файлов и извлечение данных программ"""
        title_field = options['title_field']
        start_time_field = options['start_time_field']
        programs_array_field = options['programs_array_field']
        max_records = options.get('max_records')
        
        programs_data = []
        processed_count = 0
        
        # Часовой пояс Aktau
        aktau_tz = pytz.timezone('Asia/Aqtau')
        
        for json_file_path in json_files:
            if not json_file_path:
                continue
                
            try:
                with open(json_file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Извлечение массива программ
                if isinstance(data, list):
                    # Если корневой элемент - массив, обрабатываем каждый элемент
                    for file_data in data:
                        programs_array = file_data.get(programs_array_field)
                        if programs_array and isinstance(programs_array, list):
                            processed_count += self.process_programs_array(
                                programs_array, title_field, start_time_field, 
                                aktau_tz, programs_data, json_file_path, 
                                max_records, processed_count
                            )
                elif isinstance(data, dict):
                    # Если корневой элемент - объект, ищем массив программ
                    programs_array = data.get(programs_array_field)
                    if programs_array and isinstance(programs_array, list):
                        processed_count += self.process_programs_array(
                            programs_array, title_field, start_time_field,
                            aktau_tz, programs_data, json_file_path,
                            max_records, processed_count
                        )
                    else:
                        # Обработка одиночной программы (старый формат)
                        title = self.get_nested_value(data, title_field)
                        start_time_str = self.get_nested_value(data, start_time_field)
                        
                        if title and start_time_str:
                            start_time = self.parse_datetime_with_timezone(start_time_str, aktau_tz)
                            if start_time:
                                programs_data.append({
                                    'title': title,
                                    'start_time': start_time,
                                    'source_file': json_file_path,
                                    'raw_data': data
                                })
                                processed_count += 1
                
                # Удаление временного файла
                os.unlink(json_file_path)
                
                # Проверка лимита записей
                if max_records and processed_count >= max_records:
                    break
                    
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(
                        f"Ошибка при обработке файла {json_file_path}: {str(e)}"
                    )
                )
                continue
        
        self.stdout.write(
            self.style.SUCCESS(f"Обработано программ: {len(programs_data)}")
        )
        
        return programs_data

    def process_programs_array(self, programs_array: List[Dict], title_field: str, 
                             start_time_field: str, aktau_tz, programs_data: List[Dict], 
                             json_file_path: str, max_records: Optional[int], 
                             current_count: int) -> int:
        """Обработка массива программ из JSON"""
        processed_in_array = 0
        
        for program_item in programs_array:
            try:
                # Проверка лимита записей
                if max_records and (current_count + processed_in_array) >= max_records:
                    break
                
                # Извлечение названия (прямо из элемента программы)
                title = program_item.get(title_field)
                if not title:
                    continue
                
                # Извлечение времени начала (прямо из элемента программы)
                start_time_str = program_item.get(start_time_field)
                if not start_time_str:
                    continue
                
                # Парсинг времени с учетом часового пояса
                start_time = self.parse_datetime_with_timezone(start_time_str, aktau_tz)
                if not start_time:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Не удалось распарсить время: {start_time_str}"
                        )
                    )
                    continue
                
                programs_data.append({
                    'title': title,
                    'start_time': start_time,
                    'source_file': json_file_path,
                    'raw_data': program_item
                })
                
                processed_in_array += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(
                        f"Ошибка при обработке программы: {str(e)}"
                    )
                )
                continue
        
        return processed_in_array

    def get_nested_value(self, data: Dict[str, Any], field_path: str) -> Optional[str]:
        """Получение значения из вложенной структуры по пути (например, 'program.title')"""
        try:
            value = data
            for key in field_path.split('.'):
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return None
            return str(value) if value is not None else None
        except Exception:
            return None

    def parse_datetime_with_timezone(self, datetime_str: str, timezone) -> Optional[datetime]:
        """Парсинг строки времени с применением часового пояса"""
        try:
            # Парсинг в формате "2025-08-11 06:00"
            if ' ' in datetime_str:
                dt = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M')
            else:
                # Попытка стандартного парсинга
                dt = parse_datetime(datetime_str)
                if dt is None:
                    return None
            
            # Применение часового пояса
            if dt.tzinfo is None:
                dt = timezone.localize(dt)
            
            return dt
            
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f"Ошибка парсинга времени {datetime_str}: {str(e)}")
            )
            return None

    def calculate_end_times(self, programs_data: List[Dict[str, Any]]):
        """Вычисление времени окончания программ"""
        for i, program in enumerate(programs_data):
            if i < len(programs_data) - 1:
                # Время окончания = время начала следующей программы
                program['end_time'] = programs_data[i + 1]['start_time']
            else:
                # Для последней программы добавляем 1 час по умолчанию
                program['end_time'] = program['start_time'] + timedelta(hours=1)

    def import_programs(self, channel: Channel, programs_data: List[Dict[str, Any]], options: Dict[str, Any]) -> int:
        """Импорт программ в базу данных"""
        batch_size = options['batch_size']
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING("ПРОВЕРОЧНЫЙ РЕЖИМ - данные не будут сохранены")
            )
        
        imported_count = 0
        programs_to_create = []
        
        for i, program_data in enumerate(programs_data):
            try:
                # Проверка на существование программы
                existing = Program.objects.filter(
                    channel=channel,
                    start_time=program_data['start_time']
                ).first()
                
                if existing:
                    self.stdout.write(
                        f"Программа уже существует: {program_data['title']} "
                        f"({program_data['start_time']})"
                    )
                    continue
                
                # Вычисление длительности
                duration = program_data['end_time'] - program_data['start_time']
                
                # Создание объекта программы
                program = Program(
                    channel=channel,
                    name=program_data['title'],
                    start_time=program_data['start_time'],
                    end_time=program_data['end_time'],
                    duration=duration,
                    description=""  # Можно добавить извлечение описания из JSON
                )
                
                if not dry_run:
                    programs_to_create.append(program)
                
                imported_count += 1
                
                # Пакетное создание
                if len(programs_to_create) >= batch_size:
                    if not dry_run:
                        with transaction.atomic():
                            Program.objects.bulk_create(programs_to_create, ignore_conflicts=True)
                        self.stdout.write(f"Импортировано программ: {len(programs_to_create)}")
                    programs_to_create = []
                
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(
                        f"Ошибка при импорте программы {program_data['title']}: {str(e)}"
                    )
                )
                continue
        
        # Импорт оставшихся программ
        if programs_to_create and not dry_run:
            with transaction.atomic():
                Program.objects.bulk_create(programs_to_create, ignore_conflicts=True)
            self.stdout.write(f"Импортировано программ: {len(programs_to_create)}")
        
        return imported_count
