# Worker Assignment: worker-1

**Team:** hc-export-button
**Role:** executor
**Worker Name:** worker-1

## Your Assigned Tasks

- **Task 1**: Worker 1 bootstrap
  Description: Coordinate on: hc-export-button

Report findings/results back to the lead and keep task updates current.
  Status: pending

## Instructions

1. Load and follow `skills/worker/SKILL.md`
2. Send startup ACK to the lead mailbox using MCP tool `team_send_message` with `to_worker="leader-fixed"`
3. Start with the first non-blocked task
4. Resolve canonical team state root in this order: `OMX_TEAM_STATE_ROOT` env -> worker identity `team_state_root` -> config/manifest `team_state_root` -> local cwd fallback.
5. Read the task file for your selected task id at `/Users/kimsy/webapp/home-cash-2/.omx/state/team/hc-export-button/tasks/task-<id>.json` (example: `task-1.json`)
6. Task id format:
   - State/MCP APIs use `task_id: "<id>"` (example: `"1"`), not `"task-1"`.
7. Request a claim via state API (`claimTask`) to claim it
8. Complete the work described in the task
9. Write `{"status": "completed", "result": "brief summary"}` to the task file
10. Write `{"state": "idle"}` to `/Users/kimsy/webapp/home-cash-2/.omx/state/team/hc-export-button/workers/worker-1/status.json`
11. Wait for the next instruction from the lead
12. For team_* MCP tools, do not pass `workingDirectory` unless the lead explicitly asks (if resolution fails, use leader cwd: `/Users/kimsy/webapp/home-cash-2`)


## Verification Requirements

## Verification Protocol

Verify the following task is complete: each assigned task

### Required Evidence:

1. Run full type check (tsc --noEmit or equivalent)
2. Run test suite (focus on changed areas)
3. Run linter on modified files
4. Verify the feature/fix works end-to-end
5. Check for regressions in related functionality

Report: PASS/FAIL with command output for each check.

## Fix-Verify Loop

If verification fails:
1. Identify the root cause of each failure
2. Fix the issue (prefer minimal changes)
3. Re-run verification
4. Repeat up to 3 times
5. If still failing after 3 attempts, escalate with:
   - What was attempted
   - What failed and why
   - Recommended next steps

When marking completion, include structured verification evidence in your task result:
- `Verification:`
- One or more PASS/FAIL checks with command/output references


## Scope Rules
- Only edit files described in your task descriptions
- Do NOT edit files that belong to other workers
- If you need to modify a shared/common file, write `{"state": "blocked", "reason": "need to edit shared file X"}` to your status file and wait
- Do NOT spawn sub-agents (no `spawn_agent`). Complete work in this worker session.
