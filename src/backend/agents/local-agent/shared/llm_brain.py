"""
shared/llm_brain.py
===================

Thin client for a locally-running Ollama server. Provides primitives
for page classification and form field answering.

If Ollama is not installed/running, all calls silently return None
so the agent keeps working with profile memory + heuristics only.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

from core.config import CFG
from core.logging import log

try:
    import requests
except ImportError:
    requests = None  # type: ignore


def llm_available() -> bool:
    if requests is None:
        return False
    try:
        r = requests.get(f"{CFG.ollama_url}/api/tags", timeout=2)
        return r.ok
    except Exception:
        return False


def chat_with_llm(
    messages: List[Dict[str, str]],
    *,
    force_json: bool = False,
    run_id: str = "",
) -> Optional[str]:
    """Send a chat completion request to Ollama."""
    if requests is None:
        return None
    body: Dict[str, Any] = {
        "model": CFG.ollama_model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.1},
    }
    if force_json:
        body["format"] = "json"
    try:
        r = requests.post(f"{CFG.ollama_url}/api/chat", json=body, timeout=CFG.ollama_timeout)
        if not r.ok:
            return None
        data = r.json()
        return (data.get("message") or {}).get("content") or ""
    except Exception:
        return None


def classify_page(snapshot: Dict[str, Any]) -> str:
    """Rule-first classifier with LLM fallback."""
    from classifiers.job_classifier import PAGE_KINDS

    url = (snapshot.get("url") or "").lower()
    text = (snapshot.get("body_text") or "").lower()[:4000]
    buttons = [b.lower() for b in snapshot.get("buttons", [])]
    has_dialog = bool(snapshot.get("has_dialog"))
    job_cards = int(snapshot.get("job_cards") or 0)

    if "checkpoint" in url or "captcha" in text or "verify you are human" in text:
        return "captcha"
    if "/uas/login" in url or "/login" in url or "sign in to linkedin" in text:
        return "login_wall"
    if any(s in text for s in (
        "application submitted", "your application was sent",
        "thanks for applying", "we received your application",
    )):
        return "success"

    dialog_text = (snapshot.get("dialog_text") or "").lower()[:3000]
    if "linkedin.com" in url:
        modal_source = dialog_text if has_dialog else ""
        has_modal = bool(modal_source) and any(s in modal_source for s in (
            "submit application", "review your application",
            "save this application", "contact info",
        ))
        has_wizard_button = any(
            b in ("next", "review", "submit application", "continue to next step")
            or "continue to next step" in b
            or "review your application" in b
            or "submit application" in b
            for b in buttons
        )
        if has_modal and has_wizard_button:
            return "easy_apply_step"
        if "linkedin.com/jobs/view" in url:
            return "job_detail"
        is_search = (
            "linkedin.com/jobs/search" in url
            or "linkedin.com/jobs/collections" in url
            or ("linkedin.com/jobs" in url and job_cards >= 2 and not has_dialog)
        )
        if is_search:
            return "job_listing"

    host = url.split("/")[2] if "://" in url else url
    ats_domains = (
        "greenhouse.io", "lever.co", "ashbyhq.com", "workday",
        "smartrecruiters.com", "icims.com", "bamboohr.com", "jobvite.com",
    )
    if any(d in host for d in ats_domains):
        return "external_form"

    if snapshot.get("input_count", 0) >= 2:
        return "external_form"

    out = chat_with_llm([
        {"role": "system", "content":
            "Classify the web page into exactly one label: " + ", ".join(PAGE_KINDS) +
            ". Return JSON: {\"kind\": \"...\"}."},
        {"role": "user", "content": json.dumps({
            "url": url,
            "title": snapshot.get("title", ""),
            "buttons": buttons[:20],
            "text": text[:1500],
        })},
    ], force_json=True)

    parsed = _parse_json(out or "")
    kind = (parsed or {}).get("kind", "unknown")
    return kind if kind in PAGE_KINDS else "unknown"


def answer_question(question: str, profile: dict, job_context: str = "",
                    choices: Optional[List[str]] = None) -> Optional[str]:
    """Legacy answer_question for backward compatibility with form_parser."""
    if not llm_available():
        return _heuristic_answer(question, profile, choices)

    sys_prompt = (
        "You are filling out a job application on behalf of the candidate. "
        "Answer the question concisely and truthfully based on the candidate profile. "
        "If a list of CHOICES is given, return exactly one of them verbatim. "
        "Otherwise return a single short answer (max 2 sentences). "
        "Return JSON: {\"answer\": \"...\"}."
    )
    user = {
        "question": question,
        "candidate_profile": profile,
        "job_context": job_context[:1500],
        "choices": choices or [],
    }
    out = chat_with_llm(
        [{"role": "system", "content": sys_prompt},
         {"role": "user", "content": json.dumps(user)}],
        force_json=True,
    )
    parsed = _parse_json(out or "")
    if parsed and parsed.get("answer"):
        ans = str(parsed["answer"]).strip()
        if choices:
            low = ans.lower()
            for c in choices:
                if c.lower() == low or c.lower() in low or low in c.lower():
                    return c
            return choices[0]
        return ans
    return _heuristic_answer(question, profile, choices)


def _parse_json(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


def _heuristic_answer(q: str, profile: dict, choices: Optional[List[str]]) -> Optional[str]:
    q = q.lower()
    if choices:
        neg = any(k in q for k in ("sponsor", "visa", "disabil", "felony", "convicted", "veteran"))
        for c in choices:
            cl = c.lower().strip()
            if not neg and cl in ("yes", "y", "true"):
                return c
            if neg and cl in ("no", "n", "false"):
                return c
        return choices[0]

    if "years" in q and "experience" in q:
        val = profile.get("experience") or profile.get("total_experience")
        return str(val) if val else None

    if "salary" in q or "compensation" in q:
        val = profile.get("expected_ctc") or profile.get("expected_salary")
        return str(val) if val else None

    if "notice" in q or "start" in q:
        val = profile.get("notice_period")
        return str(val) if val else None

    if "relocat" in q:
        val = profile.get("relocation")
        return str(val) if val else None

    if "authoriz" in q or "permit" in q:
        val = profile.get("work_authorization")
        return str(val) if val else None

    if "why" in q:
        val = profile.get("summary")
        return str(val) if val else None

    return None
