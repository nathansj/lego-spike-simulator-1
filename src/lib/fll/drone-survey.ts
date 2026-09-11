export const DRONE_SURVEY_RULE_SOURCE = {
    edition: 'BIOGLOW Founders Edition Challenge 2026-27',
    title: 'Robot Game Rulebook and Challenge Updates',
    url: 'https://www.firstinspires.org/resources/library/fll/season-materials',
    missionResourceUrl:
        'https://education.theiet.org/first-lego-league-programmes/challenge/about-first-lego-league-challenge/'
} as const;

export interface DroneSurveyObservation {
    droneNoLongerTouchingMat: boolean;
    lidarMapCompletelyFlipped: boolean;
    scanMarkerAtLeastPartlyInSurveyArea: boolean;
    missionModelTouchingEquipmentAtEnd: boolean;
}

export interface ScoreCondition {
    id: 'drone-off-mat' | 'lidar-bonus' | 'equipment-constraint';
    points: number;
    awarded: boolean;
    explanation: string;
}

export interface DroneSurveyScore {
    missionId: 'M01';
    points: number;
    conditions: ScoreCondition[];
    source: typeof DRONE_SURVEY_RULE_SOURCE;
}

export function scoreDroneSurvey(observation: DroneSurveyObservation): DroneSurveyScore {
    const equipmentConstraint = observation.missionModelTouchingEquipmentAtEnd;
    const droneOffMat = observation.droneNoLongerTouchingMat && !equipmentConstraint;
    const lidarBonus =
        droneOffMat &&
        observation.lidarMapCompletelyFlipped &&
        observation.scanMarkerAtLeastPartlyInSurveyArea;

    const conditions: ScoreCondition[] = [
        {
            id: 'drone-off-mat',
            points: 20,
            awarded: droneOffMat,
            explanation: droneOffMat
                ? 'The drone is no longer touching the mat.'
                : equipmentConstraint
                  ? 'The mission model is touching equipment at the end of the match.'
                  : 'The drone is still touching the mat.'
        },
        {
            id: 'lidar-bonus',
            points: 10,
            awarded: lidarBonus,
            explanation: lidarBonus
                ? 'The LiDAR map is completely flipped and the scan marker is at least partly in the survey area.'
                : 'The bonus requires the drone score plus both LiDAR map and scan marker conditions.'
        },
        {
            id: 'equipment-constraint',
            points: 0,
            awarded: !equipmentConstraint,
            explanation: equipmentConstraint
                ? 'The mission model is touching equipment at the end of the match, so this mission cannot score.'
                : 'The mission model is not touching equipment at the end of the match.'
        }
    ];

    return {
        missionId: 'M01',
        points: (droneOffMat ? 20 : 0) + (lidarBonus ? 10 : 0),
        conditions,
        source: DRONE_SURVEY_RULE_SOURCE
    };
}
