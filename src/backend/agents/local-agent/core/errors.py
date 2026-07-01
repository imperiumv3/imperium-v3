"""
core/errors.py
==============

Structured error types for the Local Agent. Every failure maps to a
specific error code so the frontend can react programmatically.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional


class ErrorCode(str, Enum):
    SELENIUM_NOT_INSTALLED = "SELENIUM_NOT_INSTALLED"
    CHROME_LAUNCH_FAILED = "CHROME_LAUNCH_FAILED"
    CHROME_NOT_REACHABLE = "CHROME_NOT_REACHABLE"
    LOGIN_REQUIRED = "LOGIN_REQUIRED"
    CAPTCHA_DETECTED = "CAPTCHA_DETECTED"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    PAGE_LOAD_TIMEOUT = "PAGE_LOAD_TIMEOUT"
    PLATFORM_NOT_SUPPORTED = "PLATFORM_NOT_SUPPORTED"
    APPLY_BUTTON_NOT_FOUND = "APPLY_BUTTON_NOT_FOUND"
    RESUME_UPLOAD_FAILED = "RESUME_UPLOAD_FAILED"
    FORM_FILL_FAILED = "FORM_FILL_FAILED"
    NEXT_BUTTON_NOT_FOUND = "NEXT_BUTTON_NOT_FOUND"
    SUBMIT_NOT_FOUND = "SUBMIT_NOT_FOUND"
    SUBMIT_FAILED = "SUBMIT_FAILED"
    SUBMISSION_UNVERIFIED = "SUBMISSION_UNVERIFIED"
    APPLICATION_CANCELLED = "APPLICATION_CANCELLED"
    APPROVAL_TIMEOUT = "APPROVAL_TIMEOUT"
    HUMAN_INTERVENTION_REQUIRED = "HUMAN_INTERVENTION_REQUIRED"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


class AgentError(Exception):
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        recoverable: bool = True,
        details: Optional[dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.recoverable = recoverable
        self.details = details or {}
        super().__init__(f"[{code.value}] {message}")

    def to_dict(self) -> dict[str, Any]:
        return {
            "error_code": self.code.value,
            "message": self.message,
            "recoverable": self.recoverable,
            "details": self.details,
        }
