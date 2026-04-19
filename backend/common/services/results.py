from dataclasses import dataclass
from typing import Generic, Optional, TypeVar

T = TypeVar('T')


@dataclass(frozen=True)
class ServiceResult(Generic[T]):
    ok: bool
    data: Optional[T] = None
    error: Optional[str] = None
    code: int = 200


def success(data=None, code=200):
    return ServiceResult(ok=True, data=data, code=code)


def failure(error, code=400):
    return ServiceResult(ok=False, error=error, code=code)
