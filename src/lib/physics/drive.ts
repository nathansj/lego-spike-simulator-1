import type RAPIER from '@dimforge/rapier3d-deterministic-compat';
import type { PhysicsWorld } from '$lib/physics/world';
import { millimetresToMetres } from '$lib/physics/units';
import type { SceneStore } from '$lib/spike/scene';
import { allPorts, type Hub, type RobotMotion, type Wheel } from '$lib/spike/vm';

export interface DriveControllerOptions {
    maximumDriveForceN?: number;
    maximumLateralForceN?: number;
    longitudinalGain?: number;
    lateralGain?: number;
    steeringAssistTorqueNm?: number;
    encoderMode?: 'command' | 'physical';
}

interface Vector3 {
    x: number;
    y: number;
    z: number;
}

function add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(vector: Vector3, amount: number): Vector3 {
    return { x: vector.x * amount, y: vector.y * amount, z: vector.z * amount };
}

function dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function length(vector: Vector3): number {
    return Math.hypot(vector.x, vector.y, vector.z);
}

function normalize(vector: Vector3): Vector3 {
    const magnitude = length(vector);
    return magnitude > 1e-8 ? scale(vector, 1 / magnitude) : { x: 0, y: 0, z: 1 };
}

function rotate(rotation: RAPIER.Rotation, vector: Vector3): Vector3 {
    const q = rotation;
    const ix = q.w * vector.x + q.y * vector.z - q.z * vector.y;
    const iy = q.w * vector.y + q.z * vector.x - q.x * vector.z;
    const iz = q.w * vector.z + q.x * vector.y - q.y * vector.x;
    const iw = -q.x * vector.x - q.y * vector.y - q.z * vector.z;
    return {
        x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
        y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
        z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x
    };
}

function clamp(value: number, maximumMagnitude: number): number {
    return Math.max(-maximumMagnitude, Math.min(maximumMagnitude, value));
}

export class ForceDriveController implements RobotMotion {
    private readonly maximumDriveForceN: number;
    private readonly maximumLateralForceN: number;
    private readonly longitudinalGain: number;
    private readonly lateralGain: number;
    private readonly encoderMode: 'command' | 'physical';
    private readonly steeringAssistTorqueNm: number;

    constructor(
        private readonly physics: PhysicsWorld,
        options: DriveControllerOptions = {}
    ) {
        this.maximumDriveForceN = options.maximumDriveForceN ?? 8;
        this.maximumLateralForceN = options.maximumLateralForceN ?? 12;
        // The gain must reach useful wheel force before mat static friction
        // captures a stationary robot. Force remains capped independently.
        this.longitudinalGain = options.longitudinalGain ?? 48;
        this.lateralGain = options.lateralGain ?? 12;
        this.steeringAssistTorqueNm = options.steeringAssistTorqueNm ?? 4;
        this.encoderMode = options.encoderMode ?? 'command';
    }

    step(seconds: number, _scene: SceneStore, hub: Hub): void {
        const body = this.physics.getBody('#robot');
        if (!body) return;

        // Rapier keeps user-applied forces and torques until they are explicitly
        // cleared. Rebuild the drivetrain effort for each fixed step so a robot
        // stalled against an obstacle cannot accumulate an unbounded launch force.
        body.resetForces(false);
        body.resetTorques(false);

        const drivenPorts = new Set(hub.wheels.map((wheel) => wheel.port));
        for (const port of allPorts) {
            const attachment = hub.ports[port];
            if (
                attachment.type === 'motor' &&
                !(this.encoderMode === 'physical' && drivenPorts.has(port))
            ) {
                attachment.motor!.move(seconds);
            }
        }

        const drivenWheels = hub.wheels.filter((wheel) => hub.ports[wheel.port].type === 'motor');
        if (drivenWheels.length === 0) return;

        const reference = normalize({
            x: drivenWheels[0].direction.x,
            y: 0,
            z: drivenWheels[0].direction.z
        });
        let forwardLocal = { x: 0, y: 0, z: 0 };
        for (const wheel of drivenWheels) {
            let direction = normalize({ x: wheel.direction.x, y: 0, z: wheel.direction.z });
            if (dot(direction, reference) < 0) direction = scale(direction, -1);
            forwardLocal = add(forwardLocal, direction);
        }
        forwardLocal = normalize(forwardLocal);

        // A four-wheel robot should not receive twice the total force of a two-wheel robot.
        const wheelForceScale = Math.min(1, 2 / drivenWheels.length);
        // Scale saturated wheel demands together. Independent clipping makes
        // both wheels exert the same force against an obstacle, erasing steering.
        let largestDemand = this.maximumDriveForceN;
        for (const wheel of drivenWheels) {
            const motor = hub.ports[wheel.port].motor!;
            const sign =
                (motor.reverse ? -1 : 1) * (dot(wheel.direction, forwardLocal) >= 0 ? 1 : -1);
            const target =
                (sign *
                    wheel.gearing *
                    (motor.on ? motor.rpm : 0) *
                    2 *
                    Math.PI *
                    millimetresToMetres(wheel.radius)) /
                60;
            const point = add(
                body.translation(),
                rotate(body.rotation(), scale(wheel.position, 0.001))
            );
            const speed = dot(body.velocityAtPoint(point), rotate(body.rotation(), forwardLocal));
            largestDemand = Math.max(
                largestDemand,
                Math.abs((target - speed) * this.longitudinalGain)
            );
        }
        const demandScale = largestDemand > 0 ? this.maximumDriveForceN / largestDemand : 0;
        for (const wheel of drivenWheels) {
            this.applyWheelForce(
                body,
                wheel,
                hub,
                forwardLocal,
                wheelForceScale,
                seconds,
                demandScale
            );
        }

        // A contact at the front of a robot can absorb the small differential
        // force that normally creates yaw. Add a bounded, wheel-speed-derived
        // assist torque so steering remains effective while pushing an object.
        const loadBoost = this.steeringLoadBoost(_scene, body);
        const rotation = body.rotation();
        const forward = normalize(rotate(rotation, forwardLocal));
        const lateral = normalize({ x: forward.z, y: 0, z: -forward.x });
        let steeringMoment = 0;
        let squaredTrackArms = 0;
        for (const wheel of drivenWheels) {
            const attachment = hub.ports[wheel.port];
            if (attachment.type !== 'motor') continue;
            const motor = attachment.motor!;
            const directionSign = motor.reverse ? -1 : 1;
            const wheelDirection = normalize({ x: wheel.direction.x, y: 0, z: wheel.direction.z });
            const orientationSign = dot(wheelDirection, forwardLocal) >= 0 ? 1 : -1;
            const targetSpeed =
                (directionSign *
                    orientationSign *
                    wheel.gearing *
                    ((motor.on ? motor.rpm : 0) *
                        2 *
                        Math.PI *
                        millimetresToMetres(wheel.radius))) /
                60;
            const localPoint = {
                x: millimetresToMetres(wheel.position.x),
                y: 0,
                z: millimetresToMetres(wheel.position.z)
            };
            const lateralArm = dot(rotate(rotation, localPoint), lateral);
            steeringMoment += targetSpeed * lateralArm;
            squaredTrackArms += lateralArm * lateralArm;
        }
        const targetYawRate = squaredTrackArms > 1e-8 ? -steeringMoment / squaredTrackArms : 0;
        body.addTorque(
            {
                x: 0,
                y: clamp((targetYawRate - body.angvel().y) * 0.8 * loadBoost, this.steeringAssistTorqueNm),
                z: 0
            },
            true
        );
    }

