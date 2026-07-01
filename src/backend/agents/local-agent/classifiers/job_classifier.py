"""
classifiers/job_classifier.py
=============================

Detects the platform from a job URL and classifies the current page state.
No LinkedIn-specific selectors here — pure URL + DOM heuristics.
"""
from __future__ import annotations

import re
from typing import Any, Dict, Optional

from core.logging import log
from shared.llm_brain import classify_page


LINKEDIN_DOMAINS = ("linkedin.com",)
NAUKRI_DOMAINS = ("naukri.com",)
ATS_DOMAINS = (
    "greenhouse.io", "lever.co", "ashbyhq.com", "workday",
    "myworkdayjobs.com", "smartrecruiters.com", "icims.com",
    "bamboohr.com", "jobvite.com", "successfactors.com",
    "paycomonline.net", "cornerstoneondemand.com", "taleo.net",
    "jobvite.com", "recruiting.paylocity.com", "apply.workable.com",
)


def detect_platform(url: str) -> str:
    """Detect platform from a job URL.

    Returns: 'linkedin', 'naukri', 'ats', or 'unknown'.
    """
    url_lower = url.lower()

    for domain in LINKEDIN_DOMAINS:
        if domain in url_lower:
            return "linkedin"

    for domain in NAUKRI_DOMAINS:
        if domain in url_lower:
            return "naukri"

    for domain in ATS_DOMAINS:
        if domain in url_lower:
            return "ats"

    return "unknown"


def is_linkedin_url(url: str) -> bool:
    return "linkedin.com" in url.lower()


def is_naukri_url(url: str) -> bool:
    return "naukri.com" in url.lower()


def classify_page_state(driver, run_id: str = "") -> str:
    """Classify what the current page state is.

    Returns one of: 'job_listing', 'job_detail', 'easy_apply_step',
    'external_form', 'login_wall', 'captcha', 'success', 'unknown'.
    """
    try:
        url = driver.current_url.lower()
    except Exception:
        return "unknown"

    if "linkedin.com" in url:
        return _classify_linkedin(driver, url, run_id)
    elif "naukri.com" in url:
        return _classify_naukri(driver, url, run_id)
    else:
        return _classify_ats(driver, url, run_id)


def _classify_linkedin(driver, url: str, run_id: str = "") -> str:
    from automation.form_parser import active_dialog

    if "/login" in url or "/uas/login" in url:
        return "login_wall"

    text = _safe_body_text(driver)[:4000]
    if any(s in text for s in (
        "application submitted", "your application was sent",
        "thanks for applying", "we received your application",
    )):
        return "success"

    if "checkpoint" in url or "captcha" in text.lower() or "verify you are human" in text.lower():
        return "captcha"

    dialog = active_dialog(driver)
    dialog_text = ""
    if dialog:
        try:
            dialog_text = (dialog.text or "").lower()[:3000]
        except Exception:
            pass

    has_modal = bool(dialog_text) and any(s in dialog_text for s in (
        "submit application", "review your application",
        "save this application", "contact info", "phone number",
        "work experience", "education", "resume",
    ))

    buttons = _safe_buttons(driver)
    has_wizard_button = any(
        b in ("next", "review", "submit application", "continue to next step",
              "continue", "proceed")
        or "continue to next step" in b
        or "review your application" in b
        or "submit application" in b
        for b in buttons
    )

    if has_modal and has_wizard_button:
        return "easy_apply_step"

    if "linkedin.com/jobs/view" in url:
        return "job_detail"

    is_search = (
        "linkedin.com/jobs/search" in url
        or "linkedin.com/jobs/collections" in url
        or ("linkedin.com/jobs" in url and _safe_job_cards(driver) >= 2)
    )
    if is_search:
        return "job_listing"

    if dialog and has_wizard_button:
        return "easy_apply_step"

    return classify_page(_driver_snapshot(driver))


def _classify_naukri(driver, url: str, run_id: str = "") -> str:
    if "nlogin" in url or "login" in url:
        return "login_wall"

    text = _safe_body_text(driver)[:4000]
    if any(s in text.lower() for s in (
        "application submitted", "applied successfully",
        "your application has been sent", "applied to this job",
    )):
        return "success"

    buttons = _safe_buttons(driver)
    has_apply = any("apply" in b.lower() for b in buttons)

    if "naukri.com/job" in url and has_apply:
        return "job_detail"

    if has_apply:
        return "external_form"

    return classify_page(_driver_snapshot(driver))


def _classify_ats(driver, url: str, run_id: str = "") -> str:
    text = _safe_body_text(driver)[:4000]
    if any(s in text.lower() for s in (
        "application submitted", "thank you for applying",
        "application received", "successfully submitted",
    )):
        return "success"

    buttons = _safe_buttons(driver)
    has_apply = any("apply" in b.lower() for b in buttons)
    inputs = _safe_input_count(driver)

    if has_apply or inputs >= 2:
        return "external_form"

    return classify_page(_driver_snapshot(driver))


def _driver_snapshot(driver) -> Dict[str, Any]:
    """Build a compact snapshot for the LLM classifier."""
    return {
        "url": _safe_attr(driver, "current_url"),
        "title": _safe_attr(driver, "title"),
        "buttons": _safe_buttons(driver)[:20],
        "input_count": _safe_input_count(driver),
        "job_cards": _safe_job_cards(driver),
        "has_dialog": False,
        "dialog_text": "",
        "body_text": _safe_body_text(driver)[:2000],
    }


def _safe_attr(obj, attr: str, default: str = "") -> str:
    try:
        v = getattr(obj, attr, default)
        return str(v) if v else default
    except Exception:
        return default


def _safe_body_text(driver) -> str:
    try:
        from selenium.webdriver.common.by import By
        return driver.find_element(By.TAG_NAME, "body").text or ""
    except Exception:
        return ""


def _safe_buttons(driver) -> list:
    try:
        from selenium.webdriver.common.by import By
        buttons = []
        for b in driver.find_elements(By.CSS_SELECTOR, "button, [role=button], a"):
            try:
                if not b.is_displayed():
                    continue
                txt = (b.text or b.get_attribute("aria-label") or "").strip()
                if txt and len(txt) < 80:
                    buttons.append(txt.lower())
            except Exception:
                continue
        return buttons
    except Exception:
        return []


def _safe_input_count(driver) -> int:
    try:
        from selenium.webdriver.common.by import By
        return len(driver.find_elements(By.CSS_SELECTOR, "input, textarea, select"))
    except Exception:
        return 0


def _safe_job_cards(driver) -> int:
    try:
        from selenium.webdriver.common.by import By
        return len(driver.find_elements(
            By.CSS_SELECTOR,
            "li.jobs-search-results__list-item, div.job-card-container, "
            "a[href*='/jobs/view/'], div.job-card-base",
        ))
    except Exception:
        return 0
