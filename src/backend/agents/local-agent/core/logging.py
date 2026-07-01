"""
core/logging.py
===============

Structured logging for the Local Agent. Replaces all print() calls.
Every log line is JSON-parseable for structured output.
"""
from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Optional


class AgentFormatter(logging.Formatter):
    LEVEL_MAP = {
        "DEBUG": "debug",
        "INFO": "info",
        "WARNING": "warn",
        "ERROR": "error",
        "CRITICAL": "error",
    }

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).isoformat()
        level = self.LEVEL_MAP.get(record.levelname, record.levelname.lower())
        msg = record.getMessage()
        run_id = getattr(record, "run_id", "")
        step = getattr(record, "step", "")
        url = getattr(record, "url", "")

        parts = {
            "ts": ts,
            "level": level,
            "logger": record.name,
            "msg": msg,
        }
        if run_id:
            parts["run_id"] = run_id
        if step:
            parts["step"] = step
        if url:
            parts["url"] = url

        exc = record.exc_info
        if exc and exc[1]:
            parts["error"] = str(exc[1])

        return json.dumps(parts, default=str)


def setup_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(AgentFormatter())
    root.addHandler(handler)

    for noisy in ("urllib3", "selenium", "urllib3.connectionpool"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


class Logger:
    def __init__(self, name: str):
        self._log = logging.getLogger(name)

    def _extra(self, run_id: str = "", step: str = "", url: str = "") -> dict[str, Any]:
        e: dict[str, Any] = {}
        if run_id:
            e["run_id"] = run_id
        if step:
            e["step"] = step
        if url:
            e["url"] = url
        return e

    def info(self, msg: str, *, run_id: str = "", step: str = "", url: str = "") -> None:
        self._log.info(msg, extra=self._extra(run_id, step, url))

    def warn(self, msg: str, *, run_id: str = "", step: str = "", url: str = "") -> None:
        self._log.warning(msg, extra=self._extra(run_id, step, url))

    def error(self, msg: str, *, run_id: str = "", step: str = "", url: str = "",
              exc_info: bool = False) -> None:
        self._log.error(msg, extra=self._extra(run_id, step, url), exc_info=exc_info)

    def debug(self, msg: str, *, run_id: str = "", step: str = "", url: str = "") -> None:
        self._log.debug(msg, extra=self._extra(run_id, step, url))


log = Logger("agent")
