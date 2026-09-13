import { describe, expect, it } from 'vitest';
import { createMatDefinition } from '$lib/physics/bodies';
import { PhysicsWorld } from '$lib/physics/world';

async function createTestWorld(): Promise<PhysicsWorld> {
    const world = await PhysicsWorld.create();
    world.addBody(createMatDefinition(2000, 1000));
    world.addBody({
        id: 'box',
        positionMm: { x: 0, y: 250, z: 0 },
        physics: {
            bodyType: 'dynamic',
            massKg: 1,
            friction: 0.7,
            colliders: [{ shape: 'box', sizeMm: { x: 100, y: 100, z: 100 } }]
        }
    });
    return world;
}

describe('PhysicsWorld', () => {
    it('uses a capped fixed-step accumulator', async () => {
        const world = await createTestWorld();
        expect(world.advance(1 / 60)).toBe(2);
        expect(world.advance(10)).toBe(12);
        world.dispose();
    });

    it('restores a snapshot and replays deterministically', async () => {
        const world = await createTestWorld();
        const initial = world.takeSnapshot();
        for (let i = 0; i < 120; i++) world.step();
        const first = world.getTransform('box');

        world.restoreSnapshot(initial);
        for (let i = 0; i < 120; i++) world.step();
        const second = world.getTransform('box');

        expect(second).toEqual(first);
        expect(second?.positionMm.y).toBeCloseTo(50, 0);
        world.dispose();
    });

    it('reports the body IDs involved in a contact', async () => {
        const world = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        world.addBody({
            id: 'obstacle',
            positionMm: { x: 90, y: 50, z: 0 },
            physics: {
                bodyType: 'fixed',
                colliders: [{ shape: 'box', sizeMm: { x: 100, y: 100, z: 100 } }]
            }
        });
        world.addBody({
            id: 'robot',
            positionMm: { x: 0, y: 50, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 1,
                colliders: [{ shape: 'box', sizeMm: { x: 100, y: 100, z: 100 } }]
            }
        });
        world.step();

        expect(world.contactBodyIdsForBody('robot')).toEqual(['obstacle']);
        world.dispose();
    });

    it('holds a dynamic object at a world hinge while allowing rotation', async () => {
        const world = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        const body = world.addBody({
            id: 'door',
            positionMm: { x: 0, y: 100, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 0.1,
                colliders: [
                    {
                        shape: 'box',
                        sizeMm: { x: 200, y: 40, z: 40 },
                        positionMm: { x: 100, y: 0, z: 0 }
                    }
                ]
            }
        });
        world.addWorldHinge('door', 'y');
        body.applyImpulseAtPoint({ x: 0, y: 0, z: 0.1 }, { x: 0.2, y: 0.1, z: 0 }, true);
        for (let i = 0; i < 60; i++) world.step();

        const transform = world.getTransform('door')!;
        expect(transform.positionMm.x).toBeCloseTo(0, 1);
        expect(transform.positionMm.y).toBeCloseTo(100, 1);
        expect(Math.abs(transform.rotation.y)).toBeGreaterThan(0.01);
        world.dispose();
    });

    it('honors collision group and mask filtering', async () => {
        const world = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        world.addBody({
            id: 'filtered-wall',
            positionMm: { x: 200, y: 50, z: 0 },
            physics: {
                bodyType: 'fixed',
                collisionGroup: 4,
                collisionMask: 8,
                colliders: [{ shape: 'box', sizeMm: { x: 40, y: 100, z: 100 } }]
            }
        });
        const body = world.addBody({
            id: 'filtered-body',
            positionMm: { x: 0, y: 50, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 0.1,
                collisionGroup: 1,
                collisionMask: 2,
                colliders: [{ shape: 'box', sizeMm: { x: 40, y: 100, z: 100 } }]
            }
        });
        body.setLinvel({ x: 5, y: 0, z: 0 }, true);
        for (let i = 0; i < 180; i++) world.step();
        expect(world.getTransform('filtered-body')!.positionMm.x).toBeGreaterThan(200);
        world.dispose();
    });

    it('releases a planar-push body only when it is actually pushed', async () => {
        const world = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        const body = world.addBody({
            id: 'sled',
            positionMm: { x: 0, y: 20, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 0.1,
                motionMode: 'planarPush',
                motionReleaseFrames: 1,
                enabledTranslations: { x: true, y: false, z: true },
                enabledRotations: { x: false, y: false, z: false },
                colliders: [{ shape: 'box', sizeMm: { x: 80, y: 20, z: 80 } }]
            }
        });
        const start = world.getTransform('sled')!.positionMm;
        for (let i = 0; i < 30; i++) world.step();
        expect(world.getTransform('sled')!.positionMm).toEqual(start);
        body.addForce({ x: 3, y: 0, z: 0 }, true);
        for (let i = 0; i < 120; i++) world.step();
        const moved = world.getTransform('sled')!.positionMm;
        expect(moved.x).toBeGreaterThan(start.x + 0.05);
        body.resetForces(false);
        for (let i = 0; i < 120; i++) world.step();
        expect(world.getTransform('sled')!.positionMm.x).toBeCloseTo(moved.x, 1);
        world.dispose();
    });

    it('limits a slider body to its configured travel', async () => {
        const world = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        const body = world.addBody({
            id: 'slider',
            positionMm: { x: 0, y: 20, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 0.1,
                colliders: [{ shape: 'box', sizeMm: { x: 20, y: 20, z: 20 } }]
            }
        });
        world.addJoint({
            id: 'travel-stop',
            type: 'slider',
            parentId: '#world',
            childId: 'slider',
            parentAnchorMm: { x: 0, y: 0, z: 0 },
            childAnchorMm: { x: 0, y: 0, z: 0 },
            axis: 'x',
            limitsMm: { min: 0, max: 455 }
        });
        body.setLinvel({ x: 5, y: 0, z: 0 }, true);
        for (let i = 0; i < 240; i++) world.step();

        const position = world.getTransform('slider')!.positionMm;
        expect(position.x).toBeGreaterThan(450);
        expect(position.x).toBeLessThanOrEqual(456);
        expect(position.y).toBeCloseTo(20, 1);
        expect(position.z).toBeCloseTo(0, 1);
        world.dispose();
    });

    it('raycasts against physics colliders and can exclude the robot body', async () => {
        const world = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        world.addBody({
            id: '#robot',
            positionMm: { x: 0, y: 50, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 1,
                colliders: [{ shape: 'box', sizeMm: { x: 100, y: 100, z: 100 } }]
            }
        });
        world.addBody({
            id: 'target',
            positionMm: { x: 0, y: 50, z: 500 },
            physics: {
                bodyType: 'fixed',
                colliders: [{ shape: 'box', sizeMm: { x: 100, y: 100, z: 100 } }]
            }
        });
        world.step();

        expect(world.castRay({ x: 0, y: 50, z: 0 }, { x: 0, y: 0, z: 1 }, 1000)?.bodyId).toBe(
            '#robot'
        );
        const hit = world.castRay({ x: 0, y: 50, z: 0 }, { x: 0, y: 0, z: 1 }, 1000, '#robot');
        expect(hit?.bodyId).toBe('target');
        expect(hit?.distanceMm).toBeCloseTo(450, 3);
        world.dispose();
    });

    it('reports localized contact impulses for a body', async () => {
        const world = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        const moving = world.addBody({
            id: 'moving',
            positionMm: { x: 0, y: 20, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 1,
                colliders: [{ shape: 'box', sizeMm: { x: 40, y: 40, z: 40 } }]
            }
        });
        world.addBody({
            id: 'wall',
            positionMm: { x: 100, y: 20, z: 0 },
            physics: {
                bodyType: 'fixed',
                colliders: [{ shape: 'box', sizeMm: { x: 40, y: 40, z: 40 } }]
            }
        });
        moving.setLinvel({ x: 2, y: 0, z: 0 }, true);

        let contacts = world.contactsForBody('moving');
        for (let index = 0; index < 20 && contacts.length === 0; index++) {
            world.step();
            contacts = world.contactsForBody('moving');
        }

        expect(contacts.length).toBeGreaterThan(0);
        expect(contacts[0].pointMm.x).toBeGreaterThan(70);
        expect(contacts[0].pointMm.x).toBeLessThan(85);
        expect(contacts[0].impulseNewtonSeconds).toBeGreaterThan(0);
        world.dispose();
    });

    it('locks a body to its parent with a fixed joint', async () => {
        const world = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        world.addBody({
            id: 'anchor',
            positionMm: { x: 0, y: 0, z: 0 },
            physics: {
                bodyType: 'fixed',
                colliders: [{ shape: 'box', sizeMm: { x: 10, y: 10, z: 10 } }]
            }
        });
        const child = world.addBody({
            id: 'child',
            positionMm: { x: 100, y: 0, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 1,
                colliders: [{ shape: 'box', sizeMm: { x: 10, y: 10, z: 10 } }]
            }
        });
        world.addJoint({
            id: 'fixed',
            type: 'fixed',
            parentId: 'anchor',
            childId: 'child',
            parentAnchorMm: { x: 100, y: 0, z: 0 },
            childAnchorMm: { x: 0, y: 0, z: 0 },
            axis: 'x'
        });
        child.setLinvel({ x: 5, y: 0, z: 0 }, true);
        for (let index = 0; index < 120; index++) world.step();
        expect(world.getTransform('child')!.positionMm.x).toBeCloseTo(100, 1);
        world.dispose();
    });

    it('pulls a body toward a spring rest length', async () => {
        const world = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        world.addBody({
            id: 'anchor',
            positionMm: { x: 0, y: 0, z: 0 },
            physics: {
                bodyType: 'fixed',
                colliders: [{ shape: 'box', sizeMm: { x: 10, y: 10, z: 10 } }]
            }
        });
        world.addBody({
            id: 'spring-child',
            positionMm: { x: 300, y: 0, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 1,
                linearDamping: 1,
                colliders: [{ shape: 'box', sizeMm: { x: 10, y: 10, z: 10 } }]
            }
        });
        world.addJoint({
            id: 'spring',
            type: 'spring',
            parentId: 'anchor',
            childId: 'spring-child',
            parentAnchorMm: { x: 0, y: 0, z: 0 },
            childAnchorMm: { x: 0, y: 0, z: 0 },
            axis: 'x',
            restLengthMm: 100,
            stiffness: 20,
            damping: 4
        });
        for (let index = 0; index < 240; index++) world.step();
        expect(world.getTransform('spring-child')!.positionMm.x).toBeLessThan(200);
        expect(world.getTransform('spring-child')!.positionMm.x).toBeGreaterThan(80);
        world.dispose();
    });

    it('drives a slider toward a motor target expressed in millimetres', async () => {
        const world = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        world.addBody({
            id: 'motor-slider',
            positionMm: { x: 0, y: 0, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 0.1,
                colliders: [{ shape: 'box', sizeMm: { x: 10, y: 10, z: 10 } }]
            }
        });
        world.addJoint({
            id: 'motor',
            type: 'slider',
            parentId: '#world',
            childId: 'motor-slider',
            parentAnchorMm: { x: 0, y: 0, z: 0 },
            childAnchorMm: { x: 0, y: 0, z: 0 },
            axis: 'x',
            limitsMm: { min: 0, max: 200 },
            motor: {
                targetPosition: 100,
                stiffness: 100,
                damping: 10,
                maximumForce: 100
            }
        });
        for (let index = 0; index < 240; index++) world.step();
        expect(world.getTransform('motor-slider')!.positionMm.x).toBeGreaterThan(97);
        expect(world.getTransform('motor-slider')!.positionMm.x).toBeLessThan(101);
        world.dispose();
    });

    it('releases a latch above its force threshold and restores it with the snapshot', async () => {
        const world = await PhysicsWorld.create({ gravityMps2: { x: 0, y: 0, z: 0 } });
        world.addBody({
            id: 'latched',
            positionMm: { x: 0, y: 20, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 0.2,
                colliders: [{ shape: 'box', sizeMm: { x: 40, y: 40, z: 40 } }]
            }
        });
        const striker = world.addBody({
            id: 'striker',
            positionMm: { x: -100, y: 20, z: 0 },
            physics: {
                bodyType: 'dynamic',
                massKg: 1,
                colliders: [{ shape: 'box', sizeMm: { x: 20, y: 20, z: 20 } }]
            }
        });
        world.addJoint({
            id: 'release-latch',
            type: 'latch',
            parentId: '#world',
            childId: 'latched',
            parentAnchorMm: { x: 0, y: 0, z: 0 },
            childAnchorMm: { x: 0, y: 0, z: 0 },
            axis: 'x',
            releaseForceN: 1
        });
        const initial = world.takeSnapshot();
        striker.setLinvel({ x: 5, y: 0, z: 0 }, true);
        for (let index = 0; index < 60 && !world.isJointBroken('release-latch'); index++)
            world.step();

        expect(world.isJointBroken('release-latch')).toBe(true);
        const releasedX = world.getTransform('latched')!.positionMm.x;
        for (let index = 0; index < 30; index++) world.step();
        expect(Math.abs(world.getTransform('latched')!.positionMm.x - releasedX)).toBeGreaterThan(
            10
        );

        world.restoreSnapshot(initial);
        expect(world.isJointBroken('release-latch')).toBe(false);
        world.getBody('latched')!.setLinvel({ x: 5, y: 0, z: 0 }, true);
        for (let index = 0; index < 60; index++) world.step();
        expect(world.getTransform('latched')!.positionMm.x).toBeCloseTo(0, 1);
        world.dispose();
    });
});
