import RAPIER from '@dimforge/rapier3d-deterministic-compat';
import type {
    ColliderDefinition,
    PhysicsBodyType,
    PhysicsDefinition,
    PhysicsQuaternion,
    PhysicsVector
} from '$lib/physics/types';
import { IDENTITY_QUATERNION } from '$lib/physics/types';
import { millimetresToMetres, vectorMmToMetres } from '$lib/physics/units';

export interface BodyCreationDefinition {
    id: string;
    positionMm: PhysicsVector;
    rotation?: PhysicsQuaternion;
    physics: PhysicsDefinition;
}

function bodyDescriptor(bodyType: PhysicsBodyType): RAPIER.RigidBodyDesc {
    switch (bodyType) {
        case 'fixed':
            return RAPIER.RigidBodyDesc.fixed();
        case 'kinematic':
            return RAPIER.RigidBodyDesc.kinematicPositionBased();
        case 'trigger':
            return RAPIER.RigidBodyDesc.fixed();
        case 'dynamic':
            return RAPIER.RigidBodyDesc.dynamic();
    }
}

function colliderDescriptor(collider: ColliderDefinition): RAPIER.ColliderDesc {
    switch (collider.shape) {
        case 'box':
            return RAPIER.ColliderDesc.cuboid(
                millimetresToMetres(collider.sizeMm.x) / 2,
                millimetresToMetres(collider.sizeMm.y) / 2,
                millimetresToMetres(collider.sizeMm.z) / 2
            );
        case 'cylinder':
            return RAPIER.ColliderDesc.cylinder(
                millimetresToMetres(collider.heightMm) / 2,
                millimetresToMetres(collider.radiusMm)
            );
        case 'capsule':
            return RAPIER.ColliderDesc.capsule(
                millimetresToMetres(collider.heightMm) / 2,
                millimetresToMetres(collider.radiusMm)
            );
        case 'trimesh': {
            const vertices = new Float32Array(collider.verticesMm.length);
            for (let i = 0; i < collider.verticesMm.length; i++) {
                vertices[i] = millimetresToMetres(collider.verticesMm[i]);
            }
            return RAPIER.ColliderDesc.trimesh(vertices, new Uint32Array(collider.indices));
        }
    }
}

function collisionGroups(group: number, mask: number): number {
    return ((((mask ?? -1) & 0xffff) << 16) | ((group ?? 1) & 0xffff)) >>> 0;
}

export function createRigidBody(
    world: RAPIER.World,
    definition: BodyCreationDefinition
): RAPIER.RigidBody {
    const physics = definition.physics;
    const position = vectorMmToMetres(definition.positionMm);
    const rotation = definition.rotation ?? IDENTITY_QUATERNION;
    const descriptor = bodyDescriptor(physics.bodyType)
        .setTranslation(position.x, position.y, position.z)
        .setRotation(rotation)
        .setLinearDamping(physics.linearDamping ?? 0)
        .setAngularDamping(physics.angularDamping ?? 0)
        .setAdditionalSolverIterations(physics.additionalSolverIterations ?? 0)
        .setCcdEnabled(physics.continuousCollisionDetection ?? false)
        .setUserData({ id: definition.id });

    if (physics.enabledRotations) {
        descriptor.enabledRotations(
            physics.enabledRotations.x,
            physics.enabledRotations.y,
            physics.enabledRotations.z
        );
    }
    if (physics.enabledTranslations) {
        descriptor.enabledTranslations(
            physics.enabledTranslations.x,
            physics.enabledTranslations.y,
            physics.enabledTranslations.z
        );
    }

    const body = world.createRigidBody(descriptor);
    for (const collider of physics.colliders) {
        const colliderDesc = colliderDescriptor(collider)
            .setFriction(physics.friction ?? 0.7)
            .setRestitution(physics.restitution ?? 0)
            .setSensor(physics.bodyType === 'trigger' || collider.collisionEnabled === false);
        if (physics.collisionGroup !== undefined || physics.collisionMask !== undefined) {
            colliderDesc.setCollisionGroups(
                collisionGroups(physics.collisionGroup ?? 1, physics.collisionMask ?? -1)
            );
        }
        if (physics.bodyType === 'dynamic') {
            if (collider.massKg !== undefined) {
                colliderDesc.setMass(collider.massKg);
            } else if (physics.massKg !== undefined) {
                colliderDesc.setMass(physics.massKg / physics.colliders.length);
            }
        }
        if (collider.positionMm) {
            const localPosition = vectorMmToMetres(collider.positionMm);
            colliderDesc.setTranslation(localPosition.x, localPosition.y, localPosition.z);
        }
        if (collider.rotation) {
            colliderDesc.setRotation(collider.rotation);
        }
        world.createCollider(colliderDesc, body);
    }
    return body;
}

export function createMatDefinition(widthMm: number, heightMm: number): BodyCreationDefinition {
    const thicknessMm = 10;
    return {
        id: '#mat',
        positionMm: { x: 0, y: -thicknessMm / 2, z: 0 },
        physics: {
            bodyType: 'fixed',
            friction: 0.9,
            restitution: 0,
            colliders: [{ shape: 'box', sizeMm: { x: widthMm, y: thicknessMm, z: heightMm } }]
        }
    };
}

export function createBoundaryDefinitions(
    widthMm: number,
    heightMm: number,
    wallHeightMm = 50,
    wallThicknessMm = 20
): BodyCreationDefinition[] {
    const halfWidth = widthMm / 2;
    const halfHeight = heightMm / 2;
    const wallY = wallHeightMm / 2;
    const horizontal = { x: widthMm + wallThicknessMm * 2, y: wallHeightMm, z: wallThicknessMm };
    const vertical = { x: wallThicknessMm, y: wallHeightMm, z: heightMm };
    const fixed = (id: string, positionMm: PhysicsVector, sizeMm: PhysicsVector) => ({
        id,
        positionMm,
        physics: {
            bodyType: 'fixed' as const,
            friction: 0.7,
            restitution: 0,
            colliders: [{ shape: 'box' as const, sizeMm }]
        }
    });
    return [
        fixed(
            '#boundary-north',
            { x: 0, y: wallY, z: halfHeight + wallThicknessMm / 2 },
            horizontal
        ),
        fixed(
            '#boundary-south',
            { x: 0, y: wallY, z: -halfHeight - wallThicknessMm / 2 },
            horizontal
        ),
        fixed('#boundary-east', { x: halfWidth + wallThicknessMm / 2, y: wallY, z: 0 }, vertical),
        fixed('#boundary-west', { x: -halfWidth - wallThicknessMm / 2, y: wallY, z: 0 }, vertical)
    ];
}
