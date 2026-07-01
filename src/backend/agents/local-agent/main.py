"""
main.py -- entrypoint shim.

Keeps the documented ``python main.py`` command working.
All real logic lives in ``api/agent_server.py``.

Layout:
    local_agent/
    ├── main.py              <- you are here
    ├── api/agent_server.py  <- HTTP server
    ├── core/                <- config, logging, errors, retry, concurrency
    ├── browser/             <- Chrome lifecycle + session management
    ├── classifiers/         <- platform + page classification
    ├── executors/           <- LinkedIn, Naukri, ATS executors + submit verifier
    ├── engine/              <- profile memory, question engine, form engine, resume
    ├── tracking/            <- run state + event persistence
    ├── shared/              <- LLM brain (Ollama client)
    └── storage/             <- application_history.json (persisted runs)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.agent_server import main  # noqa: E402

if __name__ == "__main__":
    main()
