"""
shared/question_bank.py
=======================

Purpose
-------
Deterministic answers for the screening questions that 80% of LinkedIn
Easy Apply / Greenhouse / Lever forms ask. Runs BEFORE the LLM so the
agent is reliable even when Ollama is offline.

Inputs
------
- ``question`` : the field's label / question text.
- ``profile``  : candidate profile dict.
- ``choices``  : optional list of available options (radio / select).

Outputs
-------
- ``answer(...)`` returns a string (matching one of ``choices`` when
  given) or ``None`` if no rule matches. Callers should fall back to the
  LLM only when ``None`` is returned.

Responsibility
--------------
Pure functions. No Selenium, no network. Easy to unit-test against
fixture strings.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Sequence

# --------- helpers ---------

_YES_WORDS = ("yes", "y", "yeah", "true", "✓", "i do", "i am", "authorized", "eligible")
_NO_WORDS  = ("no", "n", "false", "i do not", "i don't", "not")


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _has_any(text: str, needles: Sequence[str]) -> bool:
    t = _norm(text)
    return any(n in t for n in needles)


def _match_choice(answer: str, choices: Optional[Sequence[str]]) -> Optional[str]:
    """Return the choice that best represents ``answer``; falls back to
    case-insensitive equality / substring."""
    if not choices:
        return answer
    a = _norm(answer)
    # exact match
    for c in choices:
        if _norm(c) == a:
            return c
    # partial both ways
    for c in choices:
        cn = _norm(c)
        if cn and (cn in a or a in cn):
            return c
    # yes/no fallback
    if a in {"yes", "no"}:
        for c in choices:
            cn = _norm(c)
            if cn.startswith(a):
                return c
    return None


def _yes(choices: Optional[Sequence[str]]) -> Optional[str]:
    if not choices:
        return "Yes"
    for c in choices:
        if _has_any(c, _YES_WORDS):
            return c
    return None


def _no(choices: Optional[Sequence[str]]) -> Optional[str]:
    if not choices:
        return "No"
    for c in choices:
        if _has_any(c, _NO_WORDS) and not _has_any(c, _YES_WORDS):
            return c
    return None


def _profile_years(profile: Dict[str, Any], skill: str = "") -> int:
    """Best-effort years-of-experience number from profile."""
    skills = (profile.get("skill_years") or {}) if isinstance(profile, dict) else {}
    if skill and isinstance(skills, dict):
        for k, v in skills.items():
            if skill.lower() in str(k).lower():
                try:
                    return int(float(v))
                except (TypeError, ValueError):
                    pass
    yrs = profile.get("years_experience") or profile.get("total_experience_years")
    try:
        return int(float(yrs))
    except (TypeError, ValueError):
        return 3  # safe, common minimum


# --------- rules ---------

def _years_question(q: str) -> Optional[str]:
    """Extract the technology/skill the question is asking 'years of' about.
    Captures a SHORT token (1-3 words, no filler) after in/with/using."""
    # Single-token anchor first (catches "with AWS", "using React").
    matches = list(re.finditer(
        r"\b(?:in|with|using)\s+([A-Za-z0-9+./#][A-Za-z0-9+./#-]{0,30})\b", q, re.I))
    if matches:
        return matches[-1].group(1).strip(" ?.,")
    # Two-word skills like "machine learning", "data science" after the same anchors.
    m = re.search(r"\b(?:in|with|using)\s+([A-Za-z][A-Za-z+]{2,20}\s+[A-Za-z][A-Za-z+]{2,20})\b", q, re.I)
    if m:
        return m.group(1).strip(" ?.,")
    return None


def _is_numeric_field(q: str) -> bool:
    return bool(re.search(r"\b(years?|how many|number of|count|salary|compensation|ctc|rate|notice)\b", q, re.I))


def answer(question: str, profile: Dict[str, Any],
           choices: Optional[Sequence[str]] = None) -> Optional[str]:
    """Return a deterministic answer for ``question`` or ``None``."""
    if not question:
        return None
    q = _norm(question)
    choices = [c for c in (choices or []) if c]

    # ----- Work authorization -----
    if re.search(r"\b(authoriz|authoris|eligible|legally|work permit)\b.*\b(work|us|uk|eu|canada|country)\b", q) \
       or re.search(r"\b(are you|do you have)\b.*\b(authoriz|right to work|work permit|visa)\b", q):
        return _yes(choices) if profile.get("work_authorized", True) else _no(choices)

    # ----- Sponsorship -----
    if "sponsor" in q or "h-1b" in q or "h1b" in q or "tier 2" in q:
        # "will you NOW or in the future require sponsorship" -> default NO unless profile says otherwise
        needs = bool(profile.get("requires_sponsorship", False))
        return _yes(choices) if needs else _no(choices)

    # ----- Relocation -----
    if "reloc" in q:
        return _yes(choices) if profile.get("open_to_relocation", True) else _no(choices)

    # ----- Remote / hybrid / onsite preference -----
    if "willing to commute" in q or "commute" in q:
        return _yes(choices)

    # ----- Background check / drug test / clearance -----
    if "background check" in q or "drug test" in q or "drug screen" in q:
        return _yes(choices)
    if "security clearance" in q:
        has = bool(profile.get("security_clearance"))
        return _yes(choices) if has else _no(choices)

    # ----- Age / 18+ -----
    if re.search(r"\b(18 years|age of 18|at least 18|over 18)\b", q):
        return _yes(choices)

    # ----- Felony / criminal -----
    if "felony" in q or "convicted" in q or "criminal" in q:
        return _no(choices)

    # ----- Notice period -----
    if "notice period" in q or "notice" in q and "period" in q:
        v = profile.get("notice_period_days")
        if v is None:
            v = 30
        try:
            return str(int(v))
        except (TypeError, ValueError):
            return "30"

    # ----- Salary expectation -----
    if re.search(r"\b(salary|compensation|ctc|expected pay|desired pay|rate)\b", q):
        v = (profile.get("desired_salary") or profile.get("expected_salary")
             or profile.get("salary_expectation"))
        if v:
            return str(v)
        return None  # let user fill — wrong number is worse than blank

    # ----- Start date / availability -----
    if "start date" in q or "earliest start" in q or "when can you start" in q:
        return profile.get("earliest_start_date") or "2 weeks"

    # ----- Years of experience in X -----
    if "year" in q and ("experience" in q or "exp." in q or re.search(r"\byears\b", q)):
        skill = _years_question(question) or ""
        n = _profile_years(profile, skill)
        if choices:
            # pick the lowest option >= n, else the highest available
            ranked: List[tuple] = []
            for c in choices:
                m = re.search(r"\d+", c)
                ranked.append((int(m.group()) if m else -1, c))
            ranked.sort()
            for num, c in ranked:
                if num >= n:
                    return c
            if ranked:
                return ranked[-1][1]
        return str(n)

    # ----- Generic "how many" numeric -----
    if _is_numeric_field(q) and not choices:
        return None  # don't guess a number

    # ----- EEO / diversity questions: prefer "decline to answer" -----
    if re.search(r"\b(gender|sex|race|ethnicity|hispanic|veteran|disability|disabled)\b", q):
        for c in choices:
            cn = _norm(c)
            if "decline" in cn or "prefer not" in cn or "wish not" in cn or "do not wish" in cn:
                return c
        return None

    # ----- Education level -----
    if "highest" in q and ("education" in q or "degree" in q):
        return _match_choice(profile.get("highest_education") or "Bachelor", choices)

    # ----- Currently employed -----
    if "currently employed" in q or "currently working" in q:
        return _yes(choices) if profile.get("currently_employed", True) else _no(choices)

    # ----- How did you hear -----
    if "how did you hear" in q or "referral source" in q or "where did you" in q and "hear" in q:
        return _match_choice("LinkedIn", choices)

    return None
