import { describe, expect, it } from 'vitest';
import { BIOGLOW_MATCH_RULES } from '$lib/fll/bioglow-match-rules';

describe('BIOGLOW match rules', () => {
    it('records the Founders Edition 2.5-minute match duration as 150 seconds', () => {
        expect(BIOGLOW_MATCH_RULES.edition).toBe('BIOGLOW Founders Edition Challenge 2026-27');
        expect(BIOGLOW_MATCH_RULES.duration).toEqual({
            minutes: 2.5,
            seconds: 150,
            evaluationTiming: 'The official match end occurs when the 2.5-minute duration expires.',
            source: 'rulebook page 4, Before the Match'
        });
    });

    it('pins official HTTPS sources and locators for the selected rule set', () => {
        const sources = Object.values(BIOGLOW_MATCH_RULES.sources);

        expect(sources).toHaveLength(3);
        for (const source of sources) {
            expect(new URL(source.url).protocol).toBe('https:');
            expect(source.locator.length).toBeGreaterThan(0);
            expect(source.revision.length).toBeGreaterThan(0);
            expect(source.supports.length).toBeGreaterThan(0);
        }
        expect(BIOGLOW_MATCH_RULES.sources.rulebook.locator).toContain('page 4');
        expect(BIOGLOW_MATCH_RULES.sources.rulebook.locator).toContain('2.5 minutes');
        expect(BIOGLOW_MATCH_RULES.sources.challengeUpdates.revision).toBe('Update 01, 2026-09-02');
    });

    it('keeps early manual finish and incomplete adjudication outside the duration rule', () => {
        const limitations = BIOGLOW_MATCH_RULES.limitations;

        expect(limitations.manualFinish).toContain('before 150 seconds');
        expect(limitations.globalEligibility).toContain('does not implement');
        expect(limitations.scoring).toContain('does not implement');
    });
});
