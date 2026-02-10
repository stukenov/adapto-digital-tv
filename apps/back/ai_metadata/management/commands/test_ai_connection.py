from django.core.management.base import BaseCommand, CommandError

from ai_metadata.models import AIProvider, AITask
from ai_metadata.services import AIProviderService


class Command(BaseCommand):
    help = "Тестирование подключения к AI провайдерам"

    def add_arguments(self, parser):
        parser.add_argument(
            "--provider",
            type=str,
            help="Название конкретного провайдера для тестирования",
        )
        parser.add_argument(
            "--all", action="store_true", help="Тестировать все активные провайдеры"
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🧪 Тестирование AI подключений...\n"))

        # Определяем провайдеров для тестирования
        if options["provider"]:
            providers = AIProvider.objects.filter(
                name=options["provider"], is_active=True
            )
            if not providers.exists():
                self.stdout.write(
                    self.style.ERROR(
                        f'❌ Провайдер "{options["provider"]}" не найден или неактивен'
                    )
                )
                return
        elif options["all"]:
            providers = AIProvider.objects.filter(is_active=True)
        else:
            # По умолчанию тестируем провайдера по умолчанию
            providers = AIProvider.objects.filter(is_default=True, is_active=True)

        if not providers.exists():
            self.stdout.write(
                self.style.ERROR("❌ Нет активных провайдеров для тестирования")
            )
            return

        # Тестируем каждого провайдера
        total_tested = 0
        successful = 0

        for provider in providers:
            self.stdout.write(f"\n📡 Тестирование провайдера: {provider.name}")
            self.stdout.write(f"   Тип: {provider.get_provider_type_display()}")
            self.stdout.write(f"   Модель: {provider.default_model}")

            success = self._test_provider(provider)
            total_tested += 1
            if success:
                successful += 1

        # Итоговая статистика
        self.stdout.write(f"\n📊 Результаты тестирования:")
        self.stdout.write(f"   Протестировано: {total_tested} провайдеров")
        self.stdout.write(f"   Успешно: {successful}")
        self.stdout.write(f"   Ошибки: {total_tested - successful}")

        if successful == total_tested:
            self.stdout.write(
                self.style.SUCCESS("✅ Все провайдеры работают корректно!")
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"⚠️  {total_tested - successful} провайдеров имеют проблемы"
                )
            )

    def _test_provider(self, provider):
        """Тестировать конкретного провайдера"""
        try:
            # Создаем сервис провайдера
            service = AIProviderService(provider)

            # Создаем тестовую задачу
            test_task = self._create_test_task(provider)

            # Простой тестовый промпт
            system_prompt = "Ответь одним словом."
            user_prompt = "Скажи 'привет'"

            self.stdout.write("   🔄 Отправка тестового запроса...")

            result = service.make_request(test_task, system_prompt, user_prompt)

            if result["success"]:
                response = (
                    result["response"][:50] + "..."
                    if len(result["response"]) > 50
                    else result["response"]
                )
                tokens = result.get("tokens_used", "н/д")
                time_taken = result.get("execution_time", 0)

                self.stdout.write(self.style.SUCCESS(f"   ✅ Успешно!"))
                self.stdout.write(f'   📝 Ответ: "{response}"')
                self.stdout.write(f"   🔢 Токенов: {tokens}")
                self.stdout.write(f"   ⏱️  Время: {time_taken:.2f}с")
                return True
            else:
                self.stdout.write(self.style.ERROR(f"   ❌ Ошибка: {result['error']}"))
                return False

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ❌ Критическая ошибка: {str(e)}"))
            return False

    def _create_test_task(self, provider):
        """Создать временную тестовую задачу"""

        class TestTask:
            def __init__(self, provider):
                self.provider = provider
                self.task_type = "test"
                self.model_name = provider.default_model
                self.max_tokens = 100
                self.temperature = 0.5
                self.retry_count = 1

            def get_effective_provider(self):
                return self.provider

            def get_effective_model(self):
                return self.model_name or self.provider.default_model

            def get_effective_max_tokens(self):
                return self.max_tokens or self.provider.max_tokens

            def get_effective_temperature(self):
                return self.temperature or self.provider.temperature

        return TestTask(provider)
