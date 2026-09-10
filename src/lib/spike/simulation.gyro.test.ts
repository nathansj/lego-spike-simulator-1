import { describe, expect, it } from 'vitest';
import type { SceneStore } from '$lib/spike/scene';
import { Simulation } from '$lib/spike/simulation';
import { Hub, type VM } from '$lib/spike/vm';

async function runGyroStop(frameDeltas: number[]) {
    const hub = new Hub();
    const yawTrace: number[] = [];
    const scene: SceneStore = {
        robot: {
            id: '#robot',
            name: 'Robot',
            anchored: false,
            position: { x: 0, y: 50, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 1,
                enabledTranslations: { x: false, y: false, z: false },
                enabledRotations: { x: false, y: true, z: false },
                colliders: [{ shape: 'box', sizeMm: { x: 100, y: 100, z: 100 } }]
            }
        },
        objects: [],
        map: undefined,
        mapWidth: 1000,
        mapHeight: 1000,
        physicsWorld: {
            fixedTimeStep: 1 / 120,
            gravityMps2: { x: 0, y: 0, z: 0 }
        }
    };
    let simulation: Simulation;
    const vm = {
        step() {
            yawTrace.push(hub.yaw);
            if (Math.abs(hub.yaw) >= 0.5) {
                simulation.physics.getBody('#robot')!.setAngvel({ x: 0, y: 0, z: 0 }, true);
            }
        }
    } as unknown as VM;
    simulation = await Simulation.create(scene, vm, hub, false);
    simulation.physics.getBody('#robot')!.setAngvel({ x: 0, y: 2, z: 0 }, true);

    for (const frameDelta of frameDeltas) simulation.advance(frameDelta);

    const result = {
        yawTrace,
        hubYaw: hub.yaw,
        transform: simulation.physics.getTransform('#robot')!
    };
    simulation.dispose();
    return result;
}

describe('Simulation gyro feedback', () => {
    it('is invariant across equivalent fixed-step frame partitions', async () => {
        const fixedStep = 1 / 120;
        const split = await runGyroStop([fixedStep, fixedStep, fixedStep, fixedStep]);
        const batched = await runGyroStop([fixedStep * 4]);

        expect(split.yawTrace).toHaveLength(4);
        expect(split.yawTrace[0]).toBe(0);
        expect(Math.abs(split.yawTrace[1])).toBeGreaterThan(0.5);
        expect(split.yawTrace[2]).toBe(split.yawTrace[1]);
        expect(split.yawTrace[3]).toBe(split.yawTrace[1]);
        expect(batched.yawTrace).toEqual(split.yawTrace);
        expect(batched.hubYaw).toBe(split.hubYaw);
        expect(batched.transform).toEqual(split.transform);
    });
});
