---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees under .worktrees/ with safety verification
---

# Using Git Worktrees

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching.

**Core principle:** Fixed `.worktrees/` location + safety verification = reliable isolation.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Precondition: Local Session + Opt-In Only

Worktrees are for **local sessions only**, and they are **opt-in**. Use this skill ONLY when BOTH hold:

1. You are working in a local session (not a remote/cloud session), AND
2. The user explicitly asked to work in a worktree at the start of the session.

- Do NOT create a worktree by default.
- Do NOT create a worktree in a remote session — remote sessions work on a feature branch instead (see Branch Creation Policy below).
- Do NOT stop to ask whether a worktree is wanted — if the user didn't request one, skip worktree setup entirely and work in the current checkout.
- A skill that lists this one as "required" is satisfied by the current workspace when no worktree was requested. Proceed without isolation.

## Branch Creation Policy

**Never create a feature branch in a local session.** Feature branches are created only in remote/cloud sessions.

- **Local session:** work in the current checkout on the current branch. The ONLY way to create a branch locally is the explicitly-requested worktree above (its `-b <BRANCH_NAME>` is the sanctioned exception).
- **Remote session:** create the feature branch as normal; do NOT create a worktree.

## Directory Location

Always create worktrees under `.worktrees/` at the repository root — project-local and hidden. No prompting, no alternative locations.

## Safety Verification

**MUST verify `.worktrees/` is ignored before creating a worktree:**

```bash
# Respects local, global, and system gitignore
git check-ignore -q .worktrees 2>/dev/null
```

**If NOT ignored:**

1. Add `.worktrees/` to .gitignore
2. Commit the change
3. Proceed with worktree creation

**Why critical:** Prevents accidentally committing worktree contents to the repository.

## Creation Steps

### 1. Create Worktree

```bash
path=".worktrees/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 2. Run Project Setup

Auto-detect and run appropriate setup:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

### 3. Verify Clean Baseline

Run tests to ensure worktree starts clean:

```bash
# Examples - use project-appropriate command
npm test
cargo test
pytest
go test ./...
```

**If tests fail:** Report failures, ask whether to proceed or investigate.

**If tests pass:** Report ready.

### 4. Report Location

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation                  | Action                            |
| -------------------------- | --------------------------------- |
| Creating a worktree        | Use `.worktrees/` (verify ignored) |
| `.worktrees/` not ignored  | Add to .gitignore + commit        |
| Tests fail during baseline | Report failures + ask             |
| No package.json/Cargo.toml | Skip dependency install           |

## Common Mistakes

### Skipping ignore verification

- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Always use `git check-ignore` before creating the worktree

### Proceeding with failing tests

- **Problem:** Can't distinguish new bugs from pre-existing issues
- **Fix:** Report failures, get explicit permission to proceed

### Hardcoding setup commands

- **Problem:** Breaks on projects using different tools
- **Fix:** Auto-detect from project files (package.json, etc.)

## Example Workflow

```
You: I'm using the using-git-worktrees skill to set up an isolated workspace.

[Verify ignored - git check-ignore confirms .worktrees/ is ignored]
[Create worktree: git worktree add .worktrees/auth -b feature/auth]
[Run npm install]
[Run npm test - 47 passing]

Worktree ready at <repo-root>/.worktrees/auth
Tests passing (47 tests, 0 failures)
Ready to implement auth feature
```

## Red Flags

**Never:**

- Create worktree without verifying `.worktrees/` is ignored
- Skip baseline test verification
- Proceed with failing tests without asking

**Always:**

- Create worktrees under `.worktrees/`
- Verify `.worktrees/` is ignored before creating
- Auto-detect and run project setup
- Verify clean test baseline

## Integration

**Called by (only when the user opted into a worktree at session start):**

- **brainstorming** - when implementation follows and a worktree was requested
- **subagent-driven-development** - before executing tasks, if a worktree was requested
- **executing-plans** - before executing tasks, if a worktree was requested
- Any skill needing isolated workspace, on explicit user opt-in

**Pairs with:**

- **finishing-a-development-branch** - REQUIRED for cleanup after work complete
