import { describe, expect, it } from 'vitest';
import { M02_CANDIDATE_MECHANICS_RECORD } from '$lib/fll/m02-candidate-mechanics-record';

describe('M02 candidate mechanics record', () => {
    it('records instruction-backed candidate partitions without admitting mechanics', () => {
        expect(M02_CANDIDATE_MECHANICS_RECORD.status).toBe('candidate-not-admitted');
        expect(M02_CANDIDATE_MECHANICS_RECORD.candidatePartitions).toHaveLength(5);
        expect(M02_CANDIDATE_MECHANICS_RECORD.candidateRelations).toHaveLength(2);
        expect(M02_CANDIDATE_MECHANICS_RECORD.source.locator).toContain('steps 8-35');
    });

    it('records video confirmation while preserving identity as unresolved', () => {
        expect(M02_CANDIDATE_MECHANICS_RECORD.unresolved).toEqual(
            expect.arrayContaining([
                expect.stringContaining('video confirms three visible scoring seed objects')
            ])
        );
        expect(M02_CANDIDATE_MECHANICS_RECORD.videoEvidence.observations).toHaveLength(2);
        expect(M02_CANDIDATE_MECHANICS_RECORD.videoEvidence.limitation).toContain(
            'MPD submodel identity mapping'
        );
        expect(M02_CANDIDATE_MECHANICS_RECORD.admissionBoundary).toContain(
            'score-connected physics'
        );
    });
});
