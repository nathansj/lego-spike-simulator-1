import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '$lib/physics/fixtures/drone-scene.json';
import { observeDroneSurvey } from '$lib/fll/drone-survey-observations';
import { parseDroneSurveyObservationGeometryProfile } from '$lib/fll/drone-survey-observation-geometry-profile';
import { DroneSurveyMatchController } from '$lib/fll/match-controller';
import * as m4 from '$lib/ldraw/m4';
import type { SceneStore } from '$lib/spike/scene';
import { parseSceneDefinition } from '$lib/spike/scene-schema';
import { Simulation } from '$lib/spike/simulation';
import {
    ActionStatement,
    EventStatement,
    Hub,
    Motor,
    Port,
    StatementBlock,
    Value,
    VM,
    Wheel
} from '$lib/spike/vm';

const FIXED_STEPS = 3000;
const SYNTHETIC_UNVERIFIED_PROFILE = parseDroneSurveyObservationGeometryProfile(
    JSON.stringify({
        profileVersion: 1,
        missionId: 'M01',
        provenance: {
            source: 'synthetic M01 program-to-score regression values',
            sourceVersion: 'test-only-unverified-v1',
            recordedOn: '2026-09-10'
        },
        calibration: {
            status: 'unverified',
            evidence:
                'Synthetic test-only fixture bounds and tolerance; no official geometry or physical calibration.'
        },
        geometry: {
            lidarMapFlippedRotationRelativeToMat: {
                x: 0,
                y: 0.25881904510252074,
                z: 0,
                w: 0.9659258262890683
            },
            maximumLidarMapRotationErrorRadians: 0.001,
            surveyAreaMm: { minX: -500, maxX: 500, minZ: 300, maxZ: 600 },
            scanMarkerPointOffsetMm: { x: 0, y: 0, z: 0 },
            scanMarkerOverlapMarginMm: 0
        }
    })
);

function action(operation: string, ...args: string[]): ActionStatement {
    return new ActionStatement(
        `flippermove_${operation}`,
        operation,
        args.map((value) => new Value('literal', '', value))
    );
}

async function setup(): Promise<{
    simulation: Simulation;
    vm: VM;
}> {
    const scene: SceneStore = { ...parseSceneDefinition(fixture), map: undefined };
    for (const [index, object] of [scene.robot, ...scene.objects].entries()) {
        object.compiled = [fixture.robot, ...fixture.objects][index]
            .compiled as typeof object.compiled;
    }

    const hub = new Hub();
    for (const port of ['A', 'B'] as const) {
        hub.ports[port] = new Port('motor');
        hub.ports[port].motor = new Motor(port === 'A' ? 1 : 2);
    }
    hub.wheels = fixture.robot.wheels.map((data, index) =>
        Object.assign(
            new Wheel(index, data.radius, data.gearing, data.port as 'A' | 'B', m4.identity()),
            data
        )
    );
    VM.prototype.alignWheelsToModel.call({ hub } as VM);

    vi.stubGlobal('Audio', class {});
    vi.stubGlobal(
        'AudioContext',
        class {
            destination = {};
            createOscillator() {
                return { connect() {} };
            }
        }
    );
    const program = new StatementBlock([
        action('setMovementPair', 'AB'),
        action('movementSpeed', '50'),
        action('move', 'forward', '55', 'cm'),
        action('steer', '1', '4', 'rotations'),
        action('move', 'back', '25', 'cm'),
        action('steer', '100', '0.5', 'rotations'),
        action('move', 'forward', '25', 'cm'),
        action('stopMove')
    ]);
    const startEvent = new EventStatement('flipperevents_whenProgramStarts', 'start', [], program);
    const vm = new VM('robot', hub, {}, new Map([['start', startEvent]]), new Map(), undefined);

    return {
        simulation: await Simulation.create(scene, vm, hub, true),
        vm
    };
}

describe('M01 program to physics to score', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('samples the post-physics observation at finish and awards 30 points', async () => {
        const { simulation, vm } = await setup();
        const initialBaseX = simulation.physics.getTransform('45832-01-red-base')!.positionMm.x;
        let finishObservation: ReturnType<typeof observeDroneSurvey> | undefined;
        const controller = new DroneSurveyMatchController(() => {
            finishObservation = observeDroneSurvey(
                simulation.physics,
                SYNTHETIC_UNVERIFIED_PROFILE.geometry
            );
            return finishObservation;
        });

        controller.start();
        vm.start();
        for (let step = 0; step < FIXED_STEPS; step++) {
            simulation.advance(simulation.physics.fixedTimeStep);
        }
        controller.setElapsedFixedSimulationTime(FIXED_STEPS * simulation.physics.fixedTimeStep);

        expect(simulation.physics.getTransform('45832-01-red-base')!.positionMm.x).toBeGreaterThan(
            initialBaseX + 20
        );
        expect(finishObservation).toBeUndefined();

        const score = controller.finish();

        expect(finishObservation).toEqual({
            droneNoLongerTouchingMat: true,
            lidarMapCompletelyFlipped: true,
            scanMarkerAtLeastPartlyInSurveyArea: true,
            missionModelTouchingEquipmentAtEnd: false
        });
        expect(score.points).toBe(30);
        expect(controller.finalScore).toBe(score);

        simulation.dispose();
    });

    it('applies the equipment constraint from finish-time physics contact', async () => {
        const { simulation } = await setup();
        const scanMarker = simulation.physics.getBody('45832-01-red-base')!;
        const robot = simulation.physics.getBody('#robot')!;
        robot.setTranslation(scanMarker.translation(), true);
        robot.setLinvel({ x: 0, y: 0, z: 0 }, true);
        simulation.advance(simulation.physics.fixedTimeStep);

        const controller = new DroneSurveyMatchController(() =>
            observeDroneSurvey(simulation.physics, SYNTHETIC_UNVERIFIED_PROFILE.geometry)
        );
        controller.start();
        controller.setElapsedFixedSimulationTime(simulation.physics.fixedTimeStep);

        const score = controller.finish();

        expect(score.points).toBe(0);
        expect(score.conditions.find(({ id }) => id === 'equipment-constraint')).toMatchObject({
            awarded: false
        });

        simulation.dispose();
    });
});
