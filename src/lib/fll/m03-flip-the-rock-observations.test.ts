import { describe, expect, it } from 'vitest';
import {
    M03FlipTheRockObservationUnavailableError,
    observeM03FlipTheRock
} from '$lib/fll/m03-flip-the-rock-observations';

describe('M03 Flip the Rock observation boundary', () => {
    it('preserves both caller-supplied end-state observables', () => {
        expect(
            observeM03FlipTheRock({
                researchFlagDown: true,
                rockReturnedToOriginalPosition: false
            })
        ).toEqual({
            researchFlagDown: true,
            rockReturnedToOriginalPosition: false
        });
    });

    it('fails closed when a required field is not boolean', () => {
        expect(() =>
            observeM03FlipTheRock({
                researchFlagDown: true,
                rockReturnedToOriginalPosition: undefined
            })
        ).toThrowError(
            expect.objectContaining({
                name: 'M03FlipTheRockObservationUnavailableError',
                evidence: {
                    status: 'unavailable',
                    reason: 'invalid-m03-observation-input',
                    invalidFields: ['rockReturnedToOriginalPosition']
                }
            })
        );
    });

    it('exposes structured evidence for non-object input', () => {
        expect(() => observeM03FlipTheRock(null)).toThrowError(
            expect.objectContaining({
                name: 'M03FlipTheRockObservationUnavailableError',
                evidence: expect.objectContaining({ invalidFields: ['observation'] })
            })
        );
        expect(() => observeM03FlipTheRock({})).toThrowError(
            M03FlipTheRockObservationUnavailableError
        );
    });
});
