"""Database engine / session factory.

Three backends are supported through configuration alone, with no ORM changes:

  * local SQLite file  — the zero-setup default
  * Turso (libSQL)     — set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
  * PostgreSQL         — set DATABASE_URL to a postgresql+psycopg DSN

Turso speaks the SQLite dialect over the network, so every model, query, and
index defined against the local file works unchanged against the hosted
database.
"""

from __future__ import annotations

import logging
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import settings

logger = logging.getLogger("atmosiq.database")


class Base(DeclarativeBase):
    pass


DATABASE_URL = settings.resolved_database_url

_is_remote_libsql = DATABASE_URL.startswith("sqlite+libsql")
_is_local_sqlite = DATABASE_URL.startswith("sqlite:")


if _is_remote_libsql:
    # Registers the sqlite+libsql_https dialect that the URL above selects.
    from app.database import libsql_https  # noqa: F401

_connect_args: dict = {}
_engine_kwargs: dict = {"pool_pre_ping": True, "future": True}

if _is_local_sqlite:
    # FastAPI serves requests from a thread pool; a local SQLite connection is
    # otherwise pinned to its creating thread.
    _connect_args["check_same_thread"] = False
elif _is_remote_libsql:
    # Turso is a network database reached over HTTP, and the libSQL driver
    # applies no socket timeout. A pooled connection that has gone stale — the
    # server idled overnight, a NAT mapping expired, the far end closed it —
    # therefore does not raise: it blocks forever. `pool_pre_ping` cannot save
    # us either, because the ping is issued on that same dead socket and hangs
    # too, which is how a healthy server ends up unable to answer `SELECT 1`.
    #
    # NullPool opens a fresh connection per checkout and closes it after, so
    # there is never a stale one to inherit. The extra connect costs roughly
    # 0.5 s against a request that already spends seconds on round trips —
    # cheap insurance against an unrecoverable hang.
    _engine_kwargs.update(poolclass=NullPool)
    _engine_kwargs.pop("pool_pre_ping", None)  # meaningless on a fresh connection

try:
    engine = create_engine(DATABASE_URL, connect_args=_connect_args, **_engine_kwargs)
except Exception:
    if not _is_remote_libsql:
        raise
    # Never let a Turso misconfiguration take the whole application down —
    # fall back to the local file and say so loudly.
    logger.exception(
        "Could not create the Turso engine. Falling back to the local SQLite "
        "database. Check TURSO_DATABASE_URL / TURSO_AUTH_TOKEN, and confirm "
        "`sqlalchemy-libsql` is installed."
    )
    engine = create_engine(
        settings.database_url, connect_args={"check_same_thread": False},
        pool_pre_ping=True, future=True,
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables. Import models first so metadata is populated."""
    from app.models import models  # noqa: F401  (registers mappers)

    Base.metadata.create_all(bind=engine)
