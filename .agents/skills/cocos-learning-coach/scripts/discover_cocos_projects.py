#!/usr/bin/env python3
"""Discover Cocos Creator projects below a workspace without modifying them."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

PRUNED_DIRECTORIES = {
    ".agents",
    ".git",
    ".idea",
    ".vscode",
    "build",
    "library",
    "local",
    "native",
    "node_modules",
    "profiles",
    "study",
    "temp",
}


def read_manifest(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def classify_project(project: Path, root: Path, manifest: dict[str, Any]) -> dict[str, Any] | None:
    creator = manifest.get("creator")
    if not isinstance(creator, dict) or not isinstance(creator.get("version"), str):
        return None
    required = {
        "assets": (project / "assets").is_dir(),
        "settings": (project / "settings").is_dir(),
        "tsconfig.json": (project / "tsconfig.json").is_file(),
    }
    name = manifest.get("name") if isinstance(manifest.get("name"), str) else project.name
    return {
        "path": project.relative_to(root).as_posix() or ".",
        "name": name,
        "uuid": manifest.get("uuid") if isinstance(manifest.get("uuid"), str) else None,
        "creator_version": creator["version"],
        "required_structure": required,
        "structure_complete": all(required.values()),
        "has_project_study": (project / "study" / "project.json").is_file(),
        "has_git_boundary": (project / ".git").exists(),
    }


def discover(root: Path) -> dict[str, Any]:
    root = root.resolve()
    projects: list[dict[str, Any]] = []
    if not root.is_dir():
        return {"ok": False, "root": str(root), "projects": [], "errors": ["root is not a directory"]}

    for current, dirs, files in os.walk(root):
        dirs[:] = sorted(name for name in dirs if name not in PRUNED_DIRECTORIES)
        if "package.json" not in files:
            continue
        project = Path(current)
        manifest = read_manifest(project / "package.json")
        if manifest is None:
            continue
        result = classify_project(project, root, manifest)
        if result is not None:
            projects.append(result)
            dirs[:] = []

    projects.sort(key=lambda item: item["path"])
    return {
        "ok": True,
        "root": str(root),
        "project_count": len(projects),
        "projects": projects,
        "errors": [],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    result = discover(args.root)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
