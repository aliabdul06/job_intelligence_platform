from collections import defaultdict, deque
from time import monotonic

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.clients = defaultdict(deque)
        self.auth_clients = defaultdict(deque)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        is_auth_path = request.url.path.startswith("/api/v1/auth")
        limit = (
            settings.AUTH_RATE_LIMIT_REQUESTS
            if is_auth_path
            else settings.RATE_LIMIT_REQUESTS
        )
        window = (
            settings.AUTH_RATE_LIMIT_WINDOW_SECONDS
            if is_auth_path
            else settings.RATE_LIMIT_WINDOW_SECONDS
        )
        bucket = self.auth_clients if is_auth_path else self.clients
        key = self._client_key(request)
        now = monotonic()
        requests = bucket[key]

        while requests and now - requests[0] > window:
            requests.popleft()

        if len(requests) >= limit:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please retry later."},
                headers={"Retry-After": str(window)},
            )

        requests.append(now)
        return await call_next(request)

    @staticmethod
    def _client_key(request: Request) -> str:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        return response


class CacheControlMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)

        if request.method != "GET":
            response.headers["Cache-Control"] = "no-store"
            return response

        path = request.url.path
        is_private = path.startswith("/api/v1/auth") or path.startswith(
            ("/api/v1/users", "/api/v1/recommendations")
        )

        if is_private:
            response.headers["Cache-Control"] = "no-store"
        elif path.startswith("/api/v1/"):
            max_age = settings.PUBLIC_CACHE_MAX_AGE_SECONDS
            response.headers["Cache-Control"] = (
                f"public, max-age={max_age}, stale-while-revalidate={max_age}"
            )
        else:
            response.headers.setdefault("Cache-Control", "no-store")

        return response
