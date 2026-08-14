# Acceleration policy

## Contents

1. Purpose
2. Package design
3. Concept boundaries
4. Example
5. Assessment and progress

## 1. Purpose

Use this policy when the learner requests a faster pace or a larger amount of knowledge per session. Preserve causal learning: speed must not convert unknown core concepts into invisible prerequisites.

## 2. Package design

Treat an acceleration package as one focused learning session containing:

1. a stated volume target, such as roughly three times the normal knowledge volume;
2. one or more dependency-ordered micro-stages; and
3. one integrated, learner-written implementation.

Micro-stages are short explanations, API experiments, editor actions, or behavior predictions. They are not separate mandatory milestones unless the learner asks to slow down.

## 3. Concept boundaries

Before assigning the package, list both categories explicitly:

- **Verified prerequisites:** concepts with recorded passing evidence or a passed prior-knowledge challenge.
- **New concepts:** concepts not yet verified, including unfamiliar Cocos APIs, lifecycle semantics, state models, or TypeScript constructs.

Give each new critical concept a minimal introduction and a small check before the integrated task assumes it. If the concepts form a dependency chain, order the micro-stages within the package. Do not mechanically split a package only because it contains more than one new concept.

## 4. Example

For a 10-second challenge round, an accelerated package can be:

1. state machine and `enum`: predict valid state transitions;
2. global `input` and `onEnable`/`onDisable`: register and remove one keyboard callback in a tiny experiment;
3. integrated round: connect buttons, keyboard input, countdown, rendering, pause, restart, and finish behavior.

Existing evidence for Buttons, `update(deltaTime)`, and state-to-view rendering remains prerequisite evidence; it does not prove the new global-input or enable/disable semantics.

## 5. Assessment and progress

Record one formal assessment for the integrated implementation. Run deterministic checks for quantifiable behavior and ask only the focused questions needed to establish understanding. Then use the normal stage-end choice: continue or ask about the completed package.
