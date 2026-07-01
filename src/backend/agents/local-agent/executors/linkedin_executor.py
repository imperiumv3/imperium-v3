"""
executors/linkedin_executor.py
==============================

Dedicated LinkedIn Easy Apply executor.
Handles the full wizard: detect → open modal → fill → next → review → submit.
"""
from __future__ import annotations

import time
from typing import Callable, Dict, Optional

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

from engine.form_engine import (
    fill_fields, fill_choice_controls, scroll_form, scroll_form_to,
    click_next, click_submit, click_review,
)
from engine.resume_manager import upload_resume, resolve_resume_path
from engine.profile_memory import ProfileMemory
from executors.submit_verifier import verify_submission, dismiss_post_submit_modal
from core.logging import log
from core.config import CFG

Emit = Callable[..., None]


def execute_linkedin(
    driver,
    profile: ProfileMemory,
    resume_path: str,
    emit: Emit,
    run_id: str = "",
) -> str:
    """Execute LinkedIn application flow.

    Returns: 'submitted', 'needs_human', or 'awaiting_approval'.
    """
    url = driver.current_url.lower()

    if "/jobs/search" in url or "/jobs/collections" in url:
        if not _pick_first_job(driver, emit, run_id):
            return "needs_human"
        time.sleep(2)

    if "linkedin.com/jobs/view" in url or _has_apply_button(driver):
        return _handle_job_detail(driver, profile, resume_path, emit, run_id)

    return "needs_human"


def _has_apply_button(driver) -> bool:
    """Check if the current page has an Apply/Easy Apply button."""
    try:
        for el in driver.find_elements(By.CSS_SELECTOR, "button, a, [role='button']"):
            try:
                if not el.is_displayed():
                    continue
                txt = (el.text or "").lower()
                label = (el.get_attribute("aria-label") or "").lower()
                if "apply" in txt or "apply" in label:
                    return True
            except WebDriverException:
                continue
    except WebDriverException:
        pass
    return False


def _pick_first_job(driver, emit: Emit, run_id: str = "") -> bool:
    """On a search page, click the first job card."""
    try:
        cards = driver.find_elements(
            By.CSS_SELECTOR,
            "li.jobs-search-results__list-item, div.job-card-container, div.job-card-base",
        )
        cards.sort(key=lambda c: 0 if "easy apply" in (c.text or "").lower() else 1)
        for card in cards[:12]:
            try:
                link = card.find_element(By.CSS_SELECTOR, "a[href*='/jobs/view/']")
                if link.is_displayed():
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", link)
                    time.sleep(0.2)
                    try:
                        link.click()
                    except WebDriverException:
                        driver.execute_script("arguments[0].click();", link)
                    emit("listing", "Opened first job card", level="success")
                    return True
            except WebDriverException:
                continue
    except WebDriverException:
        pass
    emit("listing", "Could not find a job card to click", level="warn")
    return False


def _handle_job_detail(
    driver,
    profile: ProfileMemory,
    resume_path: str,
    emit: Emit,
    run_id: str = "",
) -> str:
    """Handle a LinkedIn job detail page — try Easy Apply first, then external."""
    if _click_easy_apply(driver, emit, run_id):
        return _easy_apply_wizard(driver, profile, resume_path, emit, run_id)

    external = _find_external_apply(driver)
    if external:
        emit("external_apply", f"Navigating to external apply: {external}", level="success", url=external)
        _open_external(driver, external)
        return "needs_human"

    emit("needs_human",
         "No Easy Apply or external apply link found. Finish manually in Chrome, then Approve/Reject.",
         level="warn")
    return "needs_human"


