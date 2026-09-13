import { get } from 'svelte/store';
import { afterEach, describe, expect, it } from 'vitest';
import { appendRunLog, clearRunLog, runLogStore } from '$lib/spike/run-log';

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
});
