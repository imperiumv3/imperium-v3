"""
executors/ats_executor.py
=========================

Generic ATS (Applicant Tracking System) executor.
Handles Greenhouse, Lever, Ashby, Workday, and other ATS platforms.
"""
from __future__ import annotations

import time
from typing import Callable

from selenium.webdriver.common.by import By
from selenium.common.exceptions import WebDriverException

from engine.form_engine import (
    fill_fields, fill_choice_controls, scroll_form, scroll_form_to,
    click_next, click_submit,
)
from engine.resume_manager import upload_resume
from engine.profile_memory import ProfileMemory
from executors.submit_verifier import verify_submission
from core.logging import log
from core.config import CFG

Emit = Callable[..., None]


def execute_ats(
    driver,
    profile: ProfileMemory,
    resume_path: str,
    emit: Emit,
    run_id: str = "",
) -> str:
    """Execute generic ATS application flow.

    Returns: 'submitted', 'needs_human', or 'awaiting_approval'.
    """
    time.sleep(1.5)

    _click_ats_apply(driver, emit, run_id)
    time.sleep(1)

    upload_resume(driver, resume_path, run_id=run_id)

    job_context = ""
    try:
        job_context = driver.find_element(By.TAG_NAME, "body").text[:3000]
    except WebDriverException:
        pass

    total = 0
    for pass_idx in range(5):
        try:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        except WebDriverException:
            pass
        time.sleep(0.5)

        upload_resume(driver, resume_path, run_id=run_id)
        total += fill_fields(driver, profile, job_context, emit=emit, run_id=run_id)
        total += fill_choice_controls(driver, profile, job_context, emit=emit, run_id=run_id)

        try:
            driver.execute_script("window.scrollTo(0, 0);")
        except WebDriverException:
            pass
        time.sleep(0.3)

    host = _safe_host(driver)
    emit("external", f"Filled {total} field(s) on {host}",
         level="success" if total else "warn")

    if click_submit(driver, emit=emit, timeout=3):
        time.sleep(3)
        if verify_submission(driver, timeout=5, run_id=run_id):
            emit("submitted", f"ATS application submitted on {host}", level="success")
            return "submitted"
        emit("submitted", f"Submit clicked on {host} but verification pending", level="warn")
        return "submitted"

    if click_next(driver, emit=emit, timeout=3):
        return _handle_ats_multistep(driver, profile, resume_path, job_context, emit, run_id)

    emit("needs_human",
         f"ATS form on {host} could not be completed. Finish manually, then Approve/Reject.",
         level="warn")
    return "needs_human"


def _handle_ats_multistep(
    driver,
    profile: ProfileMemory,
    resume_path: str,
    job_context: str,
    emit: Emit,
    run_id: str = "",
) -> str:
    """Handle multi-step ATS forms."""
    for step in range(CFG.max_wizard_steps):
        time.sleep(1)
        n = 0
        for pos in ("top", "middle", "bottom"):
            scroll_form_to(driver, None, pos)
            time.sleep(0.3)
            upload_resume(driver, resume_path, run_id=run_id)
            n += fill_fields(driver, profile, job_context, emit=emit, run_id=run_id)
            n += fill_choice_controls(driver, profile, job_context, emit=emit, run_id=run_id)

        scroll_form(driver, None)
        time.sleep(0.3)
        emit("ats_form", f"Step {step + 1}: filled {n} field(s)")

        if click_submit(driver, emit=emit, timeout=2):
            time.sleep(2)
            if verify_submission(driver, timeout=5, run_id=run_id):
                emit("submitted", "ATS application submitted", level="success")
                return "submitted"
            return "submitted"

        if click_next(driver, emit=emit, timeout=3):
            time.sleep(1.2)
            continue

        if n == 0:
            break

    emit("needs_human", "ATS multi-step form could not be completed", level="warn")
    return "needs_human"


def _click_ats_apply(driver, emit: Emit, run_id: str = "") -> None:
    """Click the Apply button on an ATS page."""
    selectors = [
        "a.postings-btn[href*='apply']",
        "a#apply_button",
        "button[data-source='apply_button']",
        "a.apply-btn",
        "button.apply-btn",
        "a[href*='apply']",
    ]
    for sel in selectors:
        try:
            els = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in els:
                if el.is_displayed() and el.is_enabled():
                    try:
                        el.click()
                        emit("apply", "Clicked ATS Apply button", level="success")
                        return
                    except WebDriverException:
                        driver.execute_script("arguments[0].click();", el)
                        emit("apply", "Clicked ATS Apply button (JS)", level="success")
                        return
        except WebDriverException:
            continue

    try:
        for el in driver.find_elements(By.CSS_SELECTOR, "button, a, [role='button']"):
            try:
                if not el.is_displayed():
                    continue
                txt = (el.text or "").strip().lower()
                if "apply" in txt:
                    try:
                        el.click()
                        emit("apply", "Clicked ATS Apply (text match)", level="success")
                        return
                    except WebDriverException:
                        driver.execute_script("arguments[0].click();", el)
                        emit("apply", "Clicked ATS Apply (text match, JS)", level="success")
                        return
            except WebDriverException:
                continue
    except WebDriverException:
        pass


def _safe_host(driver) -> str:
    try:
        url = driver.current_url
        return url.split("/")[2] if "://" in url else "site"
    except Exception:
        return "site"