def _click_easy_apply(driver, emit: Emit, run_id: str = "") -> bool:
    """Click the best Easy Apply button and return True if the modal opened.

    LinkedIn's Easy Apply is an <a> tag with href to the apply page.
    We navigate directly to that URL for reliability.
    """
    before_handles = list(driver.window_handles)
    before_url = driver.current_url

    # Try to find the Easy Apply link/button
    apply_el = None
    apply_href = ""

    # Strategy 1: Specific selectors for the real apply button
    for sel in [
        "button[aria-label*='Easy Apply' i]",
        "button[aria-label*='easy apply' i]",
        "button.jobs-apply-button",
        "button[data-control-name='jobdetails_topcard_inapply']",
    ]:
        try:
            for el in driver.find_elements(By.CSS_SELECTOR, sel):
                try:
                    if el.is_displayed() and el.is_enabled():
                        txt = (el.text or "").strip().lower()
                        if len(txt) > 30:
                            continue
                        apply_el = el
                        apply_href = el.get_attribute("href") or ""
                        break
                except:
                    continue
        except:
            pass
        if apply_el:
            break

    # Strategy 2: Scan for Easy Apply <a> tag with href containing /apply/
    if not apply_el:
        try:
            for el in driver.find_elements(By.CSS_SELECTOR, "a[aria-label*='Easy Apply' i], a[aria-label*='easy apply' i]"):
                try:
                    if not el.is_displayed():
                        continue
                    txt = (el.text or "").strip().lower()
                    href = (el.get_attribute("href") or "").lower()
                    if len(txt) > 30:
                        continue
                    if "/apply/" in href or "openSDUIApplyFlow" in href:
                        apply_el = el
                        apply_href = el.get_attribute("href") or ""
                        break
                except:
                    continue
        except:
            pass

    # Strategy 3: Scan all elements
    if not apply_el:
        best = None
        best_score = 0
        try:
            for el in driver.find_elements(By.CSS_SELECTOR, "button, a, [role='button']"):
                try:
                    if not el.is_displayed() or not el.is_enabled():
                        continue
                    txt = (el.text or "").strip().lower()
                    label = (el.get_attribute("aria-label") or "").strip().lower()
                    href = (el.get_attribute("href") or "").lower()
                    tag = el.tag_name.lower()
                    hay = f"{txt} {label}"
                    if "easy apply" not in hay or len(txt) > 30:
                        continue
                    score = (100 if tag == "button" else 50) + (50 if "/apply/" in href else 0)
                    if score > best_score:
                        best_score = score
                        best = el
                        apply_href = el.get_attribute("href") or ""
                except:
                    continue
        except:
            pass
        if best:
            apply_el = best

    if not apply_el:
        emit("easy_apply", "No Easy Apply button found", level="warn")
        return False

    # Navigate to the apply URL — most reliable method for LinkedIn
    if apply_href and "/apply" in apply_href.lower():
        emit("easy_apply", f"Navigating to apply URL", url=apply_href[:100])
        driver.get(apply_href)
    else:
        emit("easy_apply", "Clicking Easy Apply button")
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", apply_el)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", apply_el)

    time.sleep(4)

    # Check for new tab
    try:
        if len(driver.window_handles) > len(before_handles):
            driver.switch_to.window(driver.window_handles[-1])
            emit("external_apply", "Opened external application tab", level="success", url=driver.current_url)
            return False
    except WebDriverException:
        pass

    from automation.form_parser import active_dialog
    if active_dialog(driver):
        emit("easy_apply", "Opened Easy Apply modal", level="success")
        return True

    # Check if URL changed to apply page
    if "/apply" in driver.current_url.lower():
        emit("easy_apply", "On apply page", level="success")
        time.sleep(2)
        if active_dialog(driver):
            return True
        return True  # Apply page loaded, wizard can proceed

    # Check for external apply link
    external = _find_external_apply(driver)
    if external:
        _open_external(driver, external)
        return False

    emit("easy_apply", "Clicked Apply but no modal or apply page detected", level="warn")
    return False


