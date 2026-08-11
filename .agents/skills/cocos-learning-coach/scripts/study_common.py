#!/usr/bin/env python3
"""Shared deterministic helpers for Cocos learning study data."""

from __future__ import annotations

import json
import os
import re
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
MODULE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]*$")
STATUSES = {
    "not_started",
    "learning",
    "assigned",
    "submitted",
    "passed",
    "skip_requested",
    "challenge_failed",
    "verified_prior_knowledge",
}
SOURCES = {
    "learning_assessment",
    "prior_knowledge_challenge",
    "self_report",
    "imported",
}
COMPLETED_STATUSES = {"passed", "verified_prior_knowledge"}
STAGE_GATE_STATUSES = {
    "awaiting_learner_decision",
    "questions_open",
    "ready_for_next_stage",
}

ALLOWED_TRANSITIONS = {
    "not_started": {"not_started", "learning", "assigned", "skip_requested"},
    "learning": {"learning", "assigned", "submitted", "skip_requested"},
    "assigned": {"assigned", "learning", "submitted"},
    "submitted": {"submitted", "learning", "passed"},
    "skip_requested": {"skip_requested", "challenge_failed", "verified_prior_knowledge"},
    "challenge_failed": {"challenge_failed", "learning", "skip_requested"},
    "passed": {"passed"},
    "verified_prior_knowledge": {"verified_prior_knowledge"},
}


class StudyDataError(ValueError):
    """Raised when study data or a requested mutation is invalid."""


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def new_event(event_type: str, scope: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "event_id": str(uuid.uuid4()),
        "schema_version": SCHEMA_VERSION,
        "timestamp": now_utc(),
        "type": event_type,
        "scope": scope,
        "data": data,
    }


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise StudyDataError(f"missing file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise StudyDataError(f"invalid JSON in {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise StudyDataError(f"expected JSON object in {path}")
    return value


def atomic_write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def write_json_if_missing(path: Path, value: dict[str, Any]) -> bool:
    if path.exists():
        load_json(path)
        return False
    atomic_write_json(path, value)
    return True


def write_text_if_missing(path: Path, text: str) -> bool:
    if path.exists():
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return True


def append_event(path: Path, event: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False, sort_keys=True) + "\n")
        handle.flush()
        os.fsync(handle.fileno())


def validate_module_id(module_id: str) -> None:
    if not MODULE_ID_RE.fullmatch(module_id):
        raise StudyDataError(
            "module ID must contain only lower-case letters, digits, dots, underscores, and hyphens"
        )


def parse_rfc3339(value: Any, field: str) -> None:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise StudyDataError(f"{field} must be a UTC RFC 3339 timestamp ending in Z")
    try:
        datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError as exc:
        raise StudyDataError(f"{field} is not a valid timestamp: {value}") from exc


def relative_existing_evidence(study_dir: Path, evidence: str) -> str:
    raw = Path(evidence)
    resolved = raw.resolve() if raw.is_absolute() else (study_dir / raw).resolve()
    if not resolved.exists():
        raise StudyDataError(f"evidence does not exist: {evidence}")
    return os.path.relpath(resolved, study_dir.resolve())
