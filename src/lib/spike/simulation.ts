import { createBoundaryDefinitions, createMatDefinition } from '$lib/physics/bodies';
import { ForceDriveController } from '$lib/physics/drive';
import type { PhysicsSnapshot } from '$lib/physics/snapshot';
import { quaternionToYawDegrees, yawDegreesToQuaternion } from '$lib/physics/units';
import { PhysicsWorld } from '$lib/physics/world';
import type { SceneObject, SceneStore } from '$lib/spike/scene';
import type { Hub, VM } from '$lib/spike/vm';
import { allPorts, type PortType } from '$lib/spike/vm';

export interface PhysicsSensorPose {
    positionMm: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
}

interface PhysicsSensor {
    port: PortType;
    type: 'distance' | 'force';
    pose: PhysicsSensorPose;
}

interface MotorState {
    position: number;
    relativePosition: number;
    motorSpeed: number;
    rpm: number;
    on: boolean;
    reverse: boolean;
}

interface HubState {
    leftPressed: boolean;
    rightPressed: boolean;
    screen: string;
    screenBrightness: number;
    screenRotate: number;
    buttonColour: string;
    moveSpeed: number;
    moveDistance: number;
    movePair1: (typeof allPorts)[number];
    movePair2: (typeof allPorts)[number];
    yaw: number;
    motors: Partial<Record<(typeof allPorts)[number], MotorState>>;
}

function captureHubState(hub: Hub): HubState {
    const motors: HubState['motors'] = {};
    for (const port of allPorts) {
        const motor = hub.ports[port].motor;
        if (motor) {
            motors[port] = {
                position: motor.position,
                relativePosition: motor.relativePosition,
                motorSpeed: motor.motorSpeed,
                rpm: motor.rpm,
                on: motor.on,
                reverse: motor.reverse
            };
        }
    }
    return {
        leftPressed: hub.leftPressed,
        rightPressed: hub.rightPressed,
        screen: hub.screen,
        screenBrightness: hub.screenBrightness,
        screenRotate: hub.screenRotate,
        buttonColour: hub.buttonColour,
        moveSpeed: hub.moveSpeed,
        moveDistance: hub.moveDistance,
        movePair1: hub.movePair1,
        movePair2: hub.movePair2,
        yaw: hub.yaw,
        motors
    };
}

function restoreHubState(hub: Hub, state: HubState): void {
    Object.assign(hub, {
        leftPressed: state.leftPressed,
        rightPressed: state.rightPressed,
        screen: state.screen,
        screenBrightness: state.screenBrightness,
        screenRotate: state.screenRotate,
        buttonColour: state.buttonColour,
        moveSpeed: state.moveSpeed,
        moveDistance: state.moveDistance,
        movePair1: state.movePair1,
        movePair2: state.movePair2,
        yaw: state.yaw
    });
    for (const port of allPorts) {
        const motor = hub.ports[port].motor;
        const saved = state.motors[port];
        if (motor && saved) Object.assign(motor, saved);
    }
}

function runtimePhysics(object: SceneObject): NonNullable<SceneObject['physics']> {
    const physics = object.physics;
    if (!physics) {
        throw new Error(`Scene object is missing physics definitions: ${object.id ?? object.name}`);
    }
    if (physics.autoCollider || physics.colliders.length === 0) {
        throw new Error(`Scene object physics must define explicit colliders: ${object.id ?? object.name}`);
    }
    return object.hinge
        ? { ...physics, bodyType: 'dynamic', enabledRotations: undefined }
        : physics;
}

export class Simulation {
    private initialSnapshot: PhysicsSnapshot;
    private readonly initialHubState: HubState;
    private readonly drive: ForceDriveController;
    private sensors: PhysicsSensor[] = [];
    private forceOverrides = new Map<PortType, number>();

    private constructor(
        readonly scene: SceneStore,
        readonly physics: PhysicsWorld,
        readonly vm: VM,
        readonly hub: Hub
    ) {
        this.drive = new ForceDriveController(physics, {
            maximumDriveForceN: scene.robot.drive?.maximumDriveForceN,
            maximumLateralForceN: scene.robot.drive?.maximumLateralForceN,
            encoderMode: scene.physicsWorld?.encoderMode
        });
        this.initialSnapshot = physics.takeSnapshot();
        this.initialHubState = captureHubState(hub);
    }

