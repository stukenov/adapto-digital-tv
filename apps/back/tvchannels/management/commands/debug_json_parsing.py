import json
import os
import tempfile
from datetime import datetime
from typing import List, Dict, Any, Optional

import paramiko
import pytz
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Отладка парсинга JSON файлов для импорта программ"

    def add_arguments(self, parser):
        # SSH параметры
        parser.add_argument(
            "--ssh-host",
            type=str,
            required=True,
            help="SSH хост для подключения"
        )
        parser.add_argument(
            "--ssh-user",
            type=str,
            required=True,
            help="SSH пользователь"
        )
        parser.add_argument(
            "--ssh-password",
            type=str,
            required=True,
            help="SSH пароль"
        )
        parser.add_argument(
            "--ssh-port",
            type=int,
            default=22,
            help="SSH порт (по умолчанию: 22)"
        )
        parser.add_argument(
            "--remote-path",
            type=str,
            required=True,
            help="Путь к файлу или папке на удаленном сервере"
        )
        parser.add_argument(
            "--max-files",
            type=int,
            default=2,
            help="Максимальное количество файлов для анализа (по умолчанию: 2)"
        )

    def handle(self, *args, **options):
        try:
            # SSH подключение и получение файлов
            json_files = self.fetch_json_files(options)
            
            if not json_files:
                self.stdout.write(
                    self.style.WARNING("JSON файлы не найдены")
                )
                return
            
            self.stdout.write(
                self.style.SUCCESS(f"Найдено {len(json_files)} JSON файлов для анализа")
            )
            
            # Анализ каждого файла
            for i, json_file_path in enumerate(json_files[:options['max_files']]):
                if not json_file_path:
                    continue
                    
                self.stdout.write(f"\n{'='*60}")
                self.stdout.write(f"📁 АНАЛИЗ ФАЙЛА #{i+1}: {os.path.basename(json_file_path)}")
                self.stdout.write(f"{'='*60}")
                
                self.analyze_json_file(json_file_path)
                
                # Удаление временного файла
                os.unlink(json_file_path)
            
        except Exception as e:
            raise CommandError(f"Ошибка при анализе: {str(e)}")

    def fetch_json_files(self, options: Dict[str, Any]) -> List[str]:
        """Получение JSON файлов через SSH"""
        ssh_host = options['ssh_host']
        ssh_user = options['ssh_user']
        ssh_password = options['ssh_password']
        ssh_port = options['ssh_port']
        remote_path = options['remote_path']
        
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
                    items = sftp.listdir_attr(remote_path)
                    for item in items[:options['max_files']]:  # Ограничиваем количество
                        if item.filename.endswith('.json'):
                            item_path = os.path.join(remote_path, item.filename).replace('\\', '/')
                            json_files.append(self.download_file(sftp, item_path))
                    
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
            
            self.stdout.write(f"✅ Скачан файл: {remote_file_path}")
            return temp_file.name
            
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(
                    f"❌ Ошибка при скачивании {remote_file_path}: {str(e)}"
                )
            )
            return None

    def analyze_json_file(self, json_file_path: str):
        """Детальный анализ структуры JSON файла"""
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.stdout.write(f"📊 Размер файла: {os.path.getsize(json_file_path)} байт")
            
            # Анализ корневой структуры
            self.stdout.write("\n🔍 СТРУКТУРА JSON:")
            if isinstance(data, dict):
                self.stdout.write("   Тип: объект (dict)")
                self.stdout.write(f"   Ключи: {list(data.keys())}")
                
                # Анализ основных полей
                for key in ['channel', 'date', 'program']:
                    if key in data:
                        value = data[key]
                        if key == 'program' and isinstance(value, list):
                            self.stdout.write(f"   ✅ {key}: массив из {len(value)} элементов")
                        else:
                            self.stdout.write(f"   ✅ {key}: {type(value).__name__} = {str(value)[:50]}...")
                    else:
                        self.stdout.write(f"   ❌ {key}: отсутствует")
                        
            elif isinstance(data, list):
                self.stdout.write(f"   Тип: массив из {len(data)} элементов")
                if data:
                    self.stdout.write(f"   Первый элемент: {type(data[0]).__name__}")
                    if isinstance(data[0], dict):
                        self.stdout.write(f"   Ключи первого элемента: {list(data[0].keys())}")
            
            # Анализ программ
            programs_array = None
            if isinstance(data, dict) and 'program' in data:
                programs_array = data['program']
            elif isinstance(data, list):
                # Ищем программы в первом элементе массива
                if data and isinstance(data[0], dict) and 'program' in data[0]:
                    programs_array = data[0]['program']
            
            if programs_array and isinstance(programs_array, list):
                self.stdout.write(f"\n📺 АНАЛИЗ ПРОГРАММ (найдено {len(programs_array)} программ):")
                
                # Анализ первых 3 программ
                for i, program in enumerate(programs_array[:3]):
                    self.stdout.write(f"\n   📺 Программа #{i+1}:")
                    self.stdout.write(f"      Тип: {type(program).__name__}")
                    
                    if isinstance(program, dict):
                        # Проверяем наличие ключевых полей
                        title = program.get('title', 'НЕ НАЙДЕНО')
                        start_time = program.get('start_minute_pretty', 'НЕ НАЙДЕНО')
                        
                        self.stdout.write(f"      title: {title}")
                        self.stdout.write(f"      start_minute_pretty: {start_time}")
                        self.stdout.write(f"      Все ключи: {list(program.keys())}")
                        
                        # Парсинг времени
                        if start_time != 'НЕ НАЙДЕНО':
                            aktau_tz = pytz.timezone('Asia/Aqtau')
                            try:
                                dt = datetime.strptime(start_time, '%Y-%m-%d %H:%M')
                                dt_with_tz = aktau_tz.localize(dt)
                                self.stdout.write(f"      ✅ Время успешно распарсено: {dt_with_tz}")
                            except Exception as e:
                                self.stdout.write(f"      ❌ Ошибка парсинга времени: {str(e)}")
                
                if len(programs_array) > 3:
                    self.stdout.write(f"\n   ... и еще {len(programs_array) - 3} программ")
                    
            else:
                self.stdout.write("\n❌ ПРОГРАММЫ НЕ НАЙДЕНЫ!")
                self.stdout.write("   Возможные причины:")
                self.stdout.write("   - Отсутствует ключ 'program'")
                self.stdout.write("   - 'program' не является массивом")
                self.stdout.write("   - Неожиданная структура JSON")
            
            # Проверка работы парсера команды импорта
            self.stdout.write(f"\n🧪 ТЕСТИРОВАНИЕ ЛОГИКИ ПАРСЕРА:")
            
            # Симулируем логику из import_json_programs.py
            title_field = "title"
            start_time_field = "start_minute_pretty"
            programs_array_field = "program"
            
            programs_found = 0
            
            if isinstance(data, dict):
                # Если корневой элемент - объект, ищем массив программ
                programs_array = data.get(programs_array_field)
                if programs_array and isinstance(programs_array, list):
                    for program_item in programs_array:
                        title = program_item.get(title_field)
                        start_time_str = program_item.get(start_time_field)
                        
                        if title and start_time_str:
                            programs_found += 1
                        
                        if programs_found <= 3:  # Показываем первые 3
                            self.stdout.write(f"   Программа {programs_found}: title='{title}', time='{start_time_str}'")
            
            self.stdout.write(f"   ✅ Парсер нашел бы: {programs_found} программ")
            
        except json.JSONDecodeError as e:
            self.stdout.write(f"❌ Ошибка парсинга JSON: {str(e)}")
        except Exception as e:
            self.stdout.write(f"❌ Общая ошибка анализа: {str(e)}")
