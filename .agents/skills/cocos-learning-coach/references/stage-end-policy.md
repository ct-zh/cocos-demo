# Stage-end policy

## Contents

1. Completion gate
2. Learner choice
3. Question path
4. Continue path
5. Persistence

## 1. Completion gate

After a module reaches `passed` or `verified_prior_knowledge`, record its result and stop. The completion is not permission to begin the next module automatically.

`record_result.py` creates this gate:

```json
{
  "status": "awaiting_learner_decision",
  "updated_at": "2026-08-11T00:00:00Z"
}
```

## 2. Learner choice

Summarize the completed objectives, evidence, and any remaining caveat. Then ask the learner whether to enter the next stage or discuss the current stage first.

When the interactive question tool is available, use it with these choices:

- `Enter next stage` — proceed only after recording the choice.
- `Ask about this stage` — prompt the learner to name the unclear concept, code path, or runtime behavior.

When the tool is unavailable, ask the same choice in a single ordinary sentence.

## 3. Question path

Do not guess what is unclear. Ask the learner for their concrete question. Address it with the smallest explanation, experiment, or targeted follow-up needed.

After the learner gives the question, persist it:

```bash
python3 scripts/record_stage_decision.py \
  --study-dir <study-dir> \
  --module-id <module-id> \
  --decision question \
  --question "Why does this callback run after the node becomes active?"
```

Keep the stage gate as `questions_open`. Do not assign the next stage until the learner later asks to continue.

## 4. Continue path

When the learner explicitly asks to continue, persist the decision:

```bash
python3 scripts/record_stage_decision.py \
  --study-dir <study-dir> \
  --module-id <module-id> \
  --decision next
```

The gate becomes `ready_for_next_stage`. Select the next appropriate module only after this transition.

## 5. Persistence

Stage gates live on the completed module record in `progress.json`. Each decision appends a `stage_decision_recorded` event to `events.jsonl`. The question text is retained as learner evidence; do not replace it with an inferred summary.
