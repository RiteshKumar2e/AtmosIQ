"""Short-lived response cache for expensive read endpoints.

Why this exists
---------------
Turso is a network database: every SQL statement is an HTTP round trip costing
~800 ms from a typical client. Even after collapsing the N+1 queries, the
regional overview still needs five statements plus two external provider calls,
so a cold request lands around 4-10 s. That is the floor for *computing* the
answer — but not for *serving* it again.

These endpoints are read-only aggregates over slowly-changing data: a risk
score, a 90-day trend, a map layer. Recomputing them per page load is pure
waste. A short TTL keeps them fresh enough to be honest while making repeat
loads instant.

Correctness
-----------
Writes call `invalidate()`, which bumps a global version stamp and orphans
every existing entry. So submitting a report or acting on an alert is visible
immediately, rather than up to a TTL later.

Scope: a single process. Behind multiple workers each keeps its own copy,
bounded by the same TTL — acceptable for values that are already labelled
MODELLED or SIMULATED. A multi-process deployment would move this to Redis.
"""

from __future__ import annotations

import asyncio
import functools
import logging
import time
from typing import Any, Callable, Dict, Tuple

logger = logging.getLogger("aeroshield.cache")

#: key -> (expires_at, version_stamp, value)
_STORE: Dict[str, Tuple[float, int, Any]] = {}

#: Bumped on every write so cached reads computed before it are discarded.
_VERSION = 0

#: Guards against unbounded growth if many regions are browsed.
_MAX_ENTRIES = 512


def invalidate() -> None:
    """Discard every cached response.

    Called after any write. Cheap: entries are orphaned by a version bump
    rather than walked and deleted.
    """
    global _VERSION
    _VERSION += 1


def _make_key(prefix: str, args: tuple, kwargs: dict) -> str:
    """Build a cache key from the endpoint's own arguments.

    Session and other unhashable dependencies are skipped — they identify the
    connection, not the result.
    """
    parts = [prefix]
    for value in args:
        if isinstance(value, (str, int, float, bool, type(None))):
            parts.append(repr(value))
    for name in sorted(kwargs):
        value = kwargs[name]
        if isinstance(value, (str, int, float, bool, type(None))):
            parts.append(f"{name}={value!r}")
    return "|".join(parts)


def _get(key: str) -> Any:
    entry = _STORE.get(key)
    if entry is None:
        return None
    expires_at, version, value = entry
    if version != _VERSION or time.time() >= expires_at:
        _STORE.pop(key, None)
        return None
    return value


def _set(key: str, value: Any, ttl: float) -> None:
    if len(_STORE) >= _MAX_ENTRIES:
        # Drop the soonest-to-expire entries rather than tracking usage.
        for stale, _ in sorted(_STORE.items(), key=lambda kv: kv[1][0])[:64]:
            _STORE.pop(stale, None)
    _STORE[key] = (time.time() + ttl, _VERSION, value)


def cached(ttl: float, prefix: str) -> Callable:
    """Cache an endpoint's return value for `ttl` seconds.

    Works on both sync and async endpoints. Only the endpoint's scalar
    arguments (region_code, granularity, …) form the key.
    """

    def decorator(func: Callable) -> Callable:
        if asyncio.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                key = _make_key(prefix, args, kwargs)
                hit = _get(key)
                if hit is not None:
                    return hit
                value = await func(*args, **kwargs)
                _set(key, value, ttl)
                return value

            return async_wrapper

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            key = _make_key(prefix, args, kwargs)
            hit = _get(key)
            if hit is not None:
                return hit
            value = func(*args, **kwargs)
            _set(key, value, ttl)
            return value

        return sync_wrapper

    return decorator


def stats() -> Dict[str, Any]:
    """Diagnostics for /api/health."""
    return {"entries": len(_STORE), "version": _VERSION}
