"""
core/config.py
==============

Centralised configuration. All env-var reads live here so every other
module imports ``CFG`` and never touches ``os.environ`` directly.
"""
from __future__ import annotations

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

_PROJECT_ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Config:
    host: str = "127.0.0.1"
    port: int = 8000
    headless: bool = False
    state_file: Path = field(default_factory=lambda: _PROJECT_ROOT / "storage" / "application_history.json")

    # Chrome
    use_real_chrome: bool = False
    chrome_user_data_dir: str = ""
    chrome_profile_dir: str = "Default"
    chrome_version_main: Optional[int] = None

    # Ollama
    ollama_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen2.5:7b"
    ollama_timeout: float = 30.0

    # Resume
    resume_path: str = ""

    # Agent
    max_concurrent_runs: int = 1
    approval_timeout: float = 600.0
    page_load_timeout: float = 20.0
    max_wizard_steps: int = 20
    max_retries: int = 3
    retry_base_delay: float = 1.0
    retry_max_delay: float = 10.0

    @property
    def project_root(self) -> Path:
        return _PROJECT_ROOT


def _resolve_chrome_user_data_dir(use_real: bool) -> str:
    import sys
    home = Path.home()
    if use_real:
        if os.name == "nt":
            return str(home / "AppData" / "Local" / "Google" / "Chrome" / "User Data")
        elif sys.platform == "darwin":
            return str(home / "Library" / "Application Support" / "Google" / "Chrome")
        else:
            return str(home / ".config" / "google-chrome")
    return str(home / ".imperium_chrome_profile")


def load_config() -> Config:
    use_real = os.environ.get("USE_REAL_CHROME", "0") == "1" or os.environ.get("USE_DEFAULT_CHROME") == "1"
    chrome_dir = os.environ.get("CHROME_USER_DATA_DIR", "")
    if not chrome_dir:
        chrome_dir = _resolve_chrome_user_data_dir(use_real)

    version_str = os.environ.get("CHROME_VERSION_MAIN", "")
    version = int(version_str) if version_str.isdigit() else None

    state_file = os.environ.get("STATE_FILE", "")
    if not state_file:
        state_file = str(_PROJECT_ROOT / "storage" / "application_history.json")

    return Config(
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8000")),
        headless=os.environ.get("HEADLESS", "0") == "1",
        state_file=Path(state_file),
        use_real_chrome=use_real,
        chrome_user_data_dir=chrome_dir,
        chrome_profile_dir=os.environ.get("CHROME_PROFILE_DIR", "Default"),
        chrome_version_main=version,
        ollama_url=os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434"),
        ollama_model=os.environ.get("OLLAMA_MODEL", "qwen2.5:7b"),
        ollama_timeout=float(os.environ.get("OLLAMA_TIMEOUT", "30")),
        resume_path=os.environ.get("RESUME_PATH", ""),
        max_concurrent_runs=int(os.environ.get("MAX_CONCURRENT_RUNS", "1")),
        approval_timeout=float(os.environ.get("APPROVAL_TIMEOUT", "600")),
        page_load_timeout=float(os.environ.get("PAGE_LOAD_TIMEOUT", "20")),
        max_wizard_steps=int(os.environ.get("MAX_WIZARD_STEPS", "20")),
        max_retries=int(os.environ.get("MAX_RETRIES", "3")),
    )


CFG = load_config()
