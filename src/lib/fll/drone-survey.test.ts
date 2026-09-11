import { describe, expect, it } from 'vitest';
import { DRONE_SURVEY_RULE_SOURCE, scoreDroneSurvey } from '$lib/fll/drone-survey';

describe('Drone Survey scoring', () => {
    it('pins the official M01 source page and applicable dated update', () => {
        expect(DRONE_SURVEY_RULE_SOURCE).toMatchObject({
            edition: 'BIOGLOW Founders Edition Challenge 2026-27',
            rulebook: {
                url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-rgr.pdf',
                page: 9
            },
            challengeUpdate: {
                url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-updates.pdf',
                updated: '2026-09-02',
                update: '01',
                affectsM01: false
            },
            verifiedOn: '2026-09-10'
        });
        expect(DRONE_SURVEY_RULE_SOURCE.rulebook.revision).toContain('No displayed revision');
    });

    it('awards 20 points when the drone is off the mat', () => {
        const result = scoreDroneSurvey({
            droneNoLongerTouchingMat: true,
            lidarMapCompletelyFlipped: false,
            scanMarkerAtLeastPartlyInSurveyArea: false,
            missionModelTouchingEquipmentAtEnd: false
        });

        expect(result.points).toBe(20);
        expect(result.conditions[0].awarded).toBe(true);
        expect(result.conditions[1].awarded).toBe(false);
    });

    it('adds 10 points only when both bonus conditions are true', () => {
        const result = scoreDroneSurvey({
            droneNoLongerTouchingMat: true,
            lidarMapCompletelyFlipped: true,
            scanMarkerAtLeastPartlyInSurveyArea: true,
            missionModelTouchingEquipmentAtEnd: false
        });

        expect(result.points).toBe(30);
        expect(result.conditions[1].awarded).toBe(true);
    });

    it('does not award the bonus without the base drone condition', () => {
        const result = scoreDroneSurvey({
            droneNoLongerTouchingMat: false,
            lidarMapCompletelyFlipped: true,
            scanMarkerAtLeastPartlyInSurveyArea: true,
            missionModelTouchingEquipmentAtEnd: false
        });

        expect(result.points).toBe(0);
        expect(result.conditions[1].awarded).toBe(false);
    });

    it('applies the equipment constraint to the whole mission score', () => {
        const result = scoreDroneSurvey({
            droneNoLongerTouchingMat: true,
            lidarMapCompletelyFlipped: true,
            scanMarkerAtLeastPartlyInSurveyArea: true,
            missionModelTouchingEquipmentAtEnd: true
        });

        expect(result.points).toBe(0);
        expect(result.conditions[0].awarded).toBe(false);
        expect(result.conditions[2].awarded).toBe(false);
    });
});
