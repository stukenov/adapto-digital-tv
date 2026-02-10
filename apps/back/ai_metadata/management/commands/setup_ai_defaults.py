import os

from django.core.management.base import BaseCommand, CommandError

from ai_metadata.models import AIProvider, AITask


class Command(BaseCommand):
    help = "Настройка провайдеров AI и задач по умолчанию"

    def add_arguments(self, parser):
        parser.add_argument(
            "--openai-key",
            type=str,
            help="API ключ для OpenAI (также можно задать переменной окружения OPENAI_API_KEY)",
        )
        parser.add_argument(
            "--force", action="store_true", help="Перезаписать существующие настройки"
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Настройка AI провайдеров и задач..."))

        # Получаем API ключ
        api_key = options.get("openai_key") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            self.stdout.write(
                self.style.WARNING(
                    "API ключ OpenAI не указан. Провайдер будет создан без ключа.\n"
                    "Укажите ключ через --openai-key или переменную окружения OPENAI_API_KEY"
                )
            )
            api_key = "your-openai-api-key-here"

        force = options.get("force", False)

        # Создаем провайдера OpenAI
        created_providers = self._create_openai_provider(api_key, force)

        # Создаем задачи по умолчанию
        created_tasks = self._create_default_tasks(force)

        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Настройка завершена!\n"
                f"  Создано провайдеров: {created_providers}\n"
                f"  Создано задач: {created_tasks}"
            )
        )

        if created_providers > 0 or created_tasks > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    "\nТеперь можно запустить обработку видео:\n"
                    "python manage.py process_ai_metadata"
                )
            )

    def _create_openai_provider(self, api_key, force):
        """Создать провайдера OpenAI"""
        provider_name = "OpenAI GPT"

        if AIProvider.objects.filter(name=provider_name).exists():
            if not force:
                self.stdout.write(
                    f'Провайдер "{provider_name}" уже существует. Используйте --force для перезаписи.'
                )
                return 0
            else:
                AIProvider.objects.filter(name=provider_name).delete()
                self.stdout.write(f'Удален существующий провайдер "{provider_name}"')

        provider = AIProvider.objects.create(
            name=provider_name,
            provider_type="openai",
            api_key=api_key,
            default_model="gpt-3.5-turbo",
            available_models=[
                "gpt-3.5-turbo",
                "gpt-3.5-turbo-16k",
                "gpt-4",
                "gpt-4-turbo-preview",
                "gpt-4o",
                "gpt-4o-mini",
            ],
            max_tokens=4000,
            temperature=0.7,
            timeout=30,
            is_active=True,
            is_default=True,
            description="Провайдер OpenAI для работы с GPT моделями",
        )

        self.stdout.write(f"✓ Создан провайдер: {provider.name}")
        return 1

    def _create_default_tasks(self, force):
        """Создать задачи по умолчанию"""
        tasks_config = [
            {
                "name": "Генерация названия видео",
                "task_type": "generate_title",
                "system_prompt": """Ты эксперт по созданию названий для видеоконтента. Твоя задача - создавать привлекательные и понятные названия для русскоязычной аудитории.

Принципы создания названий:
1. Название должно быть на русском языке
2. Название должно отражать содержание видео исходя из пути и имени файла
3. Название должно быть читаемым и понятным для зрителей
4. Максимальная длина: 100 символов
5. Убирай технические обозначения, коды, номера серий
6. Делай название привлекательным для зрителей
7. Используй естественный русский язык

Верни только название, без дополнительных объяснений.""",
                "user_prompt_template": """Проанализируй информацию о видеофайле и создай подходящее название:

Путь к файлу: {file_path}
Имя файла: {filename}
Полное имя: {filename_full}
Длительность: {duration}
Расширение: {extension}
Размер файла: {file_size} МБ

Создай привлекательное название для этого видео.""",
                "max_tokens": 100,
                "temperature": 0.7,
                "is_default_for_type": True,
                "priority": 100,
                "description": "Генерация названий для видеофайлов на основе их метаданных",
            },
            {
                "name": "Генерация описания видео",
                "task_type": "generate_description",
                "system_prompt": """Ты эксперт по созданию описаний для видеоконтента. Твоя задача - создавать информативные и привлекательные описания для русскоязычной аудитории.

Принципы создания описаний:
1. Описание должно быть на русском языке
2. Описание должно быть информативным и полезным
3. Длина описания: 50-200 слов
4. Используй естественный русский язык
5. Фокусируйся на содержании и пользе для зрителя
6. Избегай технических деталей

Верни только описание, без дополнительных объяснений.""",
                "user_prompt_template": """Создай описание для видеофайла на основе доступной информации:

Путь к файлу: {file_path}
Имя файла: {filename}
Длительность: {duration}
Название видео: {video_name}

Создай информативное описание для этого видео.""",
                "max_tokens": 300,
                "temperature": 0.8,
                "is_default_for_type": True,
                "priority": 90,
                "description": "Генерация описаний для видеофайлов",
            },
            {
                "name": "Извлечение ключевых слов",
                "task_type": "extract_keywords",
                "system_prompt": """Ты эксперт по анализу контента и извлечению ключевых слов. Твоя задача - определить наиболее релевантные ключевые слова для видеоконтента.

Принципы извлечения ключевых слов:
1. Ключевые слова должны быть на русском языке
2. Выбирай 5-10 наиболее релевантных слов
3. Фокусируйся на теме и содержании видео
4. Используй слова, которые помогут зрителям найти видео
5. Избегай технических терминов и кодов

Верни ключевые слова через запятую, без дополнительных объяснений.""",
                "user_prompt_template": """Определи ключевые слова для видеофайла:

Путь к файлу: {file_path}
Имя файла: {filename}
Название видео: {video_name}

Извлеки 5-10 ключевых слов через запятую.""",
                "max_tokens": 150,
                "temperature": 0.5,
                "is_default_for_type": True,
                "priority": 80,
                "description": "Извлечение ключевых слов из видеоконтента",
            },
        ]

        created_count = 0
        provider = AIProvider.objects.filter(is_default=True).first()

        for task_config in tasks_config:
            task_name = task_config["name"]

            if AITask.objects.filter(name=task_name).exists():
                if not force:
                    self.stdout.write(
                        f'Задача "{task_name}" уже существует. Используйте --force для перезаписи.'
                    )
                    continue
                else:
                    AITask.objects.filter(name=task_name).delete()
                    self.stdout.write(f'Удалена существующая задача "{task_name}"')

            task = AITask.objects.create(
                name=task_config["name"],
                task_type=task_config["task_type"],
                provider=provider,
                system_prompt=task_config["system_prompt"],
                user_prompt_template=task_config["user_prompt_template"],
                max_tokens=task_config.get("max_tokens"),
                temperature=task_config.get("temperature"),
                is_active=True,
                is_default_for_type=task_config.get("is_default_for_type", False),
                priority=task_config.get("priority", 0),
                description=task_config.get("description", ""),
            )

            self.stdout.write(f"✓ Создана задача: {task.name}")
            created_count += 1

        return created_count
