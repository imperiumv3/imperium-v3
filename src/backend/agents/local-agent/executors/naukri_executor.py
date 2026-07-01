"""
executors/naukri_executor.py
============================

Dedicated Naukri Quick Apply executor.
Handles Naukri's unique apply flow, form filling, and submission.
"""
from __future__ import annotations

import time
from typing import Callable, Optional

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

from engine.form_engine import (
    fill_fields, fill_choice_controls, scroll_form, scroll_form_to,
    click_next, click_submit,
)
from engine.resume_manager import upload_resume, resolve_resume_path
from engine.profile_memory import ProfileMemory
from executors.submit_verifier import verify_submission
from core.logging import log
from core.config import CFG

Emit = Callable[..., None]


NAUKRI_APPLY_SELECTORS = [
    "a[data-ga-label='Apply']",
    "button[data-ga-label='Apply']",
    "a.btn-apply",
    "button.btn-apply",
    "a.apply-button",
    "button.apply-button",
    "span.apply-btn",
    "a[href*='apply']",
    "button.msg",
    "a.btn-1",
    "span.naukri-apply",
    "button[data-ga-action='apply_now']",
]

NAUKRI_JOB_SELECTORS = [
    "article.jobTuple",
    "div.jobTuple",
    "a.title",
    "a[href*='/jobs/']",
    "div.sm-axisCont a",
]


def execute_naukri(
    driver,
    profile: ProfileMemory,
    resume_path: str,
    emit: Emit,
    run_id: str = "",
) -> str:
    """Execute Naukri application flow.

    Returns: 'submitted', 'needs_human', or 'awaiting_approval'.
    """
    url = driver.current_url.lower()

    # If already on a job detail page (URL contains /job- or /job/), go straight to apply
    is_job_page = (
        "naukri.com/job" in url
        or "naukri.com/job-listings" in url
        or "naukri.com/jobs" in url
    )

    if not is_job_page and not _has_naukri_apply(driver):
        # We're on a search/listing page — need to pick a job first
        if not _pick_first_job(driver, emit, run_id):
            return "needs_human"
        time.sleep(2)

    return _handle_naukri_job(driver, profile, resume_path, emit, run_id)


def _has_naukri_apply(driver) -> bool:
    """Check if the current page has a Naukri Apply button."""
    try:
        for sel in NAUKRI_APPLY_SELECTORS:
            els = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in els:
                if el.is_displayed():
                    return True
    except WebDriverException:
        pass
    return False


def _pick_first_job(driver, emit: Emit, run_id: str = "") -> bool:
    """On a Naukri search page, click the first job listing."""
    try:
        for sel in NAUKRI_JOB_SELECTORS:
            cards = driver.find_elements(By.CSS_SELECTOR, sel)
            for card in cards[:10]:
                try:
                    if card.is_displayed():
                        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", card)
                        time.sleep(0.3)
                        try:
                            card.click()
                        except WebDriverException:
                            driver.execute_script("arguments[0].click();", card)
                        emit("listing", "Opened first Naukri job", level="success")
                        return True
                except WebDriverException:
                    continue
    except WebDriverException:
        pass

    try:
        links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/jobs/']")
        for link in links[:15]:
            try:
                if link.is_displayed() and "/jobs/" in (link.get_attribute("href") or ""):
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", link)
                    time.sleep(0.3)
                    try:
                        link.click()
                    except WebDriverException:
                        driver.execute_script("arguments[0].click();", link)
                    emit("listing", "Opened Naukri job via link", level="success")
                    return True
            except WebDriverException:
                continue
    except WebDriverException:
        pass

    emit("listing", "Could not find a Naukri job to click", level="warn")
    return False


def _handle_naukri_job(
    driver,
    profile: ProfileMemory,
    resume_path: str,
    emit: Emit,
    run_id: str = "",
) -> str:
    """Handle a Naukri job detail page."""
    time.sleep(1.5)

    upload_resume(driver, resume_path, run_id=run_id)

    if _click_naukri_apply(driver, emit, run_id):
        time.sleep(2)
        return _handle_naukri_form(driver, profile, resume_path, emit, run_id)

    emit("needs_human",
         "No Apply button found on Naukri. Finish manually in Chrome, then Approve/Reject.",
         level="warn")
    return "needs_human"


def _click_naukri_apply(driver, emit: Emit, run_id: str = "") -> bool:
    """Click the Naukri Apply button."""
    try:
        for sel in NAUKRI_APPLY_SELECTORS:
            els = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in els:
                try:
                    if el.is_displayed() and el.is_enabled():
                        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                        time.sleep(0.3)
                        try:
                            el.click()
                        except WebDriverException:
                            driver.execute_script("arguments[0].click();", el)
                        emit("apply", "Clicked Naukri Apply button", level="success")
                        return True
                except WebDriverException:
                    continue
    except WebDriverException:
        pass

    try:
        all_btns = driver.find_elements(By.CSS_SELECTOR, "button, a, [role='button']")
        for btn in all_btns:
            try:
                if not btn.is_displayed():
                    continue
                txt = (btn.text or "").strip().lower()
                label = (btn.get_attribute("aria-label") or "").lower()
                if "apply" in txt and "save" not in txt:
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
                    time.sleep(0.3)
                    try:
                        btn.click()
                    except WebDriverException:
                        driver.execute_script("arguments[0].click();", btn)
                    emit("apply", "Clicked Naukri Apply (text match)", level="success")
                    return True
            except WebDriverException:
                continue
    except WebDriverException:
        pass

    return False


def _handle_naukri_form(
    driver,
    profile: ProfileMemory,
    resume_path: str,
    emit: Emit,
    run_id: str = "",
) -> str:
    """Handle Naukri application form — fill fields, handle multi-step."""
    time.sleep(1)

    for step in range(CFG.max_wizard_steps):
        n = 0
        for pos in ("top", "middle", "bottom"):
            scroll_form_to(driver, None, pos)
            time.sleep(0.3)
            upload_resume(driver, resume_path, run_id=run_id)
            n += fill_fields(driver, profile, emit=emit, run_id=run_id)
            n += fill_choice_controls(driver, profile, emit=emit, run_id=run_id)

        scroll_form(driver, None)
        time.sleep(0.3)
        emit("naukri_form", f"Step {step + 1}: filled {n} field(s)")

        if click_submit(driver, emit=emit, timeout=2):
            time.sleep(2)
            if verify_submission(driver, timeout=5, run_id=run_id):
                emit("submitted", "Naukri application submitted successfully", level="success")
                return "submitted"
            emit("submitted", "Submit clicked on Naukri but verification pending", level="warn")
            return "submitted"

        if click_next(driver, emit=emit, timeout=3):
            time.sleep(1.2)
            continue

        if n == 0:
            break

    try:
        text = driver.find_element(By.TAG_NAME, "body").text.lower()
        if any(s in text for s in ("applied successfully", "application submitted", "applied to this job")):
            emit("submitted", "Naukri application confirmed via page text", level="success")
            return "submitted"
    except WebDriverException:
        pass

    emit("needs_human",
         "Naukri form could not be completed automatically. Finish manually, then Approve/Reject.",
         level="warn")
    return "needs_human"
