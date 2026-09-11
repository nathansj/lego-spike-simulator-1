import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    BIOGLOW_EXTERNAL_MPD_INVENTORY,
    BIOGLOW_EXTERNAL_MPD_INVENTORY_CAPTURED_ON,
    findBioglowExternalMpdAsset
} from '$lib/fll/bioglow-external-mpd-inventory';
import { findBundledModelPhysics } from '$lib/physics/articulation-presets';

describe('BIOGLOW external MPD inventory', () => {
    it('pins one distinct external M01-M13 asset with immutable integrity metadata', () => {
        expect(BIOGLOW_EXTERNAL_MPD_INVENTORY_CAPTURED_ON).toBe('2026-09-11');
        expect(BIOGLOW_EXTERNAL_MPD_INVENTORY.map(({ missionId }) => missionId)).toEqual(
            Array.from({ length: 13 }, (_, index) => `M${String(index + 1).padStart(2, '0')}`)
        );
        expect(new Set(BIOGLOW_EXTERNAL_MPD_INVENTORY.map(({ fileName }) => fileName)).size).toBe(
            13
        );
        for (const asset of BIOGLOW_EXTERNAL_MPD_INVENTORY) {
            expect(asset.fileName).toMatch(/^45832_\d{2}\.mpd$/);
            expect(asset.integrity).toMatchObject({ algorithm: 'sha256' });
            expect(asset.integrity.value).toMatch(/^[a-f0-9]{64}$/);
            expect(asset.integrity.sizeBytes).toBeGreaterThan(0);
            expect(asset.localSourcePath.endsWith(`/${asset.fileName}`)).toBe(true);
        }
    });

    it('records the existing manual import route and matching sidecar without admitting mechanics', () => {
        for (const asset of BIOGLOW_EXTERNAL_MPD_INVENTORY) {
            expect(asset.importCompatibility.status).toBe('manual-import-compatible');
            expect(asset.importCompatibility.bundledPhysicsSidecar).toMatch(/\.physics\.json$/);
            expect(existsSync(asset.importCompatibility.bundledPhysicsSidecar)).toBe(true);
            expect(findBundledModelPhysics(asset.fileName)?.model).toBe(asset.fileName);
            expect(asset.admission).toEqual({
                geometry: 'unverified-third-party',
                fieldRegistration: 'not-recorded',
                mechanics: 'not-admitted',
                calibration: 'not-calibrated',
                redistribution: 'not-approved'
            });
        }
    });

    it('finds assets case-insensitively and never treats an unknown model as inventoried', () => {
        expect(findBioglowExternalMpdAsset('45832_02.MPD')?.missionId).toBe('M02');
        expect(findBioglowExternalMpdAsset('45832_14.mpd')).toBeUndefined();
    });
});
