import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const terminalStates = new Set(['completed', 'failed', 'cancelled']);
const states = new Set(['queued', 'running', 'blocked', 'review', 'unknown', ...terminalStates]);
const defaultRoot = fileURLToPath(new URL('../docs/agent-work/logs/', import.meta.url));
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/;

function requireValue(condition, message) {
    if (!condition) throw new Error(message);
}

function nonempty(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function timestamp(value) {
    return typeof value === 'string' && value.endsWith('Z') && Number.isFinite(Date.parse(value));
}

export function validateCheckpoint(entry, now = Date.now()) {
    requireValue(entry && typeof entry === 'object', 'Checkpoint must be an object.');
    requireValue(entry.schemaVersion === 1, 'Unsupported checkpoint schemaVersion.');
    for (const field of ['runId', 'taskId']) {
        requireValue(
            typeof entry[field] === 'string' && identifier.test(entry[field]),
            `Invalid ${field}.`
        );
    }
    requireValue(
        /^fll_(lead|rules|physics|runtime|assets|design|experience|qa)$/.test(entry.role),
        'Invalid role.'
    );
    requireValue(
        entry.agentId === null || nonempty(entry.agentId),
        'agentId must be a runtime ID or null.'
    );
    requireValue(Number.isInteger(entry.attempt) && entry.attempt > 0, 'Invalid attempt.');
    requireValue(['worker', 'lead', 'lead-relay'].includes(entry.source), 'Invalid source.');
    requireValue(
        entry.source !== 'lead-relay' || nonempty(entry.reportReference),
        'Relayed checkpoints need a message/report reference.'
    );
    requireValue(states.has(entry.state), 'Invalid state.');
    requireValue(
        timestamp(entry.reportedAt) && Date.parse(entry.reportedAt) <= now,
        'Invalid or future reportedAt.'
    );
    requireValue(
        nonempty(entry.summary) && nonempty(entry.nextAction),
        'summary and nextAction are required.'
    );
    for (const field of ['blockers', 'dependencies']) {
        requireValue(
            Array.isArray(entry[field]) && entry[field].every(nonempty),
            `${field} must be a string array.`
        );
    }
    requireValue(
        entry.state !== 'blocked' || entry.blockers.length > 0,
        'Blocked tasks need a blocker.'
    );
    requireValue(
        terminalStates.has(entry.state)
            ? entry.nextUpdateAt === null
            : timestamp(entry.nextUpdateAt) &&
                  Date.parse(entry.nextUpdateAt) > Date.parse(entry.reportedAt),
        'Active tasks need a future checkpoint deadline; terminal tasks use null.'
    );
    requireValue(
        Array.isArray(entry.milestones) && entry.milestones.length > 0,
        'Milestones are required.'
    );
    const milestoneIds = new Set();
    for (const milestone of entry.milestones) {
        requireValue(
            nonempty(milestone.id) && !milestoneIds.has(milestone.id),
            'Duplicate or empty milestone ID.'
        );
        milestoneIds.add(milestone.id);
        requireValue(
            Number.isFinite(milestone.weight) && milestone.weight > 0,
            'Invalid milestone weight.'
        );
        requireValue(
            typeof milestone.done === 'boolean' && typeof milestone.evidence === 'string',
            'Invalid milestone.'
        );
        requireValue(
            !milestone.done || nonempty(milestone.evidence),
            'Completed milestones require evidence.'
        );
    }
    requireValue(
        entry.state !== 'completed' ||
            (entry.source === 'lead' &&
                entry.milestones.every(({ done }) => done) &&
                entry.blockers.length === 0),
        'Completion requires lead acceptance, all milestones done, and no blockers.'
    );
    if (entry.estimate !== null) {
        const estimate = entry.estimate;
        requireValue(
            estimate &&
                Number.isFinite(estimate.minMinutes) &&
                estimate.minMinutes >= 0 &&
                Number.isFinite(estimate.maxMinutes) &&
                estimate.maxMinutes >= estimate.minMinutes &&
                ['low', 'medium', 'high'].includes(estimate.confidence) &&
                nonempty(estimate.basis),
            'Invalid estimate; use null when unknown.'
        );
    }
    requireValue(typeof entry.planChange === 'string', 'planChange must be a string.');
    return entry;
}

function plan(entry) {
    return JSON.stringify(entry.milestones.map(({ id, weight }) => ({ id, weight })));
}

function readHistory(path) {
    if (!existsSync(path)) return [];
    return readFileSync(path, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line, index) => {
            try {
                return validateCheckpoint(JSON.parse(line));
            } catch (error) {
                throw new Error(`${path}:${index + 1}: ${error.message}`);
            }
        });
}

