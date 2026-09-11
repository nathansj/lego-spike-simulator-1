import { describe, expect, it } from 'vitest';
import fixture from '$lib/physics/fixtures/drone-scene.json';
import { createMatDefinition } from '$lib/physics/bodies';
import { PhysicsWorld } from '$lib/physics/world';
import {
    observeDroneSurvey,
    type DroneSurveyObservationGeometry
} from '$lib/fll/drone-survey-observations';
import { parseSceneDefinition } from '$lib/spike/scene-schema';

const IDENTITY_ROTATION = { x: 0, y: 0, z: 0, w: 1 } as const;

async function fixtureWorld(): Promise<PhysicsWorld> {
    const scene = parseSceneDefinition(fixture);
    const world = await PhysicsWorld.create(scene.physicsWorld);
    world.addBody(createMatDefinition(scene.mapWidth, scene.mapHeight));
    for (const object of [scene.robot, ...scene.objects]) {
        world.addBody({
            id: object === scene.robot ? '#robot' : object.id!,
            positionMm: object.position!,
            rotation: object.rotationQuaternion,
            physics: object.physics!
        });
    }
    for (let step = 0; step < 180; step++) world.step();
    return world;
}

function geometryFor(world: PhysicsWorld): DroneSurveyObservationGeometry {
    const lidarMap = world.getTransform('45832-01-fixed-scenery')!;
    const scanMarker = world.getTransform('45832-01-red-base')!;
    return {
        lidarMapFlippedRotationRelativeToMat: lidarMap.rotation,
        maximumLidarMapRotationErrorRadians: 0.01,
        surveyAreaMm: {
            minX: scanMarker.positionMm.x - 10,
            maxX: scanMarker.positionMm.x + 10,
            minZ: scanMarker.positionMm.z - 10,
            maxZ: scanMarker.positionMm.z + 10
        },
        scanMarkerOverlapMarginMm: 0
    };
}

describe('Drone Survey physics observations', () => {
    it('reads the current semantic bodies from the renderer-free fixture', async () => {
        const world = await fixtureWorld();

        expect(observeDroneSurvey(world, geometryFor(world))).toEqual({
            droneNoLongerTouchingMat: true,
            lidarMapCompletelyFlipped: true,
            scanMarkerAtLeastPartlyInSurveyArea: true,
            missionModelTouchingEquipmentAtEnd: false
        });

        world.dispose();
    });

    it('includes configurable flip and survey-area boundaries', async () => {
        const world = await fixtureWorld();
        const drone = world.getBody('45832-01-drone')!;
        const lidarMap = world.getBody('45832-01-fixed-scenery')!;
        const scanMarker = world.getBody('45832-01-red-base')!;
        drone.setTranslation({ x: 0, y: 0.01, z: 0 }, true);
        world.step();
        expect(observeDroneSurvey(world, geometryFor(world)).droneNoLongerTouchingMat).toBe(false);

        drone.setTranslation({ x: 0, y: 0.3, z: 0 }, true);
        lidarMap.setRotation(IDENTITY_ROTATION, true);
        scanMarker.setTranslation({ x: -0.005, y: 0.0294092, z: 0.05 }, true);
        world.step();
        const geometry: DroneSurveyObservationGeometry = {
            lidarMapFlippedRotationRelativeToMat: IDENTITY_ROTATION,
            maximumLidarMapRotationErrorRadians: 0.1,
            surveyAreaMm: { minX: 0, maxX: 100, minZ: 0, maxZ: 100 },
            scanMarkerOverlapMarginMm: 5
        };

        expect(observeDroneSurvey(world, geometry)).toMatchObject({
            droneNoLongerTouchingMat: true,
            lidarMapCompletelyFlipped: true,
            scanMarkerAtLeastPartlyInSurveyArea: true
        });

        lidarMap.setRotation({ x: 0, y: 0, z: Math.sin(0.05005), w: Math.cos(0.05005) }, true);
        scanMarker.setTranslation({ x: -0.005001, y: 0.0294092, z: 0.05 }, true);
        expect(observeDroneSurvey(world, geometry)).toMatchObject({
            lidarMapCompletelyFlipped: false,
            scanMarkerAtLeastPartlyInSurveyArea: false
        });

        world.dispose();
    });

    it('detects end-state equipment contact with any present mission body', async () => {
        const world = await fixtureWorld();
        const scanMarker = world.getBody('45832-01-red-base')!;
        const markerPosition = scanMarker.translation();
        const robot = world.getBody('#robot')!;
        robot.setTranslation(markerPosition, true);
        robot.setLinvel({ x: 0, y: 0, z: 0 }, true);
        world.step();

        expect(observeDroneSurvey(world, geometryFor(world))).toMatchObject({
            missionModelTouchingEquipmentAtEnd: true
        });

        world.dispose();
    });

    it('fails explicitly when a required semantic body is absent', async () => {
        const world = await PhysicsWorld.create();
        world.addBody(createMatDefinition(100, 100));

        expect(() =>
            observeDroneSurvey(world, {
                lidarMapFlippedRotationRelativeToMat: IDENTITY_ROTATION,
                maximumLidarMapRotationErrorRadians: 0,
                surveyAreaMm: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
                scanMarkerOverlapMarginMm: 0
            })
        ).toThrow('Missing Drone Survey physics body: 45832-01-fixed-scenery');

        world.dispose();
    });
});
