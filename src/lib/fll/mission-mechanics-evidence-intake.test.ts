import { describe, expect, it } from 'vitest';
import {
    BIOGLOW_MISSION_IDS,
    MISSION_MECHANICS_EVIDENCE_INTAKE_SCHEMA,
    MissionMechanicsEvidenceIntakeValidationError,
    validateMissionMechanicsEvidenceIntake,
    type MissionMechanicsEvidenceIntake
} from '$lib/fll/mission-mechanics-evidence-intake';

function validM02Intake(): MissionMechanicsEvidenceIntake {
    return {
        recordVersion: 1,
        missionId: 'M02',
        reviewer: 'Simulator mechanics reviewer',
        reviewedOn: '2026-09-11',
        admissionStatus: 'mechanics-evidence-admitted',
        sources: [
            {
                id: 'mission-video',
                kind: 'official-video',
                url: 'https://www.youtube.com/watch?v=uhZZ8O1StiQ',
                title: 'BIOGLOW Robot Game Missions Video - Founders Edition',
                locator: 'Mission 02 demonstration'
            },
            {
                id: 'building-instructions',
                kind: 'official-build-instructions',
                url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bi-enus-book-02.pdf',
                title: 'Mission 02 Building Instructions',
                locator: 'Build Bag 3, pages 1-15'
            },
            {
                id: 'candidate-mpd',
                kind: 'mpd',
                url: 'file:///models/45832_02.mpd',
                title: 'Candidate M02 MPD',
                locator: 'SHA-256-pinned root model file'
            },
            {
                id: 'bench-measurement',
                kind: 'measurement',
                url: 'file:///evidence/m02-release-trials.csv',
                title: 'M02 release trial log',
                locator: 'Trials 1-10, measured 2026-09-11'
            }
        ],
        observedClaims: [
            {
                id: 'visible-release',
                statement:
                    'The video shows seeds separating from the stalk after robot interaction.',
                evidenceSourceIds: ['mission-video'],
                state: 'unverified',
                calibrationEvidenceSourceIds: []
            },
            {
                id: 'candidate-submodel',
                statement: 'The candidate MPD contains a reviewable model hierarchy.',
                evidenceSourceIds: ['candidate-mpd'],
                state: 'unverified',
                calibrationEvidenceSourceIds: []
            },
            {
                id: 'measured-release-distance',
                statement: 'A release travel distance was measured on the physical model.',
                evidenceSourceIds: ['bench-measurement'],
                state: 'measurement-backed',
                calibrationEvidenceSourceIds: ['bench-measurement']
            }
        ],
        unverifiedClaims: [
            {
                id: 'joint-axis',
                statement: 'The seed release joint axis is not yet admitted.',
                reason: 'Video and build instructions do not establish a calibrated joint anchor or limit.',
                evidenceSourceIds: ['mission-video', 'building-instructions']
            }
        ]
    };
}

describe('mission mechanics evidence intake', () => {
    it('captures the required source and claim evidence for every BIOGLOW mission', () => {
        expect(BIOGLOW_MISSION_IDS).toEqual([
            'M01',
            'M02',
            'M03',
            'M04',
            'M05',
            'M06',
            'M07',
            'M08',
            'M09',
            'M10',
            'M11',
            'M12',
            'M13'
        ]);
        expect(MISSION_MECHANICS_EVIDENCE_INTAKE_SCHEMA.calibrationSafety).toContain(
            'only measurement sources'
        );
        expect(validateMissionMechanicsEvidenceIntake(validM02Intake())).toEqual(validM02Intake());
    });

    it('rejects a video-only observation presented as calibrated physics', () => {
        const base = validM02Intake();
        const intake = {
            ...base,
            admissionStatus: 'calibrated-physics-admitted' as const,
            observedClaims: [
                {
                    ...base.observedClaims[0],
                    state: 'calibrated-physics-admitted' as const,
                    calibrationEvidenceSourceIds: ['mission-video']
                },
                ...base.observedClaims.slice(1)
            ]
        };

        expect(() => validateMissionMechanicsEvidenceIntake(intake)).toThrow(
            MissionMechanicsEvidenceIntakeValidationError
        );
        expect(() => validateMissionMechanicsEvidenceIntake(intake)).toThrow(
            'may only identify sources with kind measurement'
        );
    });

    it('allows calibrated physics only when a measurement source is explicitly cited', () => {
        const base = validM02Intake();
        const intake = {
            ...base,
            admissionStatus: 'calibrated-physics-admitted' as const,
            observedClaims: [
                ...base.observedClaims.slice(0, 2),
                {
                    ...base.observedClaims[2],
                    state: 'calibrated-physics-admitted' as const
                }
            ]
        };

        expect(validateMissionMechanicsEvidenceIntake(intake).admissionStatus).toBe(
            'calibrated-physics-admitted'
        );
    });

    it('fails closed for malformed sources and unresolved source references', () => {
        const base = validM02Intake();
        const intake = {
            ...base,
            sources: [{ ...base.sources[0], url: 'mission-video' }, ...base.sources.slice(1)],
            observedClaims: [
                { ...base.observedClaims[0], evidenceSourceIds: ['unknown-source'] },
                ...base.observedClaims.slice(1)
            ]
        };

        expect(() => validateMissionMechanicsEvidenceIntake(intake)).toThrow(
            'url must be an absolute https: or file: URL'
        );
        expect(() => validateMissionMechanicsEvidenceIntake(intake)).toThrow(
            'references unknown source unknown-source'
        );
    });

    it('requires a calibrated admission to have an admitted calibrated claim', () => {
        const base = validM02Intake();
        const intake = { ...base, admissionStatus: 'calibrated-physics-admitted' as const };

        expect(() => validateMissionMechanicsEvidenceIntake(intake)).toThrow(
            'requires at least one calibrated physics claim'
        );
    });
});
