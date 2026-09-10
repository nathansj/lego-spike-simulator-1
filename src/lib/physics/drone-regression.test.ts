import { describe, it, expect, vi, afterEach } from 'vitest';
import fixture from './fixtures/drone-scene.json';
import { parseSceneDefinition } from '$lib/spike/scene-schema';
import { Simulation } from '$lib/spike/simulation';
import {
    Hub,
    Motor,
    Port,
    Wheel,
    VM,
    ActionStatement,
    EventStatement,
    StatementBlock,
    Value,
    type RobotMotion
} from '$lib/spike/vm';
import type { SceneStore } from '$lib/spike/scene';
import * as m4 from '$lib/ldraw/m4';

async function setup(
    program: 'project5' | 'project6' | false = false,
    boundaries = false
) {
    const scene: SceneStore = { ...parseSceneDefinition(fixture), map: undefined };
    for (const [i, obj] of [scene.robot, ...scene.objects].entries()) {
        obj.compiled = [fixture.robot, ...fixture.objects][i].compiled as typeof obj.compiled;
    }
    const hub = new Hub();
    for (const port of ['A', 'B'] as const) {
        hub.ports[port] = new Port('motor');
        hub.ports[port].motor = new Motor(port === 'A' ? 1 : 2);
    }
    hub.wheels = fixture.robot.wheels.map((data, i) =>
        Object.assign(
            new Wheel(i, data.radius, data.gearing, data.port as 'A' | 'B', m4.identity()),
            data
        )
    );
    VM.prototype.alignWheelsToModel.call({ hub } as VM);
    let vm = {
        step(dt: number, s: SceneStore, motion?: RobotMotion) {
            motion?.step(dt, s, hub);
        }
    } as VM;
    if (program) {
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
        const action = (op: string, ...args: string[]) =>
            new ActionStatement(
                'flippermove_' + op,
                op,
                args.map((value) => new Value('literal', '', value))
            );
        const script =
            program === 'project6'
                ? new StatementBlock([
                      action('setMovementPair', 'AB'),
                      action('movementSpeed', '50'),
                      action('move', 'forward', '55', 'cm'),
                      action('steer', '1', '4', 'rotations'),
                      action('stopMove')
                  ])
                : new StatementBlock([
                      action('setMovementPair', 'AB'),
                      action('movementSpeed', '50'),
                      action('move', 'forward', '65', 'cm'),
                      action('steer', '-31', '10', 'rotations'),
                      action('stopMove')
                  ]);
        const event = new EventStatement(
            'flipperevents_whenProgramStarts',
            'start',
            [],
            script
        );
        vm = new VM('robot', hub, {}, new Map([['start', event]]), new Map(), undefined);
    }

    return { scene, hub, vm, simulation: await Simulation.create(scene, vm, hub, boundaries) };
}
describe('saved drone scene', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('holds the linked red foot still under gravity', async () => {
        const { simulation } = await setup();
        const start = simulation.physics.getTransform('45832-01-red-base')!.positionMm;
        for (let i = 0; i < 1200; i++) simulation.advance(1 / 120);
        expect(simulation.physics.getTransform('45832-01-red-base')!.positionMm).toEqual(start);
        simulation.dispose();
    });
    it.each([
        { x: 1, z: 0 },
        { x: 0, z: 1 },
        { x: 0, z: -1 },
        { x: 1, z: 1 }
    ])('accepts a push %j', async (direction) => {
        const { simulation } = await setup();
        const base = simulation.physics.getBody('45832-01-red-base')!;
        const start = { ...base.translation() };
        for (let i = 0; i < 120; i++) {
            base.resetForces(false);
            base.addForce({ x: direction.x, y: 0, z: direction.z }, true);
            simulation.advance(1 / 120);
        }
        const end = base.translation();
        expect((end.x - start.x) * direction.x + (end.z - start.z) * direction.z).toBeGreaterThan(
            0.01
        );
        base.resetForces(false);
        for (let i = 0; i < 600; i++) simulation.advance(1 / 120);
        expect(base.translation().x).toBeCloseTo(end.x, 3);
        expect(base.translation().z).toBeCloseTo(end.z, 3);
        simulation.dispose();
    });
    it.each(['x', 'z'] as const)('releases the base for robot contact along %s', async (axis) => {
        const { simulation } = await setup();
        const base = simulation.physics.getBody('45832-01-red-base')!;
        const start = { ...base.translation() };
        const pusher = simulation.physics.addBody({
            id: 'test-pusher',
            positionMm: {
                x: start.x * 1000 - (axis === 'x' ? 100 : 0),
                y: 10,
                z: start.z * 1000 - (axis === 'z' ? 100 : 0)
            },
            physics: {
                bodyType: 'dynamic',
                massKg: 0.95,
                enabledTranslations: { x: true, y: false, z: true },
                enabledRotations: { x: false, y: false, z: false },
                colliders: [{ shape: 'box', sizeMm: { x: 30, y: 20, z: 30 } }]
            }
        });
        for (let i = 0; i < 150; i++) {
            pusher.resetForces(false);
            pusher.addForce({ x: axis === 'x' ? 8 : 0, y: 0, z: axis === 'z' ? 8 : 0 }, true);
            simulation.advance(1 / 120);
        }
        expect(base.translation()[axis] - start[axis]).toBeGreaterThan(0.02);
        simulation.dispose();
    });
    it('restores the base hold and migrated joints after reset', async () => {
        const { simulation } = await setup();
        const run = () => {
            const base = simulation.physics.getBody('45832-01-red-base')!;
            for (let i = 0; i < 120; i++) {
                base.resetForces(false);
                base.addForce({ x: 0, y: 0, z: -1 }, true);
                simulation.advance(1 / 120);
            }
            base.resetForces(false);
            for (let i = 0; i < 120; i++) simulation.advance(1 / 120);
            return simulation.physics.getTransform('45832-01-red-base');
        };
        const first = run();
        simulation.reset();
        expect(run()).toEqual(first);
        simulation.dispose();
    });
    it('executes the supplied project(6) forward-and-steer program after pushing the drone', async () => {
        const { simulation, hub, vm } = await setup('project6', true);
        const initialBaseX = simulation.physics.getTransform('45832-01-red-base')!.positionMm.x;
        const initialYaw = simulation.scene.robot.rotation ?? 0;
        vm.start();
        for (let i = 0; i < 1800; i++) {
            simulation.advance(1 / 120);
        }
        expect(simulation.physics.getTransform('45832-01-red-base')!.positionMm.x).toBeGreaterThan(
            initialBaseX + 20
        );
        expect(Math.abs((simulation.scene.robot.rotation ?? 0) - initialYaw)).toBeGreaterThan(2);
        expect(
            ['45832-01-red-hinge', '45832-01-white-hinge', '45832-01-white-drone-hinge', '45832-01-red-drone-hinge'].some(
                (id) => simulation.physics.isJointBroken(id)
            )
        ).toBe(false);
        expect(hub.ports.A.motor!.on).toBe(false);
        expect(hub.ports.B.motor!.on).toBe(false);
        simulation.dispose();
    });
});
