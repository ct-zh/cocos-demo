#!/usr/bin/env python3
"""Initialize workspace- or project-scoped study storage without overwriting data."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from study_common import (
    SCHEMA_VERSION,
    StudyDataError,
    append_event,
    atomic_write_json,
    load_json,
    new_event,
    now_utc,
    write_json_if_missing,
    write_text_if_missing,
)

WORKSPACE_README = """# Cocos learning record

This directory stores cross-project learning state. Use the `cocos-learning-coach` scripts to mutate JSON snapshots and append events; do not hand-edit `events.jsonl`.
"""

PROJECT_README = """# Project learning record

This directory stores project-specific maps, exercises, assessments, evidence, auditors, and progress. It is intentionally outside the Cocos `assets/` directory.
"""

PROJECT_MAP = """# Project map

Not analyzed yet. Generate this map from inspected project evidence before starting project-understanding modules.
"""


def slug(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not normalized:
        raise StudyDataError("could not derive a project ID; pass --project-id")
    return normalized


def base_progress(scope: str, timestamp: str) -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "scope": scope,
        "updated_at": timestamp,
        "modules": {},
    }


def base_roadmap(scope: str, timestamp: str) -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "scope": scope,
        "active_module": None,
        "updated_at": timestamp,
        "modules": {},
    }


def init_workspace(root: Path, backgrounds: list[str]) -> None:
    root = root.resolve()
    study = root / "study"
    timestamp = now_utc()
    created = not study.exists()
    study.mkdir(parents=True, exist_ok=True)
    for name in ("evidence", "retrospectives"):
        (study / name).mkdir(exist_ok=True)

    write_text_if_missing(study / "README.md", WORKSPACE_README)
    write_json_if_missing(
        study / "profile.json",
        {
            "schema_version": SCHEMA_VERSION,
            "created_at": timestamp,
            "updated_at": timestamp,
            "backgrounds": [
                {"description": item, "source": "user_confirmed"} for item in backgrounds
            ],
            "preferences": {
                "assessment_question_count": {"min": 2, "max": 3},
                "core_code_owner": "learner",
                "demo_creation": "ask_each_time",
                "deterministic_audits": "prefer",
                "interactive_questions": "prefer_when_available",
                "stage_review": "required",
            },
        },
    )
    write_json_if_missing(study / "roadmap.json", base_roadmap("workspace", timestamp))
    write_json_if_missing(
        study / "demos.json",
        {
            "schema_version": SCHEMA_VERSION,
            "updated_at": timestamp,
            "projects": {},
            "pending_creations": [],
        },
    )
    write_json_if_missing(study / "progress.json", base_progress("workspace", timestamp))
    events = study / "events.jsonl"
    if not events.exists():
        append_event(
            events,
            new_event(
                "study_initialized",
                "workspace",
                {"root": ".", "background_count": len(backgrounds)},
            ),
        )
    action = "created" if created else "verified"
    print(json.dumps({"action": action, "scope": "workspace", "study_dir": str(study)}))


def read_creator_manifest(project: Path) -> tuple[str, str | None]:
    manifest_path = project / "package.json"
    manifest = load_json(manifest_path)
    name = manifest.get("name")
    if not isinstance(name, str) or not name:
        name = project.name
    creator = manifest.get("creator")
    version = creator.get("version") if isinstance(creator, dict) else None
    if version is not None and not isinstance(version, str):
        raise StudyDataError(f"creator.version must be a string in {manifest_path}")
    return name, version


def init_project(
    root: Path,
    project: Path,
    project_id: str | None,
    created_by: str,
) -> None:
    root = root.resolve()
    project = project.resolve()
    if not project.is_dir():
        raise StudyDataError(f"project directory does not exist: {project}")
    try:
        relative_project = project.relative_to(root)
    except ValueError as exc:
        raise StudyDataError("project must be inside the workspace root") from exc
    workspace_study = root / "study"
    if not (workspace_study / "demos.json").exists():
        raise StudyDataError("workspace study is not initialized")

    name, creator_version = read_creator_manifest(project)
    stable_id = project_id or slug(project.name)
    timestamp = now_utc()
    study = project / "study"
    created = not study.exists()
    study.mkdir(parents=True, exist_ok=True)
    for name_part in (
        "exercises",
        "assessments",
        "retrospectives",
        "evidence",
        "auditors",
    ):
        (study / name_part).mkdir(exist_ok=True)

    write_text_if_missing(study / "README.md", PROJECT_README)
    write_text_if_missing(study / "project-map.md", PROJECT_MAP)
    write_json_if_missing(
        study / "project.json",
        {
            "schema_version": SCHEMA_VERSION,
            "project_id": stable_id,
            "name": name,
            "path": relative_project.as_posix(),
            "creator_version": creator_version,
            "created_by": created_by,
            "validation_status": "not_inspected",
            "created_at": timestamp,
            "updated_at": timestamp,
        },
    )
    write_json_if_missing(study / "roadmap.json", base_roadmap("project", timestamp))
    write_json_if_missing(study / "progress.json", base_progress("project", timestamp))
    events = study / "events.jsonl"
    if not events.exists():
        append_event(
            events,
            new_event(
                "study_initialized",
                "project",
                {"project_id": stable_id, "path": relative_project.as_posix()},
            ),
        )

    demos_path = workspace_study / "demos.json"
    demos = load_json(demos_path)
    projects = demos.setdefault("projects", {})
    if not isinstance(projects, dict):
        raise StudyDataError("demos.json projects must be an object")
    existing = projects.get(stable_id)
    registration = {
        "name": name,
        "path": relative_project.as_posix(),
        "creator_version": creator_version,
        "study_status": "initialized",
        "updated_at": timestamp,
    }
    if existing is not None and existing.get("path") != registration["path"]:
        raise StudyDataError(f"project ID already registered with another path: {stable_id}")
    projects[stable_id] = {**existing, **registration} if isinstance(existing, dict) else registration
    demos["updated_at"] = timestamp
    atomic_write_json(demos_path, demos)

    action = "created" if created else "verified"
    print(
        json.dumps(
            {
                "action": action,
                "scope": "project",
                "project_id": stable_id,
                "study_dir": str(study),
            }
        )
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    workspace = subparsers.add_parser("workspace", help="initialize root study storage")
    workspace.add_argument("--root", type=Path, required=True)
    workspace.add_argument("--background", action="append", default=[])

    project = subparsers.add_parser("project", help="initialize and register project study storage")
    project.add_argument("--root", type=Path, required=True)
    project.add_argument("--project", type=Path, required=True)
    project.add_argument("--project-id")
    project.add_argument(
        "--created-by",
        choices=("manual", "agent", "existing"),
        required=True,
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        if args.command == "workspace":
            init_workspace(args.root, args.background)
        else:
            init_project(args.root, args.project, args.project_id, args.created_by)
    except StudyDataError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
