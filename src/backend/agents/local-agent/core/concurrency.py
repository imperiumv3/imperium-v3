"""
core/concurrency.py
===================

Concurrency control for browser sessions. Limits how many Chrome
instances can run simultaneously.
"""
from __future__ import annotations

import asyncio
import threading
from typing import Optional

from core.config import CFG


class BrowserSemaphore:
    _instance: Optional["BrowserSemaphore"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "BrowserSemaphore":
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._semaphore = threading.Semaphore(CFG.max_concurrent_runs)
                cls._instance._active = 0
                cls._instance._count_lock = threading.Lock()
            return cls._instance

    def acquire(self, timeout: float = 30.0) -> bool:
        result = self._semaphore.acquire(timeout=timeout)
        if result:
            with self._count_lock:
                self._active += 1
        return result

    def release(self) -> None:
        with self._count_lock:
            self._active = max(0, self._active - 1)
        self._semaphore.release()

    @property
    def active_count(self) -> int:
        with self._count_lock:
            return self._active

    @property
    def available(self) -> int:
        return CFG.max_concurrent_runs - self.active_count

    def force_reset(self) -> None:
        """Reset the semaphore to a clean state. Call on server startup."""
        with self._count_lock:
            self._active = 0
        while self._semaphore.acquire(blocking=False):
            pass
        for _ in range(CFG.max_concurrent_runs):
            self._semaphore.release()


browser_semaphore = BrowserSemaphore()
