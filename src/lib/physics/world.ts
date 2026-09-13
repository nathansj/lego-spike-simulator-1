import RAPIER from '@dimforge/rapier3d-deterministic-compat';
import { createRigidBody, type BodyCreationDefinition } from '$lib/physics/bodies';
import type { PhysicsQuaternion, PhysicsVector, PhysicsWorldDefinition } from '$lib/physics/types';
import type { PhysicsSnapshot } from '$lib/physics/snapshot';
import { vectorMetresToMm, vectorMmToMetres } from '$lib/physics/units';
import type {
    ArticulatedHingeDefinition,
    FixedJointDefinition,
    HingeAxis,
    JointDefinition,
    LatchJointDefinition,
    SliderJointDefinition,
    SpringJointDefinition
} from '$lib/physics/types';
import { IDENTITY_QUATERNION as IDENTITY_ROTATION } from '$lib/physics/types';

export interface PhysicsTransform {
    positionMm: PhysicsVector;
    rotation: PhysicsQuaternion;
}

export interface PhysicsRayHit {
    bodyId?: string;
    distanceMm: number;
}

export interface PhysicsContact {
    pointMm: PhysicsVector;
    impulseNewtonSeconds: number;
}

export const DEFAULT_FIXED_TIME_STEP = 1 / 120;
export const DEFAULT_MAX_FRAME_DELTA = 0.1;

let initialization: Promise<void> | undefined;

export function initializePhysics(): Promise<void> {
    initialization ??= RAPIER.init();
    return initialization;
}

export class PhysicsWorld {
    private world: RAPIER.World;
    private readonly bodyHandles = new Map<string, number>();
    private readonly jointHandles = new Map<string, number>();
    private readonly breakableJoints = new Map<
        string,
        { handle: number; childId: string; thresholdN: number }
    >();
    private readonly brokenJointIds = new Set<string>();
    private readonly externalMotionOnly = new Map<
        string,
        { x: boolean; y: boolean; z: boolean; releaseFrames: number }
    >();
    private readonly externalMotionOnlyReleaseFrames = new Map<string, number>();
    private readonly jointNeighbors = new Map<number, Set<number>>();
    private accumulatorSeconds = 0;
    readonly fixedTimeStep: number;
    readonly maximumFrameDelta: number;

    private constructor(
        definition: PhysicsWorldDefinition = {},
        maximumFrameDelta = DEFAULT_MAX_FRAME_DELTA
    ) {
        this.fixedTimeStep = definition.fixedTimeStep ?? DEFAULT_FIXED_TIME_STEP;
        this.maximumFrameDelta = maximumFrameDelta;
        this.world = new RAPIER.World(definition.gravityMps2 ?? { x: 0, y: -9.81, z: 0 });
        this.world.timestep = this.fixedTimeStep;
    }

    static async create(
        definition: PhysicsWorldDefinition = {},
        maximumFrameDelta = DEFAULT_MAX_FRAME_DELTA
    ): Promise<PhysicsWorld> {
        await initializePhysics();
        return new PhysicsWorld(definition, maximumFrameDelta);
    }

    addBody(definition: BodyCreationDefinition): RAPIER.RigidBody {
        if (this.bodyHandles.has(definition.id)) {
            throw new Error(`Physics body already exists: ${definition.id}`);
        }
        const body = createRigidBody(this.world, definition);
        this.bodyHandles.set(definition.id, body.handle);
        if (definition.physics.motionMode === 'planarPush' || definition.physics.externalMotionOnly)
            this.externalMotionOnly.set(definition.id, {
                ...(definition.physics.enabledTranslations ?? { x: true, y: true, z: true }),
                releaseFrames: definition.physics.motionReleaseFrames ?? 1
            });
        return body;
    }

    getBody(id: string): RAPIER.RigidBody | undefined {
        const handle = this.bodyHandles.get(id);
        return handle === undefined ? undefined : (this.world.getRigidBody(handle) ?? undefined);
    }

