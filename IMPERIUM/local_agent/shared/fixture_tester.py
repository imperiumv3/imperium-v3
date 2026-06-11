"""
shared/fixture_tester.py
========================

Purpose
-------
Replay a saved HTML fixture (e.g. a captured LinkedIn Easy Apply modal)
through the question_bank rule engine WITHOUT launching Chrome. Lets us
verify end-to-end that the agent would answer every visible field, and
which fields would fall through to the LLM / human.

Inputs
------
- ``html`` : raw HTML string of the form page or modal.
- ``profile`` : candidate profile dict (same shape used by /apply).

Outputs
-------
- ``run_fixture(html, profile)`` -> dict with:
    - ``fields`` : [{label, kind, type, choices, answer, source}]
    - ``summary`` : {total, answered, unanswered, rule_hits, llm_needed}

Responsibility
--------------
Pure stdlib (html.parser). No Selenium, no network. Safe to call from any
HTTP handler or unit test.
"""
from __future__ import annotations

from html.parser import HTMLParser
from typing import Any, Dict, List, Optional

from shared.question_bank import answer as rule_answer


# --------- minimal HTML form extractor ---------

class _FormParser(HTMLParser):
    """Collect inputs/selects/textareas/radios with best-effort labels."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.fields: List[Dict[str, Any]] = []
        self.labels_by_for: Dict[str, str] = {}
        # Pending label text while inside a <label> tag
        self._label_stack: List[Dict[str, Any]] = []
        # Pending select element being parsed
        self._select_stack: List[Dict[str, Any]] = []
        # Pending option's text
        self._option_stack: List[Dict[str, Any]] = []
        # Pending fieldset legend text
        self._legend_stack: List[str] = []
        self._fieldset_stack: List[str] = []

    # ----- helpers -----
    def _attrs(self, attrs):
        return {k.lower(): (v or "") for k, v in attrs}

    def _label_for(self, attrs: Dict[str, str]) -> str:
        # Real <label> text takes priority — return only aria-label /
        # placeholder here. id/name are filled later as a last resort.
        for key in ("aria-label", "placeholder"):
            v = attrs.get(key)
            if v:
                return v
        return ""

    # ----- tag handlers -----
    def handle_starttag(self, tag, attrs):  # noqa: D401
        a = self._attrs(attrs)
        if tag == "label":
            self._label_stack.append({"for": a.get("for", ""), "text": ""})
        elif tag == "legend":
            self._legend_stack.append("")
        elif tag == "fieldset":
            self._fieldset_stack.append("")
        elif tag == "input":
            t = (a.get("type") or "text").lower()
            if t in {"hidden", "submit", "button", "image", "file"}:
                return
            self.fields.append({
                "tag": "input", "type": t,
                "label": self._label_for(a),
                "id": a.get("id", ""), "name": a.get("name", ""),
                "value": a.get("value", ""),
                "fieldset": self._fieldset_stack[-1] if self._fieldset_stack else "",
            })
        elif tag == "textarea":
            self.fields.append({
                "tag": "textarea", "type": "textarea",
                "label": self._label_for(a),
                "id": a.get("id", ""), "name": a.get("name", ""),
                "value": "",
                "fieldset": self._fieldset_stack[-1] if self._fieldset_stack else "",
            })
        elif tag == "select":
            self._select_stack.append({
                "tag": "select", "type": "select",
                "label": self._label_for(a),
                "id": a.get("id", ""), "name": a.get("name", ""),
                "choices": [], "value": "",
                "fieldset": self._fieldset_stack[-1] if self._fieldset_stack else "",
            })
        elif tag == "option" and self._select_stack:
            self._option_stack.append({"value": a.get("value", ""), "text": ""})

    def handle_endtag(self, tag):
        if tag == "label" and self._label_stack:
            lab = self._label_stack.pop()
            text = " ".join(lab["text"].split())
            if lab["for"]:
                self.labels_by_for[lab["for"]] = text
            elif text and self.fields:
                # nearest preceding field with no label
                for f in reversed(self.fields):
                    if not f["label"]:
                        f["label"] = text
                        break
        elif tag == "legend" and self._legend_stack:
            text = " ".join(self._legend_stack.pop().split())
            if self._fieldset_stack:
                self._fieldset_stack[-1] = text
        elif tag == "fieldset" and self._fieldset_stack:
            self._fieldset_stack.pop()
        elif tag == "select" and self._select_stack:
            sel = self._select_stack.pop()
            self.fields.append(sel)
        elif tag == "option" and self._option_stack and self._select_stack:
            opt = self._option_stack.pop()
            txt = " ".join(opt["text"].split()) or opt["value"]
            if txt:
                self._select_stack[-1]["choices"].append(txt)

    def handle_data(self, data):
        if self._label_stack:
            self._label_stack[-1]["text"] += data
        if self._legend_stack:
            self._legend_stack[-1] += data
        if self._option_stack:
            self._option_stack[-1]["text"] += data


# --------- grouping radios + final answering ---------

def _group_radios(fields: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Collapse radio inputs sharing the same name into one choice field."""
    out: List[Dict[str, Any]] = []
    groups: Dict[str, Dict[str, Any]] = {}
    for f in fields:
        if f.get("type") == "radio":
            key = f.get("name") or f.get("fieldset") or f.get("label") or "__radio"
            g = groups.get(key)
            if not g:
                g = {
                    "tag": "radio-group", "type": "radio",
                    "label": f.get("fieldset") or f.get("label") or key,
                    "name": f.get("name", ""), "choices": [], "value": "",
                }
                groups[key] = g
                out.append(g)
            label = f.get("label") or f.get("value") or ""
            if label:
                g["choices"].append(label)
        else:
            out.append(f)
    return out


