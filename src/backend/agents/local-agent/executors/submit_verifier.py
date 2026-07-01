"""
executors/submit_verifier.py
============================

Verifies that an application was actually submitted.
Does not mark success merely because Apply was clicked.
"""
from __future__ import annotations

import time
from typing import Optional

from selenium.webdriver.common.by import By
from selenium.common.exceptions import WebDriverException

from core.logging import log


SUCCESS_SIGNALS = [
    "application submitted",
    "applied successfully",
    "your application was sent",
    "thanks for applying",
    "we received your application",
    "application received",
    "successfully submitted",
    "your application has been submitted",
    "application complete",
    "you've applied",
    "applied to this job",
    "application done",
]

MODAL_DISMISS_SELECTORS = [
    "button[aria-label='Dismiss']",
    "button[aria-label*='Dismiss' i]",
    "button[aria-label*='Done' i]",
    "button[aria-label*='Close' i]",
]


def verify_submission(driver, timeout: float = 5, run_id: str = "") -> bool:
    """Check if the page shows a submission confirmation.

    Returns True if submission is confirmed.
    """
    end = time.time() + timeout
    while time.time() < end:
        try:
            text = driver.find_element(By.TAG_NAME, "body").text.lower()
            if any(signal in text for signal in SUCCESS_SIGNALS):
                log.info("Submission verified — success signal detected", run_id=run_id, step="verify")
                return True

            try:
                for sel in MODAL_DISMISS_SELECTORS:
                    els = driver.find_elements(By.CSS_SELECTOR, sel)
                    for el in els:
                        if el.is_displayed():
                            try:
                                el.click()
                                log.debug("Dismissed post-submit modal", run_id=run_id, step="verify")
                            except WebDriverException:
                                driver.execute_script("arguments[0].click();", el)
            except WebDriverException:
                pass

        except WebDriverException:
            pass
        time.sleep(1)

    return False


def dismiss_post_submit_modal(driver, run_id: str = "") -> None:
    """Dismiss any post-submit modal/dialog."""
    try:
        for sel in MODAL_DISMISS_SELECTORS:
            els = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in els:
                if el.is_displayed():
                    try:
                        el.click()
                        time.sleep(0.5)
                        return
                    except WebDriverException:
                        driver.execute_script("arguments[0].click();", el)
                        time.sleep(0.5)
                        return
    except WebDriverException:
        pass
