import type {
    BoxColliderDefinition,
    ColliderDefinition,
    PhysicsDefinition,
    PhysicsQuaternion
} from '$lib/physics/types';
import type { JointDefinition } from '$lib/physics/types';
import { IDENTITY_QUATERNION } from '$lib/physics/types';
import { yawDegreesToQuaternion } from '$lib/physics/units';
import type { SceneObject, SceneStore, Vector } from '$lib/spike/scene';

interface SerializedSceneObject {
    id: string;
    anchored: boolean;
    position: Vector;
    rotation: PhysicsQuaternion;
    name: string;
    physics: PhysicsDefinition;
    drive?: SceneObject['drive'];
    hinge?: SceneObject['hinge'];
    preserveOrigin?: boolean;
    editorGroup?: string;
    editorName?: string;
}

export interface SerializedSceneV2 {
    version: 2;
    world: NonNullable<SceneStore['physicsWorld']>;
    robot: SerializedSceneObject;
    matWidth: number;
    matHeight: number;
    objects: SerializedSceneObject[];
    joints: JointDefinition[];
}

const DEFAULT_COLLIDER: BoxColliderDefinition = {
    shape: 'box',
    sizeMm: { x: 100, y: 100, z: 100 }
};

function finiteNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readVector(value: unknown): Vector {
    const vector = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    return {
        x: finiteNumber(vector.x, 0),
        y: finiteNumber(vector.y, 0),
        z: finiteNumber(vector.z, 0)
    };
}

function readQuaternion(value: unknown, yaw = 0): PhysicsQuaternion {
    if (!value || typeof value !== 'object') {
        return yawDegreesToQuaternion(yaw);
    }
    const rotation = value as Record<string, unknown>;
    const result = {
        x: finiteNumber(rotation.x, 0),
        y: finiteNumber(rotation.y, 0),
        z: finiteNumber(rotation.z, 0),
        w: finiteNumber(rotation.w, 1)
    };
    const magnitude = Math.hypot(result.x, result.y, result.z, result.w);
    if (magnitude < 1e-8) {
        return { ...IDENTITY_QUATERNION };
    }
    return {
        x: result.x / magnitude,
        y: result.y / magnitude,
        z: result.z / magnitude,
        w: result.w / magnitude
    };
}

function validPositive(value: unknown, fallback: number): number {
    const number = finiteNumber(value, fallback);
    return number > 0 ? number : fallback;
}

function readCollider(value: unknown): ColliderDefinition | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const collider = value as Record<string, unknown>;
    const common = {
        positionMm: collider.positionMm ? readVector(collider.positionMm) : undefined,
        rotation: collider.rotation ? readQuaternion(collider.rotation) : undefined,
        collisionEnabled: collider.collisionEnabled !== false
    };
    if (collider.shape === 'box') {
        const size = readVector(collider.sizeMm);
        return {
            ...common,
            shape: 'box',
            sizeMm: {
                x: validPositive(size.x, 100),
                y: validPositive(size.y, 100),
                z: validPositive(size.z, 100)
            }
        };
    }
    if (collider.shape === 'cylinder' || collider.shape === 'capsule') {
        return {
            ...common,
            shape: collider.shape,
            radiusMm: validPositive(collider.radiusMm, 50),
            heightMm: validPositive(collider.heightMm, 100)
        };
    }
    if (collider.shape === 'trimesh') {
        const verticesSource = Array.isArray(collider.verticesMm) ? collider.verticesMm : [];
        const indicesSource = Array.isArray(collider.indices) ? collider.indices : [];
        const verticesMm = verticesSource
            .map((value) => finiteNumber(value, Number.NaN))
            .filter((value) => Number.isFinite(value));
        const indices = indicesSource
            .map((value) => Math.floor(finiteNumber(value, Number.NaN)))
            .filter((value) => Number.isFinite(value) && value >= 0);
        if (verticesMm.length < 9 || indices.length < 3) return undefined;
        return { ...common, shape: 'trimesh', verticesMm, indices };
    }
    return undefined;
}

