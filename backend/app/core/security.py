import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

from app.core.config import get_settings


class InMemoryRateLimiter:
    """Sliding-window per-IP rate limiter for API abuse protection."""

    def __init__(self, max_requests_per_minute: int | None = None):
        self._lock = Lock()
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._override_limit = max_requests_per_minute

    def check(self, key: str) -> None:
        limit = self._override_limit or get_settings().rate_limit_per_minute
        now = time.monotonic()
        cutoff = now - 60.0
        with self._lock:
            q = self._buckets[key]
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please wait before retrying.",
                )
            q.append(now)


rate_limiter = InMemoryRateLimiter()


def enforce_rate_limit(request: Request) -> None:
    client_host = request.client.host if request.client else "unknown"
    rate_limiter.check(client_host)
