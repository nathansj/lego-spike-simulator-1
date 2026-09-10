export interface PhysicsVector {
    x: number;
    y: number;
    z: number;
}

export interface PhysicsQuaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

export type PhysicsBodyType = 'fixed' | 'dynamic' | 'kinematic' | 'trigger';

interface ColliderBase {
    positionMm?: PhysicsVector;
    rotation?: PhysicsQuaternion;
    collisionEnabled?: boolean;
}

export interface BoxColliderDefinition extends ColliderBase {
    shape: 'box';
    sizeMm: PhysicsVector;
}

export interface CylinderColliderDefinition extends ColliderBase {
    shape: 'cylinder';
    radiusMm: number;
    heightMm: number;
}

export interface CapsuleColliderDefinition extends ColliderBase {
    shape: 'capsule';
    radiusMm: number;
    heightMm: number;
}

export type ColliderDefinition =
    | BoxColliderDefinition
    | CylinderColliderDefinition
    | CapsuleColliderDefinition;

export interface PhysicsDefinition {
    bodyType: PhysicsBodyType;
    autoCollider?: boolean;
    massKg?: number;
    centerOfMassMm?: PhysicsVector;
    friction?: number;
    restitution?: number;
    linearDamping?: number;
    angularDamping?: number;
    additionalSolverIterations?: number;
    collisionGroup?: number;
    collisionMask?: number;
    enabledTranslations?: { x: boolean; y: boolean; z: boolean };
    enabledRotations?: { x: boolean; y: boolean; z: boolean };
    continuousCollisionDetection?: boolean;
    /** Motion mode used for bodies that should remain planar unless pushed. */
    motionMode?: 'free' | 'planarPush';
    /** How many fixed steps a planar-push body remains released after a push. */
    motionReleaseFrames?: number;
    /** Keep horizontal motion latent until a collider applies an external push. */
    externalMotionOnly?: boolean;
    colliders: ColliderDefinition[];
}

export interface DriveDefinition {
    wheelDiameterMm: number;
    trackWidthMm: number;
    leftPort: string;
    rightPort: string;
    leftWheelPositionMm?: PhysicsVector;
    rightWheelPositionMm?: PhysicsVector;
    maximumDriveForceN?: number;
    maximumLateralForceN?: number;
}

export interface PhysicsWorldDefinition {
    gravityMps2?: PhysicsVector;
    fixedTimeStep?: number;
    /** Encoder source for drive motors. Command mode preserves SPIKE semantics; physical mode follows wheel slip. */
    encoderMode?: 'command' | 'physical';
}

export type HingeAxis = 'x' | 'y' | 'z';

export interface HingeDefinition {
    axis: HingeAxis;
}

export interface JointMotorDefinition {
    targetPosition: number;
    targetVelocity?: number;
    stiffness: number;
    damping: number;
    maximumForce?: number;
}

export interface ArticulatedHingeDefinition {
    id: string;
    type: 'hinge';
    parentId: '#world' | string;
    childId: string;
    parentAnchorMm: PhysicsVector;
    childAnchorMm: PhysicsVector;
    axis: HingeAxis;
    limitsRadians?: { min: number; max: number };
    motor?: JointMotorDefinition;
    breakForceN?: number;
}

export interface SliderJointDefinition {
    id: string;
    type: 'slider';
    parentId: '#world' | string;
    childId: string;
    parentAnchorMm: PhysicsVector;
    childAnchorMm: PhysicsVector;
    axis: HingeAxis;
    limitsMm: { min: number; max: number };
    motor?: JointMotorDefinition;
    breakForceN?: number;
}

export interface FixedJointDefinition {
    id: string;
    type: 'fixed';
    parentId: '#world' | string;
    childId: string;
    parentAnchorMm: PhysicsVector;
    childAnchorMm: PhysicsVector;
    axis: HingeAxis;
    parentFrame?: PhysicsQuaternion;
    childFrame?: PhysicsQuaternion;
    breakForceN?: number;
}

export interface SpringJointDefinition {
    id: string;
    type: 'spring';
    parentId: '#world' | string;
    childId: string;
    parentAnchorMm: PhysicsVector;
    childAnchorMm: PhysicsVector;
    axis: HingeAxis;
    restLengthMm: number;
    stiffness: number;
    damping: number;
    breakForceN?: number;
}

export interface LatchJointDefinition {
    id: string;
    type: 'latch';
    parentId: '#world' | string;
    childId: string;
    parentAnchorMm: PhysicsVector;
    childAnchorMm: PhysicsVector;
    axis: HingeAxis;
    parentFrame?: PhysicsQuaternion;
    childFrame?: PhysicsQuaternion;
    releaseForceN: number;
}

export interface BallJointDefinition
    extends Omit<ArticulatedHingeDefinition, 'type' | 'limitsRadians' | 'motor'> {
    type: 'ball';
}

export type JointDefinition =
    | BallJointDefinition
    | ArticulatedHingeDefinition
    | SliderJointDefinition
    | FixedJointDefinition
    | SpringJointDefinition
    | LatchJointDefinition;

export const IDENTITY_QUATERNION: PhysicsQuaternion = { x: 0, y: 0, z: 0, w: 1 };