# --------- public entry ---------

def run_fixture(html: str, profile: Dict[str, Any]) -> Dict[str, Any]:
    parser = _FormParser()
    parser.feed(html or "")
    # Wire "label for=id" backfills, then fall back to id/name/data-test.
    for f in parser.fields:
        if not f.get("label") and f.get("id") and f["id"] in parser.labels_by_for:
            f["label"] = parser.labels_by_for[f["id"]]
        if not f.get("label"):
            f["label"] = f.get("name") or f.get("id") or ""

    fields = _group_radios(parser.fields)

    # Mirror form_parser's profile-map and "agree/certify" checkbox heuristic
    # so the coverage report reflects what the live driver would actually do.
    parts = (profile.get("name") or "").split(" ", 1)
    name_parts = {"first": parts[0] if parts else "",
                  "last":  parts[1] if len(parts) > 1 else ""}

    def _profile_map(label: str) -> Optional[str]:
        low = (label or "").lower()
        table = [
            (("first name", "given name"),               name_parts["first"]),
            (("last name", "surname", "family name"),    name_parts["last"]),
            (("full name", "your name", "legal name", "name"), profile.get("name")),
            (("email", "e-mail"),                        profile.get("email")),
            (("phone", "mobile", "telephone"),           profile.get("phone")),
            (("address", "city", "location"),            profile.get("location")),
            (("linkedin",),                              profile.get("linkedin_url") or profile.get("linkedin")),
            (("github",),                                profile.get("github_url") or profile.get("github")),
            (("portfolio", "website"),                   profile.get("portfolio_url") or profile.get("portfolio")),
        ]
        for needles, value in table:
            if value and any(n in low for n in needles):
                return str(value)
        return None

    AGREE_WORDS = ("agree", "confirm", "certify", "consent", "acknowledge")

    results: List[Dict[str, Any]] = []
    rule_hits = profile_hits = 0
    answered = 0
    for f in fields:
        label = f.get("label") or f.get("name") or ""
        ftype = f.get("type")
        choices: Optional[List[str]] = f.get("choices") or None

        ans: Optional[str] = None
        source = "llm-or-human"

        if ftype == "checkbox" and any(w in label.lower() for w in AGREE_WORDS):
            ans = "checked"
            source = "agree-heuristic"
        else:
            pm = _profile_map(label)
            if pm:
                ans = pm
                source = "profile-map"
                profile_hits += 1
            else:
                ra = rule_answer(label, profile, choices=choices)
                if ra is not None:
                    ans = ra
                    source = "rule"
                    rule_hits += 1

        if ans is not None:
            answered += 1
        results.append({
            "label": label[:160],
            "kind": f.get("tag"),
            "type": ftype,
            "choices": choices or [],
            "answer": ans,
            "source": source,
        })

    total = len(results)
    return {
        "fields": results,
        "summary": {
            "total": total,
            "answered": answered,
            "unanswered": total - answered,
            "rule_hits": rule_hits,
            "profile_hits": profile_hits,
            "llm_needed": total - answered,
            "coverage_pct": round((answered / total) * 100, 1) if total else 0.0,
        },
    }
