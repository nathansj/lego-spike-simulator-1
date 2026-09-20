import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import {
    recordCheckpoint,
    registerRun,
    renderStatus,
    summarizeHistory,
    validateCheckpoint
} from './agent-work-log.mjs';

const start = Date.parse('2026-09-13T12:00:00.000Z');
const testRoots = new Set();

afterEach(() => {
    for (const root of testRoots) rmSync(root, { recursive: true, force: true });
    testRoots.clear();
});

function checkpoint(overrides = {}) {
    return {
        schemaVersion: 1,
        runId: 'test-run',
        taskId: 'review',
        role: 'fll_qa',
        agentId: 'runtime-test',
        attempt: 1,
        source: 'worker',
        reportedAt: new Date(start).toISOString(),
        nextUpdateAt: new Date(start + 120_000).toISOString(),
        state: 'running',
        summary: 'Inspecting import failure behavior.',
        nextAction: 'Reproduce the failure with a malformed scene.',
        dependencies: [],
        blockers: [],
        milestones: [
            {
                id: 'inspect',
                weight: 1,
                done: true,
                evidence: 'Read LoadScene.svelte import path.'
            },
            { id: 'reproduce', weight: 3, done: false, evidence: '' }
        ],
        estimate: {
            minMinutes: 5,
            maxMinutes: 10,
            confidence: 'low',
            basis: 'One reproduction remaining.'
        },
        planChange: '',
        ...overrides
    };
}

function temporaryRoot(register = true) {
    const root = mkdtempSync(join(tmpdir(), 'fll-agent-log-test-'));
    testRoots.add(root);
    if (register)
        registerRun(
            root,
            { schemaVersion: 1, runId: 'test-run', tasks: [{ taskId: 'review', role: 'fll_qa' }] },
            start
        );
    return root;
}

test('rejects unsafe paths, invalid estimates, unsupported schema, and unearned completion', () => {
    for (const overrides of [
        { runId: '../outside' },
        { taskId: 'a/b' },
        { schemaVersion: 2 },
        { source: 'lead-relay' },
        { state: 'completed', nextUpdateAt: null },
        { state: 'blocked', blockers: [] },
        { estimate: { minMinutes: 9, maxMinutes: 2, confidence: 'high', basis: 'guess' } },
        { reportedAt: new Date(start + 1).toISOString() },
        { milestones: [{ id: 'inspect', weight: 1, done: true, evidence: '' }] }
    ])
        assert.throws(() => validateCheckpoint(checkpoint(overrides), start));
});

test('late relay remains overdue even when received now', () => {
    const root = temporaryRoot();
    const now = start + 900_000;
    const path = recordCheckpoint(
        root,
        checkpoint({ source: 'lead-relay', reportReference: 'worker checkpoint message' }),
        now
    );
    const entry = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(entry.recordedAt, new Date(now).toISOString());
    assert.equal(entry.reportedAt, new Date(start).toISOString());
    const status = renderStatus(root, 'test-run', now);
    assert.match(status, /15m ago/);
    assert.match(status, /OVERDUE/);
    assert.match(status, /stall unconfirmed/);
    assert.match(status, /25%/);
});

test('a heartbeat alone does not count as milestone progress', () => {
    const history = [
        checkpoint(),
        checkpoint({
            reportedAt: new Date(start + 660_000).toISOString(),
            nextUpdateAt: new Date(start + 780_000).toISOString()
        })
    ];
    assert.match(summarizeHistory(history, start + 660_000).flags.join(), /No milestone/);
    history[1].milestones[1] = {
        id: 'reproduce',
        weight: 3,
        done: true,
        evidence: 'Reproduction result.'
    };
    assert.deepEqual(summarizeHistory(history, start + 660_000).flags, []);
});

test('queued time does not count as stalled running time', () => {
    const history = [
        checkpoint({ state: 'queued' }),
        checkpoint({
            reportedAt: new Date(start + 3_600_000).toISOString(),
            nextUpdateAt: new Date(start + 3_720_000).toISOString()
        })
    ];
    assert.deepEqual(summarizeHistory(history, start + 3_600_000).flags, []);
});

