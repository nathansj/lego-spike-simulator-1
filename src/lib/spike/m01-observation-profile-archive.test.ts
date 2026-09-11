import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
    M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY,
    parseM01ObservationProfileArchiveEntry,
    serializeM01ObservationProfileArchiveEntry
} from './m01-observation-profile-archive';

const profile = {
    profileVersion: 1,
    missionId: 'M01',
    provenance: {
        source: 'synthetic archive regression',
        sourceVersion: 'archive-test-2026-09-10',
        recordedOn: '2026-09-10'
    },
    calibration: {
        status: 'unverified',
        evidence: 'Synthetic values for archive persistence only.'
    },
    geometry: {
        lidarMapFlippedRotationRelativeToMat: { x: 0, y: 1, z: 0, w: 0 },
        maximumLidarMapRotationErrorRadians: 0.125,
        surveyAreaMm: { minX: -125.5, maxX: 330.25, minZ: 12.75, maxZ: 900 },
        scanMarkerPointOffsetMm: { x: 4.5, y: -2.25, z: 8.75 },
        scanMarkerOverlapMarginMm: 6.5
    }
} as const;

describe('M01 observation profile archive entry', () => {
    it('leaves legacy archives without the optional entry readable', async () => {
        const zip = new JSZip();
        zip.file('scene.json', '{"version":2,"objects":[]}');

        const archive = await zip.generateAsync({ type: 'uint8array' });
        const loaded = await JSZip.loadAsync(archive);

        expect(loaded.file(M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY)).toBeNull();
        await expect(loaded.file('scene.json')!.async('string')).resolves.toBe(
            '{"version":2,"objects":[]}'
        );
    });

    it('round-trips the validated profile through its dedicated JSON entry', async () => {
        const zip = new JSZip();
        zip.file(
            M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY,
            serializeM01ObservationProfileArchiveEntry(profile)
        );

        const archive = await zip.generateAsync({ type: 'uint8array' });
        const loaded = await JSZip.loadAsync(archive);
        const entry = loaded.file(M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY);

        expect(entry).toBeDefined();
        await expect(entry!.async('string')).resolves.toSatisfy((contents) => {
            expect(parseM01ObservationProfileArchiveEntry(contents)).toEqual(profile);
            return true;
        });
    });

    it('rejects malformed entries through the canonical profile parser', () => {
        expect(() => parseM01ObservationProfileArchiveEntry('{')).toThrow('invalid JSON');
        expect(() =>
            parseM01ObservationProfileArchiveEntry(JSON.stringify({ ...profile, unexpected: true }))
        ).toThrow('profile must contain exactly');
    });
});
