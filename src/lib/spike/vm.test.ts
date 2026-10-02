import { describe, expect, it } from 'vitest';
import { ActionStatement, movementTargetMm } from '$lib/spike/vm';

interface FakeScene {
    robot: { position: { x: number; y: number; z: number }; rotation: number };
}

function runTravelLoop(target: number, progress: (scene: FakeScene) => void): number {
    const scene: FakeScene = { robot: { position: { x: 0, y: 0, z: 0 }, rotation: 0 } };
    const thread = {
        vm: {
            scene,
            hub: {
                moveDistance: 175,
                movePair1: 'A',
                movePair2: 'B',
                wheels: [
                    { port: 'A', position: { x: -50, y: 0, z: 0 } },
                    { port: 'B', position: { x: 50, y: 0, z: 0 } }
                ]
            },
            sleep: () => ({})
        }
    } as never;
    const statement = new ActionStatement('flippermove_steer', 'steer', []) as never;
    const generator = (
        statement as { waitForDistance: (...args: unknown[]) => Generator<unknown> }
    ).waitForDistance(thread, target, 60);
    let steps = 0;
    let result = generator.next();
    while (!result.done && steps < 10000) {
        progress(scene);
        result = generator.next();
        steps++;
    }
    return steps;
}

describe('movementTargetMm', () => {
    const moveDistanceMm = 175;

    it('converts centimetres to millimetres', () => {
        expect(movementTargetMm(10, 'cm', moveDistanceMm)).toBeCloseTo(100, 6);
    });

    it('converts inches to millimetres', () => {
        expect(movementTargetMm(2, 'in', moveDistanceMm)).toBeCloseTo(50.8, 6);
        expect(movementTargetMm(2, 'inches', moveDistanceMm)).toBeCloseTo(50.8, 6);
    });

    it('converts rotations and degrees using the movement distance', () => {
        expect(movementTargetMm(2, 'rotations', moveDistanceMm)).toBeCloseTo(350, 6);
        expect(movementTargetMm(180, 'degrees', moveDistanceMm)).toBeCloseTo(87.5, 6);
    });

    it('ignores units that are not distances', () => {
        expect(movementTargetMm(1, 'seconds', moveDistanceMm)).toBe(0);
    });
});

describe('waitForDistance', () => {
    it('stops once straight-line travel reaches the target', () => {
        const steps = runTravelLoop(100, (scene) => {
            scene.robot.position.x += 10;
        });
        expect(steps).toBeGreaterThanOrEqual(10);
        expect(steps).toBeLessThan(20);
    });

    it('counts in-place rotation toward the target', () => {
        const steps = runTravelLoop(100, (scene) => {
            scene.robot.rotation += 90;
        });
        // 90 degrees at a 50 mm half-track arm is ~78.5 mm, so two samples exceed 100 mm.
        expect(steps).toBeGreaterThanOrEqual(2);
        expect(steps).toBeLessThan(10);
    });
});
