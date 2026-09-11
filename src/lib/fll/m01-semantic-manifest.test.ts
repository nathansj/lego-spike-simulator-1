import { describe, expect, it } from 'vitest';
import fixture from '$lib/physics/fixtures/drone-scene.json';
import { DRONE_SURVEY_OBSERVATION_IDS } from '$lib/fll/drone-survey-observations';
import { M01_DRONE_SURVEY_SEMANTIC_MANIFEST } from '$lib/fll/m01-semantic-manifest';

describe('M01 Drone Survey semantic manifest', () => {
    it('matches the current observation adapter and fixture body identities', () => {
        const manifest = M01_DRONE_SURVEY_SEMANTIC_MANIFEST;
        const fixtureBodyIds = new Set(['#robot', ...fixture.objects.map((object) => object.id)]);

        expect(manifest.bodyIds).toEqual(DRONE_SURVEY_OBSERVATION_IDS);
        expect([...fixtureBodyIds]).toEqual(expect.arrayContaining([...manifest.fixtureBodyIds]));
        expect([...fixtureBodyIds]).toEqual(
            expect.arrayContaining([
                ...manifest.bodyIds.equipment,
                manifest.bodyIds.drone,
                manifest.bodyIds.lidarMap,
                manifest.bodyIds.scanMarker
            ])
        );
        expect(manifest.fixtureBodyIds).not.toContain(manifest.bodyIds.mat);
    });

    it('keeps every geometry and calibration input explicitly unresolved', () => {
        expect(Object.values(M01_DRONE_SURVEY_SEMANTIC_MANIFEST.unresolvedInputs)).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ status: 'unresolved', missing: expect.any(Array) })
            ])
        );
        for (const input of Object.values(M01_DRONE_SURVEY_SEMANTIC_MANIFEST.unresolvedInputs)) {
            expect(input.missing.length).toBeGreaterThan(0);
        }
    });
});
