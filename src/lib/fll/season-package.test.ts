import { describe, expect, it } from 'vitest';
import {
    BIOGLOW_FOUNDERS_SEASON_ID,
    BIOGLOW_FOUNDERS_SEASON_PACKAGE,
    DEFAULT_SEASON_PACKAGE_ID,
    getMissionFromSeasonPackage,
    getDefaultSeasonPackage,
    getSeasonPackage,
    SEASON_PACKAGE_SCHEMA_VERSION
} from './season-package';

describe('BIOGLOW SeasonPackage adapter', () => {
    it('identifies the versioned Founders Edition and field dimensions', () => {
        expect(BIOGLOW_FOUNDERS_SEASON_PACKAGE.schemaVersion).toBe(SEASON_PACKAGE_SCHEMA_VERSION);
        expect(BIOGLOW_FOUNDERS_SEASON_PACKAGE.id).toBe(BIOGLOW_FOUNDERS_SEASON_ID);
        expect(BIOGLOW_FOUNDERS_SEASON_PACKAGE.edition).toBe('Founders Edition');
        expect(BIOGLOW_FOUNDERS_SEASON_PACKAGE.platform).toBe('SPIKE Prime');
        expect(BIOGLOW_FOUNDERS_SEASON_PACKAGE.field).toEqual({
            matWidthMm: 2360,
            matHeightMm: 1140,
            tableWidthMm: 2434,
            tableHeightMm: 1145,
            boundaryHeightMm: 50
        });
        expect(BIOGLOW_FOUNDERS_SEASON_PACKAGE.match.durationSeconds).toBe(150);
    });

    it('adapts all catalog missions and preserves capability status', () => {
        expect(BIOGLOW_FOUNDERS_SEASON_PACKAGE.missions).toHaveLength(15);
        expect(BIOGLOW_FOUNDERS_SEASON_PACKAGE.missions[0]).toMatchObject({
            id: 'M01',
            name: 'Drone Survey',
            capabilities: {
                assets: 'verified',
                mechanics: 'unverified',
                scoring: 'implemented',
                physicalCalibration: 'unverified'
            }
        });
        expect(getMissionFromSeasonPackage(BIOGLOW_FOUNDERS_SEASON_PACKAGE, 'M14')).toMatchObject({
            id: 'M14',
            capabilities: { assets: 'unavailable', mechanics: 'unavailable' },
            assetPaths: []
        });
    });

    it('exposes provenance and fail-closed lookup behavior', () => {
        expect(BIOGLOW_FOUNDERS_SEASON_PACKAGE.provenance.sources).toHaveLength(3);
        expect(BIOGLOW_FOUNDERS_SEASON_PACKAGE.provenance.sources).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ url: expect.stringContaining('firstinspires.org') }),
                expect.objectContaining({ revision: 'Update 01, 2026-09-02' })
            ])
        );
        expect(getSeasonPackage(BIOGLOW_FOUNDERS_SEASON_ID)).toBe(BIOGLOW_FOUNDERS_SEASON_PACKAGE);
        expect(getSeasonPackage('synthetic-unknown-season')).toBeUndefined();
        expect(getMissionFromSeasonPackage(BIOGLOW_FOUNDERS_SEASON_PACKAGE, 'M99')).toBeUndefined();
    });

    it('provides the intended default package for a new practice session', () => {
        expect(DEFAULT_SEASON_PACKAGE_ID).toBe(BIOGLOW_FOUNDERS_SEASON_ID);
        expect(getDefaultSeasonPackage()).toBe(BIOGLOW_FOUNDERS_SEASON_PACKAGE);
    });
});
