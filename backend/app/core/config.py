import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./safemine.db")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "safemine-super-secret-key-2026")

    USE_MOCK_AI: bool = os.getenv("USE_MOCK_AI", "true").lower() in ("true", "1", "yes")
    USE_MOCK_AWS: bool = os.getenv("USE_MOCK_AWS", "true").lower() in ("true", "1", "yes")

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "safemine-documents-bucket")
    MIN_EPP_CONFIDENCE: float = float(os.getenv("MIN_EPP_CONFIDENCE", "80.0"))

    @property
    def has_real_gemini_key(self) -> bool:
        return bool(
            self.GEMINI_API_KEY
            and self.GEMINI_API_KEY != "tu_gemini_api_key_aqui"
            and not self.USE_MOCK_AI
        )

    @property
    def has_real_aws_keys(self) -> bool:
        return bool(
            self.AWS_ACCESS_KEY_ID
            and self.AWS_SECRET_ACCESS_KEY
            and self.AWS_ACCESS_KEY_ID != "tu_aws_access_key_id"
            and not self.USE_MOCK_AWS
        )


settings = Settings()
