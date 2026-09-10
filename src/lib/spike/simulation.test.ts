import { describe, expect, it } from 'vitest';
import * as m4 from '$lib/ldraw/m4';
import type { RobotMotion, VM } from '$lib/spike/vm';
import { Hub, Motor, Port, Wheel } from '$lib/spike/vm';
import type { SceneStore } from '$lib/spike/scene';
import { Simulation } from '$lib/spike/simulation';

function drivenHub(): Hub {
    const hub = new Hub();
    for (const [index, port] of ['A', 'B'].entries()) {
        const name = port as 'A' | 'B';
        hub.ports[name] = new Port('motor');
        hub.ports[name].motor = new Motor(index + 1);
        hub.ports[name].motor!.startMotor({ percent: 60, ignorePresetSpeed: true });
    }
    const left = new Wheel(1, 28, 1, 'A', m4.identity());
    left.position = { x: -60, y: -30, z: 0 };
    left.direction = { x: 0, y: 0, z: 1 };
    const right = new Wheel(2, 28, 1, 'B', m4.identity());
    right.position = { x: 60, y: -30, z: 0 };
    right.direction = { x: 0, y: 0, z: 1 };
    hub.wheels = [left, right];
    return hub;
}

describe('Simulation runtime', () => {
    it('drives into an object and deterministically restores physics and motors', async () => {
        const hub = drivenHub();
        const scene: SceneStore = {
            robot: {
                id: '#robot',
                name: 'Robot',
                anchored: false,
                position: { x: 0, y: 32.5, z: 0 },
                physics: {
                    bodyType: 'dynamic',
                    massKg: 0.95,
                    friction: 0.8,
                    enabledRotations: { x: false, y: true, z: false },
                    colliders: [{ shape: 'box', sizeMm: { x: 140, y: 65, z: 170 } }]
                }
            },
            objects: [
                {
                    id: 'pushable',
                    name: 'Pushable',
                    anchored: false,
                    position: { x: 0, y: 30, z: 220 },
                    physics: {
                        bodyType: 'dynamic',
                        massKg: 0.1,
                        friction: 0.5,
                        colliders: [{ shape: 'box', sizeMm: { x: 60, y: 60, z: 60 } }]
                    }
                }
            ],
            map: undefined,
            mapWidth: 1000,
            mapHeight: 1000
        };
        const vm = {
            step(seconds: number, runtimeScene: SceneStore, motion?: RobotMotion) {
                motion?.step(seconds, runtimeScene, hub);
            }
        } as VM;
        const simulation = await Simulation.create(scene, vm, hub, false);

        for (let i = 0; i < 360; i++) simulation.advance(1 / 120);
        const firstRobot = simulation.physics.getTransform('#robot')!;
        const firstObject = simulation.physics.getTransform('pushable')!;
        expect(firstObject.positionMm.z).toBeGreaterThan(240);
        expect(hub.ports.A.motor!.relativePosition).toBeGreaterThan(0);

        simulation.reset();
        expect(simulation.physics.getTransform('#robot')!.positionMm.z).toBeCloseTo(0, 5);
        expect(simulation.physics.getTransform('pushable')!.positionMm.z).toBeCloseTo(220, 5);
        expect(hub.ports.A.motor!.relativePosition).toBe(0);
        expect(hub.ports.A.motor!.on).toBe(true);

        for (let i = 0; i < 360; i++) simulation.advance(1 / 120);
        expect(simulation.physics.getTransform('#robot')).toEqual(firstRobot);
        expect(simulation.physics.getTransform('pushable')).toEqual(firstObject);
        simulation.dispose();
    });

    it('updates distance and force ports from physics rays while excluding the robot', async () => {
        const hub = new Hub();
        hub.ports.C = new Port('distance');
        hub.ports.D = new Port('force');
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
                    colliders: [{ shape: 'box', sizeMm: { x: 140, y: 100, z: 170 } }]
                }
            },
            objects: [
                {
                    id: 'distance-target',
                    name: 'Distance target',
                    anchored: true,
                    position: { x: 0, y: 50, z: 500 },
                    physics: {
                        bodyType: 'fixed',
                        colliders: [{ shape: 'box', sizeMm: { x: 100, y: 100, z: 100 } }]
                    }
                },
                {
                    id: 'force-target',
                    name: 'Force target',
                    anchored: true,
                    position: { x: 78, y: 50, z: 0 },
                    physics: {
                        bodyType: 'fixed',
                        colliders: [{ shape: 'box', sizeMm: { x: 10, y: 20, z: 20 } }]
                    }
                }
            ],
            map: undefined,
            mapWidth: 2000,
            mapHeight: 1000
        };
        const vm = { step(_seconds: number, _scene: SceneStore, _motion?: RobotMotion) {} } as VM;
        const simulation = await Simulation.create(scene, vm, hub, false);
        simulation.physics.step();
        simulation.setPhysicsSensors([
            {
                port: 'C',
                type: 'distance',
                pose: { positionMm: { x: 0, y: 0, z: 85 }, direction: { x: 0, y: 0, z: 1 } }
            },
            {
                port: 'D',
                type: 'force',
                pose: { positionMm: { x: 70, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } }
            }
        ]);

        expect(hub.ports.C.measure.distance).toBe(364);
        expect(hub.ports.D.measure.force).toBeCloseTo(6.25, 4);
        simulation.setForceSensorOverride('D', 6);
        simulation.advance(1 / 60);
        expect(hub.ports.D.measure.force).toBe(6);
        simulation.setForceSensorOverride('D', undefined);
        expect(hub.ports.D.measure.force).toBeCloseTo(6.25, 4);
        simulation.dispose();
    });

    it('treats saved physics as authoritative even for former compatibility IDs', async () => {
        const hub = new Hub();
        const scene: SceneStore = {
            robot: {
                id: '#robot',
                name: 'Robot',
                anchored: false,
                position: { x: 0, y: 25, z: 0 },
                physics: {
                    bodyType: 'dynamic',
                    massKg: 1,
                    colliders: [{ shape: 'box', sizeMm: { x: 50, y: 50, z: 50 } }]
                }
            },
            objects: [
                {
                    id: '45832-01-red-base',
                    name: 'Explicitly fixed test body',
                    anchored: true,
                    position: { x: 200, y: 10, z: 0 },
                    physics: {
                        bodyType: 'fixed',
                        colliders: [{ shape: 'box', sizeMm: { x: 20, y: 20, z: 20 } }]
                    }
                }
            ],
            map: undefined,
            mapWidth: 1000,
            mapHeight: 1000
        };
        const vm = { step(_seconds: number, _scene: SceneStore, _motion?: RobotMotion) {} } as VM;
        const simulation = await Simulation.create(scene, vm, hub, false);
        expect(simulation.physics.getBody('45832-01-red-base')!.isFixed()).toBe(true);
        simulation.dispose();
    });
});