function readPlan(root, runId) {
    const path = join(root, runId, '_plan.jsonl');
    requireValue(existsSync(path), `Run ${runId} has no registration ledger. Progress unknown.`);
    return JSON.parse(readFileSync(path, 'utf8').trim().split('\n').at(-1));
}

export function registerRun(root, plan, now = Date.now()) {
    requireValue(
        plan?.schemaVersion === 1 && typeof plan.runId === 'string' && identifier.test(plan.runId),
        'Invalid run plan.'
    );
    requireValue(Array.isArray(plan.tasks) && plan.tasks.length > 0, 'Register all known tasks.');
    const ids = new Set();
    for (const task of plan.tasks) {
        requireValue(
            typeof task.taskId === 'string' &&
                identifier.test(task.taskId) &&
                !ids.has(task.taskId),
            'Invalid or duplicate registered task.'
        );
        requireValue(
            /^fll_(lead|rules|physics|runtime|assets|design|experience|qa)$/.test(task.role),
            'Invalid registered role.'
        );
        ids.add(task.taskId);
    }
    const path = join(root, plan.runId, '_plan.jsonl');
    if (existsSync(path)) {
        requireValue(nonempty(plan.planChange), 'Explain registration changes in planChange.');
        const previous = readPlan(root, plan.runId);
        requireValue(
            previous.tasks.every((task) =>
                plan.tasks.some((next) => next.taskId === task.taskId && next.role === task.role)
            ),
            'Keep registered tasks and roles; cancel or reassign work in its existing log.'
        );
    }
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(
        path,
        `${JSON.stringify({ ...plan, recordedAt: new Date(now).toISOString() })}\n`
    );
    return path;
}

export function recordCheckpoint(root, entry, now = Date.now()) {
    validateCheckpoint(entry, now);
    const registration = readPlan(root, entry.runId);
    requireValue(
        registration.tasks.some((task) => task.taskId === entry.taskId && task.role === entry.role),
        'Task/role must be registered before publishing.'
    );
    const path = join(root, entry.runId, `${entry.taskId}.jsonl`);
    const previous = readHistory(path).at(-1);
    if (previous) {
        requireValue(
            Date.parse(entry.reportedAt) >= Date.parse(previous.reportedAt),
            'Out-of-order checkpoint; preserve the original report time.'
        );
        requireValue(entry.attempt >= previous.attempt, 'Attempt cannot decrease.');
        if (entry.attempt > previous.attempt) {
            requireValue(
                entry.source === 'lead' &&
                    entry.reassignment?.previousAgentId === previous.agentId &&
                    entry.reassignment?.writerStopped === true &&
                    nonempty(entry.reassignment?.reason),
                'Reassignment requires lead confirmation of previous writer stop and a reason.'
            );
        }
        requireValue(
            !terminalStates.has(previous.state) ||
                terminalStates.has(entry.state) ||
                entry.attempt > previous.attempt,
            'Reopening a terminal task requires a new attempt.'
        );
        requireValue(
            plan(entry) === plan(previous) || nonempty(entry.planChange),
            'Explain milestone scope/weight changes in planChange.'
        );
        requireValue(
            entry.agentId === previous.agentId ||
                previous.agentId === null ||
                entry.attempt > previous.attempt,
            'New agent requires a new attempt.'
        );
    }
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(
        path,
        `${JSON.stringify({ ...entry, sequence: (previous?.sequence ?? 0) + 1, recordedAt: new Date(now).toISOString(), acceptedAt: entry.state === 'completed' ? new Date(now).toISOString() : null })}\n`
    );
    return path;
}

export function summarizeHistory(history, now = Date.now()) {
    const latest = history.at(-1);
    const total = latest.milestones.reduce((sum, milestone) => sum + milestone.weight, 0);
    const done = latest.milestones
        .filter((milestone) => milestone.done)
        .reduce((sum, milestone) => sum + milestone.weight, 0);
    let progressAt = Date.parse(history[0].reportedAt);
    for (let index = 1; index < history.length; index++) {
        if (
            history[index].attempt > history[index - 1].attempt ||
            (history[index].state === 'running' && history[index - 1].state !== 'running')
        ) {
            progressAt = Date.parse(history[index].reportedAt);
        }
        const previousDone = new Set(
            history[index - 1].milestones.filter(({ done }) => done).map(({ id }) => id)
        );
        if (history[index].milestones.some(({ id, done }) => done && !previousDone.has(id))) {
            progressAt = Date.parse(history[index].reportedAt);
        }
    }
    const flags = [];
    if (!terminalStates.has(latest.state) && now > Date.parse(latest.nextUpdateAt)) {
        flags.push(
            now - Date.parse(latest.nextUpdateAt) >= 300_000
                ? 'OVERDUE: investigate/check in'
                : 'Checkpoint due: request update'
        );
    }
    if (latest.state === 'running' && now - progressAt >= 600_000)
        flags.push('No milestone completed for 10+ minutes: inspect; stall unconfirmed');
    if (latest.state === 'blocked' || latest.state === 'unknown')
        flags.push(`Attention: ${latest.state}`);
    return {
        latest,
        total,
        done,
        flags,
        ageMinutes: Math.max(0, Math.floor((now - Date.parse(latest.reportedAt)) / 60_000))
    };
}

