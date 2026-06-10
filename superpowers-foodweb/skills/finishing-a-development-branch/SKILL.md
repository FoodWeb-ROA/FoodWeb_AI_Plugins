---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to integrate the work locally — verifies tests, offers merge / keep / discard, merges into the base branch, removes the feature worktree when done
---

# Finishing a Development Branch

## Overview

Complete development by merging the feature branch into the base branch **locally** and cleaning up the **git worktree** when appropriate.

**Core principle:** Verify tests → Present options → Execute choice → Clean up worktree when merging or discarding.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

**Scope:** No push or pull-request path — only local merge and worktree cleanup.

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**

```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Determine Base Branch

```bash
# Try common base branches
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main — is that correct?"

### Step 3: Present Options

Present exactly these 3 options:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Keep the branch as-is (I'll handle it later)
3. Discard this work

Which option?
```

**Don't add explanation** — keep options concise.

### Step 4: Execute Choice

#### Option 1: Merge Locally

```bash
# From your checkout of the base branch (often the main repo, not the feature worktree)
git checkout <base-branch>

# Update base if you use remotes locally
git pull

# Merge feature branch
git merge <feature-branch>

# Verify tests on merged result
<test command>

# If tests pass
git branch -d <feature-branch>
```

Then: Cleanup worktree (Step 5).

#### Option 2: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

#### Option 3: Discard

**Confirm first:**

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:

```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 5).

### Step 5: Cleanup Worktree

**For Options 1 and 3:**

Check if in worktree:

```bash
git worktree list | grep $(git branch --show-current)
```

If yes:

```bash
git worktree remove <worktree-path>
```

**For Option 2:** Keep worktree.

## Quick Reference

| Option           | Local merge | Keep worktree | Delete branch   |
| ---------------- | ----------- | ------------- | --------------- |
| 1. Merge locally | ✓           | —             | ✓ (after merge) |
| 2. Keep as-is    | —           | ✓             | —               |
| 3. Discard       | —           | —             | ✓ (force)       |

## Common Mistakes

**Skipping test verification**

- **Problem:** Merge broken code
- **Fix:** Always verify tests before offering options

**Open-ended questions**

- **Problem:** "What should I do next?" → ambiguous
- **Fix:** Present exactly 3 structured options

**Automatic worktree cleanup**

- **Problem:** Remove worktree when partner still needs it (Option 2)
- **Fix:** Only cleanup for Options 1 and 3

**No confirmation for discard**

- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

## Red Flags

**Never:**

- Proceed with failing tests
- Merge without verifying tests on the merged result
- Delete work without confirmation

**Always:**

- Verify tests before offering options
- Present exactly 3 options
- Get typed confirmation for Option 3
- Clean up worktree for Options 1 and 3 only

## Integration

**Called by:**

- **subagent-driven-development** (Step 7) — After all tasks complete
- **executing-plans** (Step 5) — After all batches complete

**Pairs with:**

- **using-git-worktrees** — Creates the worktree; this skill merges locally and removes it when you choose Option 1 or 3
