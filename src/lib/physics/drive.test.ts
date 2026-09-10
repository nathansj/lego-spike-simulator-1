import { describe, expect, it } from 'vitest';
import { ForceDriveController } from '$lib/physics/drive';
import { PhysicsWorld } from '$lib/physics/world';
import { createMatDefinition } from '$lib/physics/bodies';
import type { SceneStore } from '$lib/spike/scene';
import { Hub, Motor, Port, Wheel } from '$lib/spike/vm';
import * as m4 from '$lib/ldraw/m4';

describe('ForceDriveController', () => {
    it('produces yaw for the project steering command with a mirrored geared wheel', async () => {
        const physics = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        physics.addBody({ id: '#robot', positionMm: { x: 0, y: 50, z: 0 }, physics: {
            bodyType: 'dynamic', massKg: 1, linearDamping: 0.1, angularDamping: 0.2,
            enabledRotations: { x: false, y: true, z: false },
            colliders: [{ shape: 'box', sizeMm: { x: 140, y: 65, z: 170 } }]
        }});
        const hub = new Hub();
        hub.ports.A = new Port('motor'); hub.ports.A.motor = new Motor(1);
        hub.ports.B = new Port('motor'); hub.ports.B.motor = new Motor(2);
        // flippermove_steer(-31) at 50%: pair 1 = 19%, pair 2 = 50%.
        hub.ports.A.motor.startMotor({ percent: 19, reverse: true, ignorePresetSpeed: true });
        hub.ports.B.motor.startMotor({ percent: 50, reverse: false, ignorePresetSpeed: true });
        const left = new Wheel(1, 28, -1, 'A', m4.identity());
        left.position = { x: 0, y: -30, z: -100 }; left.direction = { x: 1, y: 0, z: 0 };
        const right = new Wheel(2, 28, 1, 'B', m4.identity());
        right.position = { x: 0, y: -30, z: 100 }; right.direction = { x: 1, y: 0, z: 0 };
        hub.wheels = [left, right];
        const scene = { robot: { anchored: false, name: '#robot' }, objects: [], map: undefined, mapWidth: 1000, mapHeight: 1000 } satisfies SceneStore;
        const drive = new ForceDriveController(physics);
        for (let i = 0; i < 240; i++) { drive.step(1 / 120, scene, hub); physics.step(); }
        expect(Math.abs(physics.getTransform('#robot')!.rotation.y)).toBeGreaterThan(0.02);
        physics.dispose();
    });
    it('converts two matching motor commands into forward body motion', async () => {
        const physics = await PhysicsWorld.create();
        physics.addBody(createMatDefinition(1000, 1000));
        physics.addBody({
            id: '#robot',
            positionMm: { x: 0, y: 32.5, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 1,
                linearDamping: 0.1,
                angularDamping: 0.2,
                enabledRotations: { x: false, y: true, z: false },
                colliders: [{ shape: 'box', sizeMm: { x: 140, y: 65, z: 170 } }]
            }
        });
        physics.addBody({
            id: 'mission-object',
            positionMm: { x: 0, y: 50, z: 250 },
            physics: {
                bodyType: 'dynamic',
                massKg: 0.1,
                colliders: [{ shape: 'box', sizeMm: { x: 100, y: 100, z: 100 } }]
            }
        });
        const hub = new Hub();
        hub.ports.A = new Port('motor');
        hub.ports.A.motor = new Motor(1);
        hub.ports.B = new Port('motor');
        hub.ports.B.motor = new Motor(2);
        hub.ports.A.motor.startMotor({ percent: 50, ignorePresetSpeed: true });
        hub.ports.B.motor.startMotor({ percent: 50, ignorePresetSpeed: true });
        const left = new Wheel(1, 28, 1, 'A', m4.identity());
        left.position = { x: -60, y: -30, z: 0 };
        left.direction = { x: 0, y: 0, z: 1 };
        const right = new Wheel(2, 28, 1, 'B', m4.identity());
        right.position = { x: 60, y: -30, z: 0 };
        right.direction = { x: 0, y: 0, z: 1 };
        hub.wheels = [left, right];
        const scene = {
            robot: { anchored: false, name: '#robot' },
            objects: [],
            map: undefined,
            mapWidth: 1000,
            mapHeight: 1000
        } satisfies SceneStore;
        const drive = new ForceDriveController(physics);

        for (let i = 0; i < 120; i++) {
            drive.step(1 / 120, scene, hub);
            physics.step();
        }

        const transform = physics.getTransform('#robot');
        expect(transform!.positionMm.z).toBeGreaterThan(50);
        expect(Math.abs(transform!.positionMm.x)).toBeLessThan(1);
        expect(physics.getTransform('mission-object')!.positionMm.z).toBeGreaterThan(250);
        expect(hub.ports.A.motor.relativePosition).toBeGreaterThan(0);
        physics.dispose();
    });

    it('replaces drive effort each step instead of accumulating force while stalled', async () => {
        const physics = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        const robot = physics.addBody({
            id: '#robot',
            positionMm: { x: 0, y: 50, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 1,
                colliders: [{ shape: 'box', sizeMm: { x: 140, y: 65, z: 170 } }]
            }
        });
        const hub = new Hub();
        for (const portName of ['A', 'B'] as const) {
            hub.ports[portName] = new Port('motor');
            hub.ports[portName].motor = new Motor(portName === 'A' ? 1 : 2);
            hub.ports[portName].motor!.startMotor({ percent: 100, ignorePresetSpeed: true });
        }
        const left = new Wheel(1, 28, 1, 'A', m4.identity());
        left.position = { x: -60, y: -30, z: 0 };
        left.direction = { x: 0, y: 0, z: 1 };
        const right = new Wheel(2, 28, 1, 'B', m4.identity());
        right.position = { x: 60, y: -30, z: 0 };
        right.direction = { x: 0, y: 0, z: 1 };
        hub.wheels = [left, right];
        const scene = {
            robot: { anchored: false, name: '#robot' },
            objects: [],
            map: undefined,
            mapWidth: 1000,
            mapHeight: 1000
        } satisfies SceneStore;
        const drive = new ForceDriveController(physics);

        // No physics step means the robot remains perfectly stalled. A controller
        // that accumulates Rapier forces would grow by 16 N on every call.
        for (let i = 0; i < 1200; i++) drive.step(1 / 120, scene, hub);

        expect(Math.hypot(robot.userForce().x, robot.userForce().z)).toBeLessThanOrEqual(16.01);
        expect(Math.abs(robot.userTorque().y)).toBeLessThanOrEqual(1.01);
        physics.dispose();
    });

    it('supports opt-in physical encoders that follow wheel slip', async () => {
        const physics = await PhysicsWorld.create();
        physics.addBody(createMatDefinition(1000, 1000));
        physics.addBody({
            id: '#robot',
            positionMm: { x: 0, y: 32.5, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 1,
                enabledRotations: { x: false, y: true, z: false },
                colliders: [{ shape: 'box', sizeMm: { x: 140, y: 65, z: 170 } }]
            }
        });
        const hub = new Hub();
        for (const portName of ['A', 'B'] as const) {
            hub.ports[portName] = new Port('motor');
            hub.ports[portName].motor = new Motor(portName === 'A' ? 1 : 2);
            hub.ports[portName].motor!.startMotor({ percent: 50, ignorePresetSpeed: true });
        }
        const left = new Wheel(1, 28, 1, 'A', m4.identity());
        left.position = { x: -60, y: -30, z: 0 };
        left.direction = { x: 0, y: 0, z: 1 };
        const right = new Wheel(2, 28, 1, 'B', m4.identity());
        right.position = { x: 60, y: -30, z: 0 };
        right.direction = { x: 0, y: 0, z: 1 };
        hub.wheels = [left, right];
        const scene = {
            robot: { anchored: false, name: '#robot' },
            objects: [], map: undefined, mapWidth: 1000, mapHeight: 1000
        } satisfies SceneStore;
        const drive = new ForceDriveController(physics, { encoderMode: 'physical' });
        for (let i = 0; i < 120; i++) {
            drive.step(1 / 120, scene, hub);
            physics.step();
        }
        expect(hub.ports.A.motor!.relativePosition).toBeGreaterThan(0);
        expect(Math.abs(hub.ports.A.motor!.relativePosition - hub.ports.B.motor!.relativePosition)).toBeLessThan(1);
        physics.dispose();
    });

    it('preserves mirrored wheel mounting while applying a steering differential', async () => {
        const physics = await PhysicsWorld.create();
        physics.addBody(createMatDefinition(1000, 1000));
        physics.addBody({ id: '#robot', positionMm: { x: 0, y: 32.5, z: 0 }, physics: {
            bodyType: 'dynamic', massKg: 1, enabledRotations: { x: false, y: true, z: false },
            colliders: [{ shape: 'box', sizeMm: { x: 140, y: 65, z: 170 } }]
        }});
        const hub = new Hub();
        hub.ports.A = new Port('motor'); hub.ports.A.motor = new Motor(1);
        hub.ports.B = new Port('motor'); hub.ports.B.motor = new Motor(2);
        hub.ports.A.motor.startMotor({ percent: 0, reverse: true, ignorePresetSpeed: true });
        hub.ports.B.motor.startMotor({ percent: 50, reverse: false, ignorePresetSpeed: true });
        const left = new Wheel(1, 28, 1, 'A', m4.identity());
        left.position = { x: -60, y: -30, z: 0 }; left.direction = { x: 0, y: 0, z: -1 };
        const right = new Wheel(2, 28, 1, 'B', m4.identity());
        right.position = { x: 60, y: -30, z: 0 }; right.direction = { x: 0, y: 0, z: 1 };
        hub.wheels = [left, right];
        const scene = { robot: { anchored: false, name: '#robot' }, objects: [], map: undefined,
            mapWidth: 1000, mapHeight: 1000 } satisfies SceneStore;
        const drive = new ForceDriveController(physics, {
            maximumDriveForceN: 16,
            maximumLateralForceN: 0,
            lateralGain: 0,
            longitudinalGain: 80
        });
        for (let i = 0; i < 600; i++) { drive.step(1 / 120, scene, hub); physics.step(); }
        const body = physics.getBody('#robot')!;
        expect(Math.hypot(body.translation().x, body.translation().z)).toBeGreaterThan(0.002);
        expect(Math.abs(body.rotation().y)).toBeGreaterThan(0.001);
        physics.dispose();
    });
});
