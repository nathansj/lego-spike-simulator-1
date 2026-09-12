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
        expect(M02_CANDIDATE_MECHANICS_RECORD.mpdCandidates.embeddedGroups).toHaveLength(6);
        expect(M02_CANDIDATE_MECHANICS_RECORD.mpdCandidates.selectionCandidates).toEqual([
            expect.objectContaining({
                partitionId: 'm02-base-and-stand-candidate',
                modelNumbers: ['SubModel Group 1']
            }),
            expect.objectContaining({
                partitionId: 'm02-plant-stem-candidate',
                modelNumbers: ['SubModel Group 2']
            }),
            expect.objectContaining({
                partitionId: 'm02-seed-assembly-candidate-a',
                modelNumbers: ['SubModel Group 3', '57539.dat Copy 3']
            }),
            expect.objectContaining({
                partitionId: 'm02-seed-assembly-candidate-b',
                modelNumbers: ['SubModel Group 3_Mirrored', '57539.dat Copy 4']
            })
        ]);
        expect(
            M02_CANDIDATE_MECHANICS_RECORD.mpdCandidates.candidateRoles.filter(
                ({ role }) => role === 'flexible-hose-candidate'
            )
        ).toHaveLength(2);
        expect(M02_CANDIDATE_MECHANICS_RECORD.videoEvidence.limitation).toContain(
            'MPD submodel identity mapping'
        );
        expect(M02_CANDIDATE_MECHANICS_RECORD.admissionBoundary).toContain(
            'score-connected physics'
        );
    });
});
