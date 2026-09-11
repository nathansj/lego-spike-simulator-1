import {
    parseDroneSurveyObservationGeometryProfile,
    validateDroneSurveyObservationGeometryProfile,
    type DroneSurveyObservationGeometryProfile
} from '$lib/fll/drone-survey-observation-geometry-profile';

/** Dedicated optional JSON entry for M01 observation geometry in `.spk` scene archives. */
export const M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY = 'm01-observation-profile.json';

/**
 * Parent integration contract:
 *
 * - `SaveSimulation` accepts an optional `m01ObservationProfile` prop. When present, it is
 *   validated and written to `M01_OBSERVATION_PROFILE_ARCHIVE_ENTRY`.
 * - `LoadScene` accepts an optional `onM01ObservationProfileLoaded` callback. It receives the
 *   parsed profile after a scene loads successfully, or `undefined` for legacy archives without
 *   this entry. The parent should replace both its active profile and derived M01 geometry from
 *   this one callback.
 * - A malformed entry prevents both the scene update and callback, preserving the current scene
 *   and parent-owned profile.
 */
export type M01ObservationProfileLoadedCallback = (
    profile: DroneSurveyObservationGeometryProfile | undefined
) => void;

/** Validates and serializes an explicit profile without adding or deriving any values. */
export function serializeM01ObservationProfileArchiveEntry(
    profile: DroneSurveyObservationGeometryProfile
): string {
    return JSON.stringify(validateDroneSurveyObservationGeometryProfile(profile));
}

/** Parses a profile archive entry through the canonical M01 profile parser. */
export function parseM01ObservationProfileArchiveEntry(
    contents: string
): DroneSurveyObservationGeometryProfile {
    return parseDroneSurveyObservationGeometryProfile(contents);
}
