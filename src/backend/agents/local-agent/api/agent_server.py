"""
api/agent_server.py
==================

HTTP server exposing the local agent on http://127.0.0.1:8000.
Routes incoming requests to the orchestrator and shared run registry.
"""
from __future__ import annotations

import base64
import json
import os
import signal
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict
from urllib.parse import urlparse

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from core.config import CFG
from core.logging import log, setup_logging
from core.concurrency import browser_semaphore
from tracking import run_tracker as models
from browser.browser_manager import SELENIUM_OK
from agents.automation_agent import run_job


class Handler(BaseHTTPRequestHandler):
    server_version = "ImperiumLocalAgent/5.0"

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _cors_headers(self) -> Dict[str, str]:
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Vary": "Origin",
        }
        if self.headers.get("Access-Control-Request-Private-Network") == "true":
            headers["Access-Control-Allow-Private-Network"] = "true"
            headers["Vary"] = "Origin, Access-Control-Request-Private-Network"
        return headers

    def _send_json(self, status: int, payload: Any) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for k, v in self._cors_headers().items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except Exception:
            return {}
        return data if isinstance(data, dict) else {}

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        for k, v in self._cors_headers().items():
            self.send_header(k, v)
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"

        if path == "/health":
            return self._send_json(200, {
                "ok": True,
                "selenium": SELENIUM_OK,
                "headless": CFG.headless,
                "runs": len(models.RUNS),
                "version": "5.0.0",
            })

        if path == "/runs":
            return self._send_json(200, models.get_all_runs())

        if path.startswith("/status/"):
            job_id = path[len("/status/"):]
            run = models.get_run(job_id)
            if not run:
                return self._send_json(404, {"error": "job not found"})
            return self._send_json(200, run)

        if path.startswith("/events/"):
            job_id = path[len("/events/"):]
            events = models.get_events(job_id)
            if not events:
                return self._send_json(404, {"error": "job not found"})
            return self._send_json(200, events)

        self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"
        body = self._read_json()

        if path == "/apply":
            job_url = (body.get("job_url") or "").strip()
            if len(job_url) < 4:
                return self._send_json(400, {"error": "job_url is required"})
            profile = body.get("profile") or {}
            if not isinstance(profile, dict):
                return self._send_json(400, {"error": "profile must be an object"})
            resume_path = body.get("resume_path") or ""
            if not resume_path and CFG.resume_path:
                resume_path = CFG.resume_path
            if not resume_path and os.environ.get("RESUME_PATH"):
                resume_path = os.environ["RESUME_PATH"]

            # Handle resume PDF sent as base64 from the frontend
            resume_base64 = body.get("resume_base64") or ""
            resume_filename = body.get("resume_filename") or "resume.pdf"
            if resume_base64 and not resume_path:
                try:
                    resume_dir = Path.home() / ".imperium" / "resumes"
                    resume_dir.mkdir(parents=True, exist_ok=True)
                    resume_path = str(resume_dir / resume_filename)
                    with open(resume_path, "wb") as f:
                        f.write(base64.b64decode(resume_base64))
                    log.info(f"Resume saved to: {resume_path}")
                except Exception as exc:
                    log.warn(f"Failed to save resume PDF: {exc}")
                    resume_path = ""

            job_id = models.new_run(job_url, profile, resume_path)
            models.emit(job_id, "queued", f"Queued application for {job_url}")
            threading.Thread(target=run_job, args=(job_id,), daemon=True).start()
            return self._send_json(200, {"job_id": job_id})

        if path in ("/approve", "/reject"):
            job_id = (body.get("job_id") or "").strip()
            if job_id not in models.RUNS:
                return self._send_json(404, {"error": "job not found"})
            approved = path == "/approve"
            models.update(job_id, approved=approved)
            models.emit(
                job_id,
                "approve" if approved else "reject",
                "User approved" if approved else "User rejected",
                level="success" if approved else "warn",
            )
            return self._send_json(200, {"ok": True})

        self._send_json(404, {"error": "not found"})


_server: ThreadingHTTPServer | None = None


def _shutdown_handler(signum, frame):
    global _server
    log.info("Shutting down...")
    models.force_save()
    if _server:
        _server.shutdown()
    sys.exit(0)


def main() -> None:
    global _server
    setup_logging()

    if CFG.host not in ("127.0.0.1", "localhost", "::1"):
        log.warn(f"HOST={CFG.host!r} is not loopback; forcing 127.0.0.1")

    models.load_state()
    browser_semaphore.force_reset()

    log.info(f"Imperium Local Agent (v5.0) -- http://{CFG.host}:{CFG.port}")
    log.info(f"Selenium ready: {SELENIUM_OK} | headless={CFG.headless}")
    log.info(f"State file: {CFG.state_file}")
    log.info(f"Max concurrent runs: {CFG.max_concurrent_runs}")
    log.info("Loopback-only, no auth, no cloud callbacks.")

    signal.signal(signal.SIGINT, _shutdown_handler)
    signal.signal(signal.SIGTERM, _shutdown_handler)

    _server = ThreadingHTTPServer(("127.0.0.1", CFG.port), Handler)
    try:
        _server.serve_forever()
    except KeyboardInterrupt:
        log.info("Interrupted")
    finally:
        models.force_save()
        _server.server_close()


if __name__ == "__main__":
    main()
