"""
engine/profile_memory.py
========================

Structured profile data store. All answers must come from here first.
Never hardcode answers — profile memory is the single source of truth.
"""
from __future__ import annotations

from typing import Any, Dict, Optional


STANDARD_FIELDS = {
    "name": "",
    "first_name": "",
    "last_name": "",
    "email": "",
    "phone": "",
    "experience": "",
    "current_ctc": "",
    "expected_ctc": "",
    "notice_period": "",
    "location": "",
    "city": "",
    "relocation": "",
    "linkedin": "",
    "linkedin_url": "",
    "github": "",
    "github_url": "",
    "portfolio": "",
    "portfolio_url": "",
    "work_authorization": "",
    "headline": "",
    "summary": "",
    "degree": "",
    "university": "",
    "graduation_year": "",
    "current_company": "",
    "current_title": "",
    "skills": "",
    "visa_status": "",
    "gender": "",
    "date_of_birth": "",
    "resume_path": "",
}


class ProfileMemory:
    """Stores candidate profile data and provides field lookups."""

    def __init__(self, data: Dict[str, Any]):
        self._data: Dict[str, Any] = {}
        for key in STANDARD_FIELDS:
            self._data[key] = data.get(key, STANDARD_FIELDS[key])

        raw_name = data.get("name", "")
        if raw_name and not self._data["first_name"]:
            parts = str(raw_name).split(" ", 1)
            self._data["first_name"] = parts[0]
            self._data["last_name"] = parts[1] if len(parts) > 1 else ""

        for key, val in data.items():
            if key not in self._data and val:
                self._data[key] = val

    def get(self, key: str, default: str = "") -> str:
        val = self._data.get(key, default)
        return str(val) if val else default

    def raw(self) -> Dict[str, Any]:
        return dict(self._data)

    def match_field(self, label: str) -> Optional[str]:
        """Try to match a form field label to a profile value.

        Returns the profile value or None if no match found.
        """
        low = label.lower().strip()

        mapping = [
            (["first name", "given name", "first_name"], "first_name"),
            (["last name", "surname", "family name", "last_name"], "last_name"),
            (["full name", "your name", "legal name", "name"], "name"),
            (["email", "e-mail", "email address"], "email"),
            (["phone", "mobile", "telephone", "phone number", "contact number"], "phone"),
            (["address", "street address"], "location"),
            (["city", "city name"], "city"),
            (["location", "where are you based", "current location"], "location"),
            (["linkedin", "linkedin url", "linkedin profile"], "linkedin_url"),
            (["github", "github url", "github profile"], "github_url"),
            (["portfolio", "website", "personal site", "personal website"], "portfolio_url"),
            (["headline", "title", "job title"], "headline"),
            (["summary", "about you", "cover letter", "tell us", "bio"], "summary"),
            (["experience", "years of experience", "total experience", "work experience"], "experience"),
            (["current ctc", "current salary", "present ctc"], "current_ctc"),
            (["expected ctc", "expected salary", "desired salary", "salary expectation"], "expected_ctc"),
            (["notice period", "notice", "when can you join"], "notice_period"),
            (["relocation", "willing to relocate", "relocate"], "relocation"),
            (["work authorization", "authorized to work", "work permit", "authorization"], "work_authorization"),
            (["visa", "visa status", "visa type"], "visa_status"),
            (["education", "degree", "highest education", "qualification"], "degree"),
            (["university", "college", "school"], "university"),
            (["graduation", "graduation year", "year of graduation"], "graduation_year"),
            (["company", "current company", "employer"], "current_company"),
            (["skills", "key skills", "technical skills"], "skills"),
            (["gender"], "gender"),
            (["date of birth", "dob", "birth date"], "date_of_birth"),
        ]

        for needles, field_key in mapping:
            if any(n in low for n in needles):
                val = self.get(field_key)
                if val:
                    return val

        return None

    def answer_screening(self, question: str, choices: list = None) -> Optional[str]:
        """Answer a screening question using profile data.

        Priority: direct field match → keyword matching → None.
        """
        low = question.lower()

        if choices:
            for c in choices:
                cl = c.lower().strip()
                if any(k in low for k in ("sponsor", "visa", "disabil", "felony", "convicted")):
                    if cl in ("no", "n", "false", "no, i do not", "no i do not"):
                        return c
                if any(k in low for k in ("veteran", "military")):
                    if cl in ("no", "n", "false"):
                        return c

        val = self.match_field(question)
        if val:
            return val

        if "years" in low and "experience" in low:
            exp = self.get("experience")
            if exp:
                return exp
            return None

        if "salary" in low or "compensation" in low or "ctc" in low:
            if "expected" in low or "desired" in low:
                val = self.get("expected_ctc")
            elif "current" in low or "present" in low:
                val = self.get("current_ctc")
            else:
                val = self.get("expected_ctc") or self.get("current_ctc")
            if val:
                return val
            return None

        if "notice" in low:
            val = self.get("notice_period")
            if val:
                return val
            return None

        if "relocat" in low:
            val = self.get("relocation")
            if val:
                return val
            return None

        if "authoriz" in low or "permit" in low or "legally" in low:
            val = self.get("work_authorization")
            if val:
                return val
            return None

        if "why" in low:
            val = self.get("summary")
            if val:
                return val
            return None

        if "degree" in low or "education" in low:
            val = self.get("degree")
            if val:
                return val
            return None

        if "university" in low or "college" in low or "school" in low:
            val = self.get("university")
            if val:
                return val
            return None

        if "skill" in low:
            val = self.get("skills")
            if val:
                return val
            return None

        return None
