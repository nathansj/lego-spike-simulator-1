import { type Model } from '$lib/ldraw/components';
import { type CompiledModel } from '$lib/ldraw/gl';
import { writable } from 'svelte/store';
import type {
    DriveDefinition,
    PhysicsDefinition,
    HingeDefinition,
    JointDefinition,
    PhysicsQuaternion,
    PhysicsWorldDefinition
} from '$lib/physics/types';

export interface Vector {
    x: number;
    y: number;
    z: number;
}

export interface SceneObject {
    id?: string;
    anchored: boolean;
    bricks?: Model;
    position?: Vector;
    rotation?: number;
    rotationQuaternion?: PhysicsQuaternion;
    name: string;
    compiled?: CompiledModel;
    preserveOrigin?: boolean;
    editorGroup?: string;
    editorName?: string;
    physics?: PhysicsDefinition;
    drive?: DriveDefinition;
    hinge?: HingeDefinition;
}

export interface SceneStore {
    robot: SceneObject;
    objects: SceneObject[];
    map: Blob | undefined;
    mapWidth: number;
    mapHeight: number;
    physicsWorld?: PhysicsWorldDefinition;
    joints?: JointDefinition[];
}

export const sceneStore = writable<SceneStore>({
    robot: { anchored: false, name: 'Robot', position: { x: 0, y: 0, z: 0 } },
    objects: [],
    map: undefined,
    mapWidth: 2360,
    mapHeight: 1140
});

function copyObject(obj: SceneObject): SceneObject {
    return {
        anchored: obj.anchored,
        id: obj.id,
        bricks: obj.bricks,
        position: obj.position ? { ...obj.position } : { x: 0, y: 0, z: 0 },
        rotation: obj.rotation ?? 0,
        rotationQuaternion: obj.rotationQuaternion ? { ...obj.rotationQuaternion } : undefined,
        name: obj.name,
        compiled: obj.compiled,
        preserveOrigin: obj.preserveOrigin,
        editorGroup: obj.editorGroup,
        editorName: obj.editorName,
        physics: obj.physics
            ? {
                  ...obj.physics,
                  centerOfMassMm: obj.physics.centerOfMassMm
                      ? { ...obj.physics.centerOfMassMm }
                      : undefined,
                  enabledTranslations: obj.physics.enabledTranslations
                      ? { ...obj.physics.enabledTranslations }
                      : undefined,
                  enabledRotations: obj.physics.enabledRotations
                      ? { ...obj.physics.enabledRotations }
                      : undefined,
                  colliders: obj.physics.colliders.map((collider) => ({
                      ...collider,
                      positionMm: collider.positionMm ? { ...collider.positionMm } : undefined,
                      rotation: collider.rotation ? { ...collider.rotation } : undefined,
                      ...(collider.shape === 'box' ? { sizeMm: { ...collider.sizeMm } } : {})
                  }))
              }
            : undefined,
        drive: obj.drive ? { ...obj.drive } : undefined,
        hinge: obj.hinge ? { ...obj.hinge } : undefined
    };
}

export function copyScene(scene: SceneStore): SceneStore {
    return {
        robot: copyObject(scene.robot),
        objects: scene.objects.map((x) => copyObject(x)),
        map: scene.map,
        mapWidth: scene.mapWidth,
        mapHeight: scene.mapHeight,
        physicsWorld: scene.physicsWorld ? { ...scene.physicsWorld } : undefined,
        joints: scene.joints?.map((joint) => ({
            ...joint,
            parentAnchorMm: { ...joint.parentAnchorMm },
            childAnchorMm: { ...joint.childAnchorMm }
        }))
    };
}

// FLL table is 2434mm x 1145mm
// Mat is 2360mm x 1140mm
// Boundary is 50mm high

export interface Boundary {
    draw: boolean;
    scale: number;
    collisions: boolean;
    debugPhysics: boolean;
}

export const boundaryStore = writable<Boundary>({
    draw: true,
    scale: 1.0,
    collisions: true,
    debugPhysics: false
});
