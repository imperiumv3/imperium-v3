"""
browser/session_manager.py
==========================

Persists browser sessions and detects login state.
Reuses logged-in Chrome profiles to avoid repeated logins.

CRITICAL: Never navigates away from the current job URL during
verification. Checks session by examining the current page or
using lightweight API calls.
"""
from __future__ import annotations

import time
from typing import Optional

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

from core.config import CFG
from core.logging import log
from core.errors import AgentError, ErrorCode


def verify_session(driver, platform: str, run_id: str = "") -> bool:
    """Check if user is logged in WITHOUT navigating away from the current page.

    Strategy: examine the current page for login redirects or auth walls.
    If we're on a job page that loaded content, we're logged in.
    """
    url = driver.current_url.lower()

    if platform == "linkedin":
        return _verify_linkedin_session(driver, url, run_id)
    elif platform == "naukri":
        return _verify_naukri_session(driver, url, run_id)
    return True


def _verify_linkedin_session(driver, url: str, run_id: str = "") -> bool:
    """Check LinkedIn session without navigating away."""
    # If on login page, session is expired
    if "/login" in url or "/uas/login" in url or "authwall" in url:
        log.warn("LinkedIn session expired — on login page", run_id=run_id, step="session")
        return False

    # If on a job page, check if it loaded job content (not redirected)
    if "linkedin.com/jobs" in url:
        try:
            # Check for job detail indicators
            body = driver.find_element(By.TAG_NAME, "body").text[:1000].lower()
            if any(s in body for s in ("sign in", "log in", "join now", "access denied")):
                log.warn("LinkedIn job page requires login", run_id=run_id, step="session")
                return False
            if any(s in body for s in ("easy apply", "apply", "job", "company")):
                log.info("LinkedIn session valid (job page loaded)", run_id=run_id, step="session")
                return True
            # Page loaded but no job content yet — wait briefly
            time.sleep(2)
            body = driver.find_element(By.TAG_NAME, "body").text[:1000].lower()
            if any(s in body for s in ("easy apply", "apply", "job", "company")):
                log.info("LinkedIn session valid (job content loaded)", run_id=run_id, step="session")
                return True
        except WebDriverException:
            pass

    # If on any other LinkedIn page, check for nav elements
    if "linkedin.com" in url:
        try:
            els = driver.find_elements(By.CSS_SELECTOR, "div.global-nav__me, img.global-nav__me-photo")
            if els:
                log.info("LinkedIn session valid (nav elements found)", run_id=run_id, step="session")
                return True
        except WebDriverException:
            pass

    # Fallback: try a lightweight check via cookies
    try:
        cookies = driver.get_cookies()
        for c in cookies:
            if c.get("name") == "li_at" and c.get("value"):
                log.info("LinkedIn session valid (li_at cookie found)", run_id=run_id, step="session")
                return True
    except WebDriverException:
        pass

    log.warn("LinkedIn session status unknown — assuming valid", run_id=run_id, step="session")
    return True


def _verify_naukri_session(driver, url: str, run_id: str = "") -> bool:
    """Check Naukri session without navigating away."""
    # If on login page, session is expired
    if "nlogin" in url or "/login" in url:
        log.warn("Naukri session expired — on login page", run_id=run_id, step="session")
        return False

    # If on a job page, check if it loaded
    if "naukri.com" in url:
        try:
            body = driver.find_element(By.TAG_NAME, "body").text[:1000].lower()
            if any(s in body for s in ("sign in", "log in", "register")):
                log.warn("Naukri page requires login", run_id=run_id, step="session")
                return False
            if any(s in body for s in ("apply", "job", "company", "salary")):
                log.info("Naukri session valid (job page loaded)", run_id=run_id, step="session")
                return True
        except WebDriverException:
            pass

    # Check cookies
    try:
        cookies = driver.get_cookies()
        for c in cookies:
            if "naukri" in c.get("domain", "") and c.get("value"):
                log.info("Naukri session valid (cookie found)", run_id=run_id, step="session")
                return True
    except WebDriverException:
        pass

    log.warn("Naukri session status unknown — assuming valid", run_id=run_id, step="session")
    return True


def wait_for_manual_login(driver, platform: str, run_id: str = "", timeout: float = 120) -> bool:
    """Pause and wait for user to log in manually in the Chrome window.

    Returns True if login detected within timeout, False otherwise.
    """
    log.warn(
        f"Please log in to {platform.title()} in the Chrome window. Waiting up to {timeout}s...",
        run_id=run_id,
        step="login",
    )

    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(3)
        url = driver.current_url.lower()
        if platform == "linkedin":
            if "linkedin.com" in url and "/login" not in url and "authwall" not in url:
                body = driver.find_element(By.TAG_NAME, "body").text[:500].lower()
                if any(s in body for s in ("easy apply", "apply", "job")):
                    log.info("LinkedIn login detected", run_id=run_id, step="login")
                    return True
        elif platform == "naukri":
            if "naukri.com" in url and "nlogin" not in url:
                body = driver.find_element(By.TAG_NAME, "body").text[:500].lower()
                if any(s in body for s in ("apply", "job", "salary")):
                    log.info("Naukri login detected", run_id=run_id, step="login")
                    return True
    return False