test('queued work stays in denominator; review is not accepted completion', () => {
    const root = temporaryRoot();
    registerRun(
        root,
        {
            schemaVersion: 1,
            runId: 'test-run',
            tasks: [
                { taskId: 'review', role: 'fll_qa' },
                { taskId: 'integration', role: 'fll_lead' }
            ],
            planChange: 'Register integration.'
        },
        start
    );
    recordCheckpoint(
        root,
        checkpoint({
            state: 'review',
            milestones: [{ id: 'report', weight: 2, done: true, evidence: 'Report delivered.' }]
        }),
        start
    );
    recordCheckpoint(
        root,
        checkpoint({
            taskId: 'integration',
            role: 'fll_lead',
            agentId: 'primary',
            state: 'queued',
            milestones: [{ id: 'integrate', weight: 2, done: false, evidence: '' }]
        }),
        start
    );
    assert.match(
        renderStatus(root, 'test-run', start),
        /2\/4 reported milestone weight \(50%\); 0\/2 tasks accepted/
    );
});

test('preserves history and requires reason for scope changes and new attempt on reassignment', () => {
    const root = temporaryRoot();
    const path = recordCheckpoint(root, checkpoint(), start);
    const largerPlan = [
        ...checkpoint().milestones,
        { id: 'extra', weight: 2, done: false, evidence: '' }
    ];
    assert.throws(
        () => recordCheckpoint(root, checkpoint({ milestones: largerPlan }), start),
        /scope/
    );
    assert.throws(
        () => recordCheckpoint(root, checkpoint({ agentId: 'replacement' }), start),
        /attempt/
    );
    assert.throws(
        () =>
            recordCheckpoint(
                root,
                checkpoint({ agentId: 'replacement', attempt: 2, source: 'lead' }),
                start
            ),
        /previous writer stop/
    );
    recordCheckpoint(
        root,
        checkpoint({
            agentId: 'replacement',
            attempt: 2,
            source: 'lead',
            reassignment: {
                previousAgentId: 'runtime-test',
                writerStopped: true,
                reason: 'Previous worker stopped; transfer after handoff.'
            },
            milestones: largerPlan,
            planChange: 'Review found a missing scenario.'
        }),
        start
    );
    const history = readFileSync(path, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(history.length, 2);
    assert.deepEqual(
        history.map(({ sequence }) => sequence),
        [1, 2]
    );
});

test('acceptance is timestamped and terminal tasks do not become stale', () => {
    const root = temporaryRoot();
    const path = recordCheckpoint(
        root,
        checkpoint({
            source: 'lead',
            state: 'completed',
            nextUpdateAt: null,
            milestones: [
                {
                    id: 'accept',
                    weight: 1,
                    done: true,
                    evidence: 'Lead reviewed the delivered report.'
                }
            ]
        }),
        start
    );
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).acceptedAt, new Date(start).toISOString());
    assert.doesNotMatch(renderStatus(root, 'test-run', start + 900_000), /ATTENTION/);
    assert.throws(() => recordCheckpoint(root, checkpoint(), start), /Reopening/);
});

test('missing, corrupt, and out-of-order logs fail visibly', () => {
    const root = temporaryRoot(false);
    assert.match(renderStatus(root), /No registered runs/);
    assert.throws(() => renderStatus(root, 'missing'), /Progress unknown/);
    registerRun(
        root,
        { schemaVersion: 1, runId: 'test-run', tasks: [{ taskId: 'review', role: 'fll_qa' }] },
        start
    );
    const path = recordCheckpoint(root, checkpoint(), start);
    assert.throws(
        () =>
            recordCheckpoint(
                root,
                checkpoint({ reportedAt: new Date(start - 1).toISOString() }),
                start
            ),
        /Out-of-order/
    );
    appendFileSync(path, '{broken\n');
    assert.throws(() => renderStatus(root, 'test-run', start), /review.jsonl:2/);
});

test('registration detects absent checkpoints and cannot silently drop tasks', () => {
    const root = temporaryRoot();
    const status = renderStatus(root, 'test-run', start);
    assert.match(status, /unknown%/);
    assert.match(status, /MISSING CHECKPOINT: review/);
    assert.throws(
        () => recordCheckpoint(root, checkpoint({ taskId: 'unregistered' }), start),
        /registered/
    );
    assert.throws(
        () =>
            registerRun(
                root,
                {
                    schemaVersion: 1,
                    runId: 'test-run',
                    tasks: [{ taskId: 'replacement', role: 'fll_qa' }],
                    planChange: 'Drop task.'
                },
                start
            ),
        /Keep registered/
    );
});
