import { describe, expect, it } from 'vitest';
import { parseSceneDefinition, serializeSceneDefinition } from '$lib/spike/scene-schema';
import type { SceneStore } from '$lib/spike/scene';

describe('scene schema', () => {
    it('migrates a version 1 scene to physics-aware runtime objects', () => {
        const scene = parseSceneDefinition({
            version: 1,
            robot: {
                anchored: false,
                name: '#robot',
                position: { x: 10, y: 0, z: 20 },
                rotation: 90
            },
            matWidth: 2360,
            matHeight: 1140,
            objects: [
                {
                    anchored: true,
                    name: 'wall',
                    position: { x: 100, y: 0, z: 0 },
                    rotation: 0
                }
            ]
        });

        expect(scene.robot.id).toBe('#robot');
        expect(scene.robot.physics?.bodyType).toBe('dynamic');
        expect(scene.robot.rotationQuaternion?.y).toBeCloseTo(Math.SQRT1_2);
        expect(scene.objects[0].id).toBe('object-1');
        expect(scene.objects[0].physics?.bodyType).toBe('dynamic');
        expect(scene.objects[0].physics?.autoCollider).toBe(false);
        expect(scene.objects[0].physics?.colliders.length).toBeGreaterThan(0);
        expect(scene.physicsWorld?.fixedTimeStep).toBeCloseTo(1 / 120);
    });

    it('serializes version 2 without renderer data and round-trips physics metadata', () => {
        const scene: SceneStore = {
            robot: {
                id: '#robot',
                anchored: false,
                name: '#robot',
                position: { x: 0, y: 50, z: 0 },
                rotation: 0,
                physics: {
                    bodyType: 'dynamic',
                    massKg: 0.95,
                    collisionGroup: 3,
                    collisionMask: 5,
                    motionMode: 'planarPush',
                    motionReleaseFrames: 3,
                    colliders: [{ shape: 'box', sizeMm: { x: 140, y: 65, z: 170 } }]
                },
                hinge: { axis: 'y' }
            },
            objects: [],
            map: undefined,
            mapWidth: 2360,
            mapHeight: 1140,
            joints: [
                {
                    id: 'middle-hinge',
                    type: 'hinge',
                    parentId: 'link-a',
                    childId: 'link-b',
                    parentAnchorMm: { x: 250, y: 0, z: 0 },
                    childAnchorMm: { x: 250, y: 0, z: 0 },
                    axis: 'z'
                }
            ]
        };

        const serialized = serializeSceneDefinition(scene);
        expect(serialized.version).toBe(2);
        expect(serialized.robot.physics.massKg).toBe(0.95);
        expect('compiled' in serialized.robot).toBe(false);

        const parsed = parseSceneDefinition(serialized);
        expect(parsed.robot.physics?.bodyType).toBe('dynamic');
        expect(parsed.robot.physics?.massKg).toBe(0.95);
        expect(parsed.robot.physics?.collisionGroup).toBe(3);
        expect(parsed.robot.physics?.collisionMask).toBe(5);
        expect(parsed.robot.physics?.motionMode).toBe('planarPush');
        expect(parsed.robot.physics?.motionReleaseFrames).toBe(3);
        expect(parsed.robot.physics?.colliders[0]).toMatchObject(scene.robot.physics!.colliders[0]);
        expect(parsed.joints).toEqual(scene.joints);
    });

    it('rejects unsupported versions', () => {
        expect(() => parseSceneDefinition({ version: 99, robot: {}, objects: [] })).toThrow(
            'Unsupported scene version'
        );
    });

    it('preserves explicitly authored shared-origin and editor metadata', () => {
        const scene = parseSceneDefinition({
            version: 2,
            robot: { name: '#robot' },
            objects: [
                {
                    id: '45832-01-link-a',
                    name: 'moving red end',
                    anchored: false,
                    preserveOrigin: true,
                    editorGroup: 'mechanism',
                    editorName: 'Hinged mechanism',
                    physics: { bodyType: 'dynamic', colliders: [] }
                }
            ]
        });
        expect(scene.objects[0].preserveOrigin).toBe(true);
        expect(scene.objects[0].editorGroup).toBe('mechanism');
    });

    it('round-trips fixed, spring, and motorized joints', () => {
        const base = {
            version: 2,
            robot: { name: '#robot' },
            objects: [
                { id: 'a', name: 'A', physics: { bodyType: 'fixed', colliders: [] } },
                { id: 'b', name: 'B', physics: { bodyType: 'dynamic', colliders: [] } }
            ],
            joints: [
                {
                    id: 'fixed',
                    type: 'fixed',
                    parentId: 'a',
                    childId: 'b',
                    parentAnchorMm: { x: 1, y: 2, z: 3 },
                    childAnchorMm: { x: 4, y: 5, z: 6 },
                    axis: 'x'
                },
                {
                    id: 'spring',
                    type: 'spring',
                    parentId: 'a',
                    childId: 'b',
                    parentAnchorMm: { x: 0, y: 0, z: 0 },
                    childAnchorMm: { x: 0, y: 0, z: 0 },
                    axis: 'x',
                    restLengthMm: 50,
                    stiffness: 20,
                    damping: 2,
                    breakForceN: 40
                },
                {
                    id: 'motor-slider',
                    type: 'slider',
                    parentId: 'a',
                    childId: 'b',
                    parentAnchorMm: { x: 0, y: 0, z: 0 },
                    childAnchorMm: { x: 0, y: 0, z: 0 },
                    axis: 'x',
                    limitsMm: { min: 0, max: 100 },
                    motor: {
                        targetPosition: 25,
                        targetVelocity: 5,
                        stiffness: 10,
                        damping: 1,
                        maximumForce: 30
                    }
                },
                {
                    id: 'latch',
                    type: 'latch',
                    parentId: 'a',
                    childId: 'b',
                    parentAnchorMm: { x: 0, y: 0, z: 0 },
                    childAnchorMm: { x: 0, y: 0, z: 0 },
                    axis: 'x',
                    releaseForceN: 12
                }
            ]
        };
        const parsed = parseSceneDefinition(base);
        const serialized = serializeSceneDefinition({ ...parsed, map: undefined });
        expect(serialized.joints).toEqual(parsed.joints);
        expect(parsed.joints?.map((joint) => joint.type)).toEqual([
            'fixed',
            'spring',
            'slider',
            'latch'
        ]);
        expect(parsed.joints?.[1]).toMatchObject({ breakForceN: 40 });
    });
});
