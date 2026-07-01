"""
engine/form_engine.py
=====================

Generic multi-step form engine. Fills fields, handles choice controls,
scrolls forms, clicks Next/Continue, and detects Submit.
"""
from __future__ import annotations

import time
from typing import Any, Callable, Dict, List, Optional, Tuple

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    StaleElementReferenceException,
    WebDriverException,
)

from engine.question_engine import answer_question
from engine.profile_memory import ProfileMemory
from core.logging import log

Emit = Callable[..., None]


def fill_fields(
    driver,
    profile: ProfileMemory,
    job_context: str = "",
    root=None,
    emit: Optional[Emit] = None,
    run_id: str = "",
) -> int:
    """Fill all visible input/textarea/select fields. Returns count filled."""
    filled = 0
    search_root = root or driver
    elements = search_root.find_elements(By.CSS_SELECTOR, "input, textarea, select")

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
                    options = [o.text.strip() for o in el.find_elements(By.TAG_NAME, "option") if o.text.strip()]
                except WebDriverException:
                    pass
                ans = answer_question(label, profile, job_context, choices=options, run_id=run_id)
                if not ans:
                    continue
                for o in el.find_elements(By.TAG_NAME, "option"):
                    if (o.text or "").strip().lower() == ans.lower():
                        try:
                            o.click()
                            filled += 1
                            if emit:
                                emit("fill", f"Selected '{label[:60]}' = {ans[:60]}", level="success")
                            break
                        except WebDriverException:
                            pass
                continue

            val = profile.match_field(label)
            if not val:
                val = answer_question(label, profile, job_context, run_id=run_id)
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
            if emit:
                emit("fill", f"Filled '{label[:60]}' = {str(val)[:60]}", level="success")
            time.sleep(0.1)
        except (StaleElementReferenceException, WebDriverException):
            continue

    return filled


def fill_choice_controls(
    driver,
    profile: ProfileMemory,
    job_context: str = "",
    root=None,
    emit: Optional[Emit] = None,
    run_id: str = "",
) -> int:
    """Fill visible radio groups and safe required checkboxes."""
    filled = 0
    seen_radio_names: set = set()
    search_root = root or driver

    for el in search_root.find_elements(By.CSS_SELECTOR, "input[type='radio'], input[type='checkbox']"):
        try:
            t = (el.get_attribute("type") or "").lower()
            if not el.is_enabled() or el.is_selected():
                continue

            label = _label_text(driver, el)
            try:
                label = (el.find_element(By.XPATH, "./ancestor::label[1]").text or label).strip()
            except WebDriverException:
                pass

            try:
                question = (el.find_element(By.XPATH, "./ancestor::fieldset[1]").text or label).strip()
            except WebDriverException:
                question = label

            low = f"{question} {label}".lower()

            if t == "checkbox":
                if any(k in low for k in ("agree", "confirm", "certify", "consent", "acknowledge", "at least 18")):
                    driver.execute_script("arguments[0].click();", el)
                    filled += 1
                    if emit:
                        emit("fill", f"Checked '{label[:60] or 'required confirmation'}'", level="success")
                continue

            name = el.get_attribute("name") or question
            if name in seen_radio_names:
                continue

            group = search_root.find_elements(
                By.CSS_SELECTOR, f"input[type='radio'][name='{name}']",
            ) if el.get_attribute("name") else [el]

            choices = []
            for r in group:
                txt = _label_text(driver, r)
                try:
                    txt = (r.find_element(By.XPATH, "./ancestor::label[1]").text or txt).strip()
                except WebDriverException:
                    pass
                choices.append(txt or (r.get_attribute("value") or ""))

            answer = answer_question(question, profile, job_context,
                                     choices=[c for c in choices if c], run_id=run_id)

            target = None
            if answer:
                for r, choice in zip(group, choices):
                    if choice and (
                        choice.lower() == answer.lower()
                        or choice.lower() in answer.lower()
                        or answer.lower() in choice.lower()
                    ):
                        target = r
                        break
            target = target or group[0]

            driver.execute_script("arguments[0].click();", target)
            seen_radio_names.add(name)
            filled += 1
            if emit:
                emit("fill", f"Selected '{question[:50]}' = {(answer or choices[0] or 'option')[:40]}", level="success")
        except (StaleElementReferenceException, WebDriverException):
            continue

    return filled


