"""
shared/artifacts.py
===================

Purpose
-------
Capture screenshots, full DOM HTML, and a small context JSON whenever the
agent gets stuck, errors out, or reaches a terminal state. Lets a human
debug a failed Easy Apply run without needing to reproduce it live.

Inputs
------
- Selenium driver, job_id, label string.

Outputs
-------
- Files under ``storage/runs/{job_id}/``:
    {seq}_{label}.png   screenshot
    {seq}_{label}.html  full page source
    {seq}_{label}.json  url, title, ts, label
- ``list_artifacts(job_id)`` returns the file metadata for the API layer.

Responsibility
--------------
Side-effect IO only. No state mutation, no DOM filling.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from shared.models import STATE_FILE

_RUNS_DIR = STATE_FILE.parent / "runs"


def _run_dir(job_id: str) -> Path:
    p = _RUNS_DIR / job_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def _slug(s: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", (s or "step"))[:40] or "step"


def _next_seq(run_dir: Path) -> int:
    n = 0
    for f in run_dir.glob("*.json"):
        m = re.match(r"(\d+)_", f.name)
        if m:
            n = max(n, int(m.group(1)))
    return n + 1


def capture(driver, job_id: str, label: str = "step") -> Optional[Dict[str, Any]]:
    """Save screenshot + html + meta for the current page. Best-effort —
    swallows all exceptions so capture never breaks the run."""
    if driver is None or not job_id:
        return None
    try:
        run_dir = _run_dir(job_id)
        seq = _next_seq(run_dir)
        stem = f"{seq:03d}_{_slug(label)}"
        png = run_dir / f"{stem}.png"
        html = run_dir / f"{stem}.html"
        meta = run_dir / f"{stem}.json"

        try:
            driver.save_screenshot(str(png))
        except Exception as exc:  # noqa: BLE001
            print(f"[artifacts] screenshot failed: {exc}", file=sys.stderr)

        try:
            html.write_text(driver.page_source or "", encoding="utf-8")
        except Exception as exc:  # noqa: BLE001
            print(f"[artifacts] page_source failed: {exc}", file=sys.stderr)

        url = title = ""
        try:
            url = driver.current_url or ""
            title = driver.title or ""
        except Exception:
            pass

        info = {
            "seq": seq,
            "label": label,
            "ts": datetime.now(timezone.utc).isoformat(),
            "url": url,
            "title": title,
            "png": png.name if png.exists() else None,
            "html": html.name if html.exists() else None,
        }
        meta.write_text(json.dumps(info, indent=2), encoding="utf-8")
        return info
    except Exception as exc:  # noqa: BLE001
        print(f"[artifacts] capture failed: {exc}", file=sys.stderr)
        return None


def list_artifacts(job_id: str) -> List[Dict[str, Any]]:
    p = _RUNS_DIR / job_id
    if not p.exists():
        return []
    items: List[Dict[str, Any]] = []
    for meta in sorted(p.glob("*.json")):
        try:
            items.append(json.loads(meta.read_text("utf-8")))
        except Exception:
            continue
    return items


def artifact_path(job_id: str, filename: str) -> Optional[Path]:
    # prevent directory traversal
    if "/" in filename or ".." in filename or "\\" in filename:
        return None
    p = _RUNS_DIR / job_id / filename
    return p if p.exists() and p.is_file() else None
