#!/usr/bin/env python3
"""Classify workspace Git boundaries without changing repository state."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

PRUNED_DIRECTORIES = {
    "build",
    "library",
    "local",
    "native",
    "node_modules",
    "profiles",
    "temp",
}


def run_git(git: str, repository: Path, *args: str) -> tuple[int, str, str]:
    result = subprocess.run(
        [git, "-C", str(repository), *args],
        text=True,
        capture_output=True,
        check=False,
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def find_boundaries(root: Path) -> list[Path]:
    boundaries: list[Path] = []
    for current, dirs, files in os.walk(root):
        dirs[:] = sorted(name for name in dirs if name not in PRUNED_DIRECTORIES)
        current_path = Path(current)
        if ".git" in dirs:
            boundaries.append(current_path)
            dirs.remove(".git")
        elif ".git" in files:
            boundaries.append(current_path)
        if current_path != root and current_path in boundaries:
            dirs[:] = []
    return sorted(set(boundaries))


def parse_remotes(output: str) -> list[dict[str, str]]:
    values: list[dict[str, str]] = []
    for line in output.splitlines():
        parts = line.split()
        if len(parts) >= 3:
            values.append(
                {
                    "name": parts[0],
                    "url": parts[1],
                    "direction": parts[2].strip("()"),
                }
            )
    return values


def inspect_boundary(git: str, root: Path, repository: Path) -> dict[str, Any]:
    marker = repository / ".git"
    marker_kind = "directory" if marker.is_dir() else "file" if marker.is_file() else "missing"
    inside_code, inside, inside_error = run_git(git, repository, "rev-parse", "--is-inside-work-tree")
    if inside_code != 0 or inside != "true":
        return {
            "path": repository.relative_to(root).as_posix() or ".",
            "marker_kind": marker_kind,
            "classification": "invalid_git_boundary",
            "cleanup_eligibility": "unknown",
            "errors": [inside_error or "not recognized as a Git worktree"],
        }

    count_code, count_text, count_error = run_git(git, repository, "rev-list", "--count", "--all")
    commit_count = int(count_text) if count_code == 0 and count_text.isdigit() else None
    remote_code, remote_text, remote_error = run_git(git, repository, "remote", "-v")
    remotes = parse_remotes(remote_text) if remote_code == 0 else []
    status_code, status_text, status_error = run_git(
        git, repository, "status", "--porcelain=v1", "--untracked-files=normal"
    )
    status_lines = status_text.splitlines() if status_code == 0 and status_text else []
    branch_code, branch, _ = run_git(git, repository, "symbolic-ref", "--short", "HEAD")
    super_code, superproject, _ = run_git(
        git, repository, "rev-parse", "--show-superproject-working-tree"
    )
    is_submodule = super_code == 0 and bool(superproject)

    errors = []
    for code, error, label in (
        (count_code, count_error, "commit count"),
        (remote_code, remote_error, "remotes"),
        (status_code, status_error, "status"),
    ):
        if code != 0:
            errors.append(f"failed to read {label}: {error}")

    if repository == root:
        classification = "workspace_repository"
        eligibility = "not_applicable"
    elif is_submodule:
        classification = "submodule"
        eligibility = "not_eligible"
    elif marker_kind == "file":
        classification = "linked_worktree_or_external_gitdir"
        eligibility = "not_eligible"
    elif commit_count is None:
        classification = "repository_state_unknown"
        eligibility = "unknown"
    elif remotes:
        classification = "repository_with_remote"
        eligibility = "not_eligible"
    elif commit_count > 0:
        classification = "repository_with_history"
        eligibility = "not_eligible"
    else:
        classification = "empty_repository_no_remote"
        eligibility = "requires_explicit_confirmation"

    return {
        "path": repository.relative_to(root).as_posix() or ".",
        "marker_kind": marker_kind,
        "classification": classification,
        "cleanup_eligibility": eligibility,
        "commit_count": commit_count,
        "remotes": remotes,
        "branch": branch if branch_code == 0 else None,
        "is_submodule": is_submodule,
        "superproject": superproject or None,
        "dirty": bool(status_lines),
        "status_entry_count": len(status_lines),
        "status_preview": status_lines[:20],
        "errors": errors,
    }


def audit(root: Path) -> dict[str, Any]:
    root = root.resolve()
    if not root.is_dir():
        return {"ok": False, "root": str(root), "boundaries": [], "errors": ["root is not a directory"]}
    git = shutil.which("git")
    if git is None:
        return {"ok": False, "root": str(root), "boundaries": [], "errors": ["git executable not found"]}
    boundaries = [inspect_boundary(git, root, path) for path in find_boundaries(root)]
    return {
        "ok": all(not item.get("errors") for item in boundaries),
        "root": str(root),
        "workspace_repository": any(item["path"] == "." for item in boundaries),
        "boundary_count": len(boundaries),
        "boundaries": boundaries,
        "errors": [],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    result = audit(args.root)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
