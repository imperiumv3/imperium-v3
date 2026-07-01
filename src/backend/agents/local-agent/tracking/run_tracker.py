"""
tracking/run_tracker.py
=======================

Single source of truth for run records and event logging.
Persists state to disk so runs survive restarts.
"""
from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from core.config import CFG
from core.logging import log


_lock = threading.RLock()
RUNS: Dict[str, Dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_state() -> None:
    """Read previous runs from disk."""
    state_file = CFG.state_file
    if not state_file.exists():
        return
    try:
        data = json.loads(state_file.read_text("utf-8"))
        if isinstance(data, dict):
            RUNS.update(data)
            log.info(f"Restored {len(RUNS)} runs from {state_file}")
    except Exception as exc:
        log.error(f"Could not read state file: {exc}")


def save_state() -> None:
    try:
        CFG.state_file.parent.mkdir(parents=True, exist_ok=True)
        CFG.state_file.write_text(json.dumps(RUNS, indent=2), "utf-8")
    except Exception as exc:
        log.error(f"Could not write state file: {exc}")


def new_run(job_url: str, profile: Dict[str, Any], resume_path: str = "") -> str:
    job_id = str(uuid.uuid4())
    with _lock:
        RUNS[job_id] = {
            "id": job_id,
            "job_url": job_url,
            "profile": profile,
            "resume_path": resume_path,
            "platform": "",
            "status": "queued",
            "progress": 0,
            "current_step": "queued",
            "current_action": "Waiting to start",
            "current_url": "",
            "approved": None,
            "error": "",
            "error_code": "",
            "result": None,
            "created_at": _now(),
            "updated_at": _now(),
            "events": [],
        }
        _debounced_save()
    log.info(f"New run created: {job_id[:8]} for {job_url}", run_id=job_id, step="queued")
    return job_id


def update(job_id: str, **fields: Any) -> None:
    with _lock:
        run = RUNS.get(job_id)
        if not run:
            return
        run.update(fields)
        run["updated_at"] = _now()
        _debounced_save()


def emit(job_id: str, step: str, action: str, *, level: str = "info", url: str = "") -> None:
    with _lock:
        run = RUNS.get(job_id)
        if run is None:
            return
        run["events"].append({
            "ts": _now(),
            "step": step,
            "action": action,
            "level": level,
            "url": url,
        })
        run["updated_at"] = _now()
        _debounced_save()

    log_fn = getattr(log, level, log.info)
    log_fn(action, run_id=job_id, step=step, url=url)


_save_timer: Optional[threading.Timer] = None
_last_save = 0.0


def _debounced_save() -> None:
    """Save state at most once every 2 seconds to avoid disk thrashing."""
    global _save_timer
    if _save_timer is not None and _save_timer.is_alive():
        return
    _save_timer = threading.Timer(2.0, _do_save)
    _save_timer.daemon = True
    _save_timer.start()


def _do_save() -> None:
    with _lock:
        save_state()


def force_save() -> None:
    """Immediately persist state (used on shutdown)."""
    with _lock:
        save_state()


def get_run(job_id: str) -> Optional[Dict[str, Any]]:
    return RUNS.get(job_id)


def get_all_runs() -> List[Dict[str, Any]]:
    items = sorted(RUNS.values(), key=lambda r: r.get("created_at", ""), reverse=True)
    return [{k: v for k, v in r.items() if k != "events"} for r in items]


def get_events(job_id: str) -> Optional[Dict[str, Any]]:
    run = RUNS.get(job_id)
    if not run:
        return None
    return {
        "events": run["events"],
        "status": run["status"],
        "progress": run["progress"],
    }
