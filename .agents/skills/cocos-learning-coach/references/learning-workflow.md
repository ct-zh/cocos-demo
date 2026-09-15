# Learning workflow

## Contents

1. Session intake
2. Module design
3. Acceleration packages
4. Stage loop
5. Project-understanding mode
6. Review and retrospective

## 1. Session intake

Determine the user's immediate goal, target project if any, available Cocos Creator version, and whether they want conceptual study, implementation practice, or project archaeology. Do not ask again when durable study data already answers a question and the user has not contradicted it.

Classify prerequisite knowledge as:

- `verified`: passed an assessment with evidence;
- `self_reported`: claimed but not assessed;
- `learning`: currently active;
- `unknown`: not yet discussed.

## 2. Module design

Split learning by concepts and implementation boundaries, not by arbitrary time slices. Aim for roughly 30-60 minutes of user coding per stage, but preserve coherent boundaries.

Each module must define:

- learning objectives;
- prerequisites;
- the smallest suitable demo or scene;
- code the user must write;
- supplied scaffolding or mocks;
- deterministic checks;
- 2-3 possible assessment questions;
- completion evidence;
- explicit out-of-scope topics.

Before assignment, classify every required concept as either a verified prerequisite or a new concept. Do not phrase a new concept as an assumed ability merely because the learner requested a faster pace.

Prefer a small focused lab for foundational concepts and an existing game for integration and archaeology. Do not use a complex game merely because it already contains the API being taught.

## 3. Acceleration packages

When the learner requests higher volume, organize one learning session as an acceleration package rather than silently skipping prerequisite teaching. A package may contain several short micro-stages followed by one integrated implementation stage.

For every package:

1. State the requested pace and the package's total objectives.
2. List `verified prerequisites` and `new concepts` separately.
3. Give each new, critical concept a short explanation, minimal API example, or behavior-prediction micro-check before the integrated task depends on it.
4. Order micro-stages by dependency. Use code, editor actions, or questions only as much as needed to confirm the learner can proceed.
5. End with one user-owned integrated implementation and its deterministic checks.
6. Run the normal assessment and stage-end gate only after the integrated implementation; a micro-check does not falsely mark a module completed.

Increase volume through breadth, integration, reduced ceremony, and tighter feedback. Do not increase volume by assuming unintroduced engine APIs, lifecycle semantics, or TypeScript constructs are already known.

## 4. Stage loop

Run one stage at a time:

1. Explain the runtime problem and the specific learning objective.
2. Connect it briefly to the user's Go experience when useful.
3. State acceptance criteria without revealing the complete solution.
4. Provide only required scaffolding, fixtures, mocks, or TODOs.
5. Ask the user to implement the core behavior manually.
6. On submission, inspect the actual diff or files.
7. Run deterministic checks that exist for the stage.
8. Collect the requested runtime evidence once, then ask 0-2 focused questions only when code, deterministic checks, and that evidence still leave a critical objective unproven. A conceptual-only module may use up to 3 questions.
9. Give the smallest useful review and allow correction.
10. Record outcome and evidence.
11. Invoke the mandatory stage-end choice: enter the next stage or ask about this stage.
12. Record the learner's decision and stop. Start another stage only after an explicit `next` decision.

Do not silently turn a learning request into an agent implementation task.

## 5. Project-understanding mode

Build a project map from source evidence before teaching:

- Creator version and project settings;
- startup and included scenes;
- scene node hierarchy;
- custom components and their attachment points;
- resource types and runtime loading paths;
- input-to-state-to-render call chains;
- lifecycle methods and event registration;
- core state models and invariants;
- pure logic that can be tested outside the engine;
- generated directories and build outputs;
- inconsistencies between documentation, serialized scenes, and code.

Turn the map into modules such as runtime entry, scene composition, input, state, rendering, resources, and build. Ask the user to predict behavior, trace a flow, or change a small isolated part rather than only reading explanations.

## 6. Review and retrospective

Review correctness first, then engine behavior, testability, code quality, and style. Use progressive hints and wait for correction when the learning objective is still achievable.

Create a separate retrospective only when real issues occurred. Prefer this format:

1. minimal problematic snippet or concrete behavior;
2. why it failed;
3. underlying principle;
4. recognition signal for next time;
5. alternative direction without a full frozen solution.

Keep project entry documentation short and link to detailed retrospectives rather than duplicating them.
