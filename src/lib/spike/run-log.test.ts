import { get } from 'svelte/store';
import { afterEach, describe, expect, it } from 'vitest';
import {
    appendRunLog,
    clearRunLog,
    formatRunLogEntries,
    getRunLogGuidance,
    runLogStore
} from '$lib/spike/run-log';

describe('robot run log', () => {
    afterEach(() => {
        clearRunLog();
    });

    it('appends entries with their diagnostic level and message', () => {
        appendRunLog('warn', 'Robot is not moving.');

        const entries = get(runLogStore);

        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            level: 'warn',
            message: 'Robot is not moving.'
        });
        expect(entries[0].timestamp).toEqual(expect.any(String));
    });

    it('keeps only the most recent 500 entries', () => {
        for (let index = 0; index < 501; index += 1) {
            appendRunLog('info', `entry ${index}`);
        }

        const entries = get(runLogStore);

        expect(entries).toHaveLength(500);
        expect(entries[0].message).toBe('entry 1');
        expect(entries[499].message).toBe('entry 500');
    });

    it('clears all entries', () => {
        appendRunLog('error', 'Collision detected.');
        clearRunLog();

        expect(get(runLogStore)).toEqual([]);
    });

    it('formats entries for a readable diagnostic export', () => {
        expect(
            formatRunLogEntries([
                { id: 2, timestamp: '12:01:02 PM', level: 'warn', message: 'Robot is stationary.' },
                { id: 1, timestamp: '12:01:01 PM', level: 'info', message: 'Run started.' }
            ])
        ).toBe('[12:01:02 PM] WARN Robot is stationary.\n[12:01:01 PM] INFO Run started.');
    });

    it('gives inspection guidance for an observed physics contact', () => {
        expect(
            getRunLogGuidance({
                message: 't=1.0s cause=physics-snag-contact=robot,mission-base'
            })
        ).toEqual({
            observation: 'A physics step reported contact with robot, mission-base.',
            nextAction:
                'Pause the run and inspect the named bodies with collider overlays; verify their transforms before changing the program.'
        });
    });

    it('keeps guidance observation-based for stationary contact', () => {
        const guidance = getRunLogGuidance({
            message: 'cause=stationary-in-contact-with:robot,wall'
        });

        expect(guidance.observation).toBe(
            'The robot was stationary while contact with robot, wall was reported.'
        );
        expect(guidance.nextAction).toContain('not proof of causation');
    });

    it('suggests setup checks for non-contact diagnostic causes', () => {
        expect(getRunLogGuidance({ message: 'cause=driven-motors-off' }).nextAction).toContain(
            'motor blocks'
        );
        expect(getRunLogGuidance({ message: 'cause=robot-body-missing' }).observation).toBe(
            'The robot physics body was reported unavailable.'
        );
    });
});
