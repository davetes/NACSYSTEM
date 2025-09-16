def init_db():
    # SQLite removed; retained for compatibility
    return None

def get_db_connection():
    # SQLite removed; retained for compatibility
    raise RuntimeError('SQLite has been removed. Use MongoDB via models.mongo.')