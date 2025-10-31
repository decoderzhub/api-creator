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

    # AI Services
    anthropic_api_key: str
    llm_model: str = "claude-3-7-sonnet-20250219"

    # Freesound API
    freesound_api_key: str

    # API Gateway
    admin_api_key: str = "admin-secret-key-change-in-production"
    gateway_host: str = "0.0.0.0"
    gateway_port: int = 8000
    public_hostname: str = "api-creator.systemd.diskstation.me"

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

    # Monitoring
    sentry_dsn: str = ""
    environment: str = "production"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_pro_price_id: str = ""
    stripe_enterprise_price_id: str = ""

    # MinIO Object Storage
    minio_endpoint: str = "minio.systemd.diskstation.me"
    minio_access_key: str = "admin"
    minio_secret_key: str = ""
    minio_public_url: str = "https://minio.systemd.diskstation.me"
    minio_secure: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
