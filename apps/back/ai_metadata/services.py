import logging
import os
import time
from typing import Any, Dict, Optional

from django.conf import settings
from django.utils import timezone
from openai import OpenAI

from tvchannels.models import VideoFile

from .models import AIProcessingLog, AIProvider, AIRequest, AISettings, AITask

logger = logging.getLogger(__name__)


class AIProviderService:
    """Сервис для работы с AI провайдерами"""

    def __init__(self, provider: AIProvider):
        self.provider = provider
        self._setup_client()

    def _setup_client(self):
        """Настройка клиента для конкретного провайдера"""
        if self.provider.provider_type == "openai":
            self.client = OpenAI(
                api_key=self.provider.api_key,
                base_url=self.provider.api_url if self.provider.api_url else None,
                timeout=self.provider.timeout,
            )
        elif self.provider.provider_type == "anthropic":
            # Здесь можно добавить поддержку Anthropic
            self.client = None
        else:
            self.client = None
        # Добавить другие провайдеры по мере необходимости

    def make_request(
        self, task: AITask, system_prompt: str, user_prompt: str
    ) -> Dict[str, Any]:
        """Выполнить запрос к AI провайдеру"""
        start_time = time.time()

        try:
            if self.provider.provider_type == "openai":
                return self._make_openai_request(
                    task, system_prompt, user_prompt, start_time
                )
            elif self.provider.provider_type == "anthropic":
                return self._make_anthropic_request(
                    task, system_prompt, user_prompt, start_time
                )
            else:
                return {
                    "success": False,
                    "error": f"Провайдер {self.provider.provider_type} не поддерживается",
                    "response": None,
                    "execution_time": time.time() - start_time,
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response": None,
                "execution_time": time.time() - start_time,
            }

    def _make_openai_request(
        self, task: AITask, system_prompt: str, user_prompt: str, start_time: float
    ) -> Dict[str, Any]:
        """Запрос к OpenAI"""
        if not self.client:
            return {
                "success": False,
                "error": "OpenAI клиент не настроен",
                "response": None,
                "execution_time": time.time() - start_time,
            }

        model = task.get_effective_model()
        max_tokens = task.get_effective_max_tokens()
        temperature = task.get_effective_temperature()

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )

            content = response.choices[0].message.content.strip()
            tokens_used = response.usage.total_tokens if response.usage else 0

            return {
                "success": True,
                "error": None,
                "response": content,
                "tokens_used": tokens_used,
                "model_used": model,
                "execution_time": time.time() - start_time,
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Ошибка OpenAI API: {str(e)}",
                "response": None,
                "execution_time": time.time() - start_time,
            }

    def _make_anthropic_request(
        self, task: AITask, system_prompt: str, user_prompt: str, start_time: float
    ) -> Dict[str, Any]:
        """Запрос к Anthropic (заглушка для будущей реализации)"""
        return {
            "success": False,
            "error": "Anthropic пока не поддерживается",
            "response": None,
            "execution_time": time.time() - start_time,
        }


