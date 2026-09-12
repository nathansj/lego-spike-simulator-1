import { describe, expect, it } from 'vitest';
import {
    FlipTheRockInputValidationError,
    scoreFlipTheRock
} from '$lib/fll/flip-the-rock';

const eligible = { allowsMissionPoints: true, reasons: [] };

describe('Flip the Rock scoring', () => {
    it('awards 20 points for the flag and 10 bonus points for the reset', () => {
        const score = scoreFlipTheRock(
            { researchFlagDown: true, rockReturnedToOriginalPosition: true },
            eligible
        );

        expect(score.points).toBe(30);
        expect(score.conditions.map(({ awarded }) => awarded)).toEqual([true, true]);
    });

    it('does not award the reset bonus without the flag result', () => {
        const score = scoreFlipTheRock(
            { researchFlagDown: false, rockReturnedToOriginalPosition: true },
            eligible
        );

        expect(score.points).toBe(0);
        expect(score.conditions[1].qualifies).toBe(false);
    });

    it('gates both conditions on global match eligibility', () => {
        const score = scoreFlipTheRock(
            { researchFlagDown: true, rockReturnedToOriginalPosition: true },
            { allowsMissionPoints: false, reasons: ['equipment violation'] }
        );

        expect(score.points).toBe(0);
        expect(score.conditions.every(({ awarded }) => !awarded)).toBe(true);
    });

    it('rejects extra observation fields', () => {
        expect(() =>
            scoreFlipTheRock(
                {
                    researchFlagDown: true,
                    rockReturnedToOriginalPosition: true,
                    extra: false
                } as unknown as Parameters<typeof scoreFlipTheRock>[0],
                eligible
            )
        ).toThrowError(FlipTheRockInputValidationError);
    });
});