export function renderStatus(root, runId, now = Date.now()) {
    if (!runId) {
        const runs = existsSync(root)
            ? readdirSync(root, { withFileTypes: true })
                  .filter((entry) => entry.isDirectory())
                  .map((entry) => entry.name)
                  .sort()
            : [];
        return `Log root: ${root}\n${runs.length ? `Runs (select one with agents:status -- <run-id>):\n${runs.join('\n')}` : 'No registered runs. Progress unknown.'}`;
    }
    requireValue(identifier.test(runId), 'Invalid run ID.');
    const directory = join(root, runId);
    requireValue(existsSync(directory), `No registered run: ${runId}. Progress unknown.`);
    const registration = readPlan(root, runId);
    const missing = registration.tasks.filter(
        ({ taskId }) => !existsSync(join(directory, `${taskId}.jsonl`))
    );
    const tasks = readdirSync(directory)
        .filter((name) => name.endsWith('.jsonl') && name !== '_plan.jsonl')
        .sort()
        .map((name) => {
            const history = readHistory(join(directory, name));
            requireValue(history.length > 0, `Empty log: ${name}`);
            requireValue(
                history.every((entry) => entry.runId === runId && `${entry.taskId}.jsonl` === name),
                `Log identity mismatch: ${name}`
            );
            return summarizeHistory(history, now);
        });
    const total = tasks.reduce((sum, task) => sum + task.total, 0);
    const done = tasks.reduce((sum, task) => sum + task.done, 0);
    const lines = [
        `Run: ${runId} | checked ${new Date(now).toISOString()}`,
        `Registered scope only: ${done}/${total} reported milestone weight (${total && !missing.length ? Math.floor((done / total) * 100) : 'unknown'}%); ${tasks.filter(({ latest }) => latest.state === 'completed').length}/${registration.tasks.length} tasks accepted.`,
        'Milestone counts are reported work, not elapsed time. Project ETA requires dependency review.'
    ];
    for (const task of missing)
        lines.push(
            `MISSING CHECKPOINT: ${task.taskId} (${task.role}); activity and remaining weight unknown.`
        );
    for (const { latest, ageMinutes, total: taskTotal, done: taskDone, flags } of tasks) {
        lines.push(
            '',
            `${latest.taskId} | ${latest.role} | ${latest.state} | ${taskDone}/${taskTotal} weight`,
            `Agent: ${latest.agentId ?? 'unassigned/unknown'} | attempt ${latest.attempt} | source ${latest.source}`,
            `Last report: ${latest.reportedAt} (${ageMinutes}m ago); next: ${latest.nextUpdateAt ?? 'none'}`,
            `Doing: ${latest.summary}`,
            `Next: ${latest.nextAction}`,
            `Dependencies: ${latest.dependencies.join(', ') || 'none'}; blockers: ${latest.blockers.join('; ') || 'none'}`
        );
        for (const milestone of latest.milestones) {
            lines.push(
                `  [${milestone.done ? 'x' : ' '}] ${milestone.id} (${milestone.weight})${milestone.evidence ? `: ${milestone.evidence}` : ''}`
            );
        }
        lines.push(
            latest.estimate
                ? `Estimate at last report: ${latest.estimate.minMinutes}-${latest.estimate.maxMinutes}m remaining (${latest.estimate.confidence}); ${latest.estimate.basis}`
                : 'Estimate: unknown'
        );
        if (flags.length) lines.push(`ATTENTION: ${flags.join('; ')}`);
    }
    return lines.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const [command, argument, ...extra] = process.argv.slice(2);
        const root = process.env.FLL_AGENT_LOG_DIR || defaultRoot;
        requireValue(extra.length === 0, 'Unexpected arguments.');
        if (command === 'register' && argument) {
            console.log(registerRun(root, JSON.parse(readFileSync(argument, 'utf8'))));
        } else if (command === 'record' && argument) {
            console.log(recordCheckpoint(root, JSON.parse(readFileSync(argument, 'utf8'))));
        } else if (command === 'status') {
            console.log(renderStatus(root, argument));
        } else {
            throw new Error(
                'Usage: agent-work-log.mjs register <plan.json> | record <checkpoint.json> | status [run-id]'
            );
        }
    } catch (error) {
        console.error(`Agent work log unavailable: ${error.message}`);
        process.exitCode = 1;
    }
}
