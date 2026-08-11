#!/usr/bin/env python3
"""Audit study snapshots, events, states, and evidence without modifying them."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from study_common import (
    COMPLETED_STATUSES,
    MODULE_ID_RE,
    SCHEMA_VERSION,
    SOURCES,
    STAGE_GATE_STATUSES,
    STATUSES,
    StudyDataError,
    load_json,
    parse_rfc3339,
)

ROADMAP_STATUSES = {"planned", "active", "paused"}
PROJECT_VALIDATION_STATUSES = {"not_inspected", "structurally_inspected"}
RUNTIME_VALIDATION_STATUSES = {"not_verified", "verified"}


def issue(issues: list[dict[str, str]], code: str, message: str) -> None:
    issues.append({"code": code, "message": message})


def load_for_audit(path: Path, issues: list[dict[str, str]]) -> dict[str, Any] | None:
    try:
        return load_json(path)
    except StudyDataError as exc:
        issue(issues, "json", str(exc))
        return None


def audit_snapshot_header(
    value: dict[str, Any],
    label: str,
    issues: list[dict[str, str]],
    expected_scope: str | None = None,
) -> None:
    if value.get("schema_version") != SCHEMA_VERSION:
        issue(issues, "schema_version", f"{label} schema_version must be 1")
    if expected_scope is not None and value.get("scope") != expected_scope:
        issue(issues, "scope", f"{label} scope must be {expected_scope}")
    try:
        parse_rfc3339(value.get("updated_at"), f"{label}.updated_at")
    except StudyDataError as exc:
        issue(issues, "timestamp", str(exc))


def audit_companion_files(study_dir: Path, scope: str, issues: list[dict[str, str]]) -> None:
    roadmap = load_for_audit(study_dir / "roadmap.json", issues)
    if roadmap is not None:
        audit_snapshot_header(roadmap, "roadmap", issues, scope)
        roadmap_modules = roadmap.get("modules")
        if not isinstance(roadmap_modules, dict):
            issue(issues, "roadmap_modules", "roadmap modules must be an object")
            roadmap_modules = {}
        active = roadmap.get("active_module")
        if active is not None and (not isinstance(active, str) or not MODULE_ID_RE.fullmatch(active)):
            issue(issues, "active_module", "roadmap active_module must be null or a valid module ID")
        elif active is not None and active not in roadmap_modules:
            issue(issues, "active_module", "roadmap active_module is not present in modules")
        orders: set[int] = set()
        for module_id, module in roadmap_modules.items():
            if not isinstance(module_id, str) or not MODULE_ID_RE.fullmatch(module_id):
                issue(issues, "roadmap_module_id", f"invalid roadmap module ID: {module_id}")
                continue
            if not isinstance(module, dict):
                issue(issues, "roadmap_module", f"roadmap module {module_id} must be an object")
                continue
            order = module.get("order")
            if not isinstance(order, int) or isinstance(order, bool) or order < 1:
                issue(issues, "roadmap_order", f"roadmap module {module_id} order must be a positive integer")
            elif order in orders:
                issue(issues, "roadmap_order", f"duplicate roadmap order: {order}")
            else:
                orders.add(order)
            if module.get("status") not in ROADMAP_STATUSES:
                issue(issues, "roadmap_status", f"roadmap module {module_id} has invalid status")
            if not isinstance(module.get("title"), str) or not module.get("title"):
                issue(issues, "roadmap_title", f"roadmap module {module_id} title must be non-empty")
            objectives = module.get("objectives")
            if not isinstance(objectives, list) or not objectives or not all(
                isinstance(item, str) and item for item in objectives
            ):
                issue(issues, "roadmap_objectives", f"roadmap module {module_id} objectives must be a non-empty string array")
            prerequisites = module.get("prerequisites")
            if not isinstance(prerequisites, list) or not all(
                isinstance(item, str) and MODULE_ID_RE.fullmatch(item) for item in prerequisites
            ):
                issue(issues, "roadmap_prerequisites", f"roadmap module {module_id} prerequisites must contain valid module IDs")
            elif module_id in prerequisites:
                issue(issues, "roadmap_prerequisites", f"roadmap module {module_id} cannot depend on itself")
        active_records = [
            module_id
            for module_id, module in roadmap_modules.items()
            if isinstance(module, dict) and module.get("status") == "active"
        ]
        if active is None and active_records:
            issue(issues, "active_module", "roadmap has active module status but active_module is null")
        if active is not None and active_records != [active]:
            issue(issues, "active_module", "roadmap active_module must be the only module with active status")

    if scope == "workspace":
        profile = load_for_audit(study_dir / "profile.json", issues)
        if profile is not None:
            audit_snapshot_header(profile, "profile", issues)
            try:
                parse_rfc3339(profile.get("created_at"), "profile.created_at")
            except StudyDataError as exc:
                issue(issues, "timestamp", str(exc))
            if not isinstance(profile.get("backgrounds"), list):
                issue(issues, "backgrounds", "profile backgrounds must be an array")
            if not isinstance(profile.get("preferences"), dict):
                issue(issues, "preferences", "profile preferences must be an object")

        demos = load_for_audit(study_dir / "demos.json", issues)
        if demos is not None:
            audit_snapshot_header(demos, "demos", issues)
            if not isinstance(demos.get("projects"), dict):
                issue(issues, "projects", "demos projects must be an object")
            else:
                for project_id, registration in demos["projects"].items():
                    if not isinstance(project_id, str) or not MODULE_ID_RE.fullmatch(project_id):
                        issue(issues, "registered_project_id", f"invalid registered project ID: {project_id}")
                        continue
                    if not isinstance(registration, dict):
                        issue(issues, "registered_project", f"registered project {project_id} must be an object")
                        continue
                    status = registration.get("study_status")
                    if status not in {"initialized", "structurally_inspected"}:
                        issue(issues, "registered_project_status", f"registered project {project_id} has invalid study_status")
                    runtime = registration.get("runtime_validation_status")
                    if runtime is not None and runtime not in RUNTIME_VALIDATION_STATUSES:
                        issue(issues, "runtime_validation", f"registered project {project_id} has invalid runtime status")
                    path = registration.get("path")
                    if not isinstance(path, str) or not path:
                        issue(issues, "registered_project_path", f"registered project {project_id} lacks path")
                    elif not (study_dir.parent / path / "study" / "project.json").is_file():
                        issue(issues, "registered_project_path", f"registered project {project_id} study data is missing")
            if not isinstance(demos.get("pending_creations"), list):
                issue(issues, "pending_creations", "demos pending_creations must be an array")
    elif scope == "project":
        project = load_for_audit(study_dir / "project.json", issues)
        if project is not None:
            audit_snapshot_header(project, "project", issues)
            try:
                parse_rfc3339(project.get("created_at"), "project.created_at")
            except StudyDataError as exc:
                issue(issues, "timestamp", str(exc))
            project_id = project.get("project_id")
            if not isinstance(project_id, str) or not MODULE_ID_RE.fullmatch(project_id):
                issue(issues, "project_id", "project project_id must be a lower-case stable ID")
            if not isinstance(project.get("name"), str) or not project.get("name"):
                issue(issues, "project_name", "project name must be a non-empty string")
            if not isinstance(project.get("path"), str) or not project.get("path"):
                issue(issues, "project_path", "project path must be a non-empty string")
            version = project.get("creator_version")
            if version is not None and not isinstance(version, str):
                issue(issues, "creator_version", "project creator_version must be a string or null")
            validation = project.get("validation_status")
            if validation not in PROJECT_VALIDATION_STATUSES:
                issue(issues, "project_validation", "project validation_status is invalid")
            runtime = project.get("runtime_validation_status")
            if runtime is not None and runtime not in RUNTIME_VALIDATION_STATUSES:
                issue(issues, "runtime_validation", "project runtime_validation_status is invalid")
            if validation == "structurally_inspected":
                evidence = project.get("inspection_evidence")
                if not isinstance(evidence, list) or not evidence:
                    issue(issues, "inspection_evidence", "structurally inspected project lacks evidence")
                else:
                    for item in evidence:
                        if not isinstance(item, str) or not (study_dir / item).is_file():
                            issue(issues, "inspection_evidence", f"project inspection evidence is missing: {item}")
                try:
                    parse_rfc3339(project.get("last_inspected_at"), "project.last_inspected_at")
                except StudyDataError as exc:
                    issue(issues, "timestamp", str(exc))


def audit_progress(study_dir: Path) -> dict[str, Any]:
    study_dir = study_dir.resolve()
    issues: list[dict[str, str]] = []
    try:
        progress = load_json(study_dir / "progress.json")
    except StudyDataError as exc:
        return {"ok": False, "study_dir": str(study_dir), "issues": [{"code": "progress", "message": str(exc)}]}

    scope = progress.get("scope")
    if progress.get("schema_version") != SCHEMA_VERSION:
        issue(issues, "schema_version", "progress schema_version must be 1")
    if scope not in {"workspace", "project"}:
        issue(issues, "scope", "progress scope must be workspace or project")
    try:
        parse_rfc3339(progress.get("updated_at"), "progress.updated_at")
    except StudyDataError as exc:
        issue(issues, "timestamp", str(exc))

    modules = progress.get("modules")
    if not isinstance(modules, dict):
        issue(issues, "modules", "progress modules must be an object")
        modules = {}
    for module_id, record in modules.items():
        if not isinstance(module_id, str) or not MODULE_ID_RE.fullmatch(module_id):
            issue(issues, "module_id", f"invalid module ID: {module_id}")
            continue
        if not isinstance(record, dict):
            issue(issues, "module_record", f"module {module_id} must be an object")
            continue
        status = record.get("status")
        source = record.get("source")
        if status not in STATUSES:
            issue(issues, "status", f"module {module_id} has invalid status: {status}")
        if source not in SOURCES:
            issue(issues, "source", f"module {module_id} has invalid source: {source}")
        try:
            parse_rfc3339(record.get("updated_at"), f"modules.{module_id}.updated_at")
        except StudyDataError as exc:
            issue(issues, "timestamp", str(exc))
        evidence = record.get("evidence", [])
        if not isinstance(evidence, list) or not all(isinstance(item, str) for item in evidence):
            issue(issues, "evidence", f"module {module_id} evidence must be a string array")
            evidence = []
        for item in evidence:
            if not (study_dir / item).resolve().exists():
                issue(issues, "missing_evidence", f"module {module_id} evidence is missing: {item}")
        if status in COMPLETED_STATUSES:
            if not record.get("assessment_id"):
                issue(issues, "assessment", f"module {module_id} completion lacks assessment_id")
            if not evidence:
                issue(issues, "evidence", f"module {module_id} completion lacks evidence")
            gate = record.get("stage_gate")
            if not isinstance(gate, dict):
                issue(issues, "stage_gate", f"module {module_id} completion lacks stage_gate")
            else:
                gate_status = gate.get("status")
                if gate_status not in STAGE_GATE_STATUSES:
                    issue(issues, "stage_gate", f"module {module_id} has invalid stage gate status")
                try:
                    parse_rfc3339(gate.get("updated_at"), f"modules.{module_id}.stage_gate.updated_at")
                except StudyDataError as exc:
                    issue(issues, "timestamp", str(exc))
                questions = gate.get("questions", [])
                if not isinstance(questions, list):
                    issue(issues, "stage_gate_questions", f"module {module_id} stage gate questions must be an array")
                elif gate_status == "questions_open" and not questions:
                    issue(issues, "stage_gate_questions", f"module {module_id} questions_open gate lacks questions")
                else:
                    for question in questions:
                        if not isinstance(question, dict) or not isinstance(question.get("text"), str) or not question["text"].strip():
                            issue(issues, "stage_gate_questions", f"module {module_id} has invalid stage question")
                            continue
                        try:
                            parse_rfc3339(question.get("asked_at"), f"modules.{module_id}.stage_gate.question.asked_at")
                        except StudyDataError as exc:
                            issue(issues, "timestamp", str(exc))

    event_ids: set[str] = set()
    events_path = study_dir / "events.jsonl"
    if not events_path.exists():
        issue(issues, "events", "events.jsonl is missing")
    else:
        for line_number, line in enumerate(events_path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                issue(issues, "event_blank", f"events.jsonl line {line_number} is blank")
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError as exc:
                issue(issues, "event_json", f"events.jsonl line {line_number}: {exc}")
                continue
            if not isinstance(event, dict):
                issue(issues, "event_type", f"events.jsonl line {line_number} is not an object")
                continue
            event_id = event.get("event_id")
            if not isinstance(event_id, str) or not event_id:
                issue(issues, "event_id", f"events.jsonl line {line_number} lacks event_id")
            elif event_id in event_ids:
                issue(issues, "event_duplicate", f"duplicate event_id: {event_id}")
            else:
                event_ids.add(event_id)
            if event.get("schema_version") != SCHEMA_VERSION:
                issue(issues, "event_schema", f"events.jsonl line {line_number} schema_version must be 1")
            if event.get("scope") != scope:
                issue(issues, "event_scope", f"events.jsonl line {line_number} scope does not match progress")
            try:
                parse_rfc3339(event.get("timestamp"), f"events line {line_number} timestamp")
            except StudyDataError as exc:
                issue(issues, "timestamp", str(exc))
            if not isinstance(event.get("type"), str) or not event.get("type"):
                issue(issues, "event_name", f"events.jsonl line {line_number} lacks type")
            if not isinstance(event.get("data"), dict):
                issue(issues, "event_data", f"events.jsonl line {line_number} data must be an object")

    required = ["README.md", "roadmap.json"]
    if scope == "workspace":
        required.extend(["profile.json", "demos.json"])
    elif scope == "project":
        required.extend(["project.json", "project-map.md"])
    for name in required:
        if not (study_dir / name).exists():
            issue(issues, "missing_file", f"required file is missing: {name}")
    audit_companion_files(study_dir, scope, issues)

    return {
        "ok": not issues,
        "study_dir": str(study_dir),
        "scope": scope,
        "module_count": len(modules),
        "event_count": len(event_ids),
        "issues": issues,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--study-dir", type=Path, required=True)
    args = parser.parse_args()
    result = audit_progress(args.study_dir)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
