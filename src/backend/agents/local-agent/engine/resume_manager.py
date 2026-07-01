"""
engine/resume_manager.py
========================

Handles resume file detection, validation, and upload.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from selenium.webdriver.common.by import By
from selenium.common.exceptions import WebDriverException

from core.config import CFG
from core.logging import log


VALID_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".rtf"}


def resolve_resume_path(profile: dict) -> Optional[str]:
    """Find the best resume file path from profile or config."""
    candidates = [
        profile.get("resume_path"),
        profile.get("resume_file"),
        CFG.resume_path,
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            ext = Path(path).suffix.lower()
            if ext in VALID_EXTENSIONS:
                return path
            log.warn(f"Resume file has unsupported extension: {ext}")
    return None


def upload_resume(driver, resume_path: str, run_id: str = "", root=None) -> bool:
    """Upload resume to any visible file input on the page.

    Returns True if upload succeeded.
    """
    if not resume_path or not os.path.isfile(resume_path):
        log.warn(f"Resume file not found: {resume_path}", run_id=run_id, step="upload")
        return False

    try:
        search_root = root or driver
        file_inputs = search_root.find_elements(By.CSS_SELECTOR, "input[type='file']")
        for inp in file_inputs:
            try:
                name = (inp.get_attribute("name") or inp.get_attribute("id") or "").lower()
                accept = (inp.get_attribute("accept") or "").lower()

                if "resume" in name or "cv" in name or "file" in name:
                    inp.send_keys(resume_path)
                    log.info(f"Resume uploaded to input '{name}': {resume_path}", run_id=run_id, step="upload")
                    return True

                if accept and not any(ext in accept for ext in (".pdf", ".docx", ".doc")):
                    continue

                if len(file_inputs) == 1:
                    inp.send_keys(resume_path)
                    log.info(f"Resume uploaded (only file input): {resume_path}", run_id=run_id, step="upload")
                    return True
            except WebDriverException:
                continue

        for inp in file_inputs:
            try:
                inp.send_keys(resume_path)
                log.info(f"Resume uploaded (fallback): {resume_path}", run_id=run_id, step="upload")
                return True
            except WebDriverException:
                continue

    except WebDriverException as exc:
        log.error(f"Resume upload failed: {exc}", run_id=run_id, step="upload")

    log.warn(f"No file input found for resume upload", run_id=run_id, step="upload")
    return False