    static async create(
        scene: SceneStore,
        vm: VM,
        hub: Hub,
        boundaries = true
    ): Promise<Simulation> {
        const physics = await PhysicsWorld.create(scene.physicsWorld);
        physics.addBody(createMatDefinition(scene.mapWidth, scene.mapHeight));
        if (boundaries) {
            for (const boundary of createBoundaryDefinitions(scene.mapWidth, scene.mapHeight)) {
                physics.addBody(boundary);
            }
        }
        const objects = [scene.robot, ...scene.objects];
        for (let index = 0; index < objects.length; index++) {
            const object = objects[index];
            const robot = index === 0;
            const id = robot ? '#robot' : (object.id ?? `object-${index}`);
            object.id = id;
            physics.addBody({
                id,
                positionMm: object.position ?? { x: 0, y: 0, z: 0 },
                rotation: object.rotationQuaternion ?? yawDegreesToQuaternion(object.rotation ?? 0),
                physics: runtimePhysics(object)
            });
        }
        for (const object of scene.objects) {
            if (object.id && object.hinge) {
                physics.addWorldHinge(object.id, object.hinge.axis);
            }
        }
        for (const joint of scene.joints ?? []) {
            physics.addJoint(joint);
        }
        const simulation = new Simulation(scene, physics, vm, hub);
        simulation.syncScene();
        return simulation;
    }

    advance(frameDeltaSeconds: number): number {
        const steps = this.physics.advance(frameDeltaSeconds, (dt) => {
            this.updateSensors();
            this.vm.step(dt, this.scene, this.drive);
        });
        this.syncScene();
        this.updateSensors();
        return steps;
    }

    setPhysicsSensors(sensors: PhysicsSensor[]): void {
        this.sensors = sensors;
        this.updateSensors();
    }

    setForceSensorOverride(port: PortType, force?: number): void {
        if (force === undefined) this.forceOverrides.delete(port);
        else this.forceOverrides.set(port, force);
        this.updateSensors();
    }

    reset(): void {
        this.physics.restoreSnapshot(this.initialSnapshot);
        restoreHubState(this.hub, this.initialHubState);
        this.syncScene();
    }

    dispose(): void {
        this.physics.dispose();
    }

    private syncScene(): void {
        for (const object of [this.scene.robot, ...this.scene.objects]) {
            const id = object === this.scene.robot ? '#robot' : object.id;
            if (!id) continue;
            const transform = this.physics.getTransform(id);
            if (!transform) continue;
            object.position = transform.positionMm;
            object.rotationQuaternion = transform.rotation;
            object.rotation = quaternionToYawDegrees(transform.rotation);
        }
        const yaw = this.scene.robot.rotation ?? 0;
        this.hub.yaw = ((-yaw + 180) % 360) - 180;
    }

    private updateSensors(): void {
        const robot = this.physics.getTransform('#robot');
        if (!robot) return;
        const contacts = this.physics.contactsForBody('#robot');
        for (const sensor of this.sensors) {
            const position = rotateVector(robot.rotation, sensor.pose.positionMm);
            const direction = rotateVector(robot.rotation, sensor.pose.direction);
            const origin = {
                x: robot.positionMm.x + position.x,
                y: robot.positionMm.y + position.y,
                z: robot.positionMm.z + position.z
            };
            if (sensor.type === 'distance') {
                const hit = this.physics.castRay(origin, direction, 2000, '#robot');
                this.hub.measureDistance(sensor.port, Math.trunc(hit?.distanceMm ?? 2000));
            } else {
                const override = this.forceOverrides.get(sensor.port);
                if (override !== undefined) {
                    this.hub.measureForce(sensor.port, override);
                    continue;
                }
                const localizedForce = contacts.reduce((maximum, contact) => {
                    const offset = {
                        x: contact.pointMm.x - origin.x,
                        y: contact.pointMm.y - origin.y,
                        z: contact.pointMm.z - origin.z
                    };
                    const distance = Math.hypot(offset.x, offset.y, offset.z);
                    const inFront =
                        offset.x * direction.x + offset.y * direction.y + offset.z * direction.z >=
                        -5;
                    if (!inFront || distance > 40) return maximum;
                    return Math.max(
                        maximum,
                        contact.impulseNewtonSeconds / this.physics.fixedTimeStep
                    );
                }, 0);
                const hit = this.physics.castRay(origin, direction, 8, '#robot');
                const onsetForce = hit
                    ? Math.max(0, Math.min(10, 10 * (1 - hit.distanceMm / 8)))
                    : 0;
                const force = Math.min(10, Math.max(localizedForce, onsetForce));
                this.hub.measureForce(sensor.port, force);
            }
        }
    }
}

function rotateVector(
    rotation: { x: number; y: number; z: number; w: number },
    vector: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
    const tx = 2 * (rotation.y * vector.z - rotation.z * vector.y);
    const ty = 2 * (rotation.z * vector.x - rotation.x * vector.z);
    const tz = 2 * (rotation.x * vector.y - rotation.y * vector.x);
    return {
        x: vector.x + rotation.w * tx + (rotation.y * tz - rotation.z * ty),
        y: vector.y + rotation.w * ty + (rotation.z * tx - rotation.x * tz),
        z: vector.z + rotation.w * tz + (rotation.x * ty - rotation.y * tx)
    };
}
