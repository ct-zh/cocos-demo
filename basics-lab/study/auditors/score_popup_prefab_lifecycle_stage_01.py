#!/usr/bin/env python3
"""Static structure check for the score-popup acceleration package."""
import argparse, json, re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--script", required=True)
args = parser.parse_args()
path = Path(args.script)
if not path.is_file():
    print(json.dumps({"ok": False, "missing": [f"missing script: {path}"]}))
    raise SystemExit(1)
text = path.read_text(encoding="utf-8")
checks = {
    "Prefab import or use": r"\bPrefab\b",
    "Prefab property": r"@property\(Prefab\)",
    "PopupLayer node property": r"@property\(Node\)",
    "instantiate": r"\binstantiate\s*\(",
    "parent assignment": r"\.setParent\s*\(|\.parent\s*=",
    "tween": r"\btween\s*\(",
    "instance destroy": r"\.destroy\s*\(",
}
missing = [name for name, pattern in checks.items() if not re.search(pattern, text)]
print(json.dumps({"ok": not missing, "checked": list(checks), "missing": missing}, ensure_ascii=False))
raise SystemExit(0 if not missing else 1)
