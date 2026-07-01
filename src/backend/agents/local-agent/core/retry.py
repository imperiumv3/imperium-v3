"""
core/retry.py
=============

Retry decorator with exponential backoff for transient failures.
"""
from __future__ import annotations

import time
import functools
from typing import Callable, Optional, Tuple, Type

from core.config import CFG
from core.logging import log


def with_retry(
    max_retries: int = 0,
    base_delay: float = 0,
    max_delay: float = 0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable] = None,
):
    max_retries = max_retries or CFG.max_retries
    base_delay = base_delay or CFG.retry_base_delay
    max_delay = max_delay or CFG.retry_max_delay

    def decorator(fn: Callable):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_retries + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as exc:
                    last_exc = exc
                    if attempt < max_retries:
                        delay = min(base_delay * (2 ** attempt), max_delay)
                        if on_retry:
                            on_retry(attempt + 1, delay, exc)
                        log.warn(
                            f"Retry {attempt + 1}/{max_retries} for {fn.__name__}: {exc} "
                            f"(waiting {delay:.1f}s)",
                        )
                        time.sleep(delay)
            raise last_exc  # type: ignore
        return wrapper
    return decorator
