# Study data schema

## Contents

1. General rules
2. Workspace study directory
3. Project study directory
4. Progress snapshot
5. Event log
6. State transitions
7. Script usage

## 1. General rules

- Use schema version `1`.
- Use lower-case dotted module IDs such as `cocos.scripting.lifecycle` or `project.puzzle.runtime-entry`.
- Use UTC RFC 3339 timestamps ending in `Z`.
- Keep current state in JSON snapshots and append history to `events.jsonl`.
- Store evidence paths relative to the containing `study/` directory when possible.
- Never treat self-report as verified mastery.

## 2. Workspace study directory

Use this structure:

```text
study/
├── README.md
├── profile.json
├── roadmap.json
├── demos.json
├── progress.json
├── events.jsonl
├── evidence/
└── retrospectives/
```

`profile.json` stores confirmed learner background and learning preferences. `roadmap.json` stores planned modules and one optional active module. `demos.json` stores registered projects and pending manual-creation requests. `progress.json` stores cross-project capabilities.

Roadmap modules use `planned`, `active`, or `paused`. Each module requires a positive unique order, non-empty title, objective strings, and valid prerequisite module IDs. Roadmap status is planning state; mastery remains exclusively in `progress.json`.

## 3. Project study directory

Use this structure outside the Cocos `assets/` directory:

```text
<project>/study/
├── README.md
├── project.json
├── project-map.md
├── roadmap.json
├── progress.json
├── events.jsonl
├── exercises/
├── assessments/
├── retrospectives/
├── evidence/
└── auditors/
```

`project.json` records stable identity, workspace-relative path, Creator version, and provenance. Do not claim a project is validated merely because this file exists.

## 4. Progress snapshot

Use this shape:

```json
{
  "schema_version": 1,
  "scope": "workspace",
  "updated_at": "2026-07-18T00:00:00Z",
  "modules": {
    "cocos.scripting.lifecycle": {
      "status": "passed",
      "source": "learning_assessment",
      "assessment_id": "lifecycle-stage-01-v1",
      "evidence": ["evidence/lifecycle-stage-01.md"],
      "note": "Implemented and explained enable/disable behavior.",
      "stage_gate": {
        "status": "awaiting_learner_decision",
        "updated_at": "2026-07-18T00:00:00Z"
      },
      "updated_at": "2026-07-18T00:00:00Z"
    }
  }
}
```

Project progress uses scope `project`. Allowed sources are `learning_assessment`, `prior_knowledge_challenge`, `self_report`, and `imported`.

## 5. Event log

Write one compact JSON object per line. Every event requires:

- unique `event_id`;
- `schema_version`;
- UTC `timestamp`;
- event `type`;
- matching `scope`;
- event-specific `data` object.

Append events; never edit or reorder old lines.

## 6. State transitions

Use these states:

```text
not_started -> learning -> assigned -> submitted -> passed
not_started -> skip_requested -> verified_prior_knowledge
                               -> challenge_failed -> learning
```

Correction may move `assigned` or `submitted` back to `learning`. Reassessment may move a completed state back to `learning` only when explicitly requested. `passed` and `verified_prior_knowledge` require an assessment ID and at least one existing evidence path.

Completed modules also require `stage_gate`. The valid gate states are:

```text
awaiting_learner_decision -> questions_open -> ready_for_next_stage
awaiting_learner_decision ------------------> ready_for_next_stage
```

`questions_open` includes one or more learner-provided question records. The gate does not represent mastery and cannot change the module result.

## 7. Script usage

Initialize the workspace:

```bash
python3 scripts/init_study.py workspace --root <workspace> --background "Go backend development"
```

Initialize and register an existing Cocos project:

```bash
python3 scripts/init_study.py project --root <workspace> --project <project> --created-by existing
```

Record a result:

```bash
python3 scripts/record_result.py \
  --study-dir <study-dir> \
  --module-id cocos.scripting.lifecycle \
  --status passed \
  --source learning_assessment \
  --assessment-id lifecycle-stage-01-v1 \
  --evidence evidence/lifecycle-stage-01.md
```

Audit storage:

```bash
python3 scripts/audit_progress.py --study-dir <study-dir>
```

Record the learner's stage-end choice:

```bash
python3 scripts/record_stage_decision.py \
  --study-dir <study-dir> \
  --module-id cocos.scripting.lifecycle \
  --decision next
```

After writing a real `project-map.md`, record a structural inspection:

```bash
python3 scripts/record_project_inspection.py --root <workspace> --project <project>
```

This writes reproducible inspection reports under project `study/evidence/`, updates project and workspace registry snapshots, and appends events. It does not prove that the project compiles, previews, or builds successfully.
