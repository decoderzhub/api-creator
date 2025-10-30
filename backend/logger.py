import logging
import sys
from pythonjsonlogger import jsonlogger
from datetime import datetime
from typing import Optional
import uuid


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        log_record['timestamp'] = datetime.utcnow().isoformat()
        log_record['level'] = record.levelname
        log_record['service'] = 'api-gateway'
        if not log_record.get('logger'):
            log_record['logger'] = record.name


def setup_logger(name: str = "api_gateway") -> logging.Logger:
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    formatter = CustomJsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger


def generate_request_id() -> str:
    return str(uuid.uuid4())


logger = setup_logger()
