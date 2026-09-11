import { describe, expect, it } from 'vitest';
import { BIOGLOW_MATCH_RULES } from '$lib/fll/bioglow-match-rules';
import { BioglowMatchClock } from '$lib/fll/match-clock';

describe('BIOGLOW fixed-step match clock', () => {
    it('uses the sourced match duration and starts with the full time remaining', () => {
        const clock = new BioglowMatchClock();

        expect(clock.durationSeconds).toBe(BIOGLOW_MATCH_RULES.duration.seconds);
        expect(clock.elapsedSeconds).toBe(0);
        expect(clock.remainingSeconds).toBe(150);
        expect(clock.expired).toBe(false);
    });

    it('advances monotonically from completed fixed steps', () => {
        const clock = new BioglowMatchClock();

        clock.advanceFixedSteps(120, 1 / 120);
        expect(clock.elapsedSeconds).toBeCloseTo(1);
        expect(clock.remainingSeconds).toBeCloseTo(149);

        clock.advanceFixedSteps(60, 1 / 120);
        expect(clock.elapsedSeconds).toBeCloseTo(1.5);
        expect(clock.remainingSeconds).toBeCloseTo(148.5);
        expect(clock.expired).toBe(false);

        clock.advanceFixedSteps(0, 1 / 120);
        expect(clock.elapsedSeconds).toBeCloseTo(1.5);
    });

    it('expires at the sourced duration and clamps overshoot', () => {
        const clock = new BioglowMatchClock();

        clock.advanceFixedSteps(17_999, 1 / 120);
        expect(clock.expired).toBe(false);
        expect(clock.remainingSeconds).toBeCloseTo(1 / 120);

        clock.advanceFixedSteps(2, 1 / 120);
        expect(clock.elapsedSeconds).toBe(150);
        expect(clock.remainingSeconds).toBe(0);
        expect(clock.expired).toBe(true);

        clock.advanceFixedSteps(120, 1 / 120);
        expect(clock.elapsedSeconds).toBe(150);
        expect(clock.remainingSeconds).toBe(0);
    });

    it('resets elapsed and expired state for an independent replay', () => {
        const clock = new BioglowMatchClock();

        clock.advanceFixedSteps(18_000, 1 / 120);
        expect(clock.expired).toBe(true);

        clock.reset();

        expect(clock.elapsedSeconds).toBe(0);
        expect(clock.remainingSeconds).toBe(150);
        expect(clock.expired).toBe(false);
    });

    it.each([
        [-1, 1 / 120],
        [0.5, 1 / 120],
        [Number.MAX_SAFE_INTEGER + 1, 1 / 120],
        [1, 0],
        [1, -1 / 120],
        [1, Number.NaN],
        [1, Number.POSITIVE_INFINITY]
    ])('rejects invalid fixed-step input (%s, %s)', (completedFixedSteps, fixedTimeStepSeconds) => {
        const clock = new BioglowMatchClock();

        expect(() => clock.advanceFixedSteps(completedFixedSteps, fixedTimeStepSeconds)).toThrow(
            RangeError
        );
        expect(clock.elapsedSeconds).toBe(0);
    });
});
