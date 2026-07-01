"""
browser/browser_manager.py
==========================

Owns Chrome lifecycle. Two launch strategies that auto-fallback:

  Strategy 1 — undetected_chromedriver (stealth, patches driver binary)
  Strategy 2 — regular chromedriver via Selenium (reliable fallback)

If UC fails (patching issue, connection timeout), the agent automatically
falls back to regular chromedriver with a separate isolated profile.
"""
from __future__ import annotations

import glob
import os
import re
import sys
import subprocess
import time
from pathlib import Path
from typing import Optional, Tuple

from core.config import CFG
from core.logging import log
from core.errors import AgentError, ErrorCode

try:
    import undetected_chromedriver as uc
    UC_OK = True
except ImportError:
    uc = None  # type: ignore
    UC_OK = False

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options as SeleniumOptions
    from selenium.webdriver.chrome.service import Service as SeleniumService
    SELENIUM_OK = True
except ImportError:
    SELENIUM_OK = False

SELENIUM_OK = SELENIUM_OK or UC_OK

# Two separate profile dirs — one for UC, one for fallback chromedriver
_UC_PROFILE = str(Path.home() / ".imperium_chrome_profile_uc")
_FB_PROFILE = str(Path.home() / ".imperium_chrome_profile_fb")


def _clear_singleton_locks(user_data_dir: str) -> None:
    """Remove stale Chrome lock files recursively."""
    try:
        base = Path(user_data_dir)
        if not base.exists():
            base.mkdir(parents=True, exist_ok=True)
            return
        for lock in ("SingletonLock", "SingletonCookie", "SingletonSocket"):
            for p in base.rglob(lock):
                try:
                    p.unlink()
                except Exception:
                    pass
    except Exception:
        pass


def _find_chrome_executable() -> Optional[str]:
    """Find chrome.exe on this system."""
    if os.name != "nt":
        if sys.platform == "darwin":
            p = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            return p if os.path.isfile(p) else None
        for cmd in ("google-chrome", "google-chrome-stable", "chromium-browser"):
            import shutil
            found = shutil.which(cmd)
            if found:
                return found
        return None

    candidates = []
    for env_key in ("PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMW6432"):
        pf = os.environ.get(env_key, "")
        if pf:
            candidates.append(Path(pf) / "Google" / "Chrome" / "Application" / "chrome.exe")
    local = os.environ.get("LOCALAPPDATA", "")
    if local:
        candidates.append(Path(local) / "Google" / "Chrome" / "Application" / "chrome.exe")
    candidates.append(Path.home() / "AppData" / "Local" / "Google" / "Chrome" / "Application" / "chrome.exe")
    for p in candidates:
        if p.exists():
            return str(p)
    for chrome_path in glob.glob("C:\\Program Files*\\Google\\Chrome\\Application\\chrome.exe"):
        if os.path.isfile(chrome_path):
            return chrome_path
    return None


def _detect_chrome_version() -> Optional[int]:
    """Auto-detect Chrome major version via registry, filesystem, or CLI."""
    # Registry (works even when Chrome is running)
    try:
        import winreg
        for hive in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            try:
                key = winreg.OpenKey(hive, r"SOFTWARE\Google\Chrome\BLBeacon")
                version, _ = winreg.QueryValueEx(key, "version")
                winreg.CloseKey(key)
                major = str(version).split(".")[0]
                if major.isdigit():
                    return int(major)
            except (OSError, FileNotFoundError):
                continue
    except ImportError:
        pass

    # Filesystem — scan version dirs next to chrome.exe
    chrome_exe = _find_chrome_executable()
    if chrome_exe and os.path.isfile(chrome_exe):
        chrome_dir = Path(chrome_exe).parent
        try:
            for ver_dir in sorted(chrome_dir.iterdir(), reverse=True):
                if ver_dir.is_dir() and re.match(r"\d+\.\d+\.\d+\.\d+", ver_dir.name):
                    major = ver_dir.name.split(".")[0]
                    if major.isdigit():
                        return int(major)
        except Exception:
            pass

    # CLI (only works when Chrome is NOT running)
    if chrome_exe and os.path.isfile(chrome_exe):
        try:
            output = subprocess.check_output(
                [chrome_exe, "--version"], stderr=subprocess.DEVNULL, timeout=5,
            )
            m = re.search(r"(\d+)\.", output.decode("utf-8", errors="ignore"))
            if m:
                return int(m.group(1))
        except Exception:
            pass

    # wmic fallback
    if chrome_exe and os.name == "nt":
        try:
            escaped = chrome_exe.replace("\\", "\\\\")
            output = subprocess.check_output(
                f'wmic datafile where name="{escaped}" get Version /value',
                shell=True, stderr=subprocess.DEVNULL, timeout=10,
            )
            m = re.search(r"Version=(\d+)\.", output.decode("utf-8", errors="ignore"))
            if m:
                return int(m.group(1))
        except Exception:
            pass

    return None


def _build_common_opts(headless: bool = False) -> list:
    """Chrome flags shared by both strategies."""
    opts = []
    if headless:
        opts.append("--headless=new")
    opts.extend([
        "--window-size=1280,860",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-popup-blocking",
        "--disable-notifications",
        "--disable-extensions",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
    ])
    return opts


# ================================================================
#  Strategy 1 — undetected_chromedriver (stealth)
# ================================================================

