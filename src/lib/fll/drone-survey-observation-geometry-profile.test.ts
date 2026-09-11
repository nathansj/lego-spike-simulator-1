import { describe, expect, it } from 'vitest';
import {
    DRONE_SURVEY_OBSERVATION_GEOMETRY_PROFILE_VERSION,
    parseDroneSurveyObservationGeometryProfile,
    validateDroneSurveyObservationGeometryProfile,
    type DroneSurveyObservationGeometryProfile
} from '$lib/fll/drone-survey-observation-geometry-profile';

function validProfile(): DroneSurveyObservationGeometryProfile {
    return {
        profileVersion: DRONE_SURVEY_OBSERVATION_GEOMETRY_PROFILE_VERSION,
        missionId: 'M01',
        provenance: {
            source: 'field-registration-measurements.csv',
            sourceVersion: 'measurement-set-2026-09-10',
            recordedOn: '2026-09-10'
        },
        calibration: {
            status: 'unverified',
            evidence: 'Synthetic test values only; no physical calibration has been performed.'
        },
        geometry: {
            lidarMapFlippedRotationRelativeToMat: { x: 0, y: 1, z: 0, w: 0 },
            maximumLidarMapRotationErrorRadians: 0.125,
            surveyAreaMm: { minX: -125.5, maxX: 330.25, minZ: 12.75, maxZ: 900 },
            scanMarkerPointOffsetMm: { x: 4.5, y: -2.25, z: 8.75 },
            scanMarkerOverlapMarginMm: 6.5
        }
    };
}

describe('Drone Survey observation geometry profile', () => {
    it('parses a complete versioned profile without converting millimeters or radians', () => {
        const expected = validProfile();

        expect(parseDroneSurveyObservationGeometryProfile(JSON.stringify(expected))).toEqual(
            expected
        );
    });

    it('rejects malformed JSON and profiles that omit required values or add fields', () => {
        expect(() => parseDroneSurveyObservationGeometryProfile('{')).toThrow('invalid JSON');

        const withoutOffset = validProfile() as unknown as {
            geometry: Record<string, unknown>;
        };
        delete withoutOffset.geometry.scanMarkerPointOffsetMm;
        expect(() => validateDroneSurveyObservationGeometryProfile(withoutOffset)).toThrow(
            'geometry must contain exactly'
        );

        const withExtraField = { ...validProfile(), unexpected: true };
        expect(() => validateDroneSurveyObservationGeometryProfile(withExtraField)).toThrow(
            'profile must contain exactly'
        );
    });

    it('rejects non-finite geometry and invalid calibration metadata', () => {
        const withInfiniteMargin = validProfile();
        withInfiniteMargin.geometry.scanMarkerOverlapMarginMm = Infinity;
        expect(() => validateDroneSurveyObservationGeometryProfile(withInfiniteMargin)).toThrow(
            'geometry.scanMarkerOverlapMarginMm must be a finite number'
        );

        const withNanOffset = validProfile();
        withNanOffset.geometry.scanMarkerPointOffsetMm.x = Number.NaN;
        expect(() => validateDroneSurveyObservationGeometryProfile(withNanOffset)).toThrow(
            'geometry.scanMarkerPointOffsetMm.x must be a finite number'
        );

        const withInvalidStatus = validProfile() as unknown as {
            calibration: { status: string; evidence: string };
        };
        withInvalidStatus.calibration.status = 'assumed';
        expect(() => validateDroneSurveyObservationGeometryProfile(withInvalidStatus)).toThrow(
            'calibration.status must be unverified or calibrated'
        );
    });

    it('rejects reversed survey bounds and unsupported profile versions', () => {
        const withReversedBounds = validProfile();
        withReversedBounds.geometry.surveyAreaMm.minZ = 901;
        expect(() => validateDroneSurveyObservationGeometryProfile(withReversedBounds)).toThrow(
            'geometry.surveyAreaMm bounds must not be reversed'
        );

        const withUnsupportedVersion = { ...validProfile(), profileVersion: 2 };
        expect(() => validateDroneSurveyObservationGeometryProfile(withUnsupportedVersion)).toThrow(
            'unsupported profileVersion: 2'
        );
    });
});
