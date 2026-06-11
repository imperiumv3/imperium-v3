"""
automation/form_parser.py
=========================

Purpose
-------
Read pages and fill generic form fields. Provides a DOM ``page_snapshot``
used by the LLM brain, label-aware field detection, a profile-keyword map
for instant fills, click helpers, and a robust submit-button finder.

Inputs
------
- A live Selenium ``WebDriver``.
- Candidate ``profile`` dict (name, email, phone, etc.).
- An ``emit`` callback for logging.

Outputs
-------
- ``page_snapshot()`` → dict describing the current page.
- ``fill_visible_fields()`` / ``fill_choice_controls()`` → int (fields filled).
- ``find_submit_button()`` → WebElement or ``None``.

Responsibility
--------------
DOM reading + generic form filling. No site-specific flow logic — that
lives in ``workflow_executor.py``.
"""
from __future__ import annotations

import time
from typing import Any, Callable, Dict, List

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    StaleElementReferenceException,
    WebDriverException,
)

from shared.llm_brain import answer_question
from shared.question_bank import answer as rule_answer

Emit = Callable[..., None]


# ---------------- DOM snapshot ----------------

def page_snapshot(driver) -> Dict[str, Any]:
    """Compact snapshot used by the brain to decide what to do."""
    buttons: List[str] = []
    dialog_text = ""
    job_cards = 0
    has_easy_apply_button = False
    try:
        for b in driver.find_elements(By.CSS_SELECTOR, "button, [role=button], a"):
            try:
                if not b.is_displayed():
                    continue
                txt = (b.text or b.get_attribute("aria-label") or "").strip()
                if txt and len(txt) < 80:
                    buttons.append(txt)
                if "easy apply" in txt.lower():
                    has_easy_apply_button = True
            except WebDriverException:
                continue
    except WebDriverException:
        pass
    try:
        job_cards = len(driver.find_elements(
            By.CSS_SELECTOR,
            "li.jobs-search-results__list-item, div.job-card-container, "
            "a[href*='/jobs/view/']",
        ))
    except WebDriverException:
        pass
    try:
        dialogs = driver.find_elements(
            By.CSS_SELECTOR,
            "div[role='dialog'], .artdeco-modal, .jobs-easy-apply-modal",
        )
        for d in dialogs:
            try:
                if d.is_displayed():
                    dialog_text = (d.text or "")[:3000]
                    break
            except WebDriverException:
                continue
    except WebDriverException:
        pass
    inputs = 0
    try:
        inputs = len(driver.find_elements(By.CSS_SELECTOR, "input, textarea, select"))
    except WebDriverException:
        pass
    body_text = ""
    try:
        body_text = driver.find_element(By.TAG_NAME, "body").text or ""
    except WebDriverException:
        pass
    return {
        "url": driver.current_url,
        "title": driver.title,
        "buttons": buttons[:40],
        "input_count": inputs,
        "job_cards": job_cards,
        "has_easy_apply_button": has_easy_apply_button,
        "has_dialog": bool(dialog_text),
        "dialog_text": dialog_text,
        "body_text": body_text[:6000],
    }


def active_dialog(driver):
    try:
        for d in driver.find_elements(
            By.CSS_SELECTOR,
            "div[role='dialog'], .artdeco-modal, .jobs-easy-apply-modal",
        ):
            try:
                if d.is_displayed():
                    return d
            except WebDriverException:
                continue
    except WebDriverException:
        pass
    return None


def active_form_root(driver):
    return active_dialog(driver) or driver


# ---------------- click helpers ----------------

def click_first(driver, selectors: List[str], *, timeout: float = 6, root=None) -> bool:
    end = time.time() + timeout
    while time.time() < end:
        for sel in selectors:
            try:
                els = (root or driver).find_elements(By.CSS_SELECTOR, sel)
                for el in els:
                    try:
                        if not el.is_displayed() or not el.is_enabled():
                            continue
                        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                        time.sleep(0.2)
                        el.click()
                        return True
                    except (ElementClickInterceptedException, WebDriverException):
                        try:
                            driver.execute_script("arguments[0].click();", el)
                            return True
                        except WebDriverException:
                            continue
            except WebDriverException:
                continue
        time.sleep(0.3)
    return False


def click_xpath(driver, xpaths: List[str], *, timeout: float = 6, root=None) -> bool:
    end = time.time() + timeout
    while time.time() < end:
        for xp in xpaths:
            try:
                for el in (root or driver).find_elements(By.XPATH, xp):
                    try:
                        if not el.is_displayed() or not el.is_enabled():
                            continue
                        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                        time.sleep(0.2)
                        try:
                            el.click()
                        except (ElementClickInterceptedException, WebDriverException):
                            driver.execute_script("arguments[0].click();", el)
                        return True
                    except WebDriverException:
                        continue
            except WebDriverException:
                continue
        time.sleep(0.3)
    return False