class AITaskProcessor:
    """Процессор для выполнения AI задач"""

    def __init__(self):
        pass

    def process_task(self, video_file: VideoFile, task: AITask) -> Dict[str, Any]:
        """Обработать задачу для видеофайла"""
        try:
            # Получаем провайдера
            provider = task.get_effective_provider()
            if not provider:
                return {
                    "success": False,
                    "error": "Не найден активный AI провайдер",
                    "request_id": None,
                }

            # Создаем промпты
            system_prompt = task.system_prompt
            user_prompt = task.render_user_prompt(video_file)
            model_used = task.get_effective_model()

            # Создаем запрос в базе данных
            ai_request = AIRequest.objects.create(
                video_file=video_file,
                task=task,
                provider=provider,
                model_used=model_used,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                status="processing",
            )

            # Логируем начало обработки
            AIProcessingLog.objects.create(
                ai_request=ai_request,
                video_file=video_file,
                level="info",
                message=f'Начата обработка задачи "{task.name}" через {provider.name}',
            )

            # Создаем сервис провайдера и выполняем запрос
            provider_service = AIProviderService(provider)

            # Пытаемся выполнить запрос с повторами
            max_retries = task.retry_count
            last_error = None

            for attempt in range(max_retries + 1):
                try:
                    ai_request.retry_count = attempt
                    ai_request.save()

                    if attempt > 0:
                        AIProcessingLog.objects.create(
                            ai_request=ai_request,
                            video_file=video_file,
                            level="info",
                            message=f"Попытка {attempt + 1} из {max_retries + 1}",
                        )

                    result = provider_service.make_request(
                        task, system_prompt, user_prompt
                    )

                    if result["success"]:
                        # Успешный результат
                        ai_request.response = result["response"]
                        ai_request.status = "completed"
                        ai_request.processed_at = timezone.now()
                        ai_request.tokens_used = result.get("tokens_used")
                        ai_request.execution_time = result.get("execution_time")
                        ai_request.save()

                        # Логируем успех
                        AIProcessingLog.objects.create(
                            ai_request=ai_request,
                            video_file=video_file,
                            level="info",
                            message=f"Задача успешно выполнена за {result.get('execution_time', 0):.2f}с",
                            details={
                                "response": result["response"],
                                "tokens_used": result.get("tokens_used"),
                                "model_used": result.get("model_used"),
                            },
                        )

                        return {
                            "success": True,
                            "error": None,
                            "response": result["response"],
                            "request_id": ai_request.id,
                        }
                    else:
                        # Ошибка в запросе
                        last_error = result["error"]

                        if attempt < max_retries:
                            # Это не последняя попытка
                            AIProcessingLog.objects.create(
                                ai_request=ai_request,
                                video_file=video_file,
                                level="warning",
                                message=f"Ошибка в попытке {attempt + 1}: {last_error}",
                                details={"error": last_error},
                            )
                            time.sleep(2**attempt)  # Экспоненциальная задержка
                        else:
                            # Последняя попытка не удалась
                            break

                except Exception as e:
                    last_error = str(e)
                    if attempt < max_retries:
                        AIProcessingLog.objects.create(
                            ai_request=ai_request,
                            video_file=video_file,
                            level="warning",
                            message=f"Исключение в попытке {attempt + 1}: {last_error}",
                            details={"error": last_error},
                        )
                        time.sleep(2**attempt)
                    else:
                        break

            # Все попытки исчерпаны
            ai_request.status = "failed"
            ai_request.error_message = last_error
            ai_request.processed_at = timezone.now()
            ai_request.save()

            AIProcessingLog.objects.create(
                ai_request=ai_request,
                video_file=video_file,
                level="error",
                message=f"Задача провалена после {max_retries + 1} попыток. Последняя ошибка: {last_error}",
                details={"final_error": last_error},
            )

            return {
                "success": False,
                "error": last_error,
                "response": None,
                "request_id": ai_request.id,
            }

        except Exception as e:
            error_message = str(e)
            logger.error(
                f"Критическая ошибка при обработке задачи {task.name} для {video_file.name}: {error_message}"
            )

            if "ai_request" in locals():
                ai_request.status = "failed"
                ai_request.error_message = error_message
                ai_request.processed_at = timezone.now()
                ai_request.save()

                AIProcessingLog.objects.create(
                    ai_request=ai_request,
                    video_file=video_file,
                    level="error",
                    message=f"Критическая ошибка: {error_message}",
                    details={"error": error_message},
                )

            return {
                "success": False,
                "error": error_message,
                "response": None,
                "request_id": None,
            }


