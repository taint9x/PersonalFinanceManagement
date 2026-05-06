import json
from typing import Any, Optional

import redis.asyncio as aioredis

from app.core.config import settings


class CacheService:
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client

    async def get(self, key: str) -> Optional[Any]:
        value = await self.redis.get(key)
        if value is None:
            return None
        return json.loads(value)

    async def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        await self.redis.setex(key, ttl, json.dumps(value, default=str))

    async def delete(self, key: str) -> None:
        await self.redis.delete(key)

    async def delete_pattern(self, pattern: str) -> None:
        cursor = 0
        while True:
            cursor, keys = await self.redis.scan(cursor, match=pattern, count=100)
            if keys:
                await self.redis.delete(*keys)
            if cursor == 0:
                break

    async def invalidate_dashboard(self, user_id: str) -> None:
        """Invalidate all dashboard-related cache keys for a user."""
        await self.delete_pattern(f"dashboard_summary:{user_id}:*")
        await self.delete(f"monthly_trend:{user_id}")
        await self.delete_pattern(f"monthly_overview:{user_id}:*")


async def get_redis() -> aioredis.Redis:
    client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return client


async def get_cache_service() -> CacheService:
    client = await get_redis()
    return CacheService(client)
