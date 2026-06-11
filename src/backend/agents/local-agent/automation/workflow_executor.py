"""
automation/workflow_executor.py
===============================

Purpose
-------
Site-specific flows. Knows how to pick a LinkedIn job card, open Easy Apply,
walk a multi-step wizard, and handle generic ATS forms (Greenhouse, Lever,
Ashby, Workday). Exposes one entrypoint, ``run_adapter(kind, ...)``, that
the orchestrator calls after the page is classified.

Inputs
------
- A ``kind`` label from ``shared.llm_brain.classify_page``.
- Selenium driver, ``emit`` callback, ``profile`` dict.

Outputs
-------
- One of: ``"submitted"``, ``"awaiting_approval"``, ``"needs_human"``.

Responsibility
--------------
Flow orchestration per site. Generic form mechanics live in
``form_parser.py``; resume drops in ``resume_uploader.py``.
"""
from __future__ import annotations

import time
from typing import Any, Callable, Dict

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException, WebDriverException

from automation.form_parser import (
    active_dialog, active_form_root,
    click_first, click_xpath,
    fill_visible_fields, fill_choice_controls,
    find_submit_button,
)
from automation.resume_uploader import maybe_upload_resume

Emit = Callable[..., None]


# ============================================================
#                  LinkedIn Easy Apply
# ============================================================

def linkedin_pick_first_job(driver, emit: Emit) -> bool:
    """On a /jobs/search page, click the first job card (Easy Apply preferred)."""
    before = driver.current_url
    ok = False
    try:
        cards = driver.find_elements(
            By.CSS_SELECTOR,
            "li.jobs-search-results__list-item, div.job-card-container",
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
                    ok = True
                    break
            except WebDriverException:
                continue
    except WebDriverException:
        pass
    if not ok:
        ok = click_first(driver, [
            "li.jobs-search-results__list-item a[href*='/jobs/view/']",
            "div.job-card-container a[href*='/jobs/view/']",
            "a.job-card-list__title",
            "a.job-card-container__link",
            "a[href*='/jobs/view/']",
        ], timeout=8)
    if not ok:
        emit("listing", "Could not find a job card to click", level="warn")
        return False
    emit("listing", "Opened first job card", level="success")
    try:
        WebDriverWait(driver, 10).until(
            lambda d: d.current_url != before
            or d.find_elements(
                By.CSS_SELECTOR,
                "button.jobs-apply-button, button[aria-label*='Easy Apply' i], "
                "button[aria-label*='Apply' i]",
            )
        )
    except TimeoutException:
        pass
    time.sleep(1)
    return True


def _linkedin_find_external_apply_link(driver) -> str:
    """Scan the job detail page for an off-site apply link (fallback when
    LinkedIn renders an <a> instead of a button, or the button is hidden)."""
    try:
        anchors = driver.find_elements(
            By.CSS_SELECTOR,
            "a[href^='http'], a[href*='/jobs/view/externalApply/'], a[href*='/jobs/view/externalapply/']",
        )
    except WebDriverException:
        return ""
    for a in anchors[:60]:
        try:
            txt = (a.text or "").strip().lower()
            label = (a.get_attribute("aria-label") or "").lower()
            data = (a.get_attribute("data-control-name") or "").lower()
            href = a.get_attribute("href") or ""
            href_low = href.lower()
            if "authwall" in href_low or "share" in href_low:
                continue
            if "externalapply" in href_low:
                return href
            if "apply" in txt or "apply" in label or "apply" in data:
                if href.startswith("http") and "linkedin.com" not in href:
                    return href
        except WebDriverException:
            continue
    return ""


def _click_best_linkedin_apply(driver) -> bool:
    """Click the best visible LinkedIn Apply/Easy Apply control on this job page."""
    try:
        driver.execute_script("window.scrollTo(0, 0);")
    except WebDriverException:
        pass
    time.sleep(0.4)
    candidates = []
    try:
        for el in driver.find_elements(By.CSS_SELECTOR, "button, a, [role='button']"):
            try:
                if not el.is_displayed() or not el.is_enabled():
                    continue
                txt = (el.text or "").strip().lower()
                label = (el.get_attribute("aria-label") or "").strip().lower()
                data = (el.get_attribute("data-control-name") or "").strip().lower()
                hay = f"{txt} {label} {data}"
                if "apply" not in hay:
                    continue
                if any(bad in hay for bad in ("saved", "save job", "share", "dismiss")):
                    continue
                score = 10
                if "easy apply" in hay:
                    score += 100
                if "jobdetails_topcard_inapply" in hay or "jobs-apply-button" in (el.get_attribute("class") or ""):
                    score += 50
                if txt in {"apply", "easy apply"} or label.startswith(("apply", "easy apply")):
                    score += 20
                candidates.append((score, el))
            except WebDriverException:
                continue
    except WebDriverException:
        pass
    candidates.sort(key=lambda item: item[0], reverse=True)
    for _, el in candidates[:6]:
        try:
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
            time.sleep(0.2)
            try:
                el.click()
            except WebDriverException:
                driver.execute_script("arguments[0].click();", el)
            return True
        except WebDriverException:
            continue
    return click_first(driver, [
        "button.jobs-apply-button",
        "button[aria-label*='Easy Apply' i]",
        "button[aria-label*='Apply' i]",
        "button[data-control-name='jobdetails_topcard_inapply']",
        "a.jobs-apply-button",
        "a[aria-label*='Apply' i]",
    ], timeout=4) or click_xpath(driver, [
        ".//button[not(@disabled) and contains(translate(normalize-space(.),"
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'apply')]",
        ".//a[contains(translate(normalize-space(.),"
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'apply')]",
    ], timeout=2)


