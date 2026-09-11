import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    BIOGLOW_CATALOG_VERIFIED_ON,
    BIOGLOW_MISSION_CATALOG,
    BIOGLOW_SOURCE_URLS
} from '$lib/fll/bioglow-mission-catalog';

describe('BIOGLOW Founders Edition mission catalog', () => {
    it('records all 15 verified mission IDs and names in score-sheet order', () => {
        expect(BIOGLOW_MISSION_CATALOG.map(({ id, name }) => [id, name])).toEqual([
            ['M01', 'Drone Survey'],
            ['M02', 'Exploding Seeds'],
            ['M03', 'Flip the Rock'],
            ['M04', 'Lucky Leaves'],
            ['M05', 'Reaching Roots'],
            ['M06', 'Leafcutter Frenzy'],
            ['M07', 'Humongous Fungus'],
            ['M08', 'Tangled'],
            ['M09', 'Research Platform'],
            ['M10', 'Fragile Microhabitats'],
            ['M11', 'Window to the Past'],
            ['M12', 'Forest Elder'],
            ['M13', 'Keystone Species'],
            ['M14', 'Seeds of Renewal'],
            ['M15', 'Biocentric Architecture']
        ]);
    });

    it('pins a verified primary source and date for every mission', () => {
        for (const mission of BIOGLOW_MISSION_CATALOG) {
            const sources = mission.readiness.officialRuleSourceCoverage.sources;
            expect(mission.readiness.officialRuleSourceCoverage.status).toBe(
                mission.id === 'M01' ? 'verified' : 'located'
            );
            expect(sources).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        url: BIOGLOW_SOURCE_URLS.softwareScoresheet,
                        verifiedOn: BIOGLOW_CATALOG_VERIFIED_ON
                    })
                ])
            );
            expect(sources.every((source) => source.url.startsWith('https://'))).toBe(true);
            expect(sources.every((source) => source.locator.length > 0)).toBe(true);
        }
    });

    it('records the Lucky Leaves update and the M01 rulebook locator', () => {
        const m01 = BIOGLOW_MISSION_CATALOG.find(({ id }) => id === 'M01')!;
        const m04 = BIOGLOW_MISSION_CATALOG.find(({ id }) => id === 'M04')!;

        expect(m01.readiness.officialRuleSourceCoverage.sources).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    url: BIOGLOW_SOURCE_URLS.rulebook,
                    locator: expect.stringContaining('page 9')
                })
            ])
        );
        expect(m04.readiness.officialRuleSourceCoverage.sources).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ url: BIOGLOW_SOURCE_URLS.challengeUpdates })
            ])
        );
    });

    it('separates existing sidecars from unverified mechanics and scoring coverage', () => {
        const sidecarMissions = BIOGLOW_MISSION_CATALOG.filter(
            ({ readiness }) => readiness.repositoryAssetPresence.status === 'verified'
        );
        const absentMissions = BIOGLOW_MISSION_CATALOG.filter(
            ({ readiness }) => readiness.repositoryAssetPresence.status === 'unavailable'
        );

        expect(sidecarMissions.map(({ id }) => id)).toEqual(
            Array.from({ length: 13 }, (_, index) => `M${String(index + 1).padStart(2, '0')}`)
        );
        expect(absentMissions.map(({ id }) => id)).toEqual(['M14', 'M15']);
        expect(
            sidecarMissions.every(({ readiness }) =>
                readiness.repositoryAssetPresence.paths.every((path) => existsSync(path))
            )
        ).toBe(true);
        expect(
            sidecarMissions.every(({ readiness }) => readiness.mechanics.status === 'unverified')
        ).toBe(true);
        expect(
            absentMissions.every(({ readiness }) => readiness.mechanics.status === 'unavailable')
        ).toBe(true);
        expect(
            BIOGLOW_MISSION_CATALOG.filter(
                ({ readiness }) => readiness.scoring.status === 'implemented'
            ).map(({ id }) => id)
        ).toEqual(['M01']);
    });
});
