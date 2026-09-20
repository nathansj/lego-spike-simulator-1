import { describe, expect, it } from 'vitest';
import { BIOGLOW_FOUNDERS_SEASON_PACKAGE, getMissionFromSeasonPackage } from './season-package';
import { missionReadiness } from './season-readiness';

describe('season mission readiness', () => {
    it('reports incomplete evidence as practice-only instead of official readiness', () => {
        const mission = getMissionFromSeasonPackage(BIOGLOW_FOUNDERS_SEASON_PACKAGE, 'M01');
        expect(mission).toBeDefined();
        const readiness = missionReadiness(mission!);
        expect(readiness.level).toBe('practice-only');
        expect(readiness.headline).toContain('incomplete');
        expect(readiness.capabilities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'mechanics', status: 'unverified' }),
                expect.objectContaining({ key: 'physicalCalibration', status: 'unverified' }),
                expect.objectContaining({ key: 'scoring', status: 'implemented' })
            ])
        );
        expect(readiness.capabilities.find(({ key }) => key === 'physicalCalibration')?.action).toContain(
            'physical field'
        );
    });

    it('reports unavailable mission assets with a corrective action', () => {
        const mission = getMissionFromSeasonPackage(BIOGLOW_FOUNDERS_SEASON_PACKAGE, 'M14');
        expect(mission).toBeDefined();
        const readiness = missionReadiness(mission!);
        expect(readiness.level).toBe('needs-setup');
        expect(readiness.capabilities.find(({ key }) => key === 'assets')).toMatchObject({
            status: 'unavailable',
            action: expect.stringContaining('Load or create')
        });
    });
});