def linkedin_click_easy_apply(driver, emit: Emit) -> bool:
    """Return True only when a real Easy Apply modal opens. For external
    apply jobs, switch into the external tab/page and return False so the
    caller routes into the ATS flow."""
    before_url = driver.current_url
    before_handles = list(driver.window_handles)

    clicked = _click_best_linkedin_apply(driver)

    if clicked:
        time.sleep(2.5)
        try:
            if len(driver.window_handles) > len(before_handles):
                driver.switch_to.window(driver.window_handles[-1])
                emit("external_apply", "Opened external application tab",
                     level="success", url=driver.current_url)
                return False
        except WebDriverException:
            pass
        if active_dialog(driver):
            emit("easy_apply", "Opened Easy Apply modal", level="success")
            return True
        external = _linkedin_find_external_apply_link(driver)
        if external:
            emit("external_apply",
                 f"Apply click exposed external apply link, navigating to {external}",
                 level="success", url=external)
            try:
                driver.get(external)
            except WebDriverException:
                pass
            time.sleep(2)
            return False
        if "linkedin.com" not in driver.current_url or driver.current_url != before_url:
            emit("external_apply", "Opened external application page",
                 level="success", url=driver.current_url)
            return False
        emit("easy_apply", "Clicked Apply, but no modal opened yet", level="warn")
        # fall through to off-site link scan below

    # Fallback: no button matched (or click did nothing) — look for an
    # off-site apply link rendered as an <a>. Common on LinkedIn jobs that
    # delegate to the company's ATS.
    external = _linkedin_find_external_apply_link(driver)
    if external:
        emit("external_apply",
             f"No Easy Apply — found external apply link, navigating to {external}",
             level="success", url=external)
        try:
            driver.execute_script("window.open(arguments[0], '_blank');", external)
            time.sleep(1.5)
            if len(driver.window_handles) > len(before_handles):
                driver.switch_to.window(driver.window_handles[-1])
            else:
                driver.get(external)
        except WebDriverException:
            try:
                driver.get(external)
            except WebDriverException:
                pass
        time.sleep(2)
        return False

    if not clicked:
        emit("easy_apply",
             "No Apply button or external apply link found. Open the job in "
             "Chrome and finish manually, then Approve/Reject.",
             level="warn")
    return False


def _scroll_form(driver, root) -> None:
    """Scroll inside the Easy Apply dialog so lazy-rendered fields show up."""
    try:
        driver.execute_script(
            "var r=arguments[0];"
            "var nodes=[];"
            "if(r){nodes=[r].concat(Array.from(r.querySelectorAll('*')));}"
            "var did=false;"
            "for(var i=0;i<nodes.length;i++){var n=nodes[i];"
            " if(n && n.scrollHeight>n.clientHeight+40){n.scrollTop=n.scrollHeight;did=true;}"
            "}"
            "if(!did){window.scrollTo(0, document.body.scrollHeight);}",
            root if hasattr(root, "tag_name") else None,
        )
    except WebDriverException:
        pass


