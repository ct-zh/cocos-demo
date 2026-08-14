#!/usr/bin/env python3
"""Static structural checks for the round-state acceleration package."""

import argparse
import json
import re
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--script", required=True)
    args = parser.parse_args()

    source = Path(args.script)
    if not source.is_file():
        print(json.dumps({"ok": False, "issues": [f"missing script: {source}"]}))
        return 1

    text = source.read_text(encoding="utf-8")
    checks = {
        "round enum": r"\benum\s+\w+",
        "onEnable lifecycle hook": r"\bonEnable\s*\(",
        "onDisable lifecycle hook": r"\bonDisable\s*\(",
        "global keyboard registration": r"\binput\.on\s*\(",
        "global keyboard cleanup": r"\binput\.off\s*\(",
        "KEY_DOWN event": r"Input\.EventType\.KEY_DOWN",
        "Space key handling": r"KeyCode\.SPACE",
        "R key handling": r"KeyCode\.KEY_R",
        "frame update": r"\bupdate\s*\(\s*deltaTime",
        "button interactable rendering": r"\.interactable\s*=",
    }
    missing = [name for name, pattern in checks.items() if not re.search(pattern, text)]
    print(json.dumps({"ok": not missing, "checked": list(checks), "missing": missing}, ensure_ascii=False))
    return 0 if not missing else 1


if __name__ == "__main__":
    raise SystemExit(main())
