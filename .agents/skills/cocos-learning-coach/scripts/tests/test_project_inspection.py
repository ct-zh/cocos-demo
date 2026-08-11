#!/usr/bin/env python3

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]


def run_script(name: str, *args: str, expect: int = 0) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        [sys.executable, str(SCRIPTS / name), *args],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != expect:
        raise AssertionError(
            f"{name} returned {result.returncode}, expected {expect}\nstdout={result.stdout}\nstderr={result.stderr}"
        )
    return result


def make_project(root: Path, name: str = "component-lab") -> Path:
    project = root / name
    (project / "assets" / "scenes").mkdir(parents=True)
    (project / "assets" / "scripts").mkdir(parents=True)
    (project / "settings" / "v2" / "packages").mkdir(parents=True)
    (project / "package.json").write_text(
        json.dumps({"name": name, "uuid": "test-uuid", "creator": {"version": "3.8.8"}}),
        encoding="utf-8",
    )
    (project / "tsconfig.json").write_text("{}\n", encoding="utf-8")
    (project / "settings" / "v2" / "packages" / "engine.json").write_text(
        json.dumps(
            {
                "modules": {
                    "configs": {"defaultConfig": {"includeModules": ["ui", "2d"]}}
                }
            }
        ),
        encoding="utf-8",
    )
    (project / "assets" / "scenes" / "Main.scene").write_text(
        json.dumps(
            [
                {"__type__": "cc.SceneAsset", "_name": "Main"},
                {
                    "__type__": "cc.Node",
                    "_name": "Canvas",
                    "_active": True,
                    "_components": [{"__id__": 2}],
                },
                {"__type__": "cc.Canvas"},
            ]
        ),
        encoding="utf-8",
    )
    (project / "assets" / "scripts" / "Counter.ts").write_text(
        "import { _decorator, Component } from 'cc';\n"
        "const { ccclass } = _decorator;\n"
        "@ccclass('Counter')\n"
        "export class Counter extends Component { start() {} onDestroy() {} }\n",
        encoding="utf-8",
    )
    (project / "assets" / "scripts" / "Counter.ts.meta").write_text(
        json.dumps(
            {
                "importer": "typescript",
                "uuid": "ffde4e88-42f6-4a75-8930-491c9e90ca27",
            }
        ),
        encoding="utf-8",
    )
    return project


class ProjectInspectionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_discovery_prunes_generated_directories(self) -> None:
        project = make_project(self.root)
        fake = project / "node_modules" / "fake"
        fake.mkdir(parents=True)
        (fake / "package.json").write_text(
            json.dumps({"name": "fake", "creator": {"version": "9.9.9"}}),
            encoding="utf-8",
        )
        report = json.loads(
            run_script("discover_cocos_projects.py", "--root", str(self.root)).stdout
        )
        self.assertEqual(report["project_count"], 1)
        self.assertEqual(report["projects"][0]["path"], "component-lab")
        self.assertTrue(report["projects"][0]["structure_complete"])

    def test_project_inventory_reports_scene_and_script_facts(self) -> None:
        project = make_project(self.root)
        report = json.loads(
            run_script("inspect_cocos_project.py", "--project", str(project)).stdout
        )
        self.assertTrue(report["ok"])
        self.assertEqual(report["manifest"]["creator_version"], "3.8.8")
        self.assertEqual(report["asset_summary"]["scene_count"], 1)
        self.assertEqual(report["scenes"][0]["nodes"][0]["components"], ["cc.Canvas"])
        self.assertEqual(report["scripts"][0]["ccclasses"], ["Counter"])
        self.assertEqual(report["scripts"][0]["lifecycle_methods"], ["onDestroy", "start"])
        self.assertEqual(report["scripts"][0]["serialized_type_id"], "ffde46IQvZKdYkwSRyekMon")
        self.assertEqual(report["startup_scene"]["status"], "unknown")

    def test_git_audit_marks_empty_repository_as_confirmation_required(self) -> None:
        project = make_project(self.root)
        subprocess.run(["git", "init", str(project)], check=True, capture_output=True, text=True)
        report = json.loads(
            run_script("audit_git_layout.py", "--root", str(self.root)).stdout
        )
        self.assertEqual(report["boundary_count"], 1)
        boundary = report["boundaries"][0]
        self.assertEqual(boundary["classification"], "empty_repository_no_remote")
        self.assertEqual(boundary["cleanup_eligibility"], "requires_explicit_confirmation")
        self.assertGreater(boundary["status_entry_count"], 0)

    def test_git_audit_does_not_offer_workspace_repository_for_cleanup(self) -> None:
        subprocess.run(["git", "init", str(self.root)], check=True, capture_output=True, text=True)
        report = json.loads(
            run_script("audit_git_layout.py", "--root", str(self.root)).stdout
        )
        self.assertTrue(report["workspace_repository"])
        boundary = report["boundaries"][0]
        self.assertEqual(boundary["path"], ".")
        self.assertEqual(boundary["classification"], "workspace_repository")
        self.assertEqual(boundary["cleanup_eligibility"], "not_applicable")

    def test_git_audit_protects_repository_with_history(self) -> None:
        project = make_project(self.root)
        subprocess.run(["git", "init", str(project)], check=True, capture_output=True, text=True)
        subprocess.run(
            ["git", "-C", str(project), "config", "user.name", "Test User"],
            check=True,
        )
        subprocess.run(
            ["git", "-C", str(project), "config", "user.email", "test@example.invalid"],
            check=True,
        )
        subprocess.run(["git", "-C", str(project), "add", "package.json"], check=True)
        subprocess.run(
            ["git", "-C", str(project), "commit", "-m", "initial"],
            check=True,
            capture_output=True,
            text=True,
        )
        report = json.loads(
            run_script("audit_git_layout.py", "--root", str(self.root)).stdout
        )
        boundary = report["boundaries"][0]
        self.assertEqual(boundary["classification"], "repository_with_history")
        self.assertEqual(boundary["cleanup_eligibility"], "not_eligible")
        self.assertEqual(boundary["commit_count"], 1)

    def test_record_project_inspection_persists_evidence_without_runtime_claim(self) -> None:
        project = make_project(self.root)
        run_script("init_study.py", "workspace", "--root", str(self.root))
        run_script(
            "init_study.py",
            "project",
            "--root",
            str(self.root),
            "--project",
            str(project),
            "--created-by",
            "existing",
        )
        (project / "study" / "project-map.md").write_text(
            "# Project map\n\n"
            + "Verified structural description from the manifest, scene, and script. " * 8,
            encoding="utf-8",
        )
        result = json.loads(
            run_script(
                "record_project_inspection.py",
                "--root",
                str(self.root),
                "--project",
                str(project),
            ).stdout
        )
        self.assertTrue(result["ok"])
        self.assertEqual(result["validation_status"], "structurally_inspected")
        self.assertEqual(result["runtime_validation_status"], "not_verified")
        self.assertTrue((project / "study" / "evidence" / "project-inspection.json").is_file())
        self.assertTrue((project / "study" / "evidence" / "git-layout.json").is_file())
        project_data = json.loads((project / "study" / "project.json").read_text())
        self.assertEqual(project_data["runtime_validation_status"], "not_verified")
        project_audit = json.loads(
            run_script(
                "audit_progress.py",
                "--study-dir",
                str(project / "study"),
            ).stdout
        )
        workspace_audit = json.loads(
            run_script(
                "audit_progress.py",
                "--study-dir",
                str(self.root / "study"),
            ).stdout
        )
        self.assertTrue(project_audit["ok"])
        self.assertTrue(workspace_audit["ok"])


if __name__ == "__main__":
    unittest.main()
