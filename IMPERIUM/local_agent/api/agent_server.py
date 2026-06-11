"""
api/agent_server.py
===================

Purpose
-------
Pure-stdlib HTTP server exposing the local agent on
``http://127.0.0.1:8000``. Routes incoming requests to the orchestrator
(``agents.automation_agent.run_job``) and to the shared run registry.

Inputs
------
- ``HOST``, ``PORT`` env vars (default 127.0.0.1:8000).
- JSON request bodies: ``{ job_url, profile }`` for /apply,
  ``{ job_id }`` for /approve and /reject.

Outputs
-------
- JSON responses for /health, /apply, /approve, /reject, /status/{id},
  /events/{id}, /runs.

Responsibility
--------------
HTTP transport + CORS only. No Selenium, no LLM. All state lives in
``shared.models``; all run logic lives in ``agents.automation_agent``.
"""
from __future__ import annotations

import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict
from urllib.parse import urlparse

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:  # noqa: BLE001
    pass

from pathlib import Path

from shared import models
from shared.artifacts import list_artifacts, artifact_path
from shared.fixture_tester import run_fixture
from automation.selenium_driver import SELENIUM_OK, HEADLESS
from agents.automation_agent import run_job

FIXTURE_DIR = Path(__file__).resolve().parent.parent / "storage" / "fixtures"


HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))


class Handler(BaseHTTPRequestHandler):
    server_version = "ImperiumLocalAgent/3.1"

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        return

    # ---- helpers ----
    def _send_json(self, status: int, payload: Any) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
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

    # ---- CORS ----
    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    # ---- routing ----
    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip("/") or "/"

        if path == "/health":
            return self._send_json(200, {
                "ok": True,
                "chrome": SELENIUM_OK,
                "headless": HEADLESS,
                "runs": len(models.RUNS),
                "version": "3.1.0",
            })

        if path == "/runs":
            items = list(models.RUNS.values())
            items.sort(key=lambda r: r.get("created_at", ""), reverse=True)
            return self._send_json(200, [
                {k: v for k, v in r.items() if k != "events"} for r in items
            ])

        if path.startswith("/status/"):
            job_id = path[len("/status/"):]
            run = models.RUNS.get(job_id)
            if not run:
                return self._send_json(404, {"error": "job not found"})
            return self._send_json(200, run)

        if path.startswith("/events/"):
            job_id = path[len("/events/"):]
            run = models.RUNS.get(job_id)
            if not run:
                return self._send_json(404, {"error": "job not found"})
            return self._send_json(200, {
                "events": run["events"],
                "status": run["status"],
                "progress": run["progress"],
                "artifacts": list_artifacts(job_id),
            })

        if path.startswith("/artifacts/"):
            # /artifacts/{job_id}            -> list
            # /artifacts/{job_id}/{filename} -> raw file
            rest = path[len("/artifacts/"):].split("/", 1)
            job_id = rest[0]
            if len(rest) == 1:
                return self._send_json(200, {"artifacts": list_artifacts(job_id)})
            fp = artifact_path(job_id, rest[1])
            if not fp:
                return self._send_json(404, {"error": "artifact not found"})
            ext = fp.suffix.lower()
            mime = {".png": "image/png", ".html": "text/html; charset=utf-8",
                    ".json": "application/json"}.get(ext, "application/octet-stream")
            data = fp.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
            return

        if path == "/test":
            # List available fixtures.
            fixtures = []
            if FIXTURE_DIR.exists():
                fixtures = sorted(p.name for p in FIXTURE_DIR.glob("*.html"))
            return self._send_json(200, {"fixtures": fixtures, "dir": str(FIXTURE_DIR)})

        self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip("/") or "/"
        body = self._read_json()

        if path == "/apply":
            job_url = (body.get("job_url") or "").strip()
            if len(job_url) < 4:
                return self._send_json(400, {"error": "job_url is required"})
            profile = body.get("profile") or {}
            if not isinstance(profile, dict):
                return self._send_json(400, {"error": "profile must be an object"})
            if not profile.get("resume_path") and os.environ.get("RESUME_PATH"):
                profile["resume_path"] = os.environ["RESUME_PATH"]
            job_id = models.new_run(job_url, profile)
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

        if path == "/test":
            # POST { fixture: "name.html" }  OR  { html: "<form>...</form>" }
            # Optional: { profile: {...} }
            profile = body.get("profile") or {}
            if not isinstance(profile, dict):
                return self._send_json(400, {"error": "profile must be an object"})
            html = body.get("html") or ""
            fixture = (body.get("fixture") or "").strip()
            if fixture:
                # Prevent path traversal.
                safe = Path(fixture).name
                fp = FIXTURE_DIR / safe
                if not fp.exists():
                    return self._send_json(404, {"error": f"fixture not found: {safe}"})
                html = fp.read_text(encoding="utf-8")
            if not html:
                return self._send_json(400, {"error": "html or fixture is required"})
            try:
                result = run_fixture(html, profile)
            except Exception as exc:  # noqa: BLE001
                return self._send_json(500, {"error": f"fixture run failed: {exc}"})
            return self._send_json(200, result)

        self._send_json(404, {"error": "not found"})


def main() -> None:
    models.load_state()
    print(f"[agent] Imperium Local Agent (offline, stdlib) -- http://{HOST}:{PORT}")
    print(f"[agent] Chrome ready: {SELENIUM_OK} | headless={HEADLESS} | state={models.STATE_FILE}")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[agent] shutting down")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
