"""
shared/models.py
================

Legacy compatibility shim. All state management now lives in
``tracking/run_tracker.py``. This file re-exports the public API
so existing imports continue to work.
"""
from tracking.run_tracker import (  # noqa: F401
    RUNS,
    load_state,
    save_state,
    new_run,
    update,
    emit,
    get_run,
    get_all_runs,
    get_events,
    force_save,
)
from core.config import CFG  # noqa: F401

STATE_FILE = CFG.state_file
