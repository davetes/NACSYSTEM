import os
from datetime import datetime

LOG_FILE = os.path.join(os.path.dirname(__file__), '../../logs/nac.log')

def log(message: str) -> None:
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as log_file:
        log_file.write(f"{datetime.now()} - {message}\n")