    private steeringLoadBoost(scene: SceneStore, robot: RAPIER.RigidBody): number {
        const candidates = scene.objects.filter(
            (object) =>
                object.physics?.motionMode === 'planarPush' ||
                object.physics?.externalMotionOnly
        );
        if (candidates.length === 0) return 1;
        const robotPosition = robot.translation();
        let boost = 1;
        for (const object of candidates) {
            const body = this.physics.getBody(object.id ?? '');
            if (!body) continue;
            const position = body.translation();
            const distance = Math.hypot(
                position.x - robotPosition.x,
                position.z - robotPosition.z
            );
            if (distance > 0.35) continue;
            const proximity = 1 - distance / 0.35;
            boost = Math.max(boost, 1 + proximity * 7);
        }
        return boost;
    }

    private applyWheelForce(
        body: RAPIER.RigidBody,
        wheel: Wheel,
        hub: Hub,
        forwardLocal: Vector3,
        wheelForceScale: number,
        seconds: number,
        demandScale: number
    ): void {
        const attachment = hub.ports[wheel.port];
        if (attachment.type !== 'motor') return;
        const motor = attachment.motor!;
        const directionSign = motor.reverse ? -1 : 1;
        const wheelDirection = normalize({ x: wheel.direction.x, y: 0, z: wheel.direction.z });
        // Wheel meshes are mirrored on opposite sides of a robot.  The
        // canonical forward vector above lets us apply grip consistently, but
        // the rolling target must retain each wheel's local orientation or the
        // motor-mount reversal would cancel the requested steering differential.
        const orientationSign = dot(wheelDirection, forwardLocal) >= 0 ? 1 : -1;
        const targetSpeed =
            (directionSign *
                orientationSign *
                wheel.gearing *
                ((motor.on ? motor.rpm : 0) * 2 * Math.PI * millimetresToMetres(wheel.radius))) /
            60;
        const rotation = body.rotation();
        const forward = normalize(rotate(rotation, forwardLocal));
        const lateral = normalize({ x: forward.z, y: 0, z: -forward.x });
        const localPoint = {
            x: millimetresToMetres(wheel.position.x),
            y: millimetresToMetres(wheel.position.y),
            z: millimetresToMetres(wheel.position.z)
        };
        const point = add(body.translation(), rotate(rotation, localPoint));
        const velocity = body.velocityAtPoint(point);
        const driveError = targetSpeed - dot(velocity, forward);
        const lateralError = -dot(velocity, lateral);
        const driveForce = clamp(
            driveError * this.longitudinalGain * demandScale,
            this.maximumDriveForceN
        );
        const lateralForce = clamp(lateralError * this.lateralGain, this.maximumLateralForceN);
        body.addForceAtPoint(
            scale(add(scale(forward, driveForce), scale(lateral, lateralForce)), wheelForceScale),
            point,
            true
        );
        if (this.encoderMode === 'physical') {
            const signedWheelSpeed = dot(velocity, forward);
            const gearing = Math.abs(wheel.gearing) > 1e-8 ? wheel.gearing : 1;
            const motorDegrees =
                (signedWheelSpeed / millimetresToMetres(wheel.radius) / gearing) *
                (180 / Math.PI) *
                seconds;
            motor.position += motorDegrees;
            motor.relativePosition += motorDegrees;
            while (motor.position >= 360) motor.position -= 360;
            while (motor.position < 0) motor.position += 360;
        }
    }
}