    getTransform(id: string): PhysicsTransform | undefined {
        const body = this.getBody(id);
        if (!body) {
            return undefined;
        }
        const rotation = body.rotation();
        return {
            positionMm: vectorMetresToMm(body.translation()),
            rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }
        };
    }

    castRay(
        originMm: PhysicsVector,
        direction: PhysicsVector,
        maximumDistanceMm: number,
        excludeBodyId?: string
    ): PhysicsRayHit | undefined {
        const magnitude = Math.hypot(direction.x, direction.y, direction.z);
        if (magnitude < 1e-8 || maximumDistanceMm <= 0) return undefined;
        const excludedBody = excludeBodyId ? this.getBody(excludeBodyId) : undefined;
        const ray = new RAPIER.Ray(vectorMmToMetres(originMm), {
            x: direction.x / magnitude,
            y: direction.y / magnitude,
            z: direction.z / magnitude
        });
        const hit = this.world.castRay(
            ray,
            maximumDistanceMm / 1000,
            true,
            undefined,
            undefined,
            undefined,
            excludedBody
        );
        if (!hit) return undefined;
        const parent = hit.collider.parent();
        const bodyId = parent
            ? [...this.bodyHandles].find(([, handle]) => handle === parent.handle)?.[0]
            : undefined;
        return { bodyId, distanceMm: hit.timeOfImpact * 1000 };
    }

    contactsForBody(id: string): PhysicsContact[] {
        const body = this.getBody(id);
        if (!body) return [];
        const contacts: PhysicsContact[] = [];
        for (let colliderIndex = 0; colliderIndex < body.numColliders(); colliderIndex++) {
            const collider = body.collider(colliderIndex);
            this.world.contactPairsWith(collider, (other) => {
                this.world.contactPair(collider, other, (manifold) => {
                    const count = Math.min(manifold.numContacts(), manifold.numSolverContacts());
                    for (let contactIndex = 0; contactIndex < count; contactIndex++) {
                        const point = manifold.solverContactPoint(contactIndex);
                        if (!point) continue;
                        contacts.push({
                            pointMm: vectorMetresToMm(point),
                            impulseNewtonSeconds: Math.abs(manifold.contactImpulse(contactIndex))
                        });
                    }
                });
            });
        }
        return contacts;
    }

    contactBodyIdsForBody(id: string): string[] {
        const body = this.getBody(id);
        if (!body) return [];
        const bodyIds = new Set<string>();
        for (let colliderIndex = 0; colliderIndex < body.numColliders(); colliderIndex++) {
            const collider = body.collider(colliderIndex);
            this.world.contactPairsWith(collider, (other) => {
                const parent = other.parent();
                if (!parent) return;
                const otherId = [...this.bodyHandles].find(
                    ([, handle]) => handle === parent.handle
                )?.[0];
                if (otherId && otherId !== id) bodyIds.add(otherId);
            });
        }
        return [...bodyIds];
    }

    bodiesAreTouching(firstId: string, secondId: string): boolean {
        const first = this.getBody(firstId);
        const second = this.getBody(secondId);
        if (!first || !second) return false;
        for (let firstIndex = 0; firstIndex < first.numColliders(); firstIndex++) {
            const firstCollider = first.collider(firstIndex);
            for (let secondIndex = 0; secondIndex < second.numColliders(); secondIndex++) {
                const secondCollider = second.collider(secondIndex);
                if (this.world.intersectionPair(firstCollider, secondCollider)) return true;
                let touching = false;
                this.world.contactPair(firstCollider, secondCollider, (manifold) => {
                    for (
                        let contactIndex = 0;
                        contactIndex < manifold.numContacts();
                        contactIndex++
                    ) {
                        if (manifold.contactDist(contactIndex) <= 0) touching = true;
                    }
                });
                if (touching) return true;
            }
        }
        return false;
    }

    addWorldHinge(id: string, axis: HingeAxis): void {
        this.addHinge({
            id: `hinge-${id}`,
            type: 'hinge',
            parentId: '#world',
            childId: id,
            parentAnchorMm: { x: 0, y: 0, z: 0 },
            childAnchorMm: { x: 0, y: 0, z: 0 },
            axis
        });
    }

    addJoint(joint: JointDefinition): void {
        if (joint.type === 'ball') {
            const [parent, body] = this.jointBodies(joint);
            const constraint = this.world.createImpulseJoint(
                RAPIER.JointData.spherical(
                    vectorMmToMetres(joint.parentAnchorMm),
                    vectorMmToMetres(joint.childAnchorMm)
                ),
                parent,
                body,
                true
            );
            constraint.setContactsEnabled(false);
            this.trackJoint(joint, constraint, joint.breakForceN);
        } else if (joint.type === 'slider') this.addSlider(joint);
        else if (joint.type === 'hinge') this.addHinge(joint);
        else if (joint.type === 'fixed') this.addFixed(joint);
        else if (joint.type === 'spring') this.addSpring(joint);
        else this.addLatch(joint);
    }

    private jointBodies(joint: JointDefinition): [RAPIER.RigidBody, RAPIER.RigidBody] {
        const id = joint.childId;
        const body = this.getBody(id);
        if (!body) throw new Error(`Cannot hinge missing physics body: ${id}`);
        let parent = joint.parentId === '#world' ? undefined : this.getBody(joint.parentId);
        if (joint.parentId !== '#world' && !parent) {
            throw new Error(`Cannot hinge to missing physics body: ${joint.parentId}`);
        }
        if (!parent) {
            const translation = body.translation();
            const rotation = body.rotation();
            parent = this.world.createRigidBody(
                RAPIER.RigidBodyDesc.fixed()
                    .setTranslation(translation.x, translation.y, translation.z)
                    .setRotation(rotation)
                    .setUserData({ id: `#hinge-${joint.id}` })
            );
        }
        return [parent, body];
    }

    addHinge(joint: ArticulatedHingeDefinition): void {
        const [parent, body] = this.jointBodies(joint);
        const axisVector = {
            x: joint.axis === 'x' ? 1 : 0,
            y: joint.axis === 'y' ? 1 : 0,
            z: joint.axis === 'z' ? 1 : 0
        };
        const parentAnchor = vectorMmToMetres(joint.parentAnchorMm);
        const childAnchor = vectorMmToMetres(joint.childAnchorMm);
        const constraint = this.world.createImpulseJoint(
            RAPIER.JointData.revolute(parentAnchor, childAnchor, axisVector),
            parent,
            body,
            true
        );
        constraint.setContactsEnabled(false);
        if (joint.limitsRadians) {
            (constraint as RAPIER.RevoluteImpulseJoint).setLimits(
                joint.limitsRadians.min,
                joint.limitsRadians.max
            );
        }
        this.configureMotor(constraint as RAPIER.RevoluteImpulseJoint, joint.motor);
        this.trackJoint(joint, constraint, joint.breakForceN);
    }

    addSlider(joint: SliderJointDefinition): void {
        const [parent, body] = this.jointBodies(joint);
        const axisVector = {
            x: joint.axis === 'x' ? 1 : 0,
            y: joint.axis === 'y' ? 1 : 0,
            z: joint.axis === 'z' ? 1 : 0
        };
        const constraint = this.world.createImpulseJoint(
            RAPIER.JointData.prismatic(
                vectorMmToMetres(joint.parentAnchorMm),
                vectorMmToMetres(joint.childAnchorMm),
                axisVector
            ),
            parent,
            body,
            true
        );
        constraint.setContactsEnabled(false);
        (constraint as RAPIER.PrismaticImpulseJoint).setLimits(
            joint.limitsMm.min / 1000,
            joint.limitsMm.max / 1000
        );
        this.configureMotor(constraint as RAPIER.PrismaticImpulseJoint, joint.motor, 1 / 1000);
        this.trackJoint(joint, constraint, joint.breakForceN);
    }

    addFixed(joint: FixedJointDefinition): void {
        const [parent, body] = this.jointBodies(joint);
        const constraint = this.world.createImpulseJoint(
            RAPIER.JointData.fixed(
                vectorMmToMetres(joint.parentAnchorMm),
                joint.parentFrame ?? IDENTITY_ROTATION,
                vectorMmToMetres(joint.childAnchorMm),
                joint.childFrame ?? IDENTITY_ROTATION
            ),
            parent,
            body,
            true
        );
        constraint.setContactsEnabled(false);
        this.trackJoint(joint, constraint, joint.breakForceN);
    }

    addSpring(joint: SpringJointDefinition): void {
        const [parent, body] = this.jointBodies(joint);
        const constraint = this.world.createImpulseJoint(
            RAPIER.JointData.spring(
                joint.restLengthMm / 1000,
                joint.stiffness,
                joint.damping,
                vectorMmToMetres(joint.parentAnchorMm),
                vectorMmToMetres(joint.childAnchorMm)
            ),
            parent,
            body,
            true
        );
        constraint.setContactsEnabled(false);
        this.trackJoint(joint, constraint, joint.breakForceN);
    }

    addLatch(joint: LatchJointDefinition): void {
        const [parent, body] = this.jointBodies(joint);
        const constraint = this.world.createImpulseJoint(
            RAPIER.JointData.fixed(
                vectorMmToMetres(joint.parentAnchorMm),
                joint.parentFrame ?? IDENTITY_ROTATION,
                vectorMmToMetres(joint.childAnchorMm),
                joint.childFrame ?? IDENTITY_ROTATION
            ),
            parent,
            body,
            true
        );
        constraint.setContactsEnabled(false);
        this.trackJoint(joint, constraint, joint.releaseForceN);
    }

    private trackJoint(
        joint: JointDefinition,
        constraint: RAPIER.ImpulseJoint,
        thresholdN?: number
    ): void {
        this.jointHandles.set(joint.id, constraint.handle);
        const a = constraint.body1().handle;
        const b = constraint.body2().handle;
        for (const [from, to] of [
            [a, b],
            [b, a]
        ]) {
            const neighbors = this.jointNeighbors.get(from) ?? new Set<number>();
            neighbors.add(to);
            this.jointNeighbors.set(from, neighbors);
        }
        if (thresholdN !== undefined && thresholdN > 0) {
            this.breakableJoints.set(joint.id, {
                handle: constraint.handle,
                childId: joint.childId,
                thresholdN
            });
        }
    }

    isJointBroken(id: string): boolean {
        return this.brokenJointIds.has(id);
    }

    private releaseBrokenJoints(): void {
        for (const [id, joint] of this.breakableJoints) {
            if (this.brokenJointIds.has(id)) continue;
            const maximumForce = this.contactsForBody(joint.childId).reduce(
                (maximum, contact) =>
                    Math.max(maximum, contact.impulseNewtonSeconds / this.fixedTimeStep),
                0
            );
            if (maximumForce < joint.thresholdN) continue;
            const constraint = this.world.getImpulseJoint(joint.handle);
            if (constraint) this.world.removeImpulseJoint(constraint, true);
            this.brokenJointIds.add(id);
        }
    }

    private configureMotor(
        joint: RAPIER.RevoluteImpulseJoint | RAPIER.PrismaticImpulseJoint,
        motor?: {
            targetPosition: number;
            targetVelocity?: number;
            stiffness: number;
            damping: number;
            maximumForce?: number;
        },
        positionScale = 1
    ): void {
        if (!motor) return;
        joint.configureMotor(
            motor.targetPosition * positionScale,
            (motor.targetVelocity ?? 0) * positionScale,
            motor.stiffness,
            motor.damping
        );
        if (motor.maximumForce !== undefined) joint.setMotorMaxForce(motor.maximumForce);
    }

    advance(frameDeltaSeconds: number, beforeStep?: (fixedTimeStep: number) => void): number {
        const safeDelta = Number.isFinite(frameDeltaSeconds)
            ? Math.max(0, Math.min(frameDeltaSeconds, this.maximumFrameDelta))
            : 0;
        this.accumulatorSeconds += safeDelta;
        let steps = 0;
        while (this.accumulatorSeconds >= this.fixedTimeStep) {
            beforeStep?.(this.fixedTimeStep);
            this.holdUnpushedBodies();
            this.world.step();
            this.releaseBrokenJoints();
            this.accumulatorSeconds -= this.fixedTimeStep;
            steps++;
        }
        return steps;
    }

    step(beforeStep?: (fixedTimeStep: number) => void): void {
        beforeStep?.(this.fixedTimeStep);
        this.holdUnpushedBodies();
        this.world.step();
        this.releaseBrokenJoints();
    }

    private holdUnpushedBodies(): void {
        for (const [id, config] of this.externalMotionOnly) {
            const body = this.getBody(id);
            if (!body || !body.isDynamic()) continue;
            // Supporting contacts and forces transmitted through the mechanism
            // must not release its static hold. Only an outside horizontal push does.
            const mechanism = new Set([body.handle]);
            for (const handle of mechanism) {
                for (const neighbor of this.jointNeighbors.get(handle) ?? [])
                    mechanism.add(neighbor);
            }
            const force = body.userForce();
            let pushed = Math.hypot(force.x, force.z) > 1e-6;
            for (let i = 0; i < body.numColliders(); i++) {
                const collider = body.collider(i);
                this.world.contactPairsWith(collider, (other) => {
                    if (mechanism.has(other.parent()?.handle ?? -1)) return;
                    this.world.contactPair(collider, other, (manifold) => {
                        const normal = manifold.normal();
                        if (Math.hypot(normal.x, normal.z) < 0.5) return;
                        for (let j = 0; j < manifold.numContacts(); j++) {
                            if (manifold.contactImpulse(j) > 1e-7) pushed = true;
                        }
                    });
                });
            }
            const velocity = body.linvel();
            const previousReleaseFrames = this.externalMotionOnlyReleaseFrames.get(id) ?? 0;
            const releaseFrames = pushed
                ? config.releaseFrames
                : Math.max(0, previousReleaseFrames - 1);
            const released = pushed || releaseFrames > 0;
            body.setEnabledTranslations(released && config.x, config.y, released && config.z, true);
            if (!released) {
                body.setLinvel({ x: 0, y: body.linvel().y, z: 0 }, true);
            }
            if (released) this.externalMotionOnlyReleaseFrames.set(id, releaseFrames);
            else this.externalMotionOnlyReleaseFrames.delete(id);
        }
    }

    takeSnapshot(): PhysicsSnapshot {
        return {
            world: this.world.takeSnapshot(),
            accumulatorSeconds: this.accumulatorSeconds
        };
    }

    restoreSnapshot(snapshot: PhysicsSnapshot): void {
        this.world.free();
        this.world = RAPIER.World.restoreSnapshot(snapshot.world);
        this.world.timestep = this.fixedTimeStep;
        this.accumulatorSeconds = snapshot.accumulatorSeconds;
        this.brokenJointIds.clear();
        this.externalMotionOnlyReleaseFrames.clear();
    }

    dispose(): void {
        this.externalMotionOnly.clear();
        this.externalMotionOnlyReleaseFrames.clear();
        this.jointNeighbors.clear();
        this.bodyHandles.clear();
        this.jointHandles.clear();
        this.breakableJoints.clear();
        this.brokenJointIds.clear();
        this.world.free();
    }
}
