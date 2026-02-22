from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient

from app.core.config import settings


@dataclass
class Auth0TokenPayload:
    sub: str
    email: str | None
    name: str | None
    roles: list[str]


_cached_jwks_client: PyJWKClient | None = None
_cached_jwks_client_created_at: float = 0


def get_auth0_issuer() -> str:
    if settings.AUTH0_ISSUER:
        return settings.AUTH0_ISSUER.rstrip("/") + "/"
    if not settings.AUTH0_DOMAIN:
        return ""
    return f"https://{settings.AUTH0_DOMAIN.strip('/')}/"


def _get_jwks_client() -> PyJWKClient:
    global _cached_jwks_client
    global _cached_jwks_client_created_at

    issuer = get_auth0_issuer()
    if not issuer:
        raise ValueError("AUTH0_DOMAIN or AUTH0_ISSUER must be configured")

    now = time.time()
    expired = (
        _cached_jwks_client is None
        or (now - _cached_jwks_client_created_at) > settings.AUTH0_JWKS_CACHE_SECONDS
    )
    if expired:
        _cached_jwks_client = PyJWKClient(f"{issuer}.well-known/jwks.json")
        _cached_jwks_client_created_at = now

    return _cached_jwks_client


def _extract_roles(claims: dict[str, Any]) -> list[str]:
    raw_roles = claims.get(settings.AUTH0_ROLES_CLAIM)
    if isinstance(raw_roles, list):
        return [str(role).strip().lower() for role in raw_roles if str(role).strip()]
    if isinstance(raw_roles, str):
        return [raw_roles.strip().lower()] if raw_roles.strip() else []
    return []


def decode_auth0_access_token(token: str) -> Auth0TokenPayload:
    issuer = get_auth0_issuer()
    if not issuer:
        raise ValueError("AUTH0_DOMAIN or AUTH0_ISSUER must be configured")
    if not settings.AUTH0_AUDIENCE:
        raise ValueError("AUTH0_AUDIENCE must be configured")

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=settings.AUTH0_AUDIENCE,
            issuer=issuer,
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.InvalidTokenError as exc:
        raise ValueError("Invalid Auth0 token") from exc

    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub.strip():
        raise ValueError("Token missing subject")

    email = claims.get("email")
    if email is not None and not isinstance(email, str):
        email = None
    name = claims.get("name")
    if name is not None and not isinstance(name, str):
        name = None

    return Auth0TokenPayload(
        sub=sub,
        email=email,
        name=name,
        roles=_extract_roles(claims),
    )


async def fetch_auth0_userinfo(access_token: str) -> dict[str, Any]:
    issuer = get_auth0_issuer()
    if not issuer:
        raise ValueError("AUTH0_DOMAIN or AUTH0_ISSUER must be configured")

    async with httpx.AsyncClient(timeout=settings.AUTH0_USERINFO_TIMEOUT_SECONDS) as client:
        response = await client.get(
            f"{issuer}userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Invalid userinfo response")
        return payload
