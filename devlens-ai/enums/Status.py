from enum import Enum

class Status(Enum):
    INDEXING = "INDEXING"
    READY = "READY"
    FAILED = "FAILED"