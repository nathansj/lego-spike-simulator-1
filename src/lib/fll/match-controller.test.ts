import { describe, expect, it } from 'vitest';
import {
    DroneSurveyMatchController,
    type DroneSurveyObservationFactory
} from '$lib/fll/match-controller';

const scoringObservation = {
    droneNoLongerTouchingMat: true,
    lidarMapCompletelyFlipped: true,
    scanMarkerAtLeastPartlyInSurveyArea: true,
    missionModelTouchingEquipmentAtEnd: false
};

function controllerFor(factory: DroneSurveyObservationFactory): DroneSurveyMatchController {
    return new DroneSurveyMatchController(factory);
}

describe('Drone Survey match controller', () => {
    it('tracks only supplied fixed simulation time without an implicit match duration', () => {
        let observationCount = 0;
        const controller = controllerFor(() => {
            observationCount += 1;
            return scoringObservation;
        });

        controller.start();
        controller.setElapsedFixedSimulationTime(0);
        controller.setElapsedFixedSimulationTime(12.5);
        controller.setElapsedFixedSimulationTime(1_000_000);

        expect(controller.state).toBe('running');
        expect(controller.elapsedFixedSimulationTimeSeconds).toBe(1_000_000);
        expect(controller.finalScore).toBeUndefined();
        expect(observationCount).toBe(0);
    });

    it('samples and scores the observation exactly once when finishing', () => {
        let observation = {
            ...scoringObservation,
            droneNoLongerTouchingMat: false
        };
        let observationCount = 0;
        const controller = controllerFor(() => {
            observationCount += 1;
            return observation;
        });

        controller.start();
        observation = scoringObservation;

        expect(controller.finalScore).toBeUndefined();

        const score = controller.finish();
        observation = { ...scoringObservation, missionModelTouchingEquipmentAtEnd: true };

        expect(score.points).toBe(30);
        expect(controller.finalScore).toBe(score);
        expect(controller.state).toBe('finished');
        expect(observationCount).toBe(1);
    });

    it('resets completed state and supports an independent replay', () => {
        let observation = scoringObservation;
        const controller = controllerFor(() => observation);

        controller.start();
        controller.setElapsedFixedSimulationTime(4);
        expect(controller.finish().points).toBe(30);

        controller.reset();

        expect(controller.state).toBe('idle');
        expect(controller.elapsedFixedSimulationTimeSeconds).toBe(0);
        expect(controller.finalScore).toBeUndefined();

        observation = { ...scoringObservation, droneNoLongerTouchingMat: false };
        controller.start();
        controller.setElapsedFixedSimulationTime(2);

        expect(controller.finish().points).toBe(0);
    });

    it('rejects invalid lifecycle transitions and backwards elapsed time', () => {
        const controller = controllerFor(() => scoringObservation);

        expect(() => controller.finish()).toThrow('Cannot finish a match while it is idle');
        expect(() => controller.setElapsedFixedSimulationTime(1)).toThrow(
            'Cannot update elapsed simulation time while the match is idle'
        );

        controller.start();

        expect(() => controller.start()).toThrow('Cannot start a match while it is running');
        expect(() => controller.setElapsedFixedSimulationTime(-1)).toThrow(RangeError);
        expect(() => controller.setElapsedFixedSimulationTime(Number.NaN)).toThrow(RangeError);

        controller.setElapsedFixedSimulationTime(2);

        expect(() => controller.setElapsedFixedSimulationTime(1)).toThrow(
            'Elapsed fixed simulation time cannot move backwards during a match'
        );
        expect(controller.elapsedFixedSimulationTimeSeconds).toBe(2);

        controller.finish();

        expect(() => controller.start()).toThrow('Cannot start a match while it is finished');
        expect(() => controller.finish()).toThrow('Cannot finish a match while it is finished');
    });
});