def _click_best_apply_button(driver) -> bool:
    """Click the actual Easy Apply button on the job detail page.

    LinkedIn has two types of "Easy Apply" elements:
    1. The REAL apply button in the job detail topcard (what we want)
    2. Sidebar job card badges showing "Easy Apply" (noise — skip these)

    Strategy: try specific selectors first, then score-based fallback.
    """
    # --- Phase 1: Try known LinkedIn selectors for the real apply button ---
    known_selectors = [
        "button.jobs-apply-button",
        "button[aria-label*='Easy Apply' i]",
        "button[aria-label*='Apply' i][data-control-name*='apply']",
        "button[data-control-name='jobdetails_topcard_inapply']",
        "button[data-control-name='jobs-apply-button']",
        "button.artdeco-button--primary[aria-label*='Apply' i]",
        "section.jobs-unapply-card button",
        "button[aria-label*='Submit application' i]",
    ]
    for sel in known_selectors:
        try:
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
                        return True
                except WebDriverException:
                    continue
        except WebDriverException:
            continue

    # --- Phase 2: XPath for the exact Easy Apply button text ---
    try:
        xp = (
            ".//button[not(@disabled) and not(ancestor::div[contains(@class,'jobs-search') or "
            "contains(@class,'scaffold')]) and "
            "(contains(translate(normalize-space(.),"
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'easy apply') or "
            "contains(translate(normalize-space(.),"
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'apply now'))]"
        )
        for el in driver.find_elements(By.XPATH, xp):
            try:
                if el.is_displayed() and el.is_enabled():
                    txt = (el.text or "").strip().lower()
                    # Reject long text (sidebar job cards have paragraph-length text)
                    if len(txt) > 30:
                        continue
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    time.sleep(0.3)
                    try:
                        el.click()
                    except WebDriverException:
                        driver.execute_script("arguments[0].click();", el)
                    return True
            except WebDriverException:
                continue
    except WebDriverException:
        pass

    # --- Phase 3: Score-based fallback with sidebar filtering ---
    try:
        driver.execute_script("window.scrollTo(0, 0);")
    except WebDriverException:
        pass
    time.sleep(0.4)

    # Identify sidebar elements to exclude
    sidebar_ids = set()
    try:
        for sidebar in driver.find_elements(By.CSS_SELECTOR,
            "div.jobs-search__list, div.scaffold-layout__list, aside, div[role='complementary']"):
            try:
                for child in sidebar.find_elements(By.CSS_SELECTOR, "button, a, [role='button']"):
                    sidebar_ids.add(id(child))
            except WebDriverException:
                continue
    except WebDriverException:
        pass

    candidates = []
    try:
        for el in driver.find_elements(By.CSS_SELECTOR, "button, a, [role='button']"):
            try:
                if not el.is_displayed() or not el.is_enabled():
                    continue
                # Skip sidebar elements
                if id(el) in sidebar_ids:
                    continue
                txt = (el.text or "").strip().lower()
                label = (el.get_attribute("aria-label") or "").strip().lower()
                data = (el.get_attribute("data-control-name") or "").strip().lower()
                cls = (el.get_attribute("class") or "").lower()
                hay = f"{txt} {label} {data} {cls}"

                if "apply" not in hay:
                    continue
                if any(bad in hay for bad in ("saved", "save job", "share", "dismiss")):
                    continue
                # Reject long text (sidebar job cards)
                if len(txt) > 30:
                    continue

                score = 10
                if "easy apply" in hay:
                    score += 100
                if "jobdetails_topcard_inapply" in hay or "jobs-apply-button" in cls:
                    score += 50
                if txt in {"apply", "easy apply"} or label.startswith(("apply", "easy apply")):
                    score += 20
                candidates.append((score, el))
            except WebDriverException:
                continue
    except WebDriverException:
        pass

    candidates.sort(key=lambda item: item[0], reverse=True)
    for _, el in candidates[:3]:
        try:
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
            time.sleep(0.3)
            try:
                el.click()
            except WebDriverException:
                driver.execute_script("arguments[0].click();", el)
            return True
        except WebDriverException:
            continue
    return False


