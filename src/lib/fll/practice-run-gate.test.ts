import { describe, expect, it } from 'vitest';
import {
    isPracticeRunReady,
    shouldStartResetRun,
    type PracticeRunReadiness
} from './practice-run-gate';

const ready: PracticeRunReadiness = {
    seasonReady: true,
    fieldReady: true,
    robotReady: true,
    driveReady: true,
    programReady: true
};

describe('practice run gate', () => {
    it.each(['seasonReady', 'fieldReady', 'robotReady', 'driveReady', 'programReady'] as const)(
        'blocks when %s is not ready',
        (missingKey) => {
            expect(isPracticeRunReady({ ...ready, [missingKey]: false })).toBe(false);
        }
    );

    it('allows a run only when every readiness check passes', () => {
        expect(isPracticeRunReady(ready)).toBe(true);
    });

    it('guards reset as an alternate start path', () => {
        expect(shouldStartResetRun(false, false, true)).toBe(true);
        expect(shouldStartResetRun(false, false, false)).toBe(false);
        expect(shouldStartResetRun(true, false, false)).toBe(false);
        expect(shouldStartResetRun(false, true, false)).toBe(false);
    });
});