function defaultPhysics(anchored: boolean, robot = false, legacy = false): PhysicsDefinition {
    return {
        bodyType: anchored && !legacy ? 'fixed' : 'dynamic',
        // Scene loading materializes a conservative explicit collider. Runtime
        // physics never synthesizes colliders from an autoCollider flag.
        autoCollider: false,
        massKg: anchored && !legacy ? undefined : robot ? 0.95 : 0.1,
        friction: 0.7,
        restitution: 0,
        enabledRotations: robot ? { x: false, y: true, z: false } : undefined,
        colliders: [
            {
                ...DEFAULT_COLLIDER,
                sizeMm: robot ? { x: 140, y: 65, z: 170 } : { ...DEFAULT_COLLIDER.sizeMm }
            }
        ]
    };
}

function readPhysics(
    value: unknown,
    anchored: boolean,
    robot = false,
    legacy = false
): PhysicsDefinition {
    if (!value || typeof value !== 'object') return defaultPhysics(anchored, robot, legacy);
    const physics = value as Record<string, unknown>;
    const allowedTypes = ['fixed', 'dynamic', 'kinematic', 'trigger'];
    const motionMode =
        physics.motionMode === 'planarPush' || physics.motionMode === 'free'
            ? (physics.motionMode as PhysicsDefinition['motionMode'])
            : undefined;
    const collisionGroup =
        typeof physics.collisionGroup === 'number' && Number.isFinite(physics.collisionGroup)
            ? Math.max(0, Math.floor(physics.collisionGroup))
            : undefined;
    const collisionMask =
        typeof physics.collisionMask === 'number' && Number.isFinite(physics.collisionMask)
            ? Math.max(0, Math.floor(physics.collisionMask))
            : undefined;
    const bodyType = allowedTypes.includes(String(physics.bodyType))
        ? (physics.bodyType as PhysicsDefinition['bodyType'])
        : anchored
          ? 'fixed'
          : 'dynamic';
    const colliders = Array.isArray(physics.colliders)
        ? physics.colliders
              .map(readCollider)
              .filter((x): x is ColliderDefinition => x !== undefined)
        : [];
    return {
        bodyType,
        // Older scene files used autoCollider as an instruction to the runtime.
        // Convert those files to explicit colliders while loading instead.
        autoCollider: false,
        massKg: physics.massKg === undefined ? undefined : validPositive(physics.massKg, 1),
        centerOfMassMm: physics.centerOfMassMm ? readVector(physics.centerOfMassMm) : undefined,
        friction: finiteNumber(physics.friction, 0.7),
        restitution: finiteNumber(physics.restitution, 0),
        linearDamping: finiteNumber(physics.linearDamping, 0),
        angularDamping: finiteNumber(physics.angularDamping, 0),
        additionalSolverIterations: Math.max(
            0,
            Math.floor(finiteNumber(physics.additionalSolverIterations, 0))
        ),
        collisionGroup,
        collisionMask,
        motionMode: motionMode ?? (physics.externalMotionOnly === true ? 'planarPush' : undefined),
        motionReleaseFrames:
            physics.motionReleaseFrames === undefined
                ? undefined
                : Math.max(0, Math.floor(finiteNumber(physics.motionReleaseFrames, 1))),
        externalMotionOnly: physics.externalMotionOnly === true,
        enabledTranslations:
            physics.enabledTranslations && typeof physics.enabledTranslations === 'object'
                ? {
                      x: (physics.enabledTranslations as Record<string, unknown>).x !== false,
                      y: (physics.enabledTranslations as Record<string, unknown>).y !== false,
                      z: (physics.enabledTranslations as Record<string, unknown>).z !== false
                  }
                : undefined,
        enabledRotations:
            physics.enabledRotations && typeof physics.enabledRotations === 'object'
                ? {
                      x: (physics.enabledRotations as Record<string, unknown>).x !== false,
                      y: (physics.enabledRotations as Record<string, unknown>).y !== false,
                      z: (physics.enabledRotations as Record<string, unknown>).z !== false
                  }
                : undefined,
        continuousCollisionDetection: physics.continuousCollisionDetection === true,
        colliders: colliders.length > 0 ? colliders : defaultPhysics(anchored, robot).colliders
    };
}

