#!/usr/bin/env python3
"""Record a validated learning state transition and append its evidence event."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from study_common import (
    ALLOWED_TRANSITIONS,
    COMPLETED_STATUSES,
    SOURCES,
    STATUSES,
    StudyDataError,
    append_event,
    atomic_write_json,
    load_json,
    new_event,
    now_utc,
    relative_existing_evidence,
    validate_module_id,
)


def record(args: argparse.Namespace) -> dict:
    study_dir = args.study_dir.resolve()
    progress_path = study_dir / "progress.json"
    progress = load_json(progress_path)
    scope = progress.get("scope")
    if scope not in {"workspace", "project"}:
        raise StudyDataError("progress scope must be workspace or project")
    modules = progress.get("modules")
    if not isinstance(modules, dict):
        raise StudyDataError("progress modules must be an object")

    validate_module_id(args.module_id)
    if args.status not in STATUSES:
        raise StudyDataError(f"unsupported status: {args.status}")
    if args.source not in SOURCES:
        raise StudyDataError(f"unsupported source: {args.source}")

    current = modules.get(args.module_id, {})
    if not isinstance(current, dict):
        raise StudyDataError(f"module record is not an object: {args.module_id}")
    old_status = current.get("status", "not_started")
    allowed = set(ALLOWED_TRANSITIONS.get(old_status, set()))
    if args.reassess and old_status in COMPLETED_STATUSES:
        allowed.add("learning")
    if args.status not in allowed:
        raise StudyDataError(f"invalid transition: {old_status} -> {args.status}")

    evidence = [relative_existing_evidence(study_dir, item) for item in args.evidence]
    if args.status in COMPLETED_STATUSES:
        if not args.assessment_id:
            raise StudyDataError(f"{args.status} requires --assessment-id")
        if not evidence:
            raise StudyDataError(f"{args.status} requires at least one existing --evidence path")
        if args.status == "passed" and args.source != "learning_assessment":
            raise StudyDataError("passed requires source learning_assessment")
        if (
            args.status == "verified_prior_knowledge"
            and args.source != "prior_knowledge_challenge"
        ):
            raise StudyDataError(
                "verified_prior_knowledge requires source prior_knowledge_challenge"
            )

    timestamp = now_utc()
    updated = dict(current)
    updated.update(
        {
            "status": args.status,
            "source": args.source,
            "evidence": evidence,
            "updated_at": timestamp,
        }
    )
    if args.assessment_id:
        updated["assessment_id"] = args.assessment_id
    else:
        updated.pop("assessment_id", None)
    if args.note:
        updated["note"] = args.note
    else:
        updated.pop("note", None)
    if args.status in COMPLETED_STATUSES:
        if old_status not in COMPLETED_STATUSES or not isinstance(updated.get("stage_gate"), dict):
            updated["stage_gate"] = {
                "status": "awaiting_learner_decision",
                "updated_at": timestamp,
            }
    else:
        updated.pop("stage_gate", None)

    modules[args.module_id] = updated
    progress["updated_at"] = timestamp
    atomic_write_json(progress_path, progress)
    event = new_event(
        "module_status_changed",
        scope,
        {
            "module_id": args.module_id,
            "from": old_status,
            "to": args.status,
            "source": args.source,
            "assessment_id": args.assessment_id,
            "evidence": evidence,
            "note": args.note,
        },
    )
    append_event(study_dir / "events.jsonl", event)
    return event


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--study-dir", type=Path, required=True)
    parser.add_argument("--module-id", required=True)
    parser.add_argument("--status", choices=sorted(STATUSES), required=True)
    parser.add_argument("--source", choices=sorted(SOURCES), required=True)
    parser.add_argument("--assessment-id")
    parser.add_argument("--evidence", action="append", default=[])
    parser.add_argument("--note")
    parser.add_argument(
        "--reassess",
        action="store_true",
        help="allow an explicitly requested completed -> learning transition",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        event = record(args)
    except StudyDataError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(event, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
