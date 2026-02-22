import logging

import aioboto3
from botocore.config import Config as BotoConfig

logger = logging.getLogger(__name__)


class R2Service:
    """Async Cloudflare R2 (S3-compatible) storage client."""

    def __init__(
        self,
        bucket_name: str,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
    ):
        self.bucket_name = bucket_name
        self._session = aioboto3.Session()
        self._client_kwargs = {
            "service_name": "s3",
            "endpoint_url": endpoint_url,
            "aws_access_key_id": access_key_id,
            "aws_secret_access_key": secret_access_key,
            "region_name": "auto",
            "config": BotoConfig(
                s3={"addressing_style": "path"},
                retries={"max_attempts": 3, "mode": "adaptive"},
            ),
        }

    async def upload_file(
        self, key: str, data: bytes, content_type: str = "application/pdf"
    ) -> None:
        async with self._session.client(**self._client_kwargs) as client:
            await client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
            logger.info("Uploaded to R2: %s (%d bytes)", key, len(data))

    async def download_file(self, key: str) -> bytes:
        async with self._session.client(**self._client_kwargs) as client:
            response = await client.get_object(Bucket=self.bucket_name, Key=key)
            data = await response["Body"].read()
            logger.info("Downloaded from R2: %s (%d bytes)", key, len(data))
            return data

    async def delete_file(self, key: str) -> None:
        async with self._session.client(**self._client_kwargs) as client:
            await client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info("Deleted from R2: %s", key)
