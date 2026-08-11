# Demo selection and creation policy

## Contents

1. Select an existing project or create a demo
2. Mandatory creation choice
3. Manual creation
4. Delegated creation
5. Demo design constraints
6. Git boundaries
7. Normalizing an unintended nested repository

## 1. Select an existing project or create a demo

Use this order:

1. Reuse an existing focused scene when it teaches the objective without unrelated complexity.
2. Add an isolated scene to an existing lab when project settings and engine version match.
3. Propose a new project when isolation materially improves learning, the Creator version differs, project configuration differs, or the exercise will intentionally break and rebuild core structure.

Prefer one basics lab with several focused scenes over many nearly empty projects. Prefer a separate project for a complete game, different engine version, platform-specific build, or destructive refactoring exercise.

## 2. Mandatory creation choice

Before creating anything, explain why a new demo is useful and ask the user to choose:

- create it manually;
- delegate creation to the agent;
- reuse an existing project or scene.

Use the interactive question tool when available. Do not infer delegation from a general learning request.

## 3. Manual creation

When the user chooses manual creation:

1. Confirm the project path, Creator version, dimension or template, and intended scene.
2. Output only Dashboard/editor steps and an acceptance checklist.
3. Do not create directories, manifests, scenes, scripts, or assets.
4. Mark the pending expected path in study data when storage exists.
5. Wait until the user reports completion.
6. Inspect the manifest, standard directories, default scene, console result supplied by the user, and nested Git state.
7. Report discrepancies and request correction before beginning the exercise.

## 4. Delegated creation

When the user delegates creation, confirm any detail that materially changes generated files:

- destination path and project name;
- exact Creator version;
- 2D, 3D, or named template;
- whether a validated local template may be reused;
- whether editor interaction is required or filesystem scaffolding is sufficient.

Create only after these are known. Validate the result in proportion to how it was created. Do not claim an editor-generated project when only a guessed filesystem skeleton was produced.

## 5. Demo design constraints

Every learning demo or scene must define:

- one primary topic and explicit exclusions;
- user-owned core TODOs;
- supplied scaffolding kept separate from hidden or later reference solutions;
- observable acceptance behavior;
- deterministic checks where feasible;
- a project-local `study/` directory outside `assets/` when progress storage is initialized.

Do not place full answers beside TODOs. Do not overload a foundational exercise with unrelated art, networking, build, or architecture concerns.

## 6. Git boundaries

Cocos may initialize a Git repository inside a new project. Treat it as real until inspected.

For every nested `.git`:

1. detect whether it is a submodule or worktree;
2. count commits across refs;
3. list remotes;
4. inspect worktree status;
5. classify it without changing it.

Recommend cleanup only when it is an unintended auto-initialized repository. Never move or delete it without explicit confirmation. If it has commits, remotes, submodule metadata, or uncertain provenance, stop and ask how history should be preserved.

For a multi-demo learning collection, prefer one outer repository after unintended nested repositories are safely resolved. Retain project-local `.gitignore` files because each demo may later be copied independently; also maintain outer recursive ignore rules for generated Cocos directories.

## 7. Normalizing an unintended nested repository

The agent owns the execution of this protocol. The learner owns the repository-ownership decision; do not infer it from the project location.

1. After every manual or delegated Cocos project creation, the agent runs `audit_git_layout.py` and reports the nested boundary's path, commit count, remotes, worktree state, and classification.
2. If the boundary is an empty, no-remote repository, ask whether the named demo should be **folded into the workspace repository** or **kept independent**. Prefer the interactive question tool when available.
3. If the learner chooses independence, leave the boundary untouched and state that the directory cannot be committed as ordinary files by the outer repository. Discuss a submodule only if the learner wants one.
4. If the learner explicitly chooses workspace ownership, the agent creates a timestamped backup directory outside the workspace, moves only `<demo>/.git` into it, and preserves `<demo>/.gitignore` and all project files.
5. The agent runs `audit_git_layout.py` again. It records the preflight facts, user authorization, backup path, action, postflight result, and restoration destination in `study/evidence/`. The agent must not stage or commit the outer repository unless the learner separately asks.
6. If the boundary has commits, remotes, submodule metadata, a linked-worktree marker, or uncertain provenance, stop after reporting the facts and ask the learner how history should be preserved.
