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


class StudyScriptsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        run_script(
            "init_study.py",
            "workspace",
            "--root",
            str(self.root),
            "--background",
            "Go backend development",
        )

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_workspace_initialization_is_idempotent_and_auditable(self) -> None:
        run_script("init_study.py", "workspace", "--root", str(self.root))
        result = run_script(
            "audit_progress.py", "--study-dir", str(self.root / "study")
        )
        report = json.loads(result.stdout)
        self.assertTrue(report["ok"])
        self.assertEqual(report["event_count"], 1)

    def test_project_initialization_registers_existing_project(self) -> None:
        project = self.root / "lifecycle-lab"
        project.mkdir()
        (project / "package.json").write_text(
            json.dumps(
                {
                    "name": "lifecycle-lab",
                    "creator": {"version": "3.8.8"},
                }
            ),
            encoding="utf-8",
        )
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
        report = json.loads(
            run_script(
                "audit_progress.py", "--study-dir", str(project / "study")
            ).stdout
        )
        self.assertTrue(report["ok"])
        demos = json.loads((self.root / "study" / "demos.json").read_text())
        self.assertEqual(demos["projects"]["lifecycle-lab"]["creator_version"], "3.8.8")

    def test_pass_requires_assessment_and_evidence(self) -> None:
        study = self.root / "study"
        run_script(
            "record_result.py",
            "--study-dir",
            str(study),
            "--module-id",
            "cocos.scripting.lifecycle",
            "--status",
            "learning",
            "--source",
            "learning_assessment",
        )
        run_script(
            "record_result.py",
            "--study-dir",
            str(study),
            "--module-id",
            "cocos.scripting.lifecycle",
            "--status",
            "assigned",
            "--source",
            "learning_assessment",
        )
        run_script(
            "record_result.py",
            "--study-dir",
            str(study),
            "--module-id",
            "cocos.scripting.lifecycle",
            "--status",
            "submitted",
            "--source",
            "learning_assessment",
        )
        failed = run_script(
            "record_result.py",
            "--study-dir",
            str(study),
            "--module-id",
            "cocos.scripting.lifecycle",
            "--status",
            "passed",
            "--source",
            "learning_assessment",
            expect=2,
        )
        self.assertIn("requires --assessment-id", failed.stderr)

        evidence = study / "evidence" / "lifecycle-stage-01.md"
        evidence.write_text("verified output\n", encoding="utf-8")
        run_script(
            "record_result.py",
            "--study-dir",
            str(study),
            "--module-id",
            "cocos.scripting.lifecycle",
            "--status",
            "passed",
            "--source",
            "learning_assessment",
            "--assessment-id",
            "lifecycle-stage-01-v1",
            "--evidence",
            str(evidence),
        )
        progress = json.loads((study / "progress.json").read_text())
        self.assertEqual(
            progress["modules"]["cocos.scripting.lifecycle"]["stage_gate"]["status"],
            "awaiting_learner_decision",
        )
        report = json.loads(
            run_script("audit_progress.py", "--study-dir", str(study)).stdout
        )
        self.assertTrue(report["ok"])

    def test_completed_stage_requires_learner_decision_before_next_stage(self) -> None:
        study = self.root / "study"
        evidence = study / "evidence" / "component-stage-01.md"
        evidence.write_text("verified output\n", encoding="utf-8")
        for status in ("learning", "assigned", "submitted"):
            run_script(
                "record_result.py",
                "--study-dir",
                str(study),
                "--module-id",
                "cocos.component.basics",
                "--status",
                status,
                "--source",
                "learning_assessment",
            )
        run_script(
            "record_result.py",
            "--study-dir",
            str(study),
            "--module-id",
            "cocos.component.basics",
            "--status",
            "passed",
            "--source",
            "learning_assessment",
            "--assessment-id",
            "component-stage-01-v1",
            "--evidence",
            str(evidence),
        )
        failed = run_script(
            "record_stage_decision.py",
            "--study-dir",
            str(study),
            "--module-id",
            "cocos.component.basics",
            "--decision",
            "question",
            expect=2,
        )
        self.assertIn("requires a non-empty --question", failed.stderr)
        run_script(
            "record_stage_decision.py",
            "--study-dir",
            str(study),
            "--module-id",
            "cocos.component.basics",
            "--decision",
            "question",
            "--question",
            "Why is the component attached to a node instead of created directly?",
        )
        progress = json.loads((study / "progress.json").read_text())
        gate = progress["modules"]["cocos.component.basics"]["stage_gate"]
        self.assertEqual(gate["status"], "questions_open")
        self.assertEqual(len(gate["questions"]), 1)
        run_script(
            "record_stage_decision.py",
            "--study-dir",
            str(study),
            "--module-id",
            "cocos.component.basics",
            "--decision",
            "next",
        )
        progress = json.loads((study / "progress.json").read_text())
        self.assertEqual(
            progress["modules"]["cocos.component.basics"]["stage_gate"]["status"],
            "ready_for_next_stage",
        )
        report = json.loads(
            run_script("audit_progress.py", "--study-dir", str(study)).stdout
        )
        self.assertTrue(report["ok"])

    def test_verified_prior_knowledge_requires_challenge_source(self) -> None:
        study = self.root / "study"
        evidence = study / "evidence" / "skip-challenge.md"
        evidence.write_text("answers\n", encoding="utf-8")
        run_script(
            "record_result.py",
            "--study-dir",
            str(study),
            "--module-id",
            "typescript.basics",
            "--status",
            "skip_requested",
            "--source",
            "self_report",
        )
        run_script(
            "record_result.py",
            "--study-dir",
            str(study),
            "--module-id",
            "typescript.basics",
            "--status",
            "verified_prior_knowledge",
            "--source",
            "prior_knowledge_challenge",
            "--assessment-id",
            "typescript-basics-skip-v1",
            "--evidence",
            str(evidence),
        )
        report = json.loads(
            run_script("audit_progress.py", "--study-dir", str(study)).stdout
        )
        self.assertTrue(report["ok"])

    def test_auditor_rejects_invalid_companion_snapshot(self) -> None:
        demos_path = self.root / "study" / "demos.json"
        demos = json.loads(demos_path.read_text(encoding="utf-8"))
        demos["projects"] = []
        demos_path.write_text(json.dumps(demos), encoding="utf-8")
        failed = run_script(
            "audit_progress.py",
            "--study-dir",
            str(self.root / "study"),
            expect=1,
        )
        report = json.loads(failed.stdout)
        self.assertFalse(report["ok"])
        self.assertIn("projects", {item["code"] for item in report["issues"]})


if __name__ == "__main__":
    unittest.main()