def _find_external_apply(driver) -> str:
    """Scan for an off-site apply link."""
    try:
        anchors = driver.find_elements(
            By.CSS_SELECTOR,
            "a[href^='http'], a[href*='/jobs/view/externalApply/']",
        )
        for a in anchors[:60]:
            try:
                href = (a.get_attribute("href") or "").lower()
                txt = (a.text or "").strip().lower()
                label = (a.get_attribute("aria-label") or "").lower()
                data = (a.get_attribute("data-control-name") or "").lower()

                if "authwall" in href or "share" in href:
                    continue
                if "externalapply" in href:
                    return a.get_attribute("href") or ""
                if ("apply" in txt or "apply" in label or "apply" in data) and "linkedin.com" not in href:
                    return a.get_attribute("href") or ""
            except WebDriverException:
                continue
    except WebDriverException:
        pass
    return ""


def _open_external(driver, url: str) -> None:
    """Open an external URL in a new tab and switch to it."""
    before = list(driver.window_handles)
    try:
        driver.execute_script("window.open(arguments[0], '_blank');", url)
        time.sleep(1.5)
        if len(driver.window_handles) > len(before):
            driver.switch_to.window(driver.window_handles[-1])
        else:
            driver.get(url)
    except WebDriverException:
        try:
            driver.get(url)
        except WebDriverException:
            pass
    time.sleep(2)


