#!/usr/bin/env python3
"""Conservative static structure check for the popup-pool learning exercise."""
import argparse
import json
import re
from pathlib import Path


parser = argparse.ArgumentParser()
parser.add_argument("--script", required=True)
args = parser.parse_args()
path = Path(args.script)
if not path.is_file():
    print(json.dumps({"ok": False, "missing": [f"missing script: {path}"]}, ensure_ascii=False))
    raise SystemExit(1)

text = path.read_text(encoding="utf-8")
checks = {
    "idle popup collection": r"(?:popupPool|freePopups|idlePopups)\s*:\s*(?:Node\[\]|Set\s*<\s*Node\s*>)",
    "reuse takes an idle node": r"\.(?:pop|values)\s*\(",
    "pool records a recycled node": r"\.(?:push|add)\s*\(",
    "instantiate remains available for an empty pool": r"\binstantiate\s*\(",
    "node tween cancellation": r"Tween\.stopAllByTarget\s*\(\s*[^)]*(?:popup|node)",
    "opacity tween cancellation": r"Tween\.stopAllByTarget\s*\(\s*(?:opacity|popupOpacity)",
    "reuse resets local position": r"\.setPosition\s*\(\s*0\s*,\s*0\s*,\s*0\s*\)",
    "reuse resets opacity": r"\.opacity\s*=\s*255",
    "recycled node is hidden": r"\.active\s*=\s*false|\.setActive\s*\(\s*false\s*\)",
    "animation completion has a callback": r"\.call\s*\(",
}
missing = [name for name, pattern in checks.items() if not re.search(pattern, text)]

# A direct destroy in a tween completion is the exact Stage 10 behaviour that
# this exercise replaces. Other cleanup strategies are deliberately allowed.
direct_destroy_callback = bool(re.search(
    r"\.call\s*\(\s*\(\s*\)\s*=>\s*[^{;]*(?:\.destroy\s*\()",
    text,
))
if direct_destroy_callback:
    missing.append("normal tween completion still directly destroys a popup")

print(json.dumps({
    "ok": not missing,
    "checked": list(checks),
    "missing": missing,
    "note": "Static structure only; run the scene for pooling and rapid-click behaviour.",
}, ensure_ascii=False))
raise SystemExit(0 if not missing else 1)
