"""
agents/automation_agent.py
==========================

Orchestrator. Owns one job-application run from queue to terminal state:
launch Chrome → detect platform → verify session → navigate → execute → verify.
"""
from __future__ import annotations

import time
import traceback
from typing import Any, Callable, Dict, Optional

from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from core.config import CFG
from core.logging import log
from core.errors import AgentError, ErrorCode
from core.concurrency import browser_semaphore
from tracking import run_tracker as models
from browser.browser_manager import build_driver, SELENIUM_OK
from browser.session_manager import verify_session, wait_for_manual_login
from classifiers.job_classifier import detect_platform
from engine.profile_memory import ProfileMemory
from engine.resume_manager import resolve_resume_path
from executors.linkedin_executor import execute_linkedin
from executors.naukri_executor import execute_naukri
from executors.ats_executor import execute_ats


def run_job(job_id: str) -> None:
    """Execute a single job application run.

    Semaphore is ALWAYS released via finally — no early returns before try.
    """
    if not SELENIUM_OK:
        models.update(job_id, status="failed", error="Selenium not installed",
                      error_code=ErrorCode.SELENIUM_NOT_INSTALLED.value)
        models.emit(job_id, "error", "Selenium is not installed on this machine", level="error")
        return

    acquired = False
    driver = None
    try:
        if not browser_semaphore.acquire(timeout=10):
            models.update(job_id, status="failed", error="Too many concurrent sessions",
                          error_code=ErrorCode.UNKNOWN_ERROR.value)
            models.emit(job_id, "error", "Max concurrent browser sessions reached. "
                        "Closing stale sessions...", level="error")
            browser_semaphore.force_reset()
            if not browser_semaphore.acquire(timeout=5):
                models.update(job_id, status="failed", error="Semaphore stuck after reset",
                              error_code=ErrorCode.UNKNOWN_ERROR.value)
                return
        acquired = True

        run = models.get_run(job_id)
        if not run:
            return

        url = run["job_url"]
        raw_profile = run.get("profile") or {}
        resume_path = run.get("resume_path") or raw_profile.get("resume_path") or CFG.resume_path
        profile = ProfileMemory(raw_profile)

        models.update(job_id, status="running", progress=5, current_step="boot",
                      current_action="Starting Chrome")
        models.emit(job_id, "boot", "Launching local Chrome")

        driver, profile_desc = build_driver()
        if profile_desc:
            models.emit(job_id, "profile", profile_desc)

        platform = detect_platform(url)
        models.update(job_id, platform=platform, progress=10,
                      current_step="detect", current_action=f"Platform: {platform}")
        models.emit(job_id, "detect", f"Platform detected: {platform}", url=url)

        if platform == "unknown":
            platform = "ats"
            models.update(job_id, platform=platform)

        models.update(job_id, progress=15, current_step="navigate",
                      current_action=f"Opening {url}", current_url=url)
        models.emit(job_id, "navigate", f"Opening {url}", url=url)
        driver.get(url)
        try:
            WebDriverWait(driver, CFG.page_load_timeout).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
        except TimeoutException:
            models.emit(job_id, "navigate", "Page load timed out, continuing", level="warn")
        time.sleep(2)

        if not verify_session(driver, platform, run_id=job_id):
            models.update(job_id, status="awaiting_approval", progress=20,
                          current_step="login",
                          current_action=f"Please log in to {platform.title()} in Chrome.")
            models.emit(job_id, "login",
                        f"Login required for {platform.title()}. Please log in manually.",
                        level="warn")
            if not wait_for_manual_login(driver, platform, run_id=job_id, timeout=120):
                models.update(job_id, status="failed", error="Login timeout",
                              error_code=ErrorCode.LOGIN_REQUIRED.value)
                models.emit(job_id, "error", "Login timeout", level="error")
                return

        # Safety: always ensure we're on the original job URL
        current = driver.current_url.split("?")[0].rstrip("/")
        target = url.split("?")[0].rstrip("/")
        if current != target:
            models.emit(job_id, "navigate", f"Re-navigating to job URL", url=url)
            driver.get(url)
            time.sleep(2)

        outcome = _execute_platform(driver, platform, profile, resume_path, job_id)

        if outcome == "submitted":
            models.update(job_id, status="submitted", progress=100,
                          current_step="submitted", current_action="Application submitted")
            models.emit(job_id, "submitted", "Application submitted successfully", level="success")
            return

        if outcome == "needs_human":
            models.update(job_id, status="awaiting_approval", progress=70,
                          current_step="needs_human",
                          current_action="Agent stuck. Finish in Chrome, then Approve/Reject.")
            models.emit(job_id, "needs_human",
                        "Agent paused — finish in Chrome, then Approve/Reject.", level="warn")
        else:
            models.update(job_id, status="awaiting_approval", progress=85,
                          current_step="approval",
                          current_action="Form filled. Waiting for approval.")
            models.emit(job_id, "approval", "Click Approve or Reject.", level="warn")

        decision = _wait_for_decision(job_id)
        _handle_decision(driver, job_id, decision)

    except AgentError as exc:
        models.update(job_id, status="failed", error=exc.message,
                      error_code=exc.code.value)
        models.emit(job_id, "error", exc.message, level="error")
    except TimeoutException as exc:
        models.update(job_id, status="failed", error=f"Timeout: {exc}",
                      error_code=ErrorCode.PAGE_LOAD_TIMEOUT.value)
        models.emit(job_id, "error", f"Page timed out: {exc}", level="error")
    except Exception as exc:
        models.update(job_id, status="failed", error=str(exc),
                      error_code=ErrorCode.UNKNOWN_ERROR.value)
        models.emit(job_id, "error", f"Unhandled error: {exc}", level="error")
        traceback.print_exc()
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
        if acquired:
            browser_semaphore.release()