function readObject(value: unknown, index: number, robot = false, legacy = false): SceneObject {
    if (!value || typeof value !== 'object') throw new Error('Invalid scene object');
    const object = value as Record<string, unknown>;
    const name =
        typeof object.name === 'string' ? object.name : robot ? '#robot' : `Object ${index + 1}`;
    const anchored = object.anchored === true;
    const yaw = finiteNumber(object.rotation, 0);
    const id = typeof object.id === 'string' ? object.id : robot ? '#robot' : `object-${index + 1}`;
    return {
        id,
        name,
        anchored,
        position: readVector(object.position),
        rotation: yaw,
        rotationQuaternion: readQuaternion(object.rotation, yaw),
        physics: readPhysics(object.physics, anchored, robot, legacy),
        drive:
            object.drive && typeof object.drive === 'object'
                ? (object.drive as SceneObject['drive'])
                : undefined,
        hinge:
            object.hinge && typeof object.hinge === 'object'
                ? {
                      axis: ['x', 'y', 'z'].includes(
                          String((object.hinge as Record<string, unknown>).axis)
                      )
                          ? ((object.hinge as Record<string, unknown>).axis as NonNullable<
                                SceneObject['hinge']
                            >['axis'])
                          : 'y'
                  }
                : undefined,
        preserveOrigin: object.preserveOrigin === true,
        editorGroup: typeof object.editorGroup === 'string' ? object.editorGroup : undefined,
        editorName: typeof object.editorName === 'string' ? object.editorName : undefined
    };
}

export function parseSceneDefinition(value: unknown): Omit<SceneStore, 'map'> {
    if (!value || typeof value !== 'object') throw new Error('Invalid scene definition');
    const scene = value as Record<string, unknown>;
    const version = finiteNumber(scene.version, 1);
    if (version !== 1 && version !== 2) throw new Error(`Unsupported scene version: ${version}`);
    if (!Array.isArray(scene.objects)) throw new Error('Invalid scene objects');
    const world =
        scene.world && typeof scene.world === 'object'
            ? (scene.world as Record<string, unknown>)
            : {};
    const joints: JointDefinition[] = Array.isArray(scene.joints)
        ? scene.joints.flatMap((value, index): JointDefinition[] => {
              if (!value || typeof value !== 'object') return [];
              const joint = value as Record<string, unknown>;
              if (
                  !['hinge', 'ball', 'slider', 'fixed', 'spring', 'latch'].includes(
                      String(joint.type)
                  ) ||
                  typeof joint.childId !== 'string'
              )
                  return [];
              const axis = ['x', 'y', 'z'].includes(String(joint.axis))
                  ? (joint.axis as JointDefinition['axis'])
                  : 'z';
              const common = {
                  id: typeof joint.id === 'string' ? joint.id : `joint-${index + 1}`,
                  parentId:
                      typeof joint.parentId === 'string' ? joint.parentId : ('#world' as const),
                  childId: joint.childId,
                  parentAnchorMm: readVector(joint.parentAnchorMm),
                  childAnchorMm: readVector(joint.childAnchorMm),
                  axis,
                  breakForceN:
                      joint.breakForceN === undefined
                          ? undefined
                          : validPositive(joint.breakForceN, 1)
              };
              const motorValue =
                  joint.motor && typeof joint.motor === 'object'
                      ? (joint.motor as Record<string, unknown>)
                      : undefined;
              const motor = motorValue
                  ? {
                        targetPosition: finiteNumber(motorValue.targetPosition, 0),
                        targetVelocity: finiteNumber(motorValue.targetVelocity, 0),
                        stiffness: Math.max(0, finiteNumber(motorValue.stiffness, 10)),
                        damping: Math.max(0, finiteNumber(motorValue.damping, 1)),
                        maximumForce:
                            motorValue.maximumForce === undefined
                                ? undefined
                                : validPositive(motorValue.maximumForce, 1)
                    }
                  : undefined;
              if (joint.type === 'ball') return [{ ...common, type: 'ball' }];
              if (joint.type === 'slider') {
                  const limits =
                      joint.limitsMm && typeof joint.limitsMm === 'object'
                          ? (joint.limitsMm as Record<string, unknown>)
                          : {};
                  return [
                      {
                          ...common,
                          type: 'slider' as const,
                          limitsMm: {
                              min: finiteNumber(limits.min, 0),
                              max: finiteNumber(limits.max, 0)
                          },
                          motor
                      }
                  ];
              }
              if (joint.type === 'fixed') {
                  return [
                      {
                          ...common,
                          type: 'fixed' as const,
                          parentFrame: joint.parentFrame
                              ? readQuaternion(joint.parentFrame)
                              : undefined,
                          childFrame: joint.childFrame
                              ? readQuaternion(joint.childFrame)
                              : undefined
                      }
                  ];
              }
              if (joint.type === 'latch') {
                  const { breakForceN: _breakForceN, ...latchCommon } = common;
                  return [
                      {
                          ...latchCommon,
                          type: 'latch' as const,
                          parentFrame: joint.parentFrame
                              ? readQuaternion(joint.parentFrame)
                              : undefined,
                          childFrame: joint.childFrame
                              ? readQuaternion(joint.childFrame)
                              : undefined,
                          releaseForceN: validPositive(joint.releaseForceN, 10)
                      }
                  ];
              }
              if (joint.type === 'spring') {
                  return [
                      {
                          ...common,
                          type: 'spring' as const,
                          restLengthMm: Math.max(0, finiteNumber(joint.restLengthMm, 0)),
                          stiffness: Math.max(0, finiteNumber(joint.stiffness, 10)),
                          damping: Math.max(0, finiteNumber(joint.damping, 1))
                      }
                  ];
              }
              return [
                  {
                      ...common,
                      type: 'hinge' as const,
                      motor,
                      limitsRadians:
                          joint.limitsRadians && typeof joint.limitsRadians === 'object'
                              ? {
                                    min: finiteNumber(
                                        (joint.limitsRadians as Record<string, unknown>).min,
                                        -Math.PI
                                    ),
                                    max: finiteNumber(
                                        (joint.limitsRadians as Record<string, unknown>).max,
                                        Math.PI
                                    )
                                }
                              : undefined
                  }
              ];
          })
        : [];
    return {
        robot: readObject(scene.robot, 0, true, version === 1),
        objects: scene.objects.map((object, index) =>
            readObject(object, index, false, version === 1)
        ),
        mapWidth: validPositive(scene.matWidth, 2360),
        mapHeight: validPositive(scene.matHeight, 1140),
        physicsWorld: {
            gravityMps2: readVector(world.gravityMps2 ?? { x: 0, y: -9.81, z: 0 }),
            fixedTimeStep: validPositive(world.fixedTimeStep, 1 / 120),
            encoderMode: world.encoderMode === 'physical' ? 'physical' : 'command',
            robotColliderMode: world.robotColliderMode === 'chassis' ? 'chassis' : 'box'
        },
        joints
    };
}

