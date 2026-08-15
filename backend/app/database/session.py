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
from sqlalchemy.pool import QueuePool

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
    # Turso is a network database. The libSQL dialect inherits pysqlite's
    # default SingletonThreadPool, which serialises every request onto one
    # connection and rejects pool sizing arguments outright — so QueuePool has
    # to be selected explicitly. Connections are recycled below the typical
    # 5-minute idle timeout so a dropped socket is replaced, not reused.
    _engine_kwargs.update(
        poolclass=QueuePool, pool_size=5, max_overflow=5, pool_recycle=280
    )

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