def find_submit_button(driver, root=None):
    """Find a submit/apply button using many heuristics."""
    candidates = [
        "button[aria-label*='Submit application' i]",
        "button[aria-label*='Submit' i]",
        "button[data-control-name='submit_unify']",
        "button[type='submit']:not([disabled])",
        "input[type='submit']:not([disabled])",
        "button[id*='submit' i]:not([disabled])",
    ]
    for sel in candidates:
        try:
            for el in (root or driver).find_elements(By.CSS_SELECTOR, sel):
                if el.is_displayed() and el.is_enabled():
                    return el
        except WebDriverException:
            continue
    try:
        xp = ("//button[not(@disabled) and "
              "(contains(translate(normalize-space(.),"
              "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'submit application')"
              " or normalize-space(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',"
              "'abcdefghijklmnopqrstuvwxyz'))='submit'"
              " or contains(translate(normalize-space(.),"
              "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'apply now'))]")
        for el in (root or driver).find_elements(By.XPATH, xp):
            if el.is_displayed() and el.is_enabled():
                return el
    except WebDriverException:
        pass
    return None


# ---------------- field filling ----------------

def _looks_like_urn(s: str) -> bool:
    s = (s or "").strip().lower()
    return s.startswith("urn:") or s.startswith("ember") or len(s) > 120


def _label_text(driver, el) -> str:
    # Prefer real label element / aria-label / placeholder before falling
    # back to id/name (which on LinkedIn are URNs like urn:li:fsd_formElement:…).
    try:
        eid = el.get_attribute("id")
        if eid:
            lab = driver.find_elements(By.CSS_SELECTOR, f"label[for='{eid}']")
            if lab:
                txt = (lab[0].text or lab[0].get_attribute("textContent") or "").strip()
                if txt and not _looks_like_urn(txt):
                    return txt
    except WebDriverException:
        pass
    try:
        anc = el.find_element(By.XPATH, "./ancestor::label[1]")
        txt = (anc.text or anc.get_attribute("textContent") or "").strip()
        if txt and not _looks_like_urn(txt):
            return txt
    except WebDriverException:
        pass
    for attr in ("aria-label", "placeholder", "data-test", "data-testid", "name"):
        v = (el.get_attribute(attr) or "").strip()
        if v and not _looks_like_urn(v):
            return v
    return ""


PROFILE_MAP = [
    (("first name", "given name"),               lambda p, n: n["first"]),
    (("last name", "surname", "family name"),    lambda p, n: n["last"]),
    (("full name", "your name", "legal name"),   lambda p, n: p.get("name")),
    (("name",),                                  lambda p, n: p.get("name")),
    (("email", "e-mail"),                        lambda p, n: p.get("email")),
    (("phone", "mobile", "telephone"),           lambda p, n: p.get("phone")),
    (("address",),                               lambda p, n: p.get("location")),
    (("city",),                                  lambda p, n: p.get("location")),
    (("location", "where are you based"),        lambda p, n: p.get("location")),
    (("linkedin",),                              lambda p, n: p.get("linkedin_url") or p.get("linkedin")),
    (("github",),                                lambda p, n: p.get("github_url") or p.get("github")),
    (("portfolio", "website", "personal site"),  lambda p, n: p.get("portfolio_url") or p.get("portfolio")),
    (("headline", "title"),                      lambda p, n: p.get("headline")),
    (("summary", "about you", "cover letter", "tell us"),
                                                  lambda p, n: p.get("summary")),
]


def _direct_profile_value(label: str, profile: Dict[str, Any], name_parts: Dict[str, str]):
    low = label.lower()
    for needles, getter in PROFILE_MAP:
        if any(n in low for n in needles):
            v = getter(profile, name_parts)
            if v:
                return str(v)
    return None


def fill_visible_fields(driver, emit: Emit, profile: Dict[str, Any],
                        job_context: str = "", root=None) -> int:
    """Generic form filler: profile-map first, LLM fallback for unknowns."""
    parts = (profile.get("name") or "").split(" ", 1)
    name_parts = {"first": parts[0] if parts else "",
                  "last":  parts[1] if len(parts) > 1 else ""}

    filled = 0
    elements = (root or driver).find_elements(By.CSS_SELECTOR, "input, textarea, select")
    for el in elements:
        try:
            tag = el.tag_name.lower()
            t = (el.get_attribute("type") or "text").lower()
            if t in {"hidden", "submit", "button", "checkbox", "radio", "file"}:
                continue
            if not el.is_displayed() or not el.is_enabled():
                continue
            if (el.get_attribute("value") or "").strip():
                continue
            label = _label_text(driver, el)
            if not label:
                continue

            if tag == "select":
                options = []
                try:
                    options = [o.text.strip() for o in el.find_elements(By.TAG_NAME, "option") if o.text]
                except WebDriverException:
                    pass
                ans = rule_answer(label, profile, choices=options) \
                    or answer_question(label, profile, job_context, choices=options)
                if not ans:
                    continue
                for o in el.find_elements(By.TAG_NAME, "option"):
                    if (o.text or "").strip().lower() == ans.lower():
                        try:
                            o.click()
                            filled += 1
                            emit("fill", f"Selected '{label}' = {ans}", level="success")
                            break
                        except WebDriverException:
                            pass
                continue

            val = _direct_profile_value(label, profile, name_parts)
            if not val:
                val = rule_answer(label, profile)
            if not val:
                val = answer_question(label, profile, job_context)
            if not val:
                continue
            try:
                el.clear()
            except WebDriverException:
                pass
            el.send_keys(str(val))
            if el.get_attribute("role") == "combobox" or (
                el.get_attribute("aria-autocomplete") or ""
            ).lower() in {"list", "both"}:
                time.sleep(0.6)
                try:
                    el.send_keys(Keys.ARROW_DOWN)
                    el.send_keys(Keys.ENTER)
                except WebDriverException:
                    pass
            filled += 1
            emit("fill", f"Filled '{label[:60]}' = {str(val)[:60]}", level="success")
            time.sleep(0.1)
        except (StaleElementReferenceException, WebDriverException) as exc:
            emit("fill", f"Skipped a field: {exc.__class__.__name__}", level="warn")
    return filled