def click_next(driver, root=None, emit: Optional[Emit] = None, timeout: float = 5) -> bool:
    """Click the Next/Continue button. Returns True if clicked."""
    search_root = root or driver
    selectors = [
        "button[aria-label='Continue to next step']",
        "button[aria-label*='Continue' i]",
        "button[aria-label*='next step' i]",
        "button[aria-label*='Next' i]",
        "button[aria-label*='continue' i]",
        "button[aria-label='Save and continue']",
    ]
    xpaths = [
        ".//button[not(@disabled) and (normalize-space(translate(.,"
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'))='next' "
        "or normalize-space(translate(.,"
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'))='continue' "
        "or contains(translate(normalize-space(.),"
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'continue'))]",
    ]

    if _click_matching(driver, selectors, xpaths, search_root, timeout):
        if emit:
            emit("next", "Clicked Next/Continue", level="success")
        return True
    return False


def click_submit(driver, root=None, emit: Optional[Emit] = None, timeout: float = 5) -> bool:
    """Click the Submit button. Returns True if clicked."""
    search_root = root or driver
    selectors = [
        "button[aria-label*='Submit application' i]",
        "button[aria-label*='Submit' i]",
        "button[data-control-name='submit_unify']",
        "button[type='submit']:not([disabled])",
        "input[type='submit']:not([disabled])",
        "button[id*='submit' i]:not([disabled])",
        "button[aria-label*='Apply now' i]",
        "button[aria-label*='Submit & continue' i]",
    ]
    xpaths = [
        ".//button[not(@disabled) and "
        "(contains(translate(normalize-space(.),"
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'submit application')"
        " or normalize-space(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',"
        "'abcdefghijklmnopqrstuvwxyz'))='submit'"
        " or contains(translate(normalize-space(.),"
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'apply now'"
        " or contains(translate(normalize-space(.),"
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'apply'))]",
    ]

    if _click_matching(driver, selectors, xpaths, search_root, timeout):
        if emit:
            emit("submit", "Clicked Submit", level="success")
        return True
    return False


def click_review(driver, root=None, emit: Optional[Emit] = None, timeout: float = 3) -> bool:
    """Click the Review button. Returns True if clicked."""
    search_root = root or driver
    selectors = [
        "button[aria-label*='Review your application' i]",
        "button[aria-label='Review your application']",
    ]
    xpaths = [
        ".//button[not(@disabled) and contains(translate(normalize-space(.),"
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'review')]",
    ]

    if _click_matching(driver, selectors, xpaths, search_root, timeout):
        if emit:
            emit("review", "Clicked Review", level="success")
        return True
    return False


def scroll_form(driver, root) -> None:
    """Scroll inside dialog/page to reveal lazy-rendered fields."""
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


def scroll_form_to(driver, root, position: str) -> None:
    """Scroll to top, middle, or bottom."""
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


def _click_matching(
    driver, selectors: List[str], xpaths: List[str], root, timeout: float
) -> bool:
    """Try CSS selectors first, then XPath, with retries up to timeout."""
    end = time.time() + timeout
    while time.time() < end:
        for sel in selectors:
            try:
                els = root.find_elements(By.CSS_SELECTOR, sel)
                for el in els:
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

        for xp in xpaths:
            try:
                for el in root.find_elements(By.XPATH, xp):
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


def _label_text(driver, el) -> str:
    """Extract the best label text from an element."""
    for attr in ("aria-label", "placeholder", "name", "id", "data-test", "data-testid"):
        v = el.get_attribute(attr) or ""
        if v.strip():
            return v.strip()
    try:
        eid = el.get_attribute("id")
        if eid:
            labs = driver.find_elements(By.CSS_SELECTOR, f"label[for='{eid}']")
            if labs and labs[0].text:
                return labs[0].text.strip()
    except WebDriverException:
        pass
    try:
        return (el.find_element(By.XPATH, "./ancestor::label[1]").text or "").strip()
    except WebDriverException:
        return ""
