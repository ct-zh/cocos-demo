# Assessment policy

## Contents

1. Evidence types
2. Standard assessment
3. Runtime evidence is not a quiz
4. Skip challenge
5. Question interaction
6. Status rules

## 1. Evidence types

Prefer, in order:

1. deterministic test or auditor output;
2. inspected user-written code or serialized scene change;
3. runtime logs, build output, or visual evidence;
4. focused conceptual answers;
5. self-report, which never proves mastery by itself.

Use deterministic checks for quantifiable claims. Do not use a fragile regex as proof of runtime correctness when a compilation or behavior test is feasible.

## 2. Standard assessment

An assessment may be:

- one user-written code task plus 0-2 questions for still-unproven critical objectives;
- 2-3 focused questions for a conceptual module;
- one editor task with serialized or visual evidence plus 0-2 questions for still-unproven critical objectives.

For an acceleration package, assess the integrated implementation rather than treating each micro-check as a completed module. Use micro-check results only to expose and repair an immediate gap before the learner proceeds.

Require the user to explain at least one relevant runtime behavior for engine-specific modules. A passing implementation with a fundamentally incorrect explanation should trigger a targeted follow-up rather than automatic mastery.

Pass only when all critical objectives are met. Record partial success by objective instead of rounding it into a pass. A pass opens a stage-end choice; it does not auto-advance the learner.

## 3. Runtime evidence is not a quiz

Use an exercise's stated preview sequence to request runtime evidence once. Ask for the concrete observed results or a complete error message; do not use a generic question such as "Does the game display as expected?" as the first or default assessment question.

If the learner has already supplied the requested preview sequence, preserve it as evidence and do not ask for the same result again. Ask a follow-up only when a specific required behavior is missing, contradictory, or cannot be observed from the supplied evidence.

Treat a runtime-evidence request as evidence collection, not as a conceptual question. Assessment questions must probe a distinct, critical objective that remains unproven by the code, auditor, scene data, and runtime evidence.

## 4. Skip challenge

When the user claims familiarity and asks to skip:

1. Identify the module's 2-3 critical objectives.
2. Ask 2-3 questions covering explanation and behavior prediction.
3. Add a tiny code or editor task only when questions cannot establish the skill safely.
4. Pass only if every critical objective is demonstrated.
5. Mark the result as verified prior knowledge, never as an unqualified skip.
6. If the challenge fails, assign only the exposed gaps rather than the entire module.

Do not disclose the answer rubric before receiving the response.

## 5. Question interaction

Prefer the interactive question tool for module selection, self-rating, and well-formed multiple-choice questions when it is available. Use ordinary conversation for free-form explanation, code reading, and runtime prediction when choices would make guessing too easy.

For a code or editor implementation, ask zero questions when evidence covers every critical objective; otherwise ask one or two. Do not target a fixed count. Reserve two or three questions for a conceptual-only module or a prior-knowledge challenge. Questions should be independent enough to identify a missing objective and must not duplicate collected runtime evidence.

## 6. Status rules

Use these conceptual states when progress storage is available:

- `not_started`
- `learning`
- `assigned`
- `submitted`
- `passed`
- `skip_requested`
- `challenge_failed`
- `verified_prior_knowledge`

Every `passed` or `verified_prior_knowledge` state must point to evidence, assessment version, and completion time. Self-reported familiarity remains separate from verified knowledge.

Every completed state also receives a stage gate. Its initial status is `awaiting_learner_decision`; it becomes `questions_open` after a recorded question or `ready_for_next_stage` after the learner explicitly chooses to continue.
