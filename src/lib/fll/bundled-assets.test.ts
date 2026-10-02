import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { BIOGLOW_MISSION_CATALOG } from '$lib/fll/bioglow-mission-catalog';
import { practiceFieldLayout } from '$lib/fll/bundled-assets';

const manifestPath = 'static/season/manifest.json';

describe('bundled season assets', () => {
    it('lists every bundled mission model and the file exists', () => {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
            models: { missionId: string; name: string; model: string }[];
            robots: { id: string; name: string; model: string }[];
        };
        expect(manifest.models.length).toBeGreaterThanOrEqual(13);
        for (const model of manifest.models) {
            expect(existsSync(`static/${model.model}`)).toBe(true);
        }
        for (const robot of manifest.robots) {
            expect(existsSync(`static/${robot.model}`)).toBe(true);
        }
    });

    it('uses the catalog mission names for bundled models', () => {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
            models: { missionId: string; name: string }[];
        };
        for (const model of manifest.models) {
            const catalog = BIOGLOW_MISSION_CATALOG.find((entry) => entry.id === model.missionId);
            expect(catalog?.name).toBe(model.name);
        }
    });

    it('lays out practice missions within the field bounds', () => {
        const field = { matWidthMm: 2360, matHeightMm: 1140, boundaryHeightMm: 50 };
        const placements = practiceFieldLayout(13, field);
        expect(placements).toHaveLength(13);
        for (const placement of placements) {
            expect(Math.abs(placement.x)).toBeLessThanOrEqual(field.matWidthMm / 2);
            expect(Math.abs(placement.z)).toBeLessThanOrEqual(field.matHeightMm / 2);
        }
    });

    it('contains the packaged default project', () => {
        expect(existsSync('static/season/default.lsp-project')).toBe(true);
    });
});
