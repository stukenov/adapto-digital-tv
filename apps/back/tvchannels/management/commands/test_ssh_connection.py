import paramiko
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Тестирование SSH подключения"

    def add_arguments(self, parser):
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
            "--test-path",
            type=str,
            default="/",
            help="Путь для тестирования (по умолчанию: /)"
        )

    def handle(self, *args, **options):
        ssh_host = options['ssh_host']
        ssh_user = options['ssh_user']
        ssh_password = options['ssh_password']
        ssh_port = options['ssh_port']
        test_path = options['test_path']
        
        self.stdout.write(f"Тестирование подключения к {ssh_user}@{ssh_host}:{ssh_port}")
        
        try:
            # Создание SSH клиента
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Подключение
            ssh.connect(
                hostname=ssh_host,
                port=ssh_port,
                username=ssh_user,
                password=ssh_password,
                timeout=30
            )
            
            self.stdout.write(
                self.style.SUCCESS("✓ SSH подключение успешно установлено")
            )
            
            # Тестирование SFTP
            sftp = ssh.open_sftp()
            self.stdout.write(
                self.style.SUCCESS("✓ SFTP соединение успешно установлено")
            )
            
            # Тестирование доступа к папке
            try:
                files = sftp.listdir(test_path)
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Доступ к папке {test_path} получен")
                )
                self.stdout.write(f"Найдено файлов/папок: {len(files)}")
                
                # Показываем первые несколько файлов
                if files:
                    self.stdout.write("Содержимое папки (первые 10 элементов):")
                    for i, file in enumerate(files[:10]):
                        self.stdout.write(f"  {i+1}. {file}")
                
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f"⚠ Ошибка доступа к папке {test_path}: {str(e)}")
                )
            
            # Поиск JSON файлов
            try:
                json_files = [f for f in files if f.endswith('.json')]
                if json_files:
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ Найдено JSON файлов: {len(json_files)}")
                    )
                    for json_file in json_files[:5]:  # Показываем первые 5
                        self.stdout.write(f"  - {json_file}")
                else:
                    self.stdout.write(
                        self.style.WARNING("⚠ JSON файлы не найдены")
                    )
            except:
                pass
            
            # Закрытие соединений
            sftp.close()
            ssh.close()
            
            self.stdout.write(
                self.style.SUCCESS("\n✓ Тест завершен успешно. SSH сервер готов к работе!")
            )
            
        except paramiko.AuthenticationException:
            raise CommandError("❌ Ошибка аутентификации SSH - проверьте логин и пароль")
        except paramiko.SSHException as e:
            raise CommandError(f"❌ Ошибка SSH соединения: {str(e)}")
        except Exception as e:
            raise CommandError(f"❌ Общая ошибка при подключении: {str(e)}")