def _easy_apply_wizard(
    driver,
    profile: ProfileMemory,
    resume_path: str,
    emit: Emit,
    run_id: str = "",
) -> str:
    """Walk the Easy Apply wizard end-to-end.

    LinkedIn's wizard: Contact Info → Resume → (optional questions) → Review → Submit.
    Each step has a progress bar. We detect advancement by checking the progress
    percentage or section heading change after each Next click.
    """
    from automation.form_parser import active_form_root, active_dialog

    job_context = ""
    try:
        job_context = driver.find_element(By.CSS_SELECTOR, ".jobs-description").text[:2000]
    except WebDriverException:
        pass

    def _get_progress(driver) -> str:
        """Get current wizard progress indicator."""
        try:
            root = active_form_root(driver)
            # LinkedIn shows progress as "25%", "50%", "75%", "100%"
            for el in root.find_elements(By.CSS_SELECTOR, "span, div, progress"):
                txt = (el.text or "").strip()
                if "%" in txt and len(txt) < 10:
                    return txt
        except:
            pass
        return ""

    def _get_section_heading(driver) -> str:
        """Get current section heading text."""
        try:
            root = active_form_root(driver)
            for h in root.find_elements(By.CSS_SELECTOR, "h3, h2, legend, [id*='section']"):
                txt = (h.text or "").strip()
                if txt and "Apply to" not in txt:
                    return txt
        except:
            pass
        return ""

    def _click_linkedin_next(driver, root) -> bool:
        """Click LinkedIn's Next/Continue/Review button with multiple strategies."""
        # Strategy 1: Specific aria-label selectors
        for sel in [
            "button[aria-label='Continue to next step']",
            "button[aria-label*='Continue' i]",
            "button[aria-label*='next step' i]",
            "button[aria-label*='Next' i]",
            "button[aria-label*='Review your application' i]",
            "button[aria-label='Review your application']",
        ]:
            try:
                for el in root.find_elements(By.CSS_SELECTOR, sel):
                    if el.is_displayed() and el.is_enabled():
                        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                        time.sleep(0.3)
                        driver.execute_script("arguments[0].click();", el)
                        return True
            except WebDriverException:
                continue

        # Strategy 2: XPath for Next/Continue text
        try:
            xp = (
                ".//button[not(@disabled) and ("
                "normalize-space(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'))='next' "
                "or normalize-space(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'))='continue' "
                "or contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'continue to next step') "
                "or contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'review your application')"
                ")]"
            )
            for el in root.find_elements(By.XPATH, xp):
                if el.is_displayed() and el.is_enabled():
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    time.sleep(0.3)
                    driver.execute_script("arguments[0].click();", el)
                    return True
        except WebDriverException:
            pass

        # Strategy 3: Find buttons with blue/primary styling at bottom of form
        try:
            for el in root.find_elements(By.CSS_SELECTOR, "button.artdeco-button--primary, button[aria-label*='Next' i]"):
                if el.is_displayed() and el.is_enabled():
                    txt = (el.text or "").strip().lower()
                    if txt in ("next", "continue", "review your application", "submit application"):
                        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                        time.sleep(0.3)
                        driver.execute_script("arguments[0].click();", el)
                        return True
        except WebDriverException:
            pass

        return False

    def _click_linkedin_submit(driver, root) -> bool:
        """Click LinkedIn's Submit Application button."""
        for sel in [
            "button[aria-label*='Submit application' i]",
            "button[aria-label*='Submit' i]",
            "button[data-control-name='submit_unify']",
        ]:
            try:
                for el in root.find_elements(By.CSS_SELECTOR, sel):
                    if el.is_displayed() and el.is_enabled():
                        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                        time.sleep(0.3)
                        driver.execute_script("arguments[0].click();", el)
                        return True
            except WebDriverException:
                continue
        try:
            xp = ".//button[not(@disabled) and contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'submit application')]"
            for el in root.find_elements(By.XPATH, xp):
                if el.is_displayed() and el.is_enabled():
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    time.sleep(0.3)
                    driver.execute_script("arguments[0].click();", el)
                    return True
        except WebDriverException:
            pass
        return False

    prev_heading = ""
    prev_progress = ""
    stuck_rounds = 0

    for step in range(CFG.max_wizard_steps):
        time.sleep(1.5)
        root = active_form_root(driver)

        heading = _get_section_heading(driver)
        progress = _get_progress(driver)
        emit("easy_apply", f"Step {step + 1}: section='{heading}', progress='{progress}'")

        # Fill visible fields
        n = 0
        for pos in ("top", "middle", "bottom"):
            scroll_form_to(driver, root, pos)
            time.sleep(0.4)
            upload_resume(driver, resume_path, run_id=run_id, root=root)
            n += fill_fields(driver, profile, job_context, root=root, emit=emit, run_id=run_id)
            n += fill_choice_controls(driver, profile, job_context, root=root, emit=emit, run_id=run_id)
        scroll_form(driver, root)
        time.sleep(0.3)

        # Try Submit first
        if _click_linkedin_submit(driver, root):
            emit("easy_apply", "Submit clicked", level="success")
            time.sleep(3)
            dismiss_post_submit_modal(driver, run_id=run_id)
            if verify_submission(driver, timeout=5, run_id=run_id):
                emit("submitted", "Application submitted successfully", level="success")
                return "submitted"
            emit("submitted", "Submit clicked — verifying...", level="warn")
            time.sleep(3)
            if verify_submission(driver, timeout=3, run_id=run_id):
                emit("submitted", "Application submitted successfully", level="success")
                return "submitted"
            return "submitted"

        # Try Next
        if _click_linkedin_next(driver, root):
            time.sleep(2)

            # Detect if page actually advanced
            new_heading = _get_section_heading(driver)
            new_progress = _get_progress(driver)

            if new_heading != heading or new_progress != prev_progress:
                stuck_rounds = 0
                prev_heading = new_heading
                prev_progress = new_progress
                continue

            # Page didn't change — wait longer and check again
            time.sleep(2)
            new_heading2 = _get_section_heading(driver)
            new_progress2 = _get_progress(driver)
            if new_heading2 != heading or new_progress2 != prev_progress:
                stuck_rounds = 0
                prev_heading = new_heading2
                prev_progress = new_progress2
                continue

            # Still no change — try clicking again (LinkedIn sometimes needs double-click)
            time.sleep(1)
            if _click_linkedin_next(driver, root):
                time.sleep(2)
                new_heading3 = _get_section_heading(driver)
                if new_heading3 != heading:
                    stuck_rounds = 0
                    prev_heading = new_heading3
                    continue

        stuck_rounds += 1
        if stuck_rounds >= 3:
            emit("easy_apply",
                 "Stuck — page not advancing after 3 attempts. "
                 "A required field may be missing.", level="warn")
            return "needs_human"

        emit("easy_apply", f"Page did not advance — retrying (attempt {stuck_rounds})", level="warn")
        scroll_form(driver, root)
        time.sleep(1)

    emit("easy_apply", "Exceeded max wizard steps", level="warn")
    return "needs_human"