def fill_choice_controls(driver, emit: Emit, profile: Dict[str, Any],
                         job_context: str = "", root=None) -> int:
    """Fill visible radio groups and safe required checkboxes.

    Re-queries elements per iteration to survive LinkedIn's re-renders, and
    never blindly clicks the first radio when no confident answer exists.
    """
    filled = 0
    seen_radio_names: set = set()

    def _all():
        return (root or driver).find_elements(
            By.CSS_SELECTOR, "input[type='radio'], input[type='checkbox']",
        )

    # Snapshot identities first so a re-render doesn't corrupt iteration.
    identities = []
    for el in _all():
        try:
            identities.append({
                "type": (el.get_attribute("type") or "").lower(),
                "name": el.get_attribute("name") or "",
                "id":   el.get_attribute("id") or "",
            })
        except WebDriverException:
            continue

    for ident in identities:
        try:
            t = ident["type"]
            # Re-find a live element by name+id, skip if gone.
            sel_parts = []
            if ident["name"]:
                sel_parts.append(f"input[type='{t}'][name='{ident['name']}']")
            if ident["id"]:
                sel_parts.append(f"input[type='{t}'][id='{ident['id']}']")
            live = []
            for s in sel_parts:
                try:
                    live = (root or driver).find_elements(By.CSS_SELECTOR, s)
                    if live:
                        break
                except WebDriverException:
                    continue
            if not live:
                continue
            el = live[0]
            if not el.is_enabled() or el.is_selected():
                continue

            label = _label_text(driver, el)
            try:
                question = (el.find_element(By.XPATH, "./ancestor::fieldset[1]").text or label).strip()
            except WebDriverException:
                question = label
            if _looks_like_urn(question):
                question = label
            low = f"{question} {label}".lower()

            if t == "checkbox":
                if any(k in low for k in ("agree", "confirm", "certify", "consent", "acknowledge")):
                    driver.execute_script("arguments[0].click();", el)
                    filled += 1
                    emit("fill", f"Checked '{(label or 'required confirmation')[:60]}'",
                         level="success")
                continue

            name = ident["name"] or question
            if name in seen_radio_names:
                continue
            seen_radio_names.add(name)

            group = (root or driver).find_elements(
                By.CSS_SELECTOR, f"input[type='radio'][name='{ident['name']}']",
            ) if ident["name"] else [el]
            choices = []
            for r in group:
                txt = _label_text(driver, r)
                if not txt or _looks_like_urn(txt):
                    val = (r.get_attribute("value") or "").strip()
                    txt = "" if _looks_like_urn(val) else val
                choices.append(txt)
            clean = [c for c in choices if c]
            if not clean:
                emit("fill", f"Skipped '{(question or 'choice')[:50]}' — no readable options",
                     level="warn")
                continue

            answer = rule_answer(question, profile, choices=clean) \
                or answer_question(question, profile, job_context, choices=clean)
            if not answer:
                emit("fill",
                     f"No confident answer for '{(question or label)[:60]}' — leaving blank",
                     level="warn")
                continue

            target = None
            for r, choice in zip(group, choices):
                if choice and (
                    choice.lower() == answer.lower()
                    or choice.lower() in answer.lower()
                    or answer.lower() in choice.lower()
                ):
                    target = r
                    break
            if not target:
                emit("fill",
                     f"Answer '{answer[:40]}' didn't match options for "
                     f"'{(question or label)[:50]}'", level="warn")
                continue

            driver.execute_script("arguments[0].click();", target)
            filled += 1
            emit("fill", f"Selected '{question[:50]}' = {answer[:40]}", level="success")
            time.sleep(0.3)
        except (StaleElementReferenceException, WebDriverException) as exc:
            emit("fill", f"Skipped a choice: {exc.__class__.__name__}", level="warn")
    return filled