def _execute_platform(
    driver,
    platform: str,
    profile: ProfileMemory,
    resume_path: str,
    job_id: str,
) -> str:
    """Route to the correct platform executor."""
    def emit(step: str, action: str, level: str = "info", url: str = "") -> None:
        models.emit(job_id, step, action, level=level, url=url)

    if platform == "linkedin":
        return execute_linkedin(driver, profile, resume_path, emit, run_id=job_id)
    elif platform == "naukri":
        return execute_naukri(driver, profile, resume_path, emit, run_id=job_id)
    else:
        return execute_ats(driver, profile, resume_path, emit, run_id=job_id)


def _wait_for_decision(job_id: str, timeout: float = 0) -> Optional[str]:
    timeout = timeout or CFG.approval_timeout
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(1)
        r = models.get_run(job_id) or {}
        if r.get("status") == "cancelled":
            return "cancel"
        if r.get("approved") is True:
            return "approve"
        if r.get("approved") is False:
            return "reject"
    return None


def _handle_decision(driver, job_id: str, decision: Optional[str]) -> None:
    if decision == "approve":
        try:
            from engine.form_engine import click_submit
            if click_submit(driver, timeout=3):
                from executors.submit_verifier import verify_submission
                time.sleep(2)
                if verify_submission(driver, timeout=5, run_id=job_id):
                    models.update(job_id, status="submitted", progress=100,
                                  current_step="submitted", current_action="Submitted")
                    models.emit(job_id, "submitted", "Submitted after approval", level="success")
                else:
                    models.update(job_id, status="submitted", progress=100,
                                  current_step="submitted", current_action="Submit clicked")
                    models.emit(job_id, "submitted", "Submit clicked", level="success")
            else:
                models.update(job_id, status="failed", error="No submit button found",
                              error_code=ErrorCode.SUBMIT_NOT_FOUND.value)
                models.emit(job_id, "submit", "No submit button found", level="error")
        except Exception as exc:
            models.update(job_id, status="failed", error=str(exc),
                          error_code=ErrorCode.SUBMIT_FAILED.value)
            models.emit(job_id, "error", f"Submit failed: {exc}", level="error")
    elif decision == "reject":
        models.update(job_id, status="rejected", current_step="rejected",
                      current_action="Rejected by user")
        models.emit(job_id, "reject", "Rejected", level="warn")
    elif decision == "cancel":
        models.emit(job_id, "cancel", "Cancelled", level="warn")
    else:
        models.update(job_id, status="failed", error="Approval timeout",
                      error_code=ErrorCode.APPROVAL_TIMEOUT.value)
        models.emit(job_id, "timeout", "Timed out waiting for approval", level="error")