function serializeObject(object: SceneObject, id: string, robot = false): SerializedSceneObject {
    const anchored = object.physics ? object.physics.bodyType === 'fixed' : object.anchored;
    return {
        id: object.id ?? id,
        anchored,
        position: object.position ? { ...object.position } : { x: 0, y: 0, z: 0 },
        rotation: object.rotationQuaternion
            ? { ...object.rotationQuaternion }
            : yawDegreesToQuaternion(object.rotation ?? 0),
        name: object.name,
        physics: object.physics ?? defaultPhysics(anchored, robot),
        drive: object.drive,
        hinge: object.hinge,
        preserveOrigin: object.preserveOrigin === true,
        editorGroup: object.editorGroup,
        editorName: object.editorName
    };
}

export function serializeSceneDefinition(scene: SceneStore): SerializedSceneV2 {
    return {
        version: 2,
        world: scene.physicsWorld ?? {
            gravityMps2: { x: 0, y: -9.81, z: 0 },
            fixedTimeStep: 1 / 120,
            encoderMode: 'command'
        },
        robot: serializeObject(scene.robot, '#robot', true),
        matWidth: scene.mapWidth,
        matHeight: scene.mapHeight,
        objects: scene.objects.map((object, index) =>
            serializeObject(object, `object-${index + 1}`)
        ),
        joints:
            scene.joints?.map((joint) => ({
                ...joint,
                parentAnchorMm: { ...joint.parentAnchorMm },
                childAnchorMm: { ...joint.childAnchorMm }
            })) ?? []
    };
}
