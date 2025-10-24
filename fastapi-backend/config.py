"""
Configuration management using pydantic-settings
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # API Gateway
    admin_api_key: str = "admin-secret-key-change-in-production"
    gateway_host: str = "0.0.0.0"
    gateway_port: int = 8000

    # Redis (optional, for caching)
    redis_url: str = "redis://localhost:6379"
    use_redis: bool = False

    # Security
    max_api_execution_time: int = 30  # seconds
    max_request_size: int = 10 * 1024 * 1024  # 10MB

    # Rate limiting
    rate_limit_free: int = 100  # requests per hour
    rate_limit_pro: int = 1000
    rate_limit_enterprise: int = 10000

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
