# Imperium Local Agent v5

A fully offline job-application automation agent. No Supabase, no cloud,
no API keys. Drives a real visible Chrome window via Selenium, with
optional local LLM via [Ollama](https://ollama.com).

## Architecture

```
local_agent/
├── main.py                          # entrypoint shim
├── api/
│   └── agent_server.py              # HTTP server (/health /apply /approve /reject)
├── core/
│   ├── config.py                    # centralised env-var config
│   ├── logging.py                   # structured JSON logging
│   ├── errors.py                    # typed error codes
│   ├── retry.py                     # exponential backoff decorator
│   └── concurrency.py               # browser session semaphore
├── browser/
│   ├── browser_manager.py           # Chrome lifecycle + auto version detection
│   └── session_manager.py           # login state persistence + detection
├── classifiers/
│   └── job_classifier.py            # platform detection + page state classification
├── executors/
│   ├── linkedin_executor.py         # LinkedIn Easy Apply wizard
│   ├── naukri_executor.py           # Naukri Quick Apply
│   ├── ats_executor.py              # Generic ATS (Greenhouse, Lever, Workday)
│   └── submit_verifier.py           # post-submit confirmation detection
├── engine/
│   ├── profile_memory.py            # structured candidate profile data store
│   ├── question_engine.py           # 4-tier answer priority chain
│   ├── form_engine.py               # generic multi-step form filling
│   └── resume_manager.py            # resume file detection + upload
├── tracking/
│   └── run_tracker.py               # run state + event persistence
├── agents/
│   └── automation_agent.py          # orchestrator (Chrome → classify → execute → verify)
├── shared/
│   ├── models.py                    # legacy compatibility shim
│   └── llm_brain.py                 # Ollama client (optional)
└── storage/
    └── application_history.json     # persisted runs (auto-created)
```

## Install & run

```bash
cd src/backend/agents/local-agent
python -m venv .venv && source .venv/bin/activate   # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
cp .env.example .env        # optional, defaults are fine
python main.py
```

## HTTP API

| Method | Path                | Body / Params                            | Description                             |
| ------ | ------------------- | ---------------------------------------- | --------------------------------------- |
| GET    | `/health`           | —                                        | Liveness + Chrome readiness             |
| POST   | `/apply`            | `{ "job_url": "...", "profile": {...}, "resume_path": "..." }` | Queue a new application |
| POST   | `/approve`          | `{ "job_id": "..." }`                    | Approve & submit current run            |
| POST   | `/reject`           | `{ "job_id": "..." }`                    | Reject current run                      |
| GET    | `/status/{job_id}`  | —                                        | Full run with events                    |
| GET    | `/events/{job_id}`  | —                                        | Just events (good for polling)          |
| GET    | `/runs`             | —                                        | All runs (most recent first)            |

## Supported Platforms

| Platform   | Flow Type           | Status      |
| ---------- | ------------------- | ----------- |
| LinkedIn   | Easy Apply wizard   | Automatic   |
| LinkedIn   | External apply      | Semi-auto   |
| Naukri     | Quick Apply         | Automatic   |
| Greenhouse | ATS forms           | Automatic   |
| Lever      | ATS forms           | Automatic   |
| Ashby      | ATS forms           | Automatic   |
| Workday    | ATS forms           | Automatic   |
| Generic    | Any form with Apply | Automatic   |

## Answer Priority Chain

1. **Profile Memory** — structured candidate data (name, email, experience, etc.)
2. **Deterministic rules** — yes/no for authorization, "prefer not to say" for demographics
3. **Ollama** — optional local LLM for complex questions
4. **Human intervention** — pause and let user answer manually

## Configuration

See `.env.example` for all options. Key settings:

- `USE_REAL_CHROME=1` to reuse your everyday Chrome profile (preserves logins)
- `OLLAMA_MODEL=qwen2.5:7b` to change the local LLM model
- `MAX_CONCURRENT_RUNS=1` to limit parallel Chrome instances
- `CHROME_VERSION_MAIN=126` to force a specific Chrome version

## Frontend wiring

The web app talks directly to `http://localhost:8000` — no Supabase calls
involved in the automation path. Override via `VITE_IMPERIUM_API_BASE_URL`
or the in-app settings.
