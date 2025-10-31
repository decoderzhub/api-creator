"""
Docker-based API Deployer
Manages deployment of user-generated APIs in isolated Docker containers
"""
import docker
import hashlib
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Optional
from logger import logger
import sentry_sdk


class APIDeployer:
    """Manages Docker container deployment for user APIs"""

    def __init__(self):
        try:
            self.client = docker.from_env()
            self.api_containers: Dict[str, Dict] = {}
            logger.info("Docker client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {str(e)}")
            sentry_sdk.capture_exception(e)
            raise

    def _get_port_for_api(self, api_id: str) -> int:
        """Generate consistent port number for an API based on its ID"""
        hash_val = int(hashlib.sha256(api_id.encode()).hexdigest(), 16)
        return 9000 + (hash_val % 10000)

    async def deploy_api(
        self,
        api_id: str,
        code: str,
        requirements: Optional[str] = None
    ) -> int:
        """
        Deploy a user API in its own Docker container

        Returns:
            int: The host port the API is accessible on
        """
        try:
            logger.info(f"Deploying API {api_id}")

            if api_id in self.api_containers:
                try:
                    container = self.api_containers[api_id]['container']
                    container.reload()
                    if container.status == 'running':
                        logger.info(f"API {api_id} already deployed and running, returning existing port")
                        return self.api_containers[api_id]['port']
                    else:
                        logger.warning(f"API {api_id} container exists but is not running (status: {container.status}), redeploying")
                        del self.api_containers[api_id]
                except Exception as e:
                    logger.warning(f"Error checking container status for API {api_id}: {str(e)}, redeploying")
                    del self.api_containers[api_id]

            api_dir = Path(tempfile.mkdtemp(prefix=f"api_{api_id[:8]}_"))

            try:
                (api_dir / "main.py").write_text(code)

                if requirements:
                    base_requirements = "fastapi==0.109.0\nuvicorn[standard]==0.27.0\npython-multipart==0.0.6\nminio==7.2.3\nPillow==10.2.0\n"
                    full_requirements = base_requirements + requirements
                    (api_dir / "requirements.txt").write_text(full_requirements)
                else:
                    (api_dir / "requirements.txt").write_text(
                        "fastapi==0.109.0\nuvicorn[standard]==0.27.0\npython-multipart==0.0.6\nminio==7.2.3\nPillow==10.2.0\n"
                    )

                dockerfile = """FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
"""
                (api_dir / "Dockerfile").write_text(dockerfile)

                image_tag = f"user-api-{api_id}"
                logger.info(f"Building Docker image for API {api_id}")

                image, build_logs = self.client.images.build(
                    path=str(api_dir),
                    tag=image_tag,
                    rm=True,
                    forcerm=True
                )

                for log in build_logs:
                    if 'stream' in log:
                        logger.debug(f"Build: {log['stream'].strip()}")

                host_port = self._get_port_for_api(api_id)

                container_name = f"api-{api_id}"

                try:
                    existing_container = self.client.containers.get(container_name)
                    logger.info(f"Removing existing container {container_name}")
                    existing_container.stop()
                    existing_container.remove()
                except docker.errors.NotFound:
                    pass
                except Exception as e:
                    logger.warning(f"Error removing existing container: {str(e)}")

                logger.info(f"Starting container for API {api_id} on port {host_port}")

                from config import get_settings
                settings = get_settings()

                container = self.client.containers.run(
                    image.id,
                    name=container_name,
                    detach=True,
                    ports={'8000/tcp': host_port},
                    mem_limit='512m',
                    cpu_quota=100000,
                    restart_policy={"Name": "unless-stopped"},
                    environment={
                        'MINIO_ENDPOINT': settings.minio_endpoint,
                        'MINIO_ACCESS_KEY': settings.minio_access_key,
                        'MINIO_SECRET_KEY': settings.minio_secret_key,
                        'MINIO_PUBLIC_URL': settings.minio_public_url,
                        'MINIO_SECURE': str(settings.minio_secure).lower(),
                        'FREESOUND_API_KEY': settings.freesound_api_key,
                        'PUBLIC_HOSTNAME': settings.public_hostname,
                        'API_ID': api_id,
                    },
                    labels={
                        'app': 'api-builder',
                        'api_id': api_id
                    }
                )

                self.api_containers[api_id] = {
                    'container': container,
                    'port': host_port,
                    'image': image_tag
                }

                import asyncio
                import httpx

                logger.info(f"Waiting for API {api_id} to become healthy on port {host_port}")
                max_retries = 30
                for i in range(max_retries):
                    try:
                        async with httpx.AsyncClient(timeout=2.0) as client:
                            response = await client.get(f"http://localhost:{host_port}/")
                            if response.status_code in [200, 404]:
                                logger.info(f"API {api_id} is healthy and responding")
                                break
                    except Exception:
                        if i < max_retries - 1:
                            await asyncio.sleep(0.5)
                        else:
                            logger.warning(f"API {api_id} deployed but health check timed out")

                logger.info(f"API {api_id} deployed successfully on port {host_port}")
                return host_port

            finally:
                shutil.rmtree(api_dir, ignore_errors=True)

        except docker.errors.BuildError as e:
            logger.error(f"Docker build failed for API {api_id}: {str(e)}")
            sentry_sdk.capture_exception(e)
            raise Exception(f"Failed to build API container: {str(e)}")
        except docker.errors.APIError as e:
            logger.error(f"Docker API error for API {api_id}: {str(e)}")
            sentry_sdk.capture_exception(e)
            raise Exception(f"Docker error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error deploying API {api_id}: {str(e)}")
            sentry_sdk.capture_exception(e)
            raise

    async def stop_api(self, api_id: str) -> bool:
        """
        Stop and remove an API container

        Returns:
            bool: True if stopped successfully, False if not found
        """
        if api_id not in self.api_containers:
            logger.warning(f"API {api_id} not found in deployed containers")
            return False

        try:
            container_info = self.api_containers[api_id]
            container = container_info['container']
            image_tag = container_info['image']

            logger.info(f"Stopping API {api_id}")
            container.stop(timeout=10)
            container.remove()

            try:
                self.client.images.remove(image_tag, force=True)
                logger.info(f"Removed image {image_tag}")
            except Exception as e:
                logger.warning(f"Failed to remove image {image_tag}: {str(e)}")

            del self.api_containers[api_id]
            logger.info(f"API {api_id} stopped and removed successfully")
            return True

        except Exception as e:
            logger.error(f"Error stopping API {api_id}: {str(e)}")
            sentry_sdk.capture_exception(e)
            raise

    async def restart_api(self, api_id: str, code: str, requirements: Optional[str] = None) -> int:
        """
        Restart an API with new code

        Returns:
            int: The host port the API is accessible on
        """
        logger.info(f"Restarting API {api_id}")
        await self.stop_api(api_id)
        return await self.deploy_api(api_id, code, requirements)

    def get_api_port(self, api_id: str) -> Optional[int]:
        """Get the host port for a deployed API"""
        return self.api_containers.get(api_id, {}).get('port')

    def is_api_deployed(self, api_id: str) -> bool:
        """Check if an API is currently deployed"""
        if api_id not in self.api_containers:
            return False

        try:
            container = self.api_containers[api_id]['container']
            container.reload()
            return container.status == 'running'
        except Exception:
            return False

    async def get_api_health(self, api_id: str) -> Dict:
        """Get health status of a deployed API"""
        if api_id not in self.api_containers:
            return {'status': 'not_deployed'}

        try:
            container = self.api_containers[api_id]['container']
            container.reload()

            stats = container.stats(stream=False)

            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            cpu_percent = (cpu_delta / system_delta) * 100.0 if system_delta > 0 else 0.0

            memory_usage = stats['memory_stats']['usage']
            memory_limit = stats['memory_stats']['limit']
            memory_percent = (memory_usage / memory_limit) * 100.0

            return {
                'status': container.status,
                'cpu_percent': round(cpu_percent, 2),
                'memory_usage_mb': round(memory_usage / (1024 * 1024), 2),
                'memory_percent': round(memory_percent, 2),
                'port': self.api_containers[api_id]['port']
            }
        except Exception as e:
            logger.error(f"Error getting health for API {api_id}: {str(e)}")
            return {'status': 'error', 'error': str(e)}

    async def cleanup_stopped_containers(self):
        """Remove containers that have stopped unexpectedly"""
        to_remove = []

        for api_id, info in self.api_containers.items():
            try:
                container = info['container']
                container.reload()
                if container.status != 'running':
                    logger.warning(f"API {api_id} container is {container.status}, removing")
                    to_remove.append(api_id)
            except Exception as e:
                logger.error(f"Error checking container for API {api_id}: {str(e)}")
                to_remove.append(api_id)

        for api_id in to_remove:
            try:
                await self.stop_api(api_id)
            except Exception as e:
                logger.error(f"Error cleaning up API {api_id}: {str(e)}")
                if api_id in self.api_containers:
                    del self.api_containers[api_id]

    def get_deployed_apis(self) -> Dict[str, Dict]:
        """Get list of all deployed APIs with their status"""
        result = {}
        for api_id, info in self.api_containers.items():
            try:
                container = info['container']
                container.reload()
                result[api_id] = {
                    'port': info['port'],
                    'status': container.status,
                    'image': info['image']
                }
            except Exception as e:
                result[api_id] = {
                    'port': info['port'],
                    'status': 'error',
                    'error': str(e)
                }
        return result
