export interface M03FlipTheRockObservation {
    researchFlagDown: boolean;
    rockReturnedToOriginalPosition: boolean;
}

export interface M03FlipTheRockObservationUnavailableEvidence {
    status: 'unavailable';
    reason: 'invalid-m03-observation-input';
    invalidFields: string[];
}

export class M03FlipTheRockObservationUnavailableError extends Error {
    constructor(readonly evidence: M03FlipTheRockObservationUnavailableEvidence) {
        super(`M03 Flip the Rock observation unavailable: ${evidence.invalidFields.join(', ')}`);
        this.name = 'M03FlipTheRockObservationUnavailableError';
    }
}

export function observeM03FlipTheRock(input: unknown): M03FlipTheRockObservation {
    const invalidFields: string[] = [];
    if (typeof input !== 'object' || input === null) {
        invalidFields.push('observation');
    } else {
        const record = input as Record<string, unknown>;
        if (typeof record.researchFlagDown !== 'boolean') {
            invalidFields.push('researchFlagDown');
        }
        if (typeof record.rockReturnedToOriginalPosition !== 'boolean') {
            invalidFields.push('rockReturnedToOriginalPosition');
        }
    }

    if (invalidFields.length > 0) {
        throw new M03FlipTheRockObservationUnavailableError({
            status: 'unavailable',
            reason: 'invalid-m03-observation-input',
            invalidFields
        });
    }

    const record = input as M03FlipTheRockObservation;
    return {
        researchFlagDown: record.researchFlagDown,
        rockReturnedToOriginalPosition: record.rockReturnedToOriginalPosition
    };
}
