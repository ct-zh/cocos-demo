# Assessment policy

## Contents

1. Evidence types
2. Standard assessment
3. Skip challenge
4. Question interaction
5. Status rules

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

- one user-written code task plus 1-2 questions;
- 2-3 focused questions for a conceptual module;
- one editor task with serialized or visual evidence plus 1-2 questions.

Require the user to explain at least one relevant runtime behavior for engine-specific modules. A passing implementation with a fundamentally incorrect explanation should trigger a targeted follow-up rather than automatic mastery.

Pass only when all critical objectives are met. Record partial success by objective instead of rounding it into a pass. A pass opens a stage-end choice; it does not auto-advance the learner.

## 3. Skip challenge

When the user claims familiarity and asks to skip:

1. Identify the module's 2-3 critical objectives.
2. Ask 2-3 questions covering explanation and behavior prediction.
3. Add a tiny code or editor task only when questions cannot establish the skill safely.
4. Pass only if every critical objective is demonstrated.
5. Mark the result as verified prior knowledge, never as an unqualified skip.
6. If the challenge fails, assign only the exposed gaps rather than the entire module.

Do not disclose the answer rubric before receiving the response.

## 4. Question interaction

Prefer the interactive question tool for module selection, self-rating, and well-formed multiple-choice questions when it is available. Use ordinary conversation for free-form explanation, code reading, and runtime prediction when choices would make guessing too easy.

Ask no more than three questions in one assessment round. Questions should be independent enough to identify the missing objective.

## 5. Status rules

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
