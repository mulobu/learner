import ssl as ssl_module

from sqlalchemy.engine import make_url


def prepare_asyncpg_connection(database_url: str) -> tuple[str, dict]:
    """
    Normalize asyncpg connection settings from DATABASE_URL.

    asyncpg does not accept libpq-style `sslmode` as a direct keyword argument,
    so we map it into `connect_args["ssl"]` and remove it from the URL query.
    """
    connect_args: dict = {}
    parsed_url = make_url(database_url)

    if parsed_url.drivername != "postgresql+asyncpg":
        return database_url, connect_args

    original_query = dict(parsed_url.query)
    query = dict(original_query)

    sslmode = query.pop("sslmode", None)
    if sslmode is not None:
        sslmode_value = sslmode.lower()
        if sslmode_value == "disable":
            connect_args["ssl"] = False
        else:
            connect_args["ssl"] = ssl_module.create_default_context()

    host = parsed_url.host or ""
    if "neon.tech" in host and "ssl" not in connect_args:
        connect_args["ssl"] = ssl_module.create_default_context()

    if query != original_query:
        parsed_url = parsed_url.set(query=query)

    return parsed_url.render_as_string(hide_password=False), connect_args