def _launch_uc(version_main: Optional[int], user_data_dir: str) -> Tuple[object, str]:
    """Launch Chrome via undetected_chromedriver."""
    if not UC_OK or uc is None:
        raise RuntimeError("undetected_chromedriver not installed")

    opts = uc.ChromeOptions()
    for arg in _build_common_opts(CFG.headless):
        opts.add_argument(arg)
    opts.add_argument(f"--user-data-dir={user_data_dir}")
    opts.add_argument("--profile-directory=Default")

    kwargs: dict = {"options": opts, "use_subprocess": True}
    if version_main:
        kwargs["version_main"] = version_main

    driver = uc.Chrome(**kwargs)
    desc = f"undetected-chromedriver | profile={user_data_dir}"
    return driver, desc


# ================================================================
#  Strategy 2 — regular chromedriver (reliable fallback)
# ================================================================

def _find_chromedriver() -> Optional[str]:
    """Find a usable chromedriver executable."""
    import shutil

    # 1. Check PATH
    found = shutil.which("chromedriver")
    if found:
        return found

    # 2. Check webdriver-manager cache
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        path = ChromeDriverManager().install()
        if path and os.path.isfile(path):
            return path
    except Exception:
        pass

    # 3. Check common locations
    for p in [
        Path.home() / "AppData" / "Local" / "undetected_chromedriver" / "chromedriver.exe",
        Path("C:/Program Files/chromedriver/chromedriver.exe"),
        Path("C:/chromedriver/chromedriver.exe"),
    ]:
        if p.exists():
            return str(p)

    return None


def _launch_selenium(version_main: Optional[int], user_data_dir: str) -> Tuple[object, str]:
    """Launch Chrome via regular Selenium chromedriver."""
    if not SELENIUM_OK:
        raise RuntimeError("selenium not installed")

    opts = SeleniumOptions()
    for arg in _build_common_opts(CFG.headless):
        opts.add_argument(arg)
    opts.add_argument(f"--user-data-dir={user_data_dir}")
    opts.add_argument("--profile-directory=Default")

    # Try to find chromedriver
    chromedriver_path = _find_chromedriver()
    if chromedriver_path:
        log.info(f"Using chromedriver at: {chromedriver_path}")
        service = SeleniumService(executable_path=chromedriver_path)
        driver = webdriver.Chrome(service=service, options=opts)
    else:
        log.info("No explicit chromedriver found, using selenium-manager auto-detect")
        driver = webdriver.Chrome(options=opts)

    desc = f"selenium-chromedriver | profile={user_data_dir}"
    return driver, desc


# ================================================================
#  Public API
# ================================================================

def build_driver() -> Tuple[object, str]:
    """Launch Chrome with automatic fallback.

    Strategy 1: undetected_chromedriver (stealth)
    Strategy 2: regular chromedriver (reliable fallback)

    Each strategy uses its own isolated profile directory so a failure
    in one doesn't lock the other.
    """
    if not SELENIUM_OK:
        raise AgentError(
            ErrorCode.SELENIUM_NOT_INSTALLED,
            "Neither selenium nor undetected-chromedriver is installed. "
            "Run: pip install -r requirements.txt",
            recoverable=False,
        )

    version_main = CFG.chrome_version_main
    if version_main is None:
        version_main = _detect_chrome_version()
        if version_main:
            log.info(f"Auto-detected Chrome version: {version_main}")
        else:
            log.warn("Could not auto-detect Chrome version")

    # --- Strategy 1: undetected_chromedriver ---
    if UC_OK:
        uc_profile = _UC_PROFILE
        _clear_singleton_locks(uc_profile)
        for attempt in range(2):
            try:
                log.info(f"[strategy-1] Launching undetected-chromedriver (attempt {attempt+1}/2)")
                driver, desc = _launch_uc(version_main, uc_profile)
                log.info(f"[strategy-1] Chrome launched successfully via UC")
                return driver, desc
            except Exception as exc:
                msg = str(exc).lower()
                log.warn(f"[strategy-1] Attempt {attempt+1} failed: {exc}")
                if attempt == 0:
                    _clear_singleton_locks(uc_profile)
                    time.sleep(2)

        log.warn("[strategy-1] UC failed, falling back to regular chromedriver")

    # --- Strategy 2: regular chromedriver ---
    fb_profile = _FB_PROFILE
    _clear_singleton_locks(fb_profile)
    for attempt in range(2):
        try:
            log.info(f"[strategy-2] Launching regular chromedriver (attempt {attempt+1}/2)")
            driver, desc = _launch_selenium(version_main, fb_profile)
            log.info(f"[strategy-2] Chrome launched successfully via regular chromedriver")
            return driver, desc
        except Exception as exc:
            log.warn(f"[strategy-2] Attempt {attempt+1} failed: {exc}")
            if attempt == 0:
                _clear_singleton_locks(fb_profile)
                time.sleep(2)

    # Both strategies failed
    raise AgentError(
        ErrorCode.CHROME_LAUNCH_FAILED,
        "Both undetected-chromedriver and regular chromedriver failed to launch Chrome. "
        "Try: 1) Close all Chrome windows, 2) Delete ~/.imperium_chrome_profile_* dirs, "
        "3) Ensure Chrome is installed.",
        recoverable=False,
    )
