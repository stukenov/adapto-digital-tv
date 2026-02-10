from django.core.management.base import BaseCommand

from tvchannels.admin import VideoFileAdmin
from tvchannels.models import VideoFile


class Command(BaseCommand):
    help = "Тестирование admin actions для VideoFile"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🧪 Тестирование admin actions...\n"))

        # Создаем экземпляр админки
        admin_instance = VideoFileAdmin(VideoFile, None)

        # Получаем действия
        actions = admin_instance.get_actions(None)

        self.stdout.write("📋 Доступные действия:")
        for action_name, (func, name, description) in actions.items():
            self.stdout.write(f"   • {action_name}: {description}")

        # Проверяем базовые действия
        expected_actions = [
            "set_need_ai_processing",
            "reset_error_status",
            "mark_as_processed",
        ]

        missing_actions = []
        for action in expected_actions:
            if action not in actions:
                missing_actions.append(action)

        if missing_actions:
            self.stdout.write(
                self.style.WARNING(
                    f"\n⚠️  Отсутствуют действия: {', '.join(missing_actions)}"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS("\n✅ Все базовые действия присутствуют!")
            )

        # Проверяем количество AI задач
        ai_actions = [
            name for name in actions.keys() if name.startswith("process_with_task_")
        ]
        if ai_actions:
            self.stdout.write(f"\n🤖 AI действия ({len(ai_actions)}):")
            for action in ai_actions:
                description = actions[action][2]
                self.stdout.write(f"   • {description}")
        else:
            self.stdout.write("\n⚠️  Нет AI действий (возможно, нет активных задач)")

        # Тестируем сигнатуру методов
        self.stdout.write("\n🔍 Проверка сигнатур методов:")

        test_queryset = VideoFile.objects.none()

        for action_name in expected_actions:
            if action_name in actions:
                func = actions[action_name][0]
                try:
                    # Пробуем получить количество аргументов
                    import inspect

                    sig = inspect.signature(func)
                    params = list(sig.parameters.keys())

                    if len(params) == 3 and params == ["self", "request", "queryset"]:
                        self.stdout.write(f"   ✅ {action_name}: правильная сигнатура")
                    elif len(params) == 3:
                        self.stdout.write(
                            f"   ⚠️  {action_name}: 3 параметра ({params})"
                        )
                    else:
                        self.stdout.write(
                            f"   ❌ {action_name}: неправильная сигнатура ({len(params)} параметров: {params})"
                        )

                except Exception as e:
                    self.stdout.write(f"   ❌ {action_name}: ошибка анализа - {e}")

        self.stdout.write("\n💡 Совет:")
        self.stdout.write("   Если видите ошибки, перезапустите сервер разработки")
        self.stdout.write("   python manage.py runserver")
