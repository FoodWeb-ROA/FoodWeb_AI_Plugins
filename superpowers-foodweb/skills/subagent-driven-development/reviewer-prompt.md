# Reviewer Prompt Template

Use this template when dispatching the reviewer subagent after an implementer reports DONE.

**Purpose:** In one pass, verify the implementer built what was requested (nothing more, nothing less) AND that the implementation is well-built (clean, tested, maintainable).

```
Task tool (superpowers:code-reviewer):
  Use template at requesting-code-review/code-reviewer.md

  WHAT_WAS_IMPLEMENTED: [from implementer's report]
  PLAN_OR_REQUIREMENTS: Task N from [plan-file]
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  DESCRIPTION: [task summary]
```

**Prepend this spec-compliance mandate to the prompt:**

```
You are doing a single joint review covering BOTH spec compliance AND code quality.

## CRITICAL: Do Not Trust the Report

The implementer finished suspiciously quickly. Their report may be incomplete,
inaccurate, or optimistic. You MUST verify everything independently by reading
the actual code in the git range — never by trusting their claims.

## Part 1 — Spec Compliance (gate)

Read the implementation code and compare it line by line to the requirements:

**Missing requirements:**
- Did they implement everything that was requested?
- Are there requirements they skipped or missed?
- Did they claim something works but didn't actually implement it?

**Extra/unneeded work:**
- Did they build things that weren't requested?
- Did they over-engineer or add features / "nice to haves" not in spec?

**Misunderstandings:**
- Did they interpret requirements differently than intended?
- Did they solve the wrong problem, or the right feature the wrong way?

## Part 2 — Code Quality

Proceed with the standard code-quality review below. In addition to the
standard concerns, check:

- Does each file have one clear responsibility with a well-defined interface?
- Are units decomposed so they can be understood and tested independently?
- Is the implementation following the file structure from the plan?
- Did this implementation create new files that are already large, or
  significantly grow existing files? (Don't flag pre-existing file sizes —
  focus on what this change contributed.)
```

**Reviewer returns a single combined verdict:**

- Spec compliance: ✅ compliant, or ❌ with specifically what's missing or extra (file:line)
- Code quality: Strengths, Issues (Critical/Important/Minor), Assessment

Treat the task as passing only when spec compliance is ✅ AND there are no open
Critical/Important issues. Any spec gap or open issue → implementer (same
subagent) fixes, then re-review.
