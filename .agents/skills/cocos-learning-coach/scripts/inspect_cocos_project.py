#!/usr/bin/env python3
"""Produce a deterministic structural inventory of one Cocos Creator project."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

CCCLASS_RE = re.compile(r"@ccclass\(\s*['\"]([^'\"]+)['\"]\s*\)")
LIFECYCLE_RE = re.compile(
    r"(?:public\s+|protected\s+|private\s+)?"
    r"(onLoad|start|onEnable|onDisable|update|lateUpdate|onDestroy)\s*\("
)
CC_IMPORT_RE = re.compile(r"import\s*\{([^}]+)\}\s*from\s*['\"]cc['\"]", re.DOTALL)
UUID_HEX_RE = re.compile(r"^[0-9a-fA-F]{32}$")
BASE64_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"


def read_json(path: Path) -> tuple[Any | None, str | None]:
    try:
        return json.loads(path.read_text(encoding="utf-8")), None
    except FileNotFoundError:
        return None, "missing"
    except json.JSONDecodeError as exc:
        return None, f"invalid JSON: {exc}"
    except OSError as exc:
        return None, str(exc)


def relative_files(base: Path, pattern: str) -> list[Path]:
    return sorted(path for path in base.rglob(pattern) if path.is_file()) if base.is_dir() else []


def compress_cocos_uuid(value: str) -> str | None:
    compact = value.replace("-", "")
    if not UUID_HEX_RE.fullmatch(compact):
        return None
    result = compact[:5]
    for index in range(5, len(compact), 3):
        number = int(compact[index:index + 3], 16)
        result += BASE64_KEYS[number >> 6] + BASE64_KEYS[number & 63]
    return result


def summarize_script(path: Path, project: Path) -> dict[str, Any]:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return {"path": path.relative_to(project).as_posix(), "readable": False}
    imports: list[str] = []
    for match in CC_IMPORT_RE.finditer(text):
        imports.extend(part.strip() for part in match.group(1).split(",") if part.strip())
    meta, meta_error = read_json(Path(f"{path}.meta"))
    meta_uuid = meta.get("uuid") if meta_error is None and isinstance(meta, dict) and isinstance(meta.get("uuid"), str) else None
    return {
        "path": path.relative_to(project).as_posix(),
        "readable": True,
        "line_count": len(text.splitlines()),
        "ccclasses": sorted(set(CCCLASS_RE.findall(text))),
        "lifecycle_methods": sorted(set(LIFECYCLE_RE.findall(text))),
        "cc_imports": sorted(set(imports)),
        "meta_uuid": meta_uuid,
        "serialized_type_id": compress_cocos_uuid(meta_uuid) if meta_uuid else None,
    }


def component_type(value: Any) -> str | None:
    return value.get("__type__") if isinstance(value, dict) and isinstance(value.get("__type__"), str) else None


def summarize_scene(
    path: Path,
    project: Path,
    custom_type_map: dict[str, str],
) -> tuple[dict[str, Any], list[str]]:
    value, error = read_json(path)
    relative = path.relative_to(project).as_posix()
    if error is not None or not isinstance(value, list):
        reason = error or "scene root must be a JSON array"
        return {"path": relative, "readable": False, "error": reason}, [f"{relative}: {reason}"]

    scene_name = None
    nodes: list[dict[str, Any]] = []
    builtins: Counter[str] = Counter()
    custom_types: Counter[str] = Counter()
    resolved_custom_scripts: Counter[str] = Counter()
    for item in value:
        item_type = component_type(item)
        if item_type == "cc.SceneAsset" and isinstance(item.get("_name"), str):
            scene_name = item["_name"]
        if item_type == "cc.Node":
            component_names: list[str] = []
            for reference in item.get("_components", []):
                if not isinstance(reference, dict) or not isinstance(reference.get("__id__"), int):
                    continue
                index = reference["__id__"]
                if 0 <= index < len(value):
                    found = component_type(value[index])
                    if found:
                        component_names.append(found)
                        if found.startswith("cc."):
                            builtins[found] += 1
                        else:
                            custom_types[found] += 1
                            resolved = custom_type_map.get(found)
                            if resolved:
                                resolved_custom_scripts[resolved] += 1
            nodes.append(
                {
                    "name": item.get("_name") if isinstance(item.get("_name"), str) else None,
                    "active": item.get("_active") if isinstance(item.get("_active"), bool) else None,
                    "components": component_names,
                }
            )
    return (
        {
            "path": relative,
            "readable": True,
            "name": scene_name,
            "node_count": len(nodes),
            "nodes": nodes,
            "builtin_component_counts": dict(sorted(builtins.items())),
            "custom_component_type_counts": dict(sorted(custom_types.items())),
            "resolved_custom_script_counts": dict(sorted(resolved_custom_scripts.items())),
        },
        [],
    )


def inspect_engine_settings(project: Path) -> dict[str, Any]:
    path = project / "settings" / "v2" / "packages" / "engine.json"
    value, error = read_json(path)
    result: dict[str, Any] = {"path": path.relative_to(project).as_posix(), "readable": error is None}
    if error is not None:
        result["error"] = error
        return result
    modules = value.get("modules") if isinstance(value, dict) else None
    configs = modules.get("configs") if isinstance(modules, dict) else None
    default = configs.get("defaultConfig") if isinstance(configs, dict) else None
    included = default.get("includeModules") if isinstance(default, dict) else None
    result["included_modules"] = sorted(item for item in included if isinstance(item, str)) if isinstance(included, list) else []
    return result


def inspect(project: Path) -> dict[str, Any]:
    project = project.resolve()
    errors: list[str] = []
    warnings: list[str] = []
    if not project.is_dir():
        return {"ok": False, "project": str(project), "errors": ["project is not a directory"], "warnings": []}

    manifest, manifest_error = read_json(project / "package.json")
    if manifest_error is not None or not isinstance(manifest, dict):
        return {
            "ok": False,
            "project": str(project),
            "errors": [f"package.json: {manifest_error or 'root must be an object'}"],
            "warnings": [],
        }
    creator = manifest.get("creator")
    version = creator.get("version") if isinstance(creator, dict) else None
    if not isinstance(version, str):
        errors.append("package.json does not contain creator.version")

    structure = {
        "assets": (project / "assets").is_dir(),
        "settings": (project / "settings").is_dir(),
        "tsconfig.json": (project / "tsconfig.json").is_file(),
    }
    for required in ("assets", "settings"):
        if not structure[required]:
            errors.append(f"missing required project path: {required}")
    if not structure["tsconfig.json"]:
        warnings.append("tsconfig.json is missing")

    assets = project / "assets"
    scene_paths = relative_files(assets, "*.scene")
    script_paths = relative_files(assets, "*.ts")
    prefab_paths = relative_files(assets, "*.prefab")
    scripts = [summarize_script(path, project) for path in script_paths]
    custom_type_map = {
        item["serialized_type_id"]: item["path"]
        for item in scripts
        if item.get("serialized_type_id")
    }
    scenes: list[dict[str, Any]] = []
    for path in scene_paths:
        summary, scene_errors = summarize_scene(path, project, custom_type_map)
        scenes.append(summary)
        errors.extend(scene_errors)
    if not scenes:
        warnings.append("no .scene files found under assets")
    if not scripts:
        warnings.append("no TypeScript files found under assets")

    extension_counts: Counter[str] = Counter()
    non_meta_assets: list[str] = []
    if assets.is_dir():
        for path in sorted(item for item in assets.rglob("*") if item.is_file()):
            if path.suffix == ".meta" or path.name == ".DS_Store":
                continue
            extension_counts[path.suffix.lower() or "<none>"] += 1
            non_meta_assets.append(path.relative_to(project).as_posix())
    resources = project / "assets" / "resources"
    resource_files = [
        path.relative_to(resources).as_posix()
        for path in sorted(item for item in resources.rglob("*") if item.is_file())
        if path.suffix != ".meta" and path.name != ".DS_Store"
    ] if resources.is_dir() else []

    return {
        "ok": not errors,
        "project": str(project),
        "manifest": {
            "name": manifest.get("name"),
            "uuid": manifest.get("uuid"),
            "creator_version": version,
        },
        "structure": structure,
        "generated_directories_present": sorted(
            name for name in ("library", "temp", "build", "profiles", "node_modules") if (project / name).exists()
        ),
        "asset_summary": {
            "non_meta_count": len(non_meta_assets),
            "extension_counts": dict(sorted(extension_counts.items())),
            "scene_count": len(scenes),
            "script_count": len(scripts),
            "prefab_count": len(prefab_paths),
            "resource_files": resource_files,
        },
        "scenes": scenes,
        "scripts": scripts,
        "engine_settings": inspect_engine_settings(project),
        "startup_scene": {"status": "unknown", "reason": "not proven by inspected stable project files"},
        "project_study_initialized": (project / "study" / "project.json").is_file(),
        "git_boundary_present": (project / ".git").exists(),
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, required=True)
    args = parser.parse_args()
    result = inspect(args.project)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
