#!/usr/bin/env python3
"""Persist structural project evidence and mark a registered project inspected."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from audit_git_layout import audit as audit_git
from inspect_cocos_project import inspect as inspect_project
from study_common import (
    StudyDataError,
    append_event,
    atomic_write_json,
    load_json,
    new_event,
    now_utc,
)


def record(root: Path, project: Path) -> dict:
    root = root.resolve()
    project = project.resolve()
    try:
        relative_project = project.relative_to(root).as_posix()
    except ValueError as exc:
        raise StudyDataError("project must be inside the workspace root") from exc

    project_study = project / "study"
    workspace_study = root / "study"
    project_path = project_study / "project.json"
    demos_path = workspace_study / "demos.json"
    project_data = load_json(project_path)
    demos = load_json(demos_path)
    project_id = project_data.get("project_id")
    if not isinstance(project_id, str) or not project_id:
        raise StudyDataError("project.json lacks project_id")
    if project_data.get("path") != relative_project:
        raise StudyDataError("project.json path does not match requested project")
    projects = demos.get("projects")
    if not isinstance(projects, dict) or project_id not in projects:
        raise StudyDataError("project is not registered in workspace demos.json")

    map_path = project_study / "project-map.md"
    try:
        project_map = map_path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise StudyDataError("project-map.md is missing") from exc
    if "Not analyzed yet" in project_map or len(project_map.strip()) < 200:
        raise StudyDataError("project-map.md is still a placeholder")

    inspection = inspect_project(project)
    if not inspection.get("ok"):
        raise StudyDataError(
            "project structural inspection failed: "
            + "; ".join(inspection.get("errors", []))
        )
    if inspection.get("manifest", {}).get("creator_version") != project_data.get("creator_version"):
        raise StudyDataError("Creator version differs from registered project.json")
    git_report = audit_git(root)
    if not git_report.get("ok"):
        raise StudyDataError("Git layout audit failed")

    evidence_dir = project_study / "evidence"
    inspection_path = evidence_dir / "project-inspection.json"
    git_path = evidence_dir / "git-layout.json"
    atomic_write_json(inspection_path, inspection)
    atomic_write_json(git_path, git_report)

    timestamp = now_utc()
    evidence = ["evidence/project-inspection.json", "evidence/git-layout.json"]
    project_data.update(
        {
            "validation_status": "structurally_inspected",
            "runtime_validation_status": "not_verified",
            "inspection_evidence": evidence,
            "last_inspected_at": timestamp,
            "updated_at": timestamp,
        }
    )
    atomic_write_json(project_path, project_data)

    registration = projects[project_id]
    if not isinstance(registration, dict):
        raise StudyDataError("registered demo entry must be an object")
    registration.update(
        {
            "study_status": "structurally_inspected",
            "runtime_validation_status": "not_verified",
            "last_inspected_at": timestamp,
            "updated_at": timestamp,
        }
    )
    demos["updated_at"] = timestamp
    atomic_write_json(demos_path, demos)

    project_event = new_event(
        "project_structurally_inspected",
        "project",
        {
            "project_id": project_id,
            "evidence": evidence,
            "runtime_validation_status": "not_verified",
        },
    )
    workspace_event = new_event(
        "project_structurally_inspected",
        "workspace",
        {
            "project_id": project_id,
            "path": relative_project,
            "runtime_validation_status": "not_verified",
        },
    )
    append_event(project_study / "events.jsonl", project_event)
    append_event(workspace_study / "events.jsonl", workspace_event)
    return {
        "ok": True,
        "project_id": project_id,
        "validation_status": "structurally_inspected",
        "runtime_validation_status": "not_verified",
        "evidence": evidence,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--project", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = record(args.root, args.project)
    except StudyDataError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
