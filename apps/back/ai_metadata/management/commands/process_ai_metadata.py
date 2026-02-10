import time

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from ai_metadata.models import AIProvider, AISettings, AITask
from ai_metadata.services import VideoMetadataProcessor


class Command(BaseCommand):
    help = "Обработка видеофайлов для генерации метаданных с помощью AI"

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=10,
            help="Максимальное количество видео для обработки за раз (по умолчанию: 10)",
        )
        parser.add_argument(
            "--loop",
            action="store_true",
            help="Запустить в режиме цикла с периодической проверкой",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=60,
            help="Интервал проверки в секундах при работе в режиме цикла (по умолчанию: 60)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Режим тестирования без фактической обработки",
        )
        parser.add_argument(
            "--task-type",
            type=str,
            default="generate_title",
            help="Тип задачи для обработки (по умолчанию: generate_title)",
        )
        parser.add_argument(
            "--task-name", type=str, help="Конкретное название задачи для использования"
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Запуск процессора AI метаданных..."))

        # Проверяем наличие активных провайдеров и задач
        active_providers = AIProvider.objects.filter(is_active=True).count()
        if active_providers == 0:
            self.stdout.write(
                self.style.ERROR(
                    "Ошибка: Нет активных AI провайдеров. Добавьте провайдера в админ панели."
                )
            )
            return

        default_provider = AIProvider.get_default_provider()
        if not default_provider:
            self.stdout.write(
                self.style.WARNING(
                    'Предупреждение: Нет провайдера по умолчанию. Установите один из провайдеров как "По умолчанию".'
                )
            )

        # Проверяем задачи
        task_type = options["task_type"]
        task_name = options.get("task_name")

        if task_name:
            task = AITask.objects.filter(name=task_name, is_active=True).first()
            if not task:
                self.stdout.write(
                    self.style.ERROR(
                        f'Ошибка: Задача "{task_name}" не найдена или не активна.'
                    )
                )
                return
        else:
            task = AITask.get_default_for_type(task_type)
            if not task:
                self.stdout.write(
                    self.style.ERROR(
                        f'Ошибка: Нет активной задачи по умолчанию для типа "{task_type}". Добавьте задачу в админ панели.'
                    )
                )
                return

        self.stdout.write(
            f"Используется задача: {task.name} ({task.get_task_type_display()})"
        )
        if task.get_effective_provider():
            self.stdout.write(f"Провайдер: {task.get_effective_provider().name}")

        processor = VideoMetadataProcessor()

        if options["dry_run"]:
            self.stdout.write(
                self.style.WARNING("Режим тестирования - изменения не будут сохранены")
            )
            return

        if options["loop"]:
            self._run_loop(processor, options)
        else:
            self._run_once(processor, options)

    def _run_once(self, processor, options):
        """Выполнить обработку один раз"""
        try:
            self.stdout.write("Начинаем обработку видеофайлов...")

            start_time = timezone.now()
            result = processor.process_videos_needing_ai_metadata(
                limit=options["limit"], task_type=options["task_type"]
            )
            end_time = timezone.now()
            duration = (end_time - start_time).total_seconds()

            if result["success"]:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Обработка завершена за {duration:.2f} секунд"
                    )
                )
                self.stdout.write(f"  Обработано: {result['processed_count']} видео")

                if "total_found" in result:
                    self.stdout.write(f"  Найдено всего: {result['total_found']} видео")

                if result.get("errors"):
                    self.stdout.write(
                        self.style.WARNING(f"  Ошибки: {len(result['errors'])}")
                    )
                    for error in result["errors"][:5]:  # Показываем первые 5 ошибок
                        self.stdout.write(f"    - {error}")
                    if len(result["errors"]) > 5:
                        self.stdout.write(
                            f"    ... и еще {len(result['errors']) - 5} ошибок"
                        )

                self.stdout.write(f"  Сообщение: {result['message']}")
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Ошибка при обработке: {result.get('error', 'Неизвестная ошибка')}"
                    )
                )

        except KeyboardInterrupt:
            self.stdout.write(
                self.style.WARNING("\n⚠ Обработка прервана пользователем")
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Критическая ошибка: {e}"))
            raise CommandError(f"Ошибка выполнения команды: {e}")

    def _run_loop(self, processor, options):
        """Выполнить обработку в режиме цикла"""
        self.stdout.write(
            self.style.SUCCESS(
                f"Запуск в режиме цикла с интервалом {options['interval']} секунд"
            )
        )
        self.stdout.write("Нажмите Ctrl+C для остановки")

        try:
            iteration = 0
            while True:
                iteration += 1
                current_time = timezone.now().strftime("%Y-%m-%d %H:%M:%S")

                self.stdout.write(f"\n--- Итерация {iteration} ({current_time}) ---")

                # Показываем статистику видео
                from tvchannels.models import VideoFile

                total_videos = VideoFile.objects.count()
                ai_needed = VideoFile.objects.filter(
                    status="need_add_meta_with_ai"
                ).count()

                self.stdout.write(
                    f"  Всего видео: {total_videos}, нужна AI обработка: {ai_needed}"
                )

                start_time = timezone.now()
                result = processor.process_videos_needing_ai_metadata(
                    limit=options["limit"], task_type=options["task_type"]
                )
                end_time = timezone.now()
                duration = (end_time - start_time).total_seconds()

                if result["success"]:
                    if result["processed_count"] > 0:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"✓ Обработано {result['processed_count']} видео за {duration:.2f}с"
                            )
                        )
                        if result.get("errors"):
                            self.stdout.write(
                                self.style.WARNING(f"  Ошибки: {len(result['errors'])}")
                            )
                    else:
                        self.stdout.write(f"  {result['message']}")
                        if ai_needed == 0:
                            self.stdout.write(
                                "  💡 Создайте тестовое видео: python manage.py create_test_video"
                            )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f"✗ Ошибка: {result.get('error', 'Неизвестная ошибка')}"
                        )
                    )

                # Ожидаем следующую итерацию
                if iteration == 1:
                    self.stdout.write(
                        f"Ожидание {options['interval']} секунд до следующей проверки..."
                    )

                time.sleep(options["interval"])

        except KeyboardInterrupt:
            self.stdout.write(
                self.style.WARNING(f"\n⚠ Цикл остановлен после {iteration} итераций")
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Критическая ошибка в цикле: {e}"))
            raise CommandError(f"Ошибка выполнения команды: {e}")
