import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
    brickColour,
    loadModel,
    setStudioMode,
    type Model,
    type Subpart
} from '$lib/ldraw/components';
import {
    createModelPhysicsArticulation,
    findBundledModelPhysics
} from '$lib/physics/articulation-presets';
import { createMatDefinition } from '$lib/physics/bodies';
import { PhysicsWorld } from '$lib/physics/world';

function subpart(id: number, x: number, z: number): Subpart {
    return {
        id,
        colour: brickColour('16'),
        matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 0, z, 1],
        model: undefined,
        modelNumber: `group-${id}`
    };
}

const realModelPath =
    '/Users/Sheldon/data/projects/sourcecode/FLL_Bioglow/models/complete/ldraw/45832_01.mpd';
const sidecar = findBundledModelPhysics('45832_01.mpd')!;

describe('model physics articulation', () => {
    it('splits fixed scenery, red base, and both moving links', () => {
        const model: Model = {
            name: 'M01.io',
            subparts: [
                subpart(1, 0, 0),
                subpart(2, 160, -310),
                subpart(3, 322, 0),
                subpart(4, 642, 0),
                subpart(5, 978, 0),
                subpart(6, 1322, 0)
            ],
            lines: [],
            triangles: [],
            quads: [],
            optionalLines: []
        };

        const result = createModelPhysicsArticulation(model, { x: 10, y: 20, z: 30 }, sidecar);
        expect(result.objects).toHaveLength(6);
            expect(result.objects.map((object) => object.bricks?.subparts.length)).toEqual([
                1, 1, 1, 1, 1, 1
            ]);
            expect(result.objects[0].physics?.bodyType).toBe('fixed');
            expect(result.objects[0].physics?.autoCollider).toBe(false);
            expect(result.objects[0].physics?.colliders.length).toBeGreaterThan(0);
            expect(result.objects[1].physics?.bodyType).toBe('dynamic');
            expect(result.objects[3].physics?.bodyType).toBe('dynamic');
            expect(
                result.objects
                    .filter((object) => object.id !== '45832-01-fixed-scenery')
                .map((object) => object.editorGroup)
        ).toEqual(Array(5).fill('45832-01-mechanism'));
        // The red base is a planar body: it is held to the mat by its locked
        // vertical/rotational axes, while the drone carriage remains rail-bound.
        expect(result.joints).toHaveLength(1);
        expect(result.objects[1].physics?.enabledTranslations).toEqual({ x: true, y: false, z: true });
        expect(result.joints[0]).toMatchObject({
            type: 'slider',
            parentId: '#world',
            childId: '45832-01-drone',
            axis: 'x'
        });
    });

    it('matches only the intended MPD filename', () => {
        expect(findBundledModelPhysics('45832_01.mpd')).toBeDefined();
        expect(findBundledModelPhysics('/models/45832_01.mpd')).toBeDefined();
        expect(findBundledModelPhysics('45832_01.ldr')).toBeUndefined();
    });

    it('can select subparts by exact MPD model number', () => {
        const model: Model = {
            name: 'grouped.ldr',
            subparts: [
                { ...subpart(1, 0, 0), modelNumber: 'SubModel Group 1' },
                { ...subpart(2, 0, 0), modelNumber: 'SubModel Group 2' }
            ],
            lines: [],
            triangles: [],
            quads: [],
            optionalLines: []
        };
        const body = {
            bodyType: 'fixed' as const,
            colliders: [{ shape: 'box' as const, sizeMm: { x: 10, y: 10, z: 10 } }]
        };
        const result = createModelPhysicsArticulation(model, { x: 0, y: 0, z: 0 }, {
            version: 1,
            model: 'grouped.mpd',
            segments: [
                {
                    id: 'group-one',
                    name: 'Group One',
                    selection: { modelNumbers: ['submodel group 1'] },
                    body
                },
                {
                    id: 'group-two',
                    name: 'Group Two',
                    selection: { modelNumbers: ['SubModel Group 2'] },
                    body
                }
            ],
            joints: []
        });

        expect(result.objects.map((object) => object.bricks?.subparts[0]?.modelNumber)).toEqual([
            'SubModel Group 1',
            'SubModel Group 2'
        ]);
    });

    it('registers physics sidecars for every BIOGLOW mission model', () => {
        for (let model = 1; model <= 13; model++) {
            const id = String(model).padStart(2, '0');
            const definition = findBundledModelPhysics(`45832_${id}.mpd`);
            expect(definition?.model).toBe(`45832_${id}.mpd`);
            expect(definition?.segments.length).toBeGreaterThanOrEqual(1);
            expect(definition?.segments.every((segment) => segment.selection)).toBe(true);
            if (model > 1) {
                expect(definition?.mission).toBeTruthy();
                expect(definition?.mechanics?.length).toBeGreaterThan(0);
            }
        }
    });

    it('keeps M02 candidate groups separated from unassigned root references', () => {
        const definition = findBundledModelPhysics('45832_02.mpd');
        expect(definition?.segments.map((segment) => segment.selection.modelNumbers)).toEqual([
            ['SubModel Group 1'],
            ['SubModel Group 2'],
            ['SubModel Group 3', '57539.dat Copy 3'],
            ['SubModel Group 3_Mirrored', '57539.dat Copy 4'],
            undefined
        ]);
        expect(definition?.segments.at(-1)?.editorName).toBe('Unassigned root references');
        expect(new Set(definition?.segments.map((segment) => segment.editorGroup)).size).toBe(5);
        expect(definition?.joints).toEqual([]);
    });

    it.skipIf(!existsSync(realModelPath))('splits the real MPD fixture from sidecar data', () => {
        setStudioMode(true);
        try {
            const model = loadModel('45832_01.mpd', readFileSync(realModelPath, 'utf8'));
            const result = createModelPhysicsArticulation(
                model,
                { x: 0, y: 29.4092, z: 0 },
                sidecar
            );
            expect(model.subparts).toHaveLength(9);
            expect(result.objects.map((object) => object.bricks?.subparts.length)).toEqual([
                1, 1, 2, 1, 2, 2
            ]);
            expect(
                result.objects.every((object) => (object.physics?.colliders?.length ?? 0) > 0)
            ).toBe(
                true
            );
            expect(result.objects.every((object) => object.physics?.autoCollider === false)).toBe(
                true
            );
            expect(result.joints).toEqual(sidecar.joints);
        } finally {
            setStudioMode(false);
        }
    });

    it('settles without pre-contact hinge vibration', async () => {
        const model: Model = {
            name: 'M01.io',
            subparts: [
                subpart(1, 0, 0),
                subpart(2, 322, 0),
                subpart(3, 642, 0),
                subpart(4, 978, 0)
            ],
            lines: [],
            triangles: [],
            quads: [],
            optionalLines: []
        };
        const preset = createModelPhysicsArticulation(model, { x: 0, y: 29.4092, z: 0 }, sidecar);
        const world = await PhysicsWorld.create();
        world.addBody(createMatDefinition(1200, 600));
        for (const object of preset.objects) {
            world.addBody({
                id: object.id!,
                positionMm: object.position!,
                physics: object.physics!
            });
        }
        for (const joint of preset.joints) world.addJoint(joint);
        for (let i = 0; i < 1200; i++) world.step();

        const firstVelocity = world.getBody('45832-01-rail-a')!.linvel();
        const secondVelocity = world.getBody('45832-01-rail-b')!.linvel();
        const redBaseVelocity = world.getBody('45832-01-red-base')!.linvel();
        const droneVelocity = world.getBody('45832-01-drone')!.linvel();
        expect(Math.hypot(firstVelocity.x, firstVelocity.y, firstVelocity.z)).toBeLessThan(0.05);
        expect(Math.hypot(secondVelocity.x, secondVelocity.y, secondVelocity.z)).toBeLessThan(0.05);
        expect(Math.hypot(redBaseVelocity.x, redBaseVelocity.y, redBaseVelocity.z)).toBeLessThan(
            0.05
        );
        expect(Math.hypot(droneVelocity.x, droneVelocity.y, droneVelocity.z)).toBeLessThan(0.05);
        world.dispose();
    });

    it('slides the red base and drone carriage without vertical drift', async () => {
        const model: Model = {
            name: 'M01.io',
            subparts: [
                subpart(1, 0, 0),
                subpart(2, 322, 0),
                subpart(3, 642, 0),
                subpart(4, 978, 0),
                subpart(5, 1322, 0)
            ],
            lines: [],
            triangles: [],
            quads: [],
            optionalLines: []
        };
        const preset = createModelPhysicsArticulation(model, { x: 0, y: 29.4092, z: 0 }, sidecar);
        const world = await PhysicsWorld.create();
        world.addBody(createMatDefinition(1200, 600));
        for (const object of preset.objects) {
            world.addBody({
                id: object.id!,
                positionMm: object.position!,
                physics: object.physics!
            });
        }
        for (const joint of preset.joints) world.addJoint(joint);
        const robot = world.addBody({
            id: '#robot',
            positionMm: { x: -140, y: 40, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 0.95,
                enabledRotations: { x: false, y: true, z: false },
                colliders: [{ shape: 'box', sizeMm: { x: 80, y: 60, z: 70 } }]
            }
        });
        robot.setLinvel({ x: 1, y: 0, z: 0 }, true);

        let maximumDroneY = -Infinity;
        let maximumRedBaseVerticalError = 0;
        let maximumRedBaseX = -Infinity;
        let maximumRobotSpeed = 0;
        for (let i = 0; i < 600; i++) {
            if (i < 600) {
                const driveForce = Math.max(-16, Math.min(16, (1 - robot.linvel().x) * 48));
                robot.applyImpulse({ x: driveForce / 120, y: 0, z: 0 }, true);
            }
            world.step();
            const drone = world.getBody('45832-01-drone')!;
            maximumDroneY = Math.max(maximumDroneY, drone.translation().y);
            const redBasePosition = world.getBody('45832-01-red-base')!.translation();
            maximumRedBaseX = Math.max(maximumRedBaseX, redBasePosition.x);
            maximumRedBaseVerticalError = Math.max(
                maximumRedBaseVerticalError,
                Math.abs(redBasePosition.y - 0.0294092)
            );
            const velocity = robot.linvel();
            maximumRobotSpeed = Math.max(
                maximumRobotSpeed,
                Math.hypot(velocity.x, velocity.y, velocity.z)
            );
        }

        expect(maximumDroneY).toBeCloseTo(0.0294092, 5);
        expect(maximumRedBaseX).toBeGreaterThan(0.02);
        // The planar base is intentionally not limited to the former 520 mm
        // rail travel; field boundaries or the driving robot now determine its
        // practical travel envelope.
        expect(maximumRedBaseX).toBeLessThan(1.0);
        expect(maximumRedBaseVerticalError).toBeLessThan(0.00001);
        expect(Math.abs(world.getBody('45832-01-drone')!.rotation().z)).toBeLessThan(0.001);
        expect(maximumRobotSpeed).toBeLessThan(3);
        world.dispose();
    });
});