def _scroll_form_to(driver, root, position: str) -> None:
    """Scroll dialog/page to top, middle, or bottom."""
    ratio = 0 if position == "top" else 0.5 if position == "middle" else 1
    try:
        driver.execute_script(
            "var ratio=arguments[1]; var r=arguments[0];"
            "var nodes=[];"
            "if(r){nodes=[r].concat(Array.from(r.querySelectorAll('*')));}"
            "var did=false;"
            "for(var i=0;i<nodes.length;i++){var n=nodes[i];"
            " if(n && n.scrollHeight>n.clientHeight+40){n.scrollTop=n.scrollHeight*ratio;did=true;}"
            "}"
            "if(!did){window.scrollTo(0, document.body.scrollHeight*ratio);}",
            root if hasattr(root, "tag_name") else None,
            ratio,
        )
    except WebDriverException:
        pass


def _click_submit_and_dismiss(driver, emit: Emit, root) -> bool:
    """Click the Submit button and dismiss the post-submit 'Save app' modal."""
    btn = find_submit_button(driver, root=root) or find_submit_button(driver)
    if not btn:
        return False
    emit("submit", f"Clicking submit: {btn.text or btn.get_attribute('aria-label') or 'button'}",
         level="success")
    try:
        btn.click()
    except WebDriverException:
        driver.execute_script("arguments[0].click();", btn)
    time.sleep(2.5)
    # LinkedIn often shows a "Save this application?" dismiss modal after submit.
    click_first(driver, [
        "button[aria-label='Dismiss']",
        "button[aria-label*='Dismiss' i]",
        "button[aria-label*='Done' i]",
    ], timeout=2)
    return True


def linkedin_easy_apply_loop(driver, emit: Emit, profile: Dict[str, Any],
                             max_steps: int = 14) -> str:
    """Walk the Easy Apply wizard end-to-end: fill -> Next -> ... -> Review -> Submit.

    Fully automatic — never returns 'awaiting_approval'. Returns 'submitted'
    on success, or 'needs_human' only if truly stuck after retries.
    """
    job_context = ""
    try:
        job_context = driver.find_element(By.CSS_SELECTOR, ".jobs-description").text[:2000]
    except WebDriverException:
        pass

    stuck_rounds = 0
    for step in range(max_steps):
        time.sleep(1)
        root = active_form_root(driver)

        # LinkedIn lazy-renders fields while scrolling. Fill top/middle/bottom
        # before trying Next, and leave the dialog at the bottom where buttons live.
        n = 0
        for pos in ("top", "middle", "bottom"):
            _scroll_form_to(driver, root, pos)
            time.sleep(0.35)
            maybe_upload_resume(driver, emit, profile, root=root)
            n += fill_visible_fields(driver, emit, profile, job_context, root=root)
            n += fill_choice_controls(driver, emit, profile, job_context, root=root)
        _scroll_form(driver, root)
        time.sleep(0.3)
        emit("easy_apply", f"Step {step+1}: filled {n} field(s)")

        # 1) Submit if visible (last step) — fully automatic.
        if _click_submit_and_dismiss(driver, emit, root):
            emit("submitted", "Application submitted", level="success")
            return "submitted"

        # 2) Review → click, then loop again so next iteration finds Submit.
        if click_first(driver, [
            "button[aria-label*='Review your application' i]",
            "button[aria-label='Review your application']",
        ], timeout=2, root=root) or click_xpath(driver, [
            ".//button[not(@disabled) and contains(translate(normalize-space(.),"
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'review')]",
        ], timeout=1, root=root):
            emit("easy_apply", "Reached Review step — proceeding to submit", level="success")
            time.sleep(1.5)
            continue

        # 3) Otherwise Next / Continue.
        moved = click_first(driver, [
            "button[aria-label='Continue to next step']",
            "button[aria-label*='Continue' i]",
            "button[aria-label*='next step' i]",
            "button[aria-label*='Next' i]",
        ], timeout=3, root=root) or click_xpath(driver, [
            ".//button[not(@disabled) and (normalize-space(translate(.,"
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'))='next' "
            "or contains(translate(normalize-space(.),"
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'continue'))]",
        ], timeout=1, root=root)

        if moved:
            stuck_rounds = 0
            time.sleep(1.2)
            continue

        # No Next/Review/Submit found. Try once more with a scroll, then bail.
        stuck_rounds += 1
        if stuck_rounds >= 2:
            emit("easy_apply",
                 "Stuck — no Next/Review/Submit visible after retry. "
                 "A required field is probably missing.", level="warn")
            return "needs_human"
        emit("easy_apply", "No Next button visible — scrolling and retrying", level="warn")
        _scroll_form(driver, root)
        time.sleep(1)

    emit("easy_apply", "Exceeded max wizard steps", level="warn")
    return "needs_human"


