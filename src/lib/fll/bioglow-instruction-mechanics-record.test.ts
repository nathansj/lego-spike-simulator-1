import { describe, expect, it } from 'vitest';
import {
    BIOGLOW_INSTRUCTION_MECHANICS_RECORD,
    findBioglowInstructionMechanicsRecord
} from '$lib/fll/bioglow-instruction-mechanics-record';

describe('BIOGLOW instruction mechanics record', () => {
    it('records construction observations for all 15 missions', () => {
        expect(BIOGLOW_INSTRUCTION_MECHANICS_RECORD).toHaveLength(15);
        for (const record of BIOGLOW_INSTRUCTION_MECHANICS_RECORD) {
            expect(record.claims.some(({ kind }) => kind === 'construction-observation')).toBe(
                true
            );
            expect(record.resource.url).toMatch(/^https:\/\//);
        }
    });

    it('keeps every mission explicitly outside calibrated physics admission', () => {
        for (const record of BIOGLOW_INSTRUCTION_MECHANICS_RECORD) {
            expect(record.claims.some(({ kind }) => kind === 'physics-unresolved')).toBe(true);
            expect(record.evidenceBoundary).toContain('not official physics specifications');
        }
    });

    it('preserves shared booklet mapping', () => {
        expect(findBioglowInstructionMechanicsRecord('M06')?.resource.bookletNumber).toBe('06');
        expect(findBioglowInstructionMechanicsRecord('M07')?.resource.bookletNumber).toBe('06');
        expect(findBioglowInstructionMechanicsRecord('M08')?.resource.bookletNumber).toBe('07');
        expect(findBioglowInstructionMechanicsRecord('M09')?.resource.bookletNumber).toBe('07');
    });
});
