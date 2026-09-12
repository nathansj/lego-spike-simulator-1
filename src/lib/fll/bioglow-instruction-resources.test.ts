import { describe, expect, it } from 'vitest';
import {
    BIOGLOW_INSTRUCTION_RESOURCE_RECORD,
    findBioglowInstructionResource
} from '$lib/fll/bioglow-instruction-resources';

describe('BIOGLOW instruction resources', () => {
    it('maps all 15 missions to the official 13 booklet PDFs', () => {
        expect(BIOGLOW_INSTRUCTION_RESOURCE_RECORD).toHaveLength(15);
        expect(
            new Set(BIOGLOW_INSTRUCTION_RESOURCE_RECORD.map(({ bookletNumber }) => bookletNumber))
        ).toHaveLength(13);
        expect(findBioglowInstructionResource('M06')?.bookletNumber).toBe('06');
        expect(findBioglowInstructionResource('M07')?.bookletNumber).toBe('06');
        expect(findBioglowInstructionResource('M08')?.bookletNumber).toBe('07');
        expect(findBioglowInstructionResource('M09')?.bookletNumber).toBe('07');
    });

    it('keeps instruction evidence separate from physics calibration', () => {
        for (const resource of BIOGLOW_INSTRUCTION_RESOURCE_RECORD) {
            expect(resource.url).toMatch(/^https:\/\//);
            expect(resource.pageCount).toBeGreaterThan(0);
            expect(resource.evidenceBoundary).toContain('do not establish calibrated physics');
        }
    });

    it('fails closed for unknown missions', () => {
        expect(findBioglowInstructionResource('M99')).toBeUndefined();
    });
});