class VideoMetadataProcessor:
    """Сервис для обработки метаданных видеофайлов"""

    def __init__(self):
        self.task_processor = AITaskProcessor()

    def process_videos_needing_ai_metadata(
        self, limit: int = 10, task_type: str = "generate_title"
    ) -> Dict[str, Any]:
        """Обработать видео, которым нужны метаданные от AI"""
        try:
            # Находим видеофайлы со статусом need_add_meta_with_ai
            videos = VideoFile.objects.filter(status="need_add_meta_with_ai").order_by(
                "created_at"
            )[:limit]

            if not videos.exists():
                return {
                    "success": True,
                    "processed_count": 0,
                    "message": "Нет видео для обработки",
                }

            # Получаем задачу по умолчанию для типа
            task = AITask.get_default_for_type(task_type)
            if not task:
                return {
                    "success": False,
                    "processed_count": 0,
                    "error": f'Не найдена активная задача для типа "{task_type}"',
                }

            processed_count = 0
            errors = []

            for video in videos:
                try:
                    # Меняем статус на "обрабатывается AI"
                    video.status = "ai_processing"
                    video.save()

                    # Логируем начало обработки
                    AIProcessingLog.objects.create(
                        video_file=video,
                        level="info",
                        message=f'Начата обработка видео: {video.name} с задачей "{task.name}"',
                    )

                    # Обрабатываем через процессор задач
                    result = self.task_processor.process_task(video, task)

                    if result["success"]:
                        # Получаем или создаем метаданные
                        try:
                            metadata = video.metadata
                        except AttributeError:
                            from tvchannels.models import VideoMetadata

                            metadata = VideoMetadata.objects.create(video_file=video)

                        # Сохраняем результат в соответствующее поле
                        if task_type == "generate_title":
                            metadata.original_title = result["response"]
                        elif task_type == "generate_description":
                            metadata.description = result["response"]
                        # Можно добавить другие типы задач

                        metadata.save()

                        # Обновляем статус видео
                        video.status = "ai_completed"
                        video.save()

                        # Логируем успешное завершение
                        AIProcessingLog.objects.create(
                            video_file=video,
                            level="info",
                            message=f"Успешно обработано видео. Результат: {result['response'][:100]}...",
                            details={
                                "task_type": task_type,
                                "result": result["response"],
                                "request_id": result["request_id"],
                            },
                        )

                        processed_count += 1

                    else:
                        # Ошибка при обработке
                        video.status = "error"
                        video.save()

                        error_msg = (
                            f"Ошибка при обработке {video.name}: {result['error']}"
                        )
                        errors.append(error_msg)

                        AIProcessingLog.objects.create(
                            video_file=video,
                            level="error",
                            message=error_msg,
                            details={"error": result["error"]},
                        )

                except Exception as e:
                    error_message = str(e)
                    logger.error(
                        f"Ошибка при обработке видео {video.id}: {error_message}"
                    )

                    # Восстанавливаем статус на need_add_meta_with_ai
                    video.status = "need_add_meta_with_ai"
                    video.save()

                    errors.append(f"Ошибка при обработке {video.name}: {error_message}")

                    AIProcessingLog.objects.create(
                        video_file=video,
                        level="error",
                        message=f"Критическая ошибка при обработке: {error_message}",
                        details={"error": error_message},
                    )

            return {
                "success": True,
                "processed_count": processed_count,
                "total_found": videos.count(),
                "errors": errors,
                "task_used": task.name,
                "message": f'Обработано {processed_count} из {videos.count()} видео с задачей "{task.name}"',
            }

        except Exception as e:
            error_message = str(e)
            logger.error(f"Критическая ошибка в процессоре метаданных: {error_message}")
            return {"success": False, "processed_count": 0, "error": error_message}

    def process_single_video(
        self,
        video_file: VideoFile,
        task_name: str = None,
        task_type: str = "generate_title",
    ) -> Dict[str, Any]:
        """Обработать одно видео с конкретной задачей"""
        try:
            # Находим задачу
            if task_name:
                task = AITask.objects.filter(name=task_name, is_active=True).first()
            else:
                task = AITask.get_default_for_type(task_type)

            if not task:
                return {
                    "success": False,
                    "error": f'Не найдена задача "{task_name or task_type}"',
                }

            # Обрабатываем
            return self.task_processor.process_task(video_file, task)

        except Exception as e:
            return {"success": False, "error": str(e)}
