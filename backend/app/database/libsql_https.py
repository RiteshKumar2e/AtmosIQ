"""HTTP transport for Turso (libSQL) under SQLAlchemy.

Why this module exists
----------------------
``sqlalchemy-libsql`` dials Turso over the legacy Hrana **WebSocket** protocol
(``ws://`` / ``wss://``). Current Turso instances reject that handshake with
HTTP 400, so the stock dialect cannot connect at all. Its underlying DBAPI
(``libsql_client.dbapi2``) is websocket-only and refuses an ``https`` URL
outright.

The official ``libsql`` package *does* speak HTTP to Turso and presents a
sqlite3-compatible ``Connection`` / ``Cursor``. It is, however, only a partial
DBAPI: it exposes ``connect``, ``Error``, ``paramstyle`` and
``sqlite_version_info``, and nothing else SQLAlchemy expects.

So this module does two small things:

1. Wraps ``libsql`` in a module shim that completes the DBAPI surface, taking
   the missing pieces from the standard library's ``sqlite3``.
2. Subclasses SQLAlchemy's pysqlite dialect to use that shim, and to pass the
   Turso auth token through as a connect argument rather than a URL parameter.

Everything else — SQL compilation, type handling, DDL — is inherited unchanged,
because Turso is SQLite over the wire.

Registered as ``sqlite+libsql_https`` and selected automatically by
``Settings.resolved_database_url`` when Turso credentials are present.
"""

from __future__ import annotations

import types

from sqlalchemy.dialects import registry
from sqlalchemy.dialects.sqlite.pysqlite import SQLiteDialect_pysqlite

# Exceptions SQLAlchemy expects on a DBAPI module. `libsql` only defines the
# `Error` base, so the rest are borrowed from `sqlite3`. They are deliberately
# *not* aliased onto `libsql.Error`: distinct classes simply never match during
# exception translation, whereas aliasing them all to one class would make
# SQLAlchemy misclassify every failure as whichever it happens to test first.
# The shared `Error` base is what matters — it is how SQLAlchemy recognises a
# driver error and wraps it as a DBAPIError.
_EXCEPTION_NAMES = (
    "Warning",
    "InterfaceError",
    "DatabaseError",
    "DataError",
    "OperationalError",
    "IntegrityError",
    "InternalError",
    "ProgrammingError",
    "NotSupportedError",
)

_TYPE_HELPERS = (
    "Binary",
    "Date",
    "Time",
    "Timestamp",
    "DateFromTicks",
    "TimeFromTicks",
    "TimestampFromTicks",
    "PARSE_DECLTYPES",
    "PARSE_COLNAMES",
)


def _build_dbapi() -> types.ModuleType:
    """Complete `libsql` into a DBAPI module SQLAlchemy can drive."""
    import sqlite3

    import libsql

    shim = types.ModuleType("atmosiq.libsql_dbapi")

    shim.connect = libsql.connect
    shim.paramstyle = getattr(libsql, "paramstyle", "qmark")
    shim.apilevel = "2.0"
    # libsql serialises access per connection; SQLAlchemy pools one connection
    # per thread, so module-level threadsafety 1 is the honest value.
    shim.threadsafety = 1

    version_info = getattr(libsql, "sqlite_version_info", (3, 44, 0))
    shim.sqlite_version_info = version_info
    shim.sqlite_version = ".".join(str(part) for part in version_info)
    shim.version = getattr(libsql, "__version__", "libsql")

    shim.Error = libsql.Error
    for name in _EXCEPTION_NAMES:
        setattr(shim, name, getattr(libsql, name, getattr(sqlite3, name)))

    for name in _TYPE_HELPERS:
        value = getattr(libsql, name, getattr(sqlite3, name, None))
        if value is not None:
            setattr(shim, name, value)

    return shim


class SQLiteDialect_libsql_https(SQLiteDialect_pysqlite):
    """SQLite dialect that talks to a remote Turso database over HTTP."""

    driver = "libsql_https"
    supports_statement_cache = SQLiteDialect_pysqlite.supports_statement_cache

    # Turso is a network database: there is no local file to memory-map and no
    # single shared connection to serialise onto.
    @classmethod
    def get_pool_class(cls, url):
        from sqlalchemy.pool import QueuePool

        return QueuePool

    @classmethod
    def import_dbapi(cls):
        return _build_dbapi()

    # SQLAlchemy < 2.0 spelling, kept so the dialect works either way.
    @classmethod
    def dbapi(cls):
        return cls.import_dbapi()

    def on_connect(self):
        """Skip pysqlite's `create_function` hooks.

        libSQL has no `create_function`, so the regexp and date helpers
        pysqlite installs would raise on connect.
        """
        return None

    def create_connect_args(self, url):
        """Turn the SQLAlchemy URL into `libsql.connect(database, auth_token=…)`.

        Every statement is a request to the single remote Turso database. No
        local copy exists, so there is exactly one source of truth.

        The token arrives as the `authToken` query parameter (the form
        `sqlalchemy-libsql` documents) and is passed as a keyword argument, so
        it never has to survive URL round-tripping.
        """
        query = dict(url.query)
        auth_token = query.pop("authToken", None) or query.pop("auth_token", None)
        # Transport hints meant for the websocket driver; meaningless here.
        query.pop("secure", None)
        query.pop("uri", None)

        database = f"https://{url.host}"
        if url.port:
            database = f"{database}:{url.port}"

        kwargs: dict = {}
        if auth_token:
            kwargs["auth_token"] = auth_token

        return [database], kwargs


registry.register(
    "sqlite.libsql_https",
    "app.database.libsql_https",
    "SQLiteDialect_libsql_https",
)

dialect = SQLiteDialect_libsql_https