# ============================================================
#                  External ATS handlers
# ============================================================

def external_form_flow(driver, emit: Emit, profile: Dict[str, Any]) -> str:
    """Generic Greenhouse / Lever / Ashby / Workday handler. Fully automatic."""
    time.sleep(1.5)
    click_first(driver, [
        "a.postings-btn[href*='apply']",         # Lever
        "a#apply_button",                        # Greenhouse
        "button[data-source='apply_button']",
    ], timeout=2)
    time.sleep(1)

    job_context = ""
    try:
        job_context = driver.find_element(By.TAG_NAME, "body").text[:3000]
    except WebDriverException:
        pass

    # Multiple passes: scroll, upload, fill, then try submit.
    total = 0
    for pass_idx in range(3):
        try:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        except WebDriverException:
            pass
        time.sleep(0.5)
        maybe_upload_resume(driver, emit, profile)
        total += fill_visible_fields(driver, emit, profile, job_context)
        total += fill_choice_controls(driver, emit, profile, job_context)
        try:
            driver.execute_script("window.scrollTo(0, 0);")
        except WebDriverException:
            pass
        time.sleep(0.3)

    host = driver.current_url.split("/")[2] if "://" in driver.current_url else "site"
    emit("external", f"Filled {total} field(s) on {host}",
         level="success" if total else "warn")

    btn = find_submit_button(driver)
    if btn:
        emit("submit", f"Clicking submit on {host}", level="success")
        try:
            btn.click()
        except WebDriverException:
            driver.execute_script("arguments[0].click();", btn)
        time.sleep(3)
        emit("submitted", "Application submitted", level="success")
        return "submitted"

    emit("external", "Filled form but no Submit button visible", level="warn")
    return "needs_human"


# ============================================================
#                        dispatch
# ============================================================

def run_adapter(kind: str, driver, emit: Emit, profile: Dict[str, Any]) -> str:
    if kind == "job_listing":
        if linkedin_pick_first_job(driver, emit):
            try:
                WebDriverWait(driver, 10).until(
                    lambda d: "/jobs/view/" in d.current_url
                    or d.find_elements(
                        By.CSS_SELECTOR,
                        "button.jobs-apply-button, button[aria-label*='Easy Apply' i], "
                        "button[aria-label*='Apply' i]",
                    )
                )
            except TimeoutException:
                emit("listing", "Job opened, but Apply button did not appear yet", level="warn")
            kind = "job_detail"
        else:
            return "needs_human"

    if kind == "job_detail":
        if "linkedin.com" in driver.current_url:
            if linkedin_click_easy_apply(driver, emit):
                return linkedin_easy_apply_loop(driver, emit, profile)
            # Easy Apply didn't open. Switch to any new tab, and if we
            # ended up off LinkedIn, treat it as an external ATS flow.
            try:
                if len(driver.window_handles) > 1:
                    driver.switch_to.window(driver.window_handles[-1])
            except WebDriverException:
                pass
            if "linkedin.com" not in driver.current_url:
                emit("external_apply",
                     f"Routing into external ATS at {driver.current_url}",
                     level="info", url=driver.current_url)
                return external_form_flow(driver, emit, profile)
            emit("external_apply",
                 "This job has no Easy Apply and no detectable external "
                 "link. Finish the application in Chrome, then click "
                 "Approve to mark it submitted or Reject to skip.",
                 level="warn", url=driver.current_url)
            return "needs_human"
        return external_form_flow(driver, emit, profile)

    if kind == "easy_apply_step":
        return linkedin_easy_apply_loop(driver, emit, profile)

    if kind in ("external_form", "resume_upload"):
        return external_form_flow(driver, emit, profile)

    if kind == "login_wall":
        emit("login", "Login wall detected — please sign in inside the Chrome window, "
             "then re-run the job. Your session will persist.", level="warn")
        return "needs_human"

    if kind == "captcha":
        emit("captcha", "Captcha detected — solve it manually in the Chrome window, "
             "then approve.", level="warn")
        return "needs_human"

    if kind == "success":
        emit("done", "Application already submitted", level="success")
        return "submitted"

    emit("unknown", f"Unhandled page kind: {kind}", level="warn")
    return "needs_human"
