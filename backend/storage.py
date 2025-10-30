"""
MinIO Object Storage Service
Handles file uploads to MinIO storage
"""
from minio import Minio
from minio.error import S3Error
from io import BytesIO
from typing import Optional
import logging
import sentry_sdk
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class StorageService:
    """Service for managing file uploads to MinIO object storage"""

    def __init__(self):
        """Initialize MinIO client"""
        try:
            self.client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure
            )
            logger.info(f"MinIO client initialized for {settings.minio_endpoint}")
        except Exception as e:
            logger.error(f"Failed to initialize MinIO client: {str(e)}")
            sentry_sdk.capture_exception(e)
            raise

    def _ensure_bucket_exists(self, bucket_name: str) -> None:
        """
        Ensure bucket exists and is publicly accessible

        Args:
            bucket_name: Name of the bucket to create/check
        """
        try:
            if not self.client.bucket_exists(bucket_name):
                logger.info(f"Creating bucket: {bucket_name}")
                self.client.make_bucket(bucket_name)

                policy = f"""{{
                    "Version": "2012-10-17",
                    "Statement": [
                        {{
                            "Effect": "Allow",
                            "Principal": {{"AWS": ["*"]}},
                            "Action": ["s3:GetObject"],
                            "Resource": ["arn:aws:s3:::{bucket_name}/*"]
                        }}
                    ]
                }}"""

                self.client.set_bucket_policy(bucket_name, policy)
                logger.info(f"Bucket {bucket_name} created and made public")
            else:
                logger.debug(f"Bucket {bucket_name} already exists")
        except S3Error as e:
            logger.error(f"Error ensuring bucket exists: {str(e)}")
            sentry_sdk.capture_exception(e)
            raise
        except Exception as e:
            logger.error(f"Unexpected error with bucket: {str(e)}")
            sentry_sdk.capture_exception(e)
            raise

    def upload(
        self,
        bucket: str,
        filename: str,
        data: bytes,
        content_type: str = "application/octet-stream"
    ) -> str:
        """
        Upload a file to MinIO and return its public URL

        Args:
            bucket: Bucket name to upload to
            filename: Name of the file in the bucket
            data: File data as bytes
            content_type: MIME type of the file

        Returns:
            str: Public URL to access the uploaded file

        Raises:
            Exception: If upload fails
        """
        try:
            self._ensure_bucket_exists(bucket)

            file_stream = BytesIO(data)
            file_size = len(data)

            logger.info(f"Uploading {filename} to {bucket} ({file_size} bytes)")

            self.client.put_object(
                bucket,
                filename,
                file_stream,
                file_size,
                content_type=content_type
            )

            public_url = f"{settings.minio_public_url}/{bucket}/{filename}"
            logger.info(f"File uploaded successfully: {public_url}")

            return public_url

        except S3Error as e:
            logger.error(f"S3 error uploading {filename}: {str(e)}")
            sentry_sdk.capture_exception(e)
            raise Exception(f"Failed to upload file: {str(e)}")
        except Exception as e:
            logger.error(f"Error uploading {filename}: {str(e)}")
            sentry_sdk.capture_exception(e)
            raise

    def delete(self, bucket: str, filename: str) -> bool:
        """
        Delete a file from MinIO

        Args:
            bucket: Bucket name
            filename: Name of the file to delete

        Returns:
            bool: True if deleted successfully
        """
        try:
            self.client.remove_object(bucket, filename)
            logger.info(f"Deleted {filename} from {bucket}")
            return True
        except S3Error as e:
            logger.error(f"Error deleting {filename}: {str(e)}")
            sentry_sdk.capture_exception(e)
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting {filename}: {str(e)}")
            sentry_sdk.capture_exception(e)
            return False

    def file_exists(self, bucket: str, filename: str) -> bool:
        """
        Check if a file exists in MinIO

        Args:
            bucket: Bucket name
            filename: Name of the file

        Returns:
            bool: True if file exists
        """
        try:
            self.client.stat_object(bucket, filename)
            return True
        except S3Error:
            return False
        except Exception as e:
            logger.error(f"Error checking if file exists: {str(e)}")
            return False

    def get_file_url(self, bucket: str, filename: str) -> str:
        """
        Get the public URL for a file

        Args:
            bucket: Bucket name
            filename: Name of the file

        Returns:
            str: Public URL to the file
        """
        return f"{settings.minio_public_url}/{bucket}/{filename}"

    def list_files(self, bucket: str, prefix: Optional[str] = None) -> list:
        """
        List files in a bucket

        Args:
            bucket: Bucket name
            prefix: Optional prefix to filter files

        Returns:
            list: List of file names
        """
        try:
            objects = self.client.list_objects(bucket, prefix=prefix)
            return [obj.object_name for obj in objects]
        except S3Error as e:
            logger.error(f"Error listing files in {bucket}: {str(e)}")
            sentry_sdk.capture_exception(e)
            return []
        except Exception as e:
            logger.error(f"Unexpected error listing files: {str(e)}")
            sentry_sdk.capture_exception(e)
            return []


storage_service = StorageService()
