import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
import psutil
import time
from datetime import datetime
from typing import Dict, Any
from config import get_settings


settings = get_settings()


def init_sentry():
    sentry_dsn = settings.sentry_dsn if hasattr(settings, 'sentry_dsn') else None

    if sentry_dsn:
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[
                StarletteIntegration(transaction_style="url"),
                FastApiIntegration(transaction_style="url"),
            ],
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
            environment=settings.environment if hasattr(settings, 'environment') else "production",
            send_default_pii=False,
            attach_stacktrace=True,
        )
        return True
    return False


class MetricsCollector:
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        self.total_response_time = 0.0

    def increment_request(self, response_time: float, is_error: bool = False):
        self.request_count += 1
        self.total_response_time += response_time
        if is_error:
            self.error_count += 1

    def get_metrics(self) -> Dict[str, Any]:
        uptime = time.time() - self.start_time
        avg_response_time = (
            self.total_response_time / self.request_count
            if self.request_count > 0 else 0
        )

        process = psutil.Process()
        memory_info = process.memory_info()

        return {
            "uptime_seconds": int(uptime),
            "uptime_formatted": self._format_uptime(uptime),
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "error_rate": (
                self.error_count / self.request_count
                if self.request_count > 0 else 0
            ),
            "avg_response_time_ms": round(avg_response_time, 2),
            "memory_usage_mb": round(memory_info.rss / 1024 / 1024, 2),
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "timestamp": datetime.utcnow().isoformat()
        }

    def _format_uptime(self, seconds: float) -> str:
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)

        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"


metrics_collector = MetricsCollector()
