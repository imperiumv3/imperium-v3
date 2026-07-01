"""
engine/question_engine.py
=========================

Answer priority chain:
1. Profile Memory
2. Deterministic rules
3. Ollama (optional)
4. Human intervention (None)
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from engine.profile_memory import ProfileMemory
from shared.llm_brain import llm_available, chat_with_llm
from core.logging import log


def answer_question(
    question: str,
    profile: ProfileMemory,
    job_context: str = "",
    choices: Optional[List[str]] = None,
    run_id: str = "",
) -> Optional[str]:
    """Answer a form field question using the priority chain.

    Returns the answer string, or None if human intervention needed.
    """
    # Priority 1: Profile memory
    answer = _from_profile(question, profile, choices)
    if answer:
        log.debug(f"Profile answer for '{question[:50]}': {answer[:50]}", run_id=run_id, step="fill")
        return answer

    # Priority 2: Deterministic rules
    answer = _from_rules(question, profile, choices)
    if answer:
        log.debug(f"Rule answer for '{question[:50]}': {answer[:50]}", run_id=run_id, step="fill")
        return answer

    # Priority 3: Ollama (optional)
    if llm_available():
        answer = _from_llm(question, profile, job_context, choices, run_id=run_id)
        if answer:
            log.debug(f"LLM answer for '{question[:50]}': {answer[:50]}", run_id=run_id, step="fill")
            return answer

    # Priority 4: Human intervention needed
    return None


def _from_profile(question: str, profile: ProfileMemory, choices: Optional[List[str]] = None) -> Optional[str]:
    """Try to answer from profile memory."""
    val = profile.answer_screening(question, choices)
    if val:
        return str(val).strip()
    return None


def _from_rules(question: str, profile: ProfileMemory, choices: Optional[List[str]] = None) -> Optional[str]:
    """Deterministic rules for common questions."""
    low = question.lower()

    if choices:
        neg = any(k in low for k in ("sponsor", "visa", "disabil", "felony", "convicted", "veteran"))
        for c in choices:
            cl = c.lower().strip()
            if not neg and cl in ("yes", "y", "true", "yes, i am authorized"):
                return c
            if neg and cl in ("no", "n", "false", "no, i do not", "no i do not"):
                return c

    if "gender" in low:
        val = profile.get("gender")
        if val:
            return val

    if "race" in low or "ethnicity" in low or "demographic" in low:
        for c in (choices or []):
            cl = c.lower().strip()
            if "prefer not" in cl or "decline" in cl:
                return c
        return None

    if "equal" in low or "voluntary" in low:
        for c in (choices or []):
            cl = c.lower().strip()
            if "prefer not" in cl or "decline" in cl:
                return c
        return None

    return None


def _from_llm(
    question: str,
    profile: ProfileMemory,
    job_context: str,
    choices: Optional[List[str]] = None,
    run_id: str = "",
) -> Optional[str]:
    """Use Ollama to answer the question."""
    sys_prompt = (
        "You are filling out a job application on behalf of the candidate. "
        "Answer the question concisely and truthfully based on the candidate profile. "
        "If a list of CHOICES is given, return exactly one of them verbatim. "
        "Otherwise return a single short answer (max 2 sentences). "
        "Return JSON: {\"answer\": \"...\"}."
    )
    user = {
        "question": question,
        "candidate_profile": profile.raw(),
        "job_context": job_context[:1500],
        "choices": choices or [],
    }
    out = chat_with_llm(
        [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": str(user)},
        ],
        run_id=run_id,
    )
    if not out:
        return None

    import json
    import re
    m = re.search(r"\{.*\}", out, re.S)
    if m:
        try:
            parsed = json.loads(m.group(0))
            ans = str(parsed.get("answer", "")).strip()
            if ans:
                if choices:
                    low = ans.lower()
                    for c in choices:
                        if c.lower() == low or c.lower() in low or low in c.lower():
                            return c
                    return choices[0]
                return ans
        except Exception:
            pass

    if choices and out.strip():
        for c in choices:
            if c.lower() == out.strip().lower():
                return c
        return choices[0]

    return out.strip() if out.strip() else None
