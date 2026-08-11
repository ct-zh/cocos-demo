#!/usr/bin/env python3
"""Record a learner's choice after completing a Cocos learning stage."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from study_common import (
    COMPLETED_STATUSES,
    STAGE_GATE_STATUSES,
    StudyDataError,
    append_event,
    atomic_write_json,
    load_json,
    new_event,
    now_utc,
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
    module = modules.get(args.module_id)
    if not isinstance(module, dict):
        raise StudyDataError("module has no recorded result")
    if module.get("status") not in COMPLETED_STATUSES:
        raise StudyDataError("stage decision requires a completed module")
    gate = module.get("stage_gate")
    if not isinstance(gate, dict) or gate.get("status") not in STAGE_GATE_STATUSES:
        raise StudyDataError("completed module lacks a valid stage gate")

    timestamp = now_utc()
    if args.decision == "question":
        question = args.question.strip() if args.question else ""
        if not question:
            raise StudyDataError("question decision requires a non-empty --question")
        questions = gate.get("questions", [])
        if not isinstance(questions, list):
            raise StudyDataError("stage gate questions must be an array")
        questions = [*questions, {"text": question, "asked_at": timestamp}]
        next_gate = {
            "status": "questions_open",
            "questions": questions,
            "updated_at": timestamp,
        }
        event_data = {"module_id": args.module_id, "decision": "question", "question": question}
    else:
        next_gate = {
            "status": "ready_for_next_stage",
            "updated_at": timestamp,
        }
        if isinstance(gate.get("questions"), list) and gate["questions"]:
            next_gate["questions"] = gate["questions"]
        event_data = {"module_id": args.module_id, "decision": "next"}

    module["stage_gate"] = next_gate
    module["updated_at"] = timestamp
    progress["updated_at"] = timestamp
    atomic_write_json(progress_path, progress)
    event = new_event("stage_decision_recorded", scope, event_data)
    append_event(study_dir / "events.jsonl", event)
    return event


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--study-dir", type=Path, required=True)
    parser.add_argument("--module-id", required=True)
    parser.add_argument("--decision", choices=("next", "question"), required=True)
    parser.add_argument("--question")
    args = parser.parse_args()
    try:
        event = record(args)
    except StudyDataError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(event, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
