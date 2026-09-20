# Agent work logs

Every active role, including `fll_lead`, maintains a log for each assigned task.
This is an operational record of actions, artifacts, tests, and blockers. Do not
record private reasoning, credentials, or full transcripts. Role definitions are
not running processes; an unassigned role needs no heartbeat.

## View progress

From the repository root:

```sh
npm run agents:status
npm run agents:status -- <run-id>
```

The first command lists available runs. The second prints each task's owner and
runtime ID, last report time, current work, completed/pending milestones, blockers,
next action, estimate, and attention flags. Full timestamped history is in
`docs/agent-work/logs/<run-id>/<task-id>.jsonl`; open it in your editor.
Logs are local, ignored by Git, and separate from the robot run console. Save a
reviewed milestone summary in project documentation when durable history is needed.
There is no background monitor: the command computes freshness when invoked, and
the lead monitors during active turns. Suspended sessions cannot send heartbeats.

## Register and publish

1. The lead chooses a unique run ID and registers **all known tasks**, including
   queued dependencies, review, and integration, before starting workers. Copy
   `docs/agent-work/run.example.json` to a temporary JSON file, fill in task IDs
   and roles, and run `npm run agents:register -- /absolute/path/to/run.json`.
   The append-only registration ledger exposes tasks missing an initial checkpoint;
   total percentage is unknown until every registered task has published. Add new
   tasks with an explained `planChange`; retain existing IDs and roles.
   Copy
   `docs/agent-work/checkpoint.example.json` to a task-owned temporary JSON file
   using the file editing tool; replace the example values. Record the checkpoint:

    ```sh
    npm run agents:log -- /absolute/path/to/checkpoint.json
    ```

2. Assign a unique task ID per concurrent assignment, role, allowed write paths,
   and acceptance milestones. Weights are relative effort, agreed before work.
   Record actual runtime ID as soon as spawning returns; use `null` until known
   and `primary` for the lead. Do not lose the ID after compaction. On reassignment
   increment `attempt`, retain the task ID/history, and record why in `summary`.
3. Specify the **absolute** shared log root in every handoff. The default is
   `docs/agent-work/logs` in the script's checkout. Separate worktrees must use the
   same absolute `FLL_AGENT_LOG_DIR` to publish to the lead's log directory, within
   existing permissions. A worker publishes an initial checkpoint and the lead
   verifies it is readable before relying on file-based monitoring.
4. If shared writes are unavailable, the worker sends the lead checkpoint JSON
   through an available agent-message tool. The lead records it with
   `source: "lead-relay"`, preserving the worker's `reportedAt`, and include
   `reportReference` identifying the original message/report (runtime ID is
   recorded in `agentId`). Declare **one
   writer per task**; worker and lead must not append simultaneously. If no
   intermediate transport is available, use bounded assignments and log that
   limitation as `unknown`; do not promise live monitoring or bypass permissions.
5. Publish at start, after meaningful findings/edits/tests, immediately on a
   blocker or scope change, before a long command/wait, and before returning a
   final report. While actively executing, target a checkpoint every two minutes
   at the next tool boundary. Set `nextUpdateAt` to a realistic UTC deadline;
   explain long operations and include a tool/process reference in `summary`.
   A queued task's deadline is the next planned dispatch/dependency review.
6. Include cumulative milestone evidence, current action (`summary`), next action,
   blockers, dependencies, and remaining-time range with confidence and basis.
   Use `estimate: null` when unknown. A completed milestone requires concrete
   evidence (file/symbol, command/result, or delivered finding). Changing weights
   or scope requires a nonempty `planChange` explanation; history is retained.
7. Workers use `review` when their deliverable is ready. Only the lead records
   `completed` with `source: "lead"` after acceptance/validation. `failed`,
   `cancelled`, and `unknown` are explicit states; never imply they completed.
   Include final changed paths, validation, assumptions, and risks in the handoff.

The record command appends a versioned full JSON snapshot, assigns a sequence
number, stamps receipt/acceptance times, and validates it. `reportedAt` measures
worker freshness; receipt of a delayed relay does not
make old work fresh. Example timestamps must be replaced with actual UTC times.
Work logs are cooperative team conventions, not an authentication boundary.
Evidence strings must identify files/symbols, commands/results, or delivered
reports; the lead checks their substance. Presence validation does not prove the
artifact or test is correct. A lead's own observation must use `source: "lead"`
and explicitly distinguish receipt time from unknown worker activity time.

When incrementing `attempt`, the lead must supply `reassignment` with
`previousAgentId`, `writerStopped: true`, and a nonempty `reason`. Only assert the
writer stopped after confirming it; this field records the confirmation, it does
not terminate an agent. The task's ordinary dependencies identify parent work.

If publishing fails, retain the checkpoint file and report `relay-unavailable` to
the lead with the error. Retry sequentially after restoring transport; timestamps
must never be advanced merely to conceal a delayed report. The recorder rejects
out-of-order and future-dated snapshots. Keep rejected historical evidence in a
task-owned report and reference it from the next current checkpoint. Reconcile
clock disagreements explicitly. Never report successful publication on failure.

## Lead monitoring and intervention

-   Read status at handoff/integration boundaries, before any user status answer,
    and about every two minutes during active coordination. Continue independent
    work between checks; do not repeatedly block on agent waits.
-   Report last known state **with age**. If no current report exists, say unknown.
    At a missed checkpoint, request a concise update using the recorded runtime ID.
    Five minutes beyond the deadline is an overdue check-in requiring investigation.
-   Ten minutes without a newly completed milestone while `running` is a progress
    warning, not proof of a stuck process. Inspect the current long operation and
    runtime status, ask for a checkpoint, and record evidence of any actual stall.
-   If a check-in gets no response by the next two-minute review, record the
    missing response and inspect available runtime/tool state. Interrupt/reassign
    only when justified. Stop the previous writer before transferring ownership;
    preserve changes, increment attempt, and record the recovery action.
-   On session resume, read existing logs and reconcile runtime IDs and reports.
    Mark unreachable/unknown activity honestly. Send this protocol explicitly to
    already-running agents; editing role files alone does not update their context.

## Progress and estimates

The dashboard computes completed milestone weight / total registered weight,
with accepted tasks counted separately. In-review work may have 100% of its
milestones done while acceptance remains pending. Failed/cancelled tasks remain
in the denominator so abandoning work cannot inflate completion. Register their
replacement in the same task with a new attempt to avoid double counting.

Percentages describe the **registered run scope**, not the entire simulator or
time consumed. Partial milestones receive no invented credit. When scope grows,
explain any percentage decrease. The lead must disclose unregistered/discovered
work and unresolved dependencies before projecting project completion.

Task estimates are worker-reported minutes remaining **as of the report time**;
stale or blocked estimates are not current forecasts. Do not sum parallel task
ETAs into a finish time. A project forecast requires a lead estimate of the
remaining dependency path, review/integration work, and uncertainty; otherwise
report remaining milestones and an unknown completion time.